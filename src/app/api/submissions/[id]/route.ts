import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getClinicIdServer } from '@/lib/clinic-server';

// GET: get a submission by id or token
// tokenでのアクセスは患者向け（認証不要）、UUID形式はスタッフ向け（認証+clinic_idフィルタ必須）
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // UUID format check
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (isUUID) {
    // スタッフ向け: 認証+clinic_idフィルタ必須
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const clinicId = await getClinicIdServer();

    const { data, error } = await supabaseServer
      .from('ms_submissions')
      .select('*, patient:cm_patients(patient_number)')
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } else {
    // 患者向け: tokenベースのアクセス（認証不要）
    const { data, error } = await supabase
      .from('ms_submissions')
      .select('*, patient:cm_patients(patient_number)')
      .eq('token', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  }
}

// PATCH: update status or notes — スタッフ向け（認証+clinic_idフィルタ必須）
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const supabaseServer = await createClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const clinicId = await getClinicIdServer();
  const body = await req.json();

  // スタッフが更新可能なフィールドのみ許可
  const allowedPatchFields = ['status', 'notes', 'patient_id', 'patient_match_type'];
  const sanitized: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of Object.keys(body)) {
    if (allowedPatchFields.includes(key)) {
      sanitized[key] = body[key];
    }
  }

  const { data, error } = await supabaseServer
    .from('ms_submissions')
    .update(sanitized)
    .eq('id', id)
    .eq('clinic_id', clinicId)
    .select()
    .single();

  if (error) {
    console.error('submissions PATCH error:', error.message);
    return NextResponse.json({ error: '処理に失敗しました' }, { status: 500 });
  }

  return NextResponse.json(data);
}
