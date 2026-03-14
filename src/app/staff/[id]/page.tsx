'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Submission } from '@/lib/types';

export default function SubmissionDetail() {
  const params = useParams();
  const id = params.id as string;

  const [sub, setSub] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetch(`/api/submissions/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setSub(data);
        setNotes(data.notes || '');
        setLoading(false);
      });
  }, [id]);

  const markReviewed = async () => {
    const res = await fetch(`/api/submissions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'reviewed', notes }),
    });
    const data = await res.json();
    setSub(data);
    alert('確認済みにしました');
  };

  const saveNotes = async () => {
    await fetch(`/api/submissions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    alert('メモを保存しました');
  };

  const copySummary = () => {
    if (sub?.summary_text) {
      navigator.clipboard.writeText(sub.summary_text);
      alert('カルテ用テキストをコピーしました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: '#14252A' }} />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p>データが見つかりません</p>
      </div>
    );
  }

  const statusLabel = sub.status === 'draft' ? '下書き' : sub.status === 'submitted' ? '未確認' : '確認済み';
  const statusColor = sub.status === 'draft' ? 'bg-gray-100 text-gray-600' : sub.status === 'submitted' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <h3 className="font-bold text-sm" style={{ color: '#14252A' }}>{title}</h3>
      {children}
    </div>
  );

  const Field = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex flex-col sm:flex-row sm:gap-4">
        <span className="text-sm text-gray-500 sm:w-32 shrink-0">{label}</span>
        <span className="text-sm">{value}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white py-4 px-6" style={{ backgroundColor: '#14252A' }}>
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/staff" className="text-white hover:opacity-80">
              &larr; 戻る
            </Link>
            <h1 className="text-lg font-bold">問診票詳細</h1>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          {sub.status === 'submitted' && (
            <button
              onClick={markReviewed}
              className="px-5 py-2 text-white rounded-lg text-sm font-medium"
              style={{ backgroundColor: '#14252A' }}
            >
              確認済みにする
            </button>
          )}
          {sub.summary_text && (
            <button
              onClick={copySummary}
              className="px-5 py-2 border rounded-lg text-sm font-medium"
              style={{ borderColor: '#14252A', color: '#14252A' }}
            >
              カルテ用テキストをコピー
            </button>
          )}
        </div>

        <Section title="基本情報">
          <Field label="氏名" value={sub.patient_name} />
          <Field label="フリガナ" value={sub.patient_furigana} />
          <Field label="生年月日" value={sub.birth_date} />
          <Field label="性別" value={sub.gender} />
          <Field label="電話番号" value={sub.phone} />
          <Field label="メール" value={sub.email} />
        </Section>

        <Section title="住所">
          <Field label="郵便番号" value={sub.zipcode} />
          <Field
            label="住所"
            value={[sub.prefecture, sub.city, sub.address, sub.building].filter(Boolean).join(' ')}
          />
        </Section>

        <Section title="主訴">
          {sub.chief_complaints && sub.chief_complaints.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {sub.chief_complaints.map((c) => (
                <span
                  key={c}
                  className="px-3 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: '#14252A' }}
                >
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">未入力</p>
          )}
        </Section>

        <Section title="痛みの詳細">
          <Field label="発症時期" value={sub.pain_onset} />
          <Field label="痛みの程度" value={sub.pain_severity ? `${sub.pain_severity}/10` : null} />
          <Field label="悪化する動作" value={sub.pain_aggravators} />
          <Field label="楽になる動作" value={sub.pain_relievers} />
        </Section>

        <Section title="既往歴・服薬">
          <Field label="既往歴" value={sub.medical_history || 'なし'} />
          <Field label="服薬" value={sub.medications || 'なし'} />
          <Field label="アレルギー" value={sub.allergies || 'なし'} />
        </Section>

        <Section title="生活習慣">
          <Field label="職業" value={sub.occupation} />
          <Field label="運動頻度" value={sub.exercise_frequency} />
          <Field label="睡眠" value={sub.sleep_quality} />
          <Field label="ストレス" value={sub.stress_level} />
        </Section>

        <Section title="来院動機">
          <Field label="きっかけ" value={sub.referral_source} />
          <Field label="来院目的" value={sub.visit_motivation} />
        </Section>

        {/* Summary Text */}
        {sub.summary_text && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-sm mb-3" style={{ color: '#14252A' }}>
              カルテ用テキスト
            </h3>
            <pre className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap font-sans">
              {sub.summary_text}
            </pre>
          </div>
        )}

        {/* Staff Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-bold text-sm mb-3" style={{ color: '#14252A' }}>
            スタッフメモ
          </h3>
          <textarea
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2"
            rows={4}
            placeholder="メモを入力..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            onClick={saveNotes}
            className="mt-3 px-4 py-2 text-white rounded-lg text-sm"
            style={{ backgroundColor: '#14252A' }}
          >
            メモを保存
          </button>
        </div>

        <div className="text-xs text-gray-400 pb-8">
          作成: {new Date(sub.created_at).toLocaleString('ja-JP')} /
          更新: {new Date(sub.updated_at).toLocaleString('ja-JP')} /
          Token: {sub.token}
        </div>
      </div>
    </div>
  );
}
