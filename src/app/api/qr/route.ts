import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClinicIdServer } from '@/lib/clinic-server';
import crypto from 'crypto';

// POST: generate a new QR code link (creates a draft submission)
export async function POST() {
  const token = crypto.randomBytes(16).toString('hex');
  const clinicId = await getClinicIdServer();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ms_submissions')
    .insert({ token, status: 'draft', clinic_id: clinicId })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ token: data.token, id: data.id });
}
