import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClinicIdServer } from '@/lib/clinic-server';
import { Submission } from '@/lib/types';

/**
 * CSV出力API
 * 全問診データをCSV形式でダウンロード
 */
export async function GET() {
  const clinicId = await getClinicIdServer();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ms_submissions')
    .select('*')
    .eq('clinic_id', clinicId)
    .in('status', ['submitted', 'reviewed'])
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const submissions = (data || []) as Submission[];

  // CSV header
  const headers = [
    '状態',
    '患者名',
    'フリガナ',
    '生年月日',
    '性別',
    '電話番号',
    'メール',
    '郵便番号',
    '都道府県',
    '市区町村',
    '番地',
    '建物',
    '主訴',
    '発症時期',
    '痛みの程度',
    '悪化する動作',
    '楽になる動作',
    '既往歴',
    '服薬',
    'アレルギー',
    '職業',
    '運動頻度',
    '睡眠',
    'ストレス',
    '来院きっかけ',
    '来院目的',
    'スタッフメモ',
    '受付日時',
  ];

  const statusMap: Record<string, string> = {
    draft: '下書き',
    submitted: '未確認',
    reviewed: '確認済み',
  };

  // Escape CSV value
  const escapeCSV = (val: string | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = submissions.map((sub) => [
    escapeCSV(statusMap[sub.status] || sub.status),
    escapeCSV(sub.patient_name),
    escapeCSV(sub.patient_furigana),
    escapeCSV(sub.birth_date),
    escapeCSV(sub.gender),
    escapeCSV(sub.phone),
    escapeCSV(sub.email),
    escapeCSV(sub.zipcode),
    escapeCSV(sub.prefecture),
    escapeCSV(sub.city),
    escapeCSV(sub.address),
    escapeCSV(sub.building),
    escapeCSV(sub.chief_complaints ? sub.chief_complaints.join('、') : ''),
    escapeCSV(sub.pain_onset),
    escapeCSV(sub.pain_severity ? String(sub.pain_severity) : ''),
    escapeCSV(sub.pain_aggravators),
    escapeCSV(sub.pain_relievers),
    escapeCSV(sub.medical_history),
    escapeCSV(sub.medications),
    escapeCSV(sub.allergies),
    escapeCSV(sub.occupation),
    escapeCSV(sub.exercise_frequency),
    escapeCSV(sub.sleep_quality),
    escapeCSV(sub.stress_level),
    escapeCSV(sub.referral_source),
    escapeCSV(sub.visit_motivation),
    escapeCSV(sub.notes),
    escapeCSV(
      new Date(sub.created_at).toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Tokyo',
      })
    ),
  ]);

  // BOM + header + rows
  const BOM = '\uFEFF';
  const csvContent = BOM + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const filename = `monshin_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
