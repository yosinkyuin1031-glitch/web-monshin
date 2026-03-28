import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClinicIdServer } from '@/lib/clinic-server';
import { searchPatientCandidates } from '@/lib/shared-patient';

// GET: 未リンク問診の患者候補を検索 — スタッフ向け（認証必須）
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const submissionId = req.nextUrl.searchParams.get('submissionId');
  if (!submissionId) {
    return NextResponse.json({ error: 'submissionId is required' }, { status: 400 });
  }

  const clinicId = await getClinicIdServer();

  // 問診データを取得
  const { data: submission } = await supabase
    .from('ms_submissions')
    .select('patient_name, patient_furigana, phone, birth_date')
    .eq('id', submissionId)
    .eq('clinic_id', clinicId)
    .single();

  if (!submission) {
    return NextResponse.json({ error: '問診データが見つかりません' }, { status: 404 });
  }

  // 患者候補を検索
  const candidates = await searchPatientCandidates(supabase, clinicId, {
    name: submission.patient_name || '',
    furigana: submission.patient_furigana || '',
    phone: submission.phone || '',
    birth_date: submission.birth_date || null,
  });

  return NextResponse.json({
    submission,
    candidates: candidates.sort((a, b) => b.confidence - a.confidence),
  });
}

// POST: 問診を手動で患者にリンク — スタッフ向け（認証必須）
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { submissionId, patientId } = await req.json();

  if (!submissionId || !patientId) {
    return NextResponse.json({ error: 'submissionId and patientId are required' }, { status: 400 });
  }

  const clinicId = await getClinicIdServer();

  // 患者がこのクリニックに属するか確認
  const { data: patient } = await supabase
    .from('cm_patients')
    .select('id, name')
    .eq('id', patientId)
    .eq('clinic_id', clinicId)
    .single();

  if (!patient) {
    return NextResponse.json({ error: '患者が見つかりません' }, { status: 404 });
  }

  // 問診にpatient_idをリンク
  const { error } = await supabase
    .from('ms_submissions')
    .update({
      patient_id: patientId,
      patient_match_type: 'manual',
    })
    .eq('id', submissionId)
    .eq('clinic_id', clinicId);

  if (error) {
    console.error('Patient link error:', error.message);
    return NextResponse.json({ error: '患者リンクの更新に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({ success: true, patient_name: patient.name });
}
