import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { generateSummary } from '@/lib/types';
import { getClinicIdServer } from '@/lib/clinic-server';
import { findOrCreatePatient } from '@/lib/shared-patient';
import crypto from 'crypto';

// GET: list all submissions (for staff dashboard) — 認証必須
export async function GET(req: NextRequest) {
  const supabaseServer = await createClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const clinicId = await getClinicIdServer();
  const status = req.nextUrl.searchParams.get('status');

  let query = supabaseServer
    .from('ms_submissions')
    .select('*, patient:cm_patients(patient_number)')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('submissions GET error:', error.message);
    return NextResponse.json({ error: '処理に失敗しました' }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST: create a new submission (generates token) — 認証必須（スタッフがQRコード等で発行）
export async function POST() {
  const supabaseServer = await createClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const token = crypto.randomBytes(16).toString('hex');
  const clinicId = await getClinicIdServer();

  const { data, error } = await supabaseServer
    .from('ms_submissions')
    .insert({ token, status: 'draft', clinic_id: clinicId })
    .select()
    .single();

  if (error) {
    console.error('submissions POST error:', error.message);
    return NextResponse.json({ error: '処理に失敗しました' }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PUT: update a submission by token
// NOTE: 患者が問診を入力する際はtokenベースで更新（認証不要）
export async function PUT(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '不正なリクエスト形式です' }, { status: 400 });
  }
  const { token, ...updates } = body;

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  // tokenに対応するsubmissionの存在確認 & clinic_id検証 & statusチェック（draft以外は変更不可）
  const { data: existing } = await supabase
    .from('ms_submissions')
    .select('id, status, clinic_id')
    .eq('token', token)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  }

  if (!existing.clinic_id) {
    return NextResponse.json({ error: 'Invalid submission: missing clinic' }, { status: 400 });
  }

  if (existing.status !== 'draft') {
    return NextResponse.json({ error: 'This submission has already been submitted and cannot be modified' }, { status: 403 });
  }

  // 許可フィールドのホワイトリスト（患者が更新可能なフィールドのみ）
  const allowedFields = [
    'patient_name', 'patient_furigana', 'birth_date', 'gender', 'phone', 'email',
    'postal_code', 'prefecture', 'city', 'address', 'building',
    'chief_complaints', 'onset_timing', 'pain_level', 'worsening_actions', 'relieving_actions',
    'medical_history', 'medications', 'allergies', 'occupation',
    'exercise_habits', 'sleep_quality', 'stress_level', 'referral_source',
    'consent_agreed', 'status', 'summary_text', 'updated_at',
  ];
  const sanitizedUpdates: Record<string, unknown> = {};
  for (const key of Object.keys(updates)) {
    if (allowedFields.includes(key)) {
      sanitizedUpdates[key] = updates[key];
    }
  }

  // If submitting, generate summary
  if (sanitizedUpdates.status === 'submitted') {
    // First fetch current data
    const { data: current } = await supabase
      .from('ms_submissions')
      .select('*')
      .eq('token', token)
      .single();

    const merged = { ...current, ...sanitizedUpdates };
    sanitizedUpdates.summary_text = generateSummary(merged);
    sanitizedUpdates.updated_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('ms_submissions')
    .update(sanitizedUpdates)
    .eq('token', token)
    .select()
    .single();

  if (error) {
    console.error('submissions PUT error:', error.message);
    return NextResponse.json({ error: '処理に失敗しました' }, { status: 500 });
  }

  // 提出時にcm_patientsと自動リンク（共通基盤のfind_or_create_patient使用）
  if (data && updates.status === 'submitted' && data.patient_name) {
    const clinicId = data.clinic_id;

    try {
      const result = await findOrCreatePatient(supabase, clinicId, {
        name: data.patient_name || '',
        furigana: data.patient_furigana || '',
        phone: data.phone || '',
        birth_date: data.birth_date || null,
        gender: data.gender || '男性',
        email: data.email || '',
        zipcode: data.zipcode || '',
        prefecture: data.prefecture || '',
        city: data.city || '',
        address: [data.prefecture, data.city, data.address, data.building].filter(Boolean).join(''),
        building: data.building || '',
        chief_complaint: (data.chief_complaints || []).join(', '),
        medical_history: data.medical_history || '',
        occupation: data.occupation || '',
        referral_source: data.referral_source || '',
      });

      if (result.patient_id) {
        await supabase
          .from('ms_submissions')
          .update({
            patient_id: result.patient_id,
            patient_match_type: result.match_type,
            patient_is_new: result.is_new,
          })
          .eq('id', data.id);
      }
    } catch {
      // 患者リンク失敗は問診提出をブロックしない
    }

    // LINE通知（スタッフへ）
    try {
      const baseUrl = req.nextUrl.origin;
      await fetch(`${baseUrl}/api/line-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: data.patient_name,
          chief_complaints: data.chief_complaints,
        }),
      });
    } catch (err) {
      console.error('LINE notify failed:', err instanceof Error ? err.message : err);
      // LINE通知失敗は問診提出をブロックしない
    }
  }

  return NextResponse.json(data);
}
