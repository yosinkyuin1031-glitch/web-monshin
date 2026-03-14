import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateSummary } from '@/lib/types';
import { getClinicId } from '@/lib/clinic';
import { findBestMatch } from '@/lib/nameMatch';
import crypto from 'crypto';

// GET: list all submissions (for staff dashboard)
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status');
  const clinicId = getClinicId();

  let query = supabase
    .from('ms_submissions')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST: create a new submission (generates token)
export async function POST() {
  const token = crypto.randomBytes(16).toString('hex');

  const { data, error } = await supabase
    .from('ms_submissions')
    .insert({ token, status: 'draft', clinic_id: getClinicId() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PUT: update a submission by token
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { token, ...updates } = body;

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  // If submitting, generate summary
  if (updates.status === 'submitted') {
    // First fetch current data
    const { data: current } = await supabase
      .from('ms_submissions')
      .select('*')
      .eq('token', token)
      .single();

    const merged = { ...current, ...updates };
    updates.summary_text = generateSummary(merged);
    updates.updated_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('ms_submissions')
    .update(updates)
    .eq('token', token)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 提出時にcm_patientsと自動リンク
  if (data && updates.status === 'submitted' && data.patient_name) {
    const clinicId = getClinicId();

    // 全患者を取得してファジーマッチング
    const { data: allPatients } = await supabase
      .from('cm_patients')
      .select('id, name, furigana')
      .eq('clinic_id', clinicId);

    let patientId: string | null = null;
    const matched = allPatients ? findBestMatch(data.patient_name, allPatients) : null;

    if (matched) {
      // ファジーマッチで既存患者にリンク
      patientId = matched.id;
    } else {
      // 新規患者を自動作成
      const { data: newPatient } = await supabase
        .from('cm_patients')
        .insert({
          clinic_id: clinicId,
          name: data.patient_name || '',
          furigana: data.patient_furigana || '',
          birth_date: data.birth_date || null,
          gender: data.gender || '男性',
          phone: data.phone || '',
          email: data.email || '',
          address: [data.prefecture, data.city, data.address, data.building].filter(Boolean).join(''),
          zipcode: data.zipcode || '',
          prefecture: data.prefecture || '',
          city: data.city || '',
          building: data.building || '',
          chief_complaint: (data.chief_complaints || []).join(', '),
          medical_history: data.medical_history || '',
          occupation: data.occupation || '',
          referral_source: data.referral_source || '',
          notes: '',
          status: 'active',
        })
        .select('id')
        .single();

      if (newPatient) {
        patientId = newPatient.id;
      }
    }

    // ms_submissionsにpatient_idをリンク
    if (patientId) {
      await supabase
        .from('ms_submissions')
        .update({ patient_id: patientId })
        .eq('id', data.id);
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
    } catch {
      // LINE通知失敗は問診提出をブロックしない
    }
  }

  return NextResponse.json(data);
}
