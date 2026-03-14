export interface Submission {
  id: string;
  token: string;
  status: 'draft' | 'submitted' | 'reviewed';
  patient_name: string | null;
  patient_furigana: string | null;
  birth_date: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  zipcode: string | null;
  prefecture: string | null;
  city: string | null;
  address: string | null;
  building: string | null;
  chief_complaints: string[];
  pain_onset: string | null;
  pain_severity: number | null;
  pain_aggravators: string | null;
  pain_relievers: string | null;
  medical_history: string | null;
  medications: string | null;
  allergies: string | null;
  occupation: string | null;
  exercise_frequency: string | null;
  sleep_quality: string | null;
  stress_level: string | null;
  referral_source: string | null;
  visit_motivation: string | null;
  summary_text: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const COMPLAINT_OPTIONS = [
  '頭痛',
  '首の痛み',
  '肩こり',
  '肩の痛み',
  '背中の痛み',
  '腰痛',
  '股関節の痛み',
  '膝の痛み',
  '足首の痛み',
  '手首・肘の痛み',
  'しびれ',
  '自律神経の乱れ',
  '疲労感・倦怠感',
  '不眠',
  '冷え性',
  'むくみ',
  '姿勢の改善',
  'その他',
];

export const EXERCISE_OPTIONS = [
  'ほぼ毎日',
  '週3〜4回',
  '週1〜2回',
  '月に数回',
  'ほとんどしない',
];

export const SLEEP_OPTIONS = [
  'よく眠れる',
  'まあまあ眠れる',
  '眠りが浅い',
  'なかなか寝付けない',
  '途中で目が覚める',
];

export const STRESS_OPTIONS = [
  'ほとんどない',
  '少しある',
  'かなりある',
  '非常に強い',
];

export const REFERRAL_OPTIONS = [
  'インターネット検索',
  'Googleマップ',
  'SNS（Instagram等）',
  '友人・知人の紹介',
  '家族の紹介',
  '通りがかり',
  'チラシ・広告',
  'その他',
];

export function generateSummary(data: Partial<Submission>): string {
  const lines: string[] = [];
  lines.push('【WEB問診票】');
  lines.push(`記入日: ${new Date().toLocaleDateString('ja-JP')}`);
  lines.push('');

  lines.push('■ 基本情報');
  if (data.patient_name) lines.push(`氏名: ${data.patient_name}${data.patient_furigana ? `（${data.patient_furigana}）` : ''}`);
  if (data.birth_date) {
    const bd = new Date(data.birth_date);
    const age = Math.floor((Date.now() - bd.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    lines.push(`生年月日: ${data.birth_date}（${age}歳）`);
  }
  if (data.gender) lines.push(`性別: ${data.gender}`);
  if (data.phone) lines.push(`電話: ${data.phone}`);
  if (data.email) lines.push(`メール: ${data.email}`);
  lines.push('');

  if (data.zipcode || data.prefecture) {
    lines.push('■ 住所');
    const addr = [data.zipcode ? `〒${data.zipcode}` : '', data.prefecture, data.city, data.address, data.building].filter(Boolean).join(' ');
    lines.push(addr);
    lines.push('');
  }

  if (data.chief_complaints && data.chief_complaints.length > 0) {
    lines.push('■ 主訴');
    lines.push(data.chief_complaints.join('、'));
    lines.push('');
  }

  if (data.pain_severity || data.pain_onset) {
    lines.push('■ 痛みの詳細');
    if (data.pain_onset) lines.push(`発症時期: ${data.pain_onset}`);
    if (data.pain_severity) lines.push(`痛みの程度: ${data.pain_severity}/10`);
    if (data.pain_aggravators) lines.push(`悪化する動作: ${data.pain_aggravators}`);
    if (data.pain_relievers) lines.push(`楽になる動作: ${data.pain_relievers}`);
    lines.push('');
  }

  lines.push('■ 既往歴・服薬');
  lines.push(`既往歴: ${data.medical_history || 'なし'}`);
  lines.push(`服薬中の薬: ${data.medications || 'なし'}`);
  lines.push(`アレルギー: ${data.allergies || 'なし'}`);
  lines.push('');

  lines.push('■ 生活習慣');
  if (data.occupation) lines.push(`職業: ${data.occupation}`);
  if (data.exercise_frequency) lines.push(`運動頻度: ${data.exercise_frequency}`);
  if (data.sleep_quality) lines.push(`睡眠: ${data.sleep_quality}`);
  if (data.stress_level) lines.push(`ストレス: ${data.stress_level}`);
  lines.push('');

  if (data.referral_source || data.visit_motivation) {
    lines.push('■ 来院動機');
    if (data.referral_source) lines.push(`知ったきっかけ: ${data.referral_source}`);
    if (data.visit_motivation) lines.push(`来院理由: ${data.visit_motivation}`);
  }

  return lines.join('\n');
}
