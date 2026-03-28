import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClinicIdServer } from '@/lib/clinic-server';
import crypto from 'crypto';

// POST: generate a new QR code link (creates a draft submission)
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const token = crypto.randomBytes(16).toString('hex');
  const clinicId = await getClinicIdServer();

  const { data, error } = await supabase
    .from('ms_submissions')
    .insert({ token, status: 'draft', clinic_id: clinicId })
    .select()
    .single();

  if (error) {
    console.error('QR generation error:', error.message);
    return NextResponse.json({ error: 'QRコードの生成に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({ token: data.token, id: data.id });
}
