import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClinicIdServer } from '@/lib/clinic-server';
import {
  COMPLAINT_OPTIONS,
  EXERCISE_OPTIONS,
  SLEEP_OPTIONS,
  STRESS_OPTIONS,
  REFERRAL_OPTIONS,
} from '@/lib/types';

// Default question options (fallback when no DB record exists)
const DEFAULT_OPTIONS: Record<string, string[]> = {
  complaint: COMPLAINT_OPTIONS,
  exercise: EXERCISE_OPTIONS,
  sleep: SLEEP_OPTIONS,
  stress: STRESS_OPTIONS,
  referral: REFERRAL_OPTIONS,
};

// GET: get custom question options for the clinic
export async function GET() {
  const clinicId = await getClinicIdServer();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ms_question_options')
    .select('*')
    .eq('clinic_id', clinicId)
    .single();

  if (error || !data) {
    // Return defaults if no custom settings
    return NextResponse.json({
      clinic_id: clinicId,
      complaint_options: DEFAULT_OPTIONS.complaint,
      exercise_options: DEFAULT_OPTIONS.exercise,
      sleep_options: DEFAULT_OPTIONS.sleep,
      stress_options: DEFAULT_OPTIONS.stress,
      referral_options: DEFAULT_OPTIONS.referral,
      is_default: true,
    });
  }

  return NextResponse.json({
    ...data,
    is_default: false,
  });
}

// PUT: update custom question options
export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const clinicId = await getClinicIdServer();
  const body = await req.json();

  const updates = {
    clinic_id: clinicId,
    complaint_options: body.complaint_options || DEFAULT_OPTIONS.complaint,
    exercise_options: body.exercise_options || DEFAULT_OPTIONS.exercise,
    sleep_options: body.sleep_options || DEFAULT_OPTIONS.sleep,
    stress_options: body.stress_options || DEFAULT_OPTIONS.stress,
    referral_options: body.referral_options || DEFAULT_OPTIONS.referral,
    updated_at: new Date().toISOString(),
  };

  // Upsert: insert or update
  const { data, error } = await supabase
    .from('ms_question_options')
    .upsert(updates, { onConflict: 'clinic_id' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
