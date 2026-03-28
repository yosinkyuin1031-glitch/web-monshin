import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClinicIdServer } from '@/lib/clinic-server';
import { Submission } from '@/lib/types';

/** HTMLエスケープ */
function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * PDF出力API（サーバーサイドでHTMLベースのPDFを生成）
 * ブラウザのprint機能を利用する印刷用HTMLを返す
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const clinicId = await getClinicIdServer();
  const id = req.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'IDが必要です' }, { status: 400 });
  }

  // Fetch submission
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const query = supabase.from('ms_submissions').select('*').eq('clinic_id', clinicId);
  const { data, error } = await (isUUID ? query.eq('id', id) : query.eq('token', id)).single();

  if (error || !data) {
    return NextResponse.json({ error: '問診データが見つかりません' }, { status: 404 });
  }

  const sub = data as Submission;

  // Calculate age
  let ageText = '';
  if (sub.birth_date) {
    const bd = new Date(sub.birth_date);
    const age = Math.floor((Date.now() - bd.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    ageText = `（${age}歳）`;
  }

  const dateStr = new Date(sub.created_at).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });

  const addressParts = [
    sub.zipcode ? `〒${escapeHtml(sub.zipcode)}` : '',
    escapeHtml(sub.prefecture),
    escapeHtml(sub.city),
    escapeHtml(sub.address),
    escapeHtml(sub.building),
  ].filter(Boolean).join(' ');

  // Build print-friendly HTML (all user data escaped)
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>問診票 - ${escapeHtml(sub.patient_name) || '名前未入力'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif; font-size: 12px; color: #333; padding: 20mm 15mm; }
    h1 { font-size: 18px; text-align: center; margin-bottom: 8px; color: #14252A; }
    .meta { text-align: center; font-size: 11px; color: #666; margin-bottom: 20px; }
    .section { margin-bottom: 16px; }
    .section-title { font-size: 13px; font-weight: bold; color: #14252A; border-bottom: 2px solid #14252A; padding-bottom: 4px; margin-bottom: 8px; }
    .row { display: flex; padding: 4px 0; border-bottom: 1px solid #eee; }
    .label { width: 120px; font-weight: bold; color: #555; flex-shrink: 0; }
    .value { flex: 1; }
    .complaints { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
    .complaint-tag { background: #14252A; color: white; padding: 3px 10px; border-radius: 12px; font-size: 11px; }
    .summary-box { background: #f5f5f5; border: 1px solid #ddd; border-radius: 8px; padding: 12px; white-space: pre-wrap; font-size: 11px; line-height: 1.6; }
    @media print {
      body { padding: 10mm; }
      @page { margin: 10mm; size: A4; }
    }
  </style>
</head>
<body>
  <h1>WEB問診票</h1>
  <div class="meta">記入日時: ${escapeHtml(dateStr)}</div>

  <div class="section">
    <div class="section-title">基本情報</div>
    ${sub.patient_name ? `<div class="row"><div class="label">氏名</div><div class="value">${escapeHtml(sub.patient_name)}${sub.patient_furigana ? ` (${escapeHtml(sub.patient_furigana)})` : ''}</div></div>` : ''}
    ${sub.birth_date ? `<div class="row"><div class="label">生年月日</div><div class="value">${escapeHtml(sub.birth_date)}${ageText}</div></div>` : ''}
    ${sub.gender ? `<div class="row"><div class="label">性別</div><div class="value">${escapeHtml(sub.gender)}</div></div>` : ''}
    ${sub.phone ? `<div class="row"><div class="label">電話番号</div><div class="value">${escapeHtml(sub.phone)}</div></div>` : ''}
    ${sub.email ? `<div class="row"><div class="label">メール</div><div class="value">${escapeHtml(sub.email)}</div></div>` : ''}
  </div>

  ${addressParts ? `
  <div class="section">
    <div class="section-title">住所</div>
    <div class="row"><div class="label">住所</div><div class="value">${addressParts}</div></div>
  </div>
  ` : ''}

  ${sub.chief_complaints && sub.chief_complaints.length > 0 ? `
  <div class="section">
    <div class="section-title">主訴</div>
    <div class="complaints">
      ${sub.chief_complaints.map((c: string) => `<span class="complaint-tag">${escapeHtml(c)}</span>`).join('')}
    </div>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">痛みの詳細</div>
    ${sub.pain_onset ? `<div class="row"><div class="label">発症時期</div><div class="value">${escapeHtml(sub.pain_onset)}</div></div>` : ''}
    ${sub.pain_severity ? `<div class="row"><div class="label">痛みの程度</div><div class="value">${escapeHtml(String(sub.pain_severity))}/10</div></div>` : ''}
    ${sub.pain_aggravators ? `<div class="row"><div class="label">悪化する動作</div><div class="value">${escapeHtml(sub.pain_aggravators)}</div></div>` : ''}
    ${sub.pain_relievers ? `<div class="row"><div class="label">楽になる動作</div><div class="value">${escapeHtml(sub.pain_relievers)}</div></div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">既往歴・服薬</div>
    <div class="row"><div class="label">既往歴</div><div class="value">${escapeHtml(sub.medical_history) || 'なし'}</div></div>
    <div class="row"><div class="label">服薬</div><div class="value">${escapeHtml(sub.medications) || 'なし'}</div></div>
    <div class="row"><div class="label">アレルギー</div><div class="value">${escapeHtml(sub.allergies) || 'なし'}</div></div>
  </div>

  <div class="section">
    <div class="section-title">生活習慣</div>
    ${sub.occupation ? `<div class="row"><div class="label">職業</div><div class="value">${escapeHtml(sub.occupation)}</div></div>` : ''}
    ${sub.exercise_frequency ? `<div class="row"><div class="label">運動頻度</div><div class="value">${escapeHtml(sub.exercise_frequency)}</div></div>` : ''}
    ${sub.sleep_quality ? `<div class="row"><div class="label">睡眠</div><div class="value">${escapeHtml(sub.sleep_quality)}</div></div>` : ''}
    ${sub.stress_level ? `<div class="row"><div class="label">ストレス</div><div class="value">${escapeHtml(sub.stress_level)}</div></div>` : ''}
  </div>

  ${sub.referral_source || sub.visit_motivation ? `
  <div class="section">
    <div class="section-title">来院動機</div>
    ${sub.referral_source ? `<div class="row"><div class="label">きっかけ</div><div class="value">${escapeHtml(sub.referral_source)}</div></div>` : ''}
    ${sub.visit_motivation ? `<div class="row"><div class="label">来院目的</div><div class="value">${escapeHtml(sub.visit_motivation)}</div></div>` : ''}
  </div>
  ` : ''}

  ${sub.notes ? `
  <div class="section">
    <div class="section-title">スタッフメモ</div>
    <div class="summary-box">${escapeHtml(sub.notes)}</div>
  </div>
  ` : ''}

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
