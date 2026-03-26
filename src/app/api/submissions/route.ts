import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { generateSummary } from '@/lib/types';
import { getClinicIdServer } from '@/lib/clinic-server';
import { findOrCreatePatient } from '@/lib/shared-patient';
import crypto from 'crypto';

// GET: list all submissions (for staff dashboard)
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status');
  const clinicId = await getClinicIdServer();
  const supabaseServer = await createClient();

  let query = supabaseServer
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
  const clinicId = await getClinicIdServer();
  const supabaseServer = await createClient();

  const { data, error } = await supabaseServer
    .from('ms_submissions')
    .insert({ token, status: 'draft', clinic_id: clinicId })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PUT: update a submission by token
// NOTE: 患者が問診を入力する際はtokenベースで更新（認証不要）
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
    } catch {
      // LINE通知失敗は問診提出をブロックしない
    }
  }

  return NextResponse.json(data);
}
