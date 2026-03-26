'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import ProgressBar from '@/components/ProgressBar';
import {
  Submission,
  COMPLAINT_OPTIONS,
  EXERCISE_OPTIONS,
  SLEEP_OPTIONS,
  STRESS_OPTIONS,
  REFERRAL_OPTIONS,
} from '@/lib/types';

const STEP_LABELS = [
  '基本情報',
  '住所',
  '症状',
  '痛みの詳細',
  '既往歴',
  '生活習慣',
  '来院動機',
  '確認',
];

interface QuestionOptions {
  complaint_options: string[];
  exercise_options: string[];
  sleep_options: string[];
  stress_options: string[];
  referral_options: string[];
}

export default function MonshinPage() {
  const params = useParams();
  const token = params.token as string;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<Partial<Submission>>({
    chief_complaints: [],
    pain_severity: 5,
  });

  // Dynamic question options (fetched from API, falls back to hardcoded defaults)
  const [questionOptions, setQuestionOptions] = useState<QuestionOptions>({
    complaint_options: COMPLAINT_OPTIONS,
    exercise_options: EXERCISE_OPTIONS,
    sleep_options: SLEEP_OPTIONS,
    stress_options: STRESS_OPTIONS,
    referral_options: REFERRAL_OPTIONS,
  });

  useEffect(() => {
    // Fetch custom question options
    fetch('/api/questions')
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setQuestionOptions({
            complaint_options: data.complaint_options || COMPLAINT_OPTIONS,
            exercise_options: data.exercise_options || EXERCISE_OPTIONS,
            sleep_options: data.sleep_options || SLEEP_OPTIONS,
            stress_options: data.stress_options || STRESS_OPTIONS,
            referral_options: data.referral_options || REFERRAL_OPTIONS,
          });
        }
      })
      .catch(() => {
        // Use defaults on error
      });
  }, []);

  useEffect(() => {
    fetch(`/api/submissions/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          alert('問診票が見つかりませんでした');
          return;
        }
        if (data.status === 'submitted' || data.status === 'reviewed') {
          setSubmitted(true);
        }
        setForm(data);
        setLoading(false);
      })
      .catch(() => {
        alert('エラーが発生しました');
      });
  }, [token]);

  const updateField = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleComplaint = (c: string) => {
    setForm((prev) => {
      const current = prev.chief_complaints || [];
      if (current.includes(c)) {
        return { ...prev, chief_complaints: current.filter((x) => x !== c) };
      }
      return { ...prev, chief_complaints: [...current, c] };
    });
  };

  const saveProgress = useCallback(async () => {
    await fetch('/api/submissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...form }),
    });
  }, [token, form]);

  const nextStep = async () => {
    await saveProgress();
    setStep((s) => Math.min(s + 1, 8));
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch('/api/submissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form, status: 'submitted' }),
      });
      setSubmitted(true);
    } catch {
      alert('送信に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  const lookupZipcode = async () => {
    if (!form.zipcode || form.zipcode.length < 7) return;
    try {
      const res = await fetch(`/api/zipcode?code=${form.zipcode.replace('-', '')}`);
      const data = await res.json();
      if (data.prefecture) {
        setForm((prev) => ({
          ...prev,
          prefecture: data.prefecture,
          city: data.city,
          address: data.address,
        }));
      }
    } catch {
      // silently fail
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: '#14252A' }} />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">&#10003;</div>
          <h1 className="text-xl font-bold mb-2" style={{ color: '#14252A' }}>
            問診票を送信しました
          </h1>
          <p className="text-gray-600">
            ご記入ありがとうございます。<br />
            ご来院をお待ちしております。
          </p>
        </div>
      </div>
    );
  }

  const inputClass =
    'w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white py-4 px-4 text-center" style={{ backgroundColor: '#14252A' }}>
        <h1 className="text-lg font-bold">WEB問診票</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        <ProgressBar current={step} total={8} labels={STEP_LABELS} />

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold" style={{ color: '#14252A' }}>基本情報</h2>

            <div>
              <label className={labelClass}>お名前 <span className="text-red-500">*</span></label>
              <input
                type="text"
                className={inputClass}
                placeholder="山田 太郎"
                value={form.patient_name || ''}
                onChange={(e) => updateField('patient_name', e.target.value)}
                style={{ focusRingColor: '#14252A' } as React.CSSProperties}
              />
            </div>

            <div>
              <label className={labelClass}>フリガナ <span className="text-red-500">*</span></label>
              <input
                type="text"
                className={inputClass}
                placeholder="ヤマダ タロウ"
                value={form.patient_furigana || ''}
                onChange={(e) => updateField('patient_furigana', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>生年月日</label>
              <input
                type="date"
                className={inputClass}
                value={form.birth_date || ''}
                onChange={(e) => updateField('birth_date', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>性別</label>
              <div className="flex gap-3">
                {['男性', '女性', 'その他'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => updateField('gender', g)}
                    className={`flex-1 py-3 rounded-xl border text-center transition-all ${
                      form.gender === g
                        ? 'text-white border-transparent'
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}
                    style={form.gender === g ? { backgroundColor: '#14252A' } : {}}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>電話番号</label>
              <input
                type="tel"
                className={inputClass}
                placeholder="090-1234-5678"
                value={form.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>メールアドレス</label>
              <input
                type="email"
                className={inputClass}
                placeholder="example@mail.com"
                value={form.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 2: Address */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold" style={{ color: '#14252A' }}>住所</h2>

            <div>
              <label className={labelClass}>郵便番号</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={inputClass}
                  placeholder="1234567"
                  value={form.zipcode || ''}
                  onChange={(e) => updateField('zipcode', e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={7}
                />
                <button
                  type="button"
                  onClick={lookupZipcode}
                  className="px-4 py-3 text-white rounded-xl text-sm whitespace-nowrap"
                  style={{ backgroundColor: '#14252A' }}
                >
                  住所検索
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>都道府県</label>
              <input
                type="text"
                className={inputClass}
                placeholder="東京都"
                value={form.prefecture || ''}
                onChange={(e) => updateField('prefecture', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>市区町村</label>
              <input
                type="text"
                className={inputClass}
                placeholder="新宿区"
                value={form.city || ''}
                onChange={(e) => updateField('city', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>番地</label>
              <input
                type="text"
                className={inputClass}
                placeholder="西新宿1-2-3"
                value={form.address || ''}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>建物名・部屋番号</label>
              <input
                type="text"
                className={inputClass}
                placeholder="○○マンション 101号室"
                value={form.building || ''}
                onChange={(e) => updateField('building', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 3: Chief Complaints */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold" style={{ color: '#14252A' }}>
              お悩みの症状
            </h2>
            <p className="text-sm text-gray-500">当てはまるものをすべて選択してください</p>

            <div className="grid grid-cols-2 gap-3">
              {questionOptions.complaint_options.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleComplaint(c)}
                  className={`py-3 px-4 rounded-xl border text-sm transition-all ${
                    form.chief_complaints?.includes(c)
                      ? 'text-white border-transparent'
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                  style={
                    form.chief_complaints?.includes(c)
                      ? { backgroundColor: '#14252A' }
                      : {}
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Pain Details */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold" style={{ color: '#14252A' }}>
              痛みの詳細
            </h2>

            <div>
              <label className={labelClass}>いつ頃から気になりますか？</label>
              <input
                type="text"
                className={inputClass}
                placeholder="例：3ヶ月前から、先週から"
                value={form.pain_onset || ''}
                onChange={(e) => updateField('pain_onset', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>
                痛みの程度（1: 軽い 〜 10: 非常に強い）
              </label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">1</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={form.pain_severity || 5}
                  onChange={(e) => updateField('pain_severity', parseInt(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ accentColor: '#14252A' }}
                />
                <span className="text-sm text-gray-500">10</span>
                <span
                  className="text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center"
                  style={{ backgroundColor: '#14252A' }}
                >
                  {form.pain_severity || 5}
                </span>
              </div>
            </div>

            <div>
              <label className={labelClass}>どんな時に悪化しますか？</label>
              <textarea
                className={inputClass}
                rows={3}
                placeholder="例：長時間座っていると、朝起きた時"
                value={form.pain_aggravators || ''}
                onChange={(e) => updateField('pain_aggravators', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>どんな時に楽になりますか？</label>
              <textarea
                className={inputClass}
                rows={3}
                placeholder="例：お風呂に入ると、ストレッチすると"
                value={form.pain_relievers || ''}
                onChange={(e) => updateField('pain_relievers', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 5: Medical History */}
        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold" style={{ color: '#14252A' }}>
              既往歴・服薬・アレルギー
            </h2>

            <div>
              <label className={labelClass}>過去の手術・大きな病気</label>
              <textarea
                className={inputClass}
                rows={3}
                placeholder="例：2020年に腰のヘルニア手術、特になし"
                value={form.medical_history || ''}
                onChange={(e) => updateField('medical_history', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>現在服用中のお薬</label>
              <textarea
                className={inputClass}
                rows={3}
                placeholder="例：ロキソニン、血圧の薬、特になし"
                value={form.medications || ''}
                onChange={(e) => updateField('medications', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>アレルギー</label>
              <textarea
                className={inputClass}
                rows={3}
                placeholder="例：花粉、金属アレルギー、特になし"
                value={form.allergies || ''}
                onChange={(e) => updateField('allergies', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 6: Lifestyle */}
        {step === 6 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold" style={{ color: '#14252A' }}>
              生活習慣
            </h2>

            <div>
              <label className={labelClass}>ご職業</label>
              <input
                type="text"
                className={inputClass}
                placeholder="例：デスクワーク、看護師、主婦"
                value={form.occupation || ''}
                onChange={(e) => updateField('occupation', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>運動頻度</label>
              <div className="space-y-2">
                {questionOptions.exercise_options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => updateField('exercise_frequency', opt)}
                    className={`w-full py-3 px-4 rounded-xl border text-left transition-all ${
                      form.exercise_frequency === opt
                        ? 'text-white border-transparent'
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}
                    style={
                      form.exercise_frequency === opt
                        ? { backgroundColor: '#14252A' }
                        : {}
                    }
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>睡眠の状態</label>
              <div className="space-y-2">
                {questionOptions.sleep_options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => updateField('sleep_quality', opt)}
                    className={`w-full py-3 px-4 rounded-xl border text-left transition-all ${
                      form.sleep_quality === opt
                        ? 'text-white border-transparent'
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}
                    style={
                      form.sleep_quality === opt
                        ? { backgroundColor: '#14252A' }
                        : {}
                    }
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>ストレスの程度</label>
              <div className="space-y-2">
                {questionOptions.stress_options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => updateField('stress_level', opt)}
                    className={`w-full py-3 px-4 rounded-xl border text-left transition-all ${
                      form.stress_level === opt
                        ? 'text-white border-transparent'
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}
                    style={
                      form.stress_level === opt
                        ? { backgroundColor: '#14252A' }
                        : {}
                    }
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Referral */}
        {step === 7 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold" style={{ color: '#14252A' }}>
              来院のきっかけ
            </h2>

            <div>
              <label className={labelClass}>当院を知ったきっかけ</label>
              <div className="space-y-2">
                {questionOptions.referral_options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => updateField('referral_source', opt)}
                    className={`w-full py-3 px-4 rounded-xl border text-left transition-all ${
                      form.referral_source === opt
                        ? 'text-white border-transparent'
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}
                    style={
                      form.referral_source === opt
                        ? { backgroundColor: '#14252A' }
                        : {}
                    }
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>来院の目的・期待すること</label>
              <textarea
                className={inputClass}
                rows={4}
                placeholder="例：腰痛を根本的に改善したい、定期的なメンテナンスをしたい"
                value={form.visit_motivation || ''}
                onChange={(e) => updateField('visit_motivation', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 8: Confirmation */}
        {step === 8 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold" style={{ color: '#14252A' }}>
              入力内容の確認
            </h2>
            <p className="text-sm text-gray-500">
              内容をご確認の上、送信してください。
            </p>

            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 text-sm">
              <div>
                <span className="font-medium text-gray-500">お名前：</span>
                <span>{form.patient_name} ({form.patient_furigana})</span>
              </div>
              {form.birth_date && (
                <div>
                  <span className="font-medium text-gray-500">生年月日：</span>
                  <span>{form.birth_date}</span>
                </div>
              )}
              {form.gender && (
                <div>
                  <span className="font-medium text-gray-500">性別：</span>
                  <span>{form.gender}</span>
                </div>
              )}
              {form.phone && (
                <div>
                  <span className="font-medium text-gray-500">電話：</span>
                  <span>{form.phone}</span>
                </div>
              )}
              {form.email && (
                <div>
                  <span className="font-medium text-gray-500">メール：</span>
                  <span>{form.email}</span>
                </div>
              )}
              {(form.zipcode || form.prefecture) && (
                <div>
                  <span className="font-medium text-gray-500">住所：</span>
                  <span>
                    {form.zipcode && `〒${form.zipcode} `}
                    {form.prefecture}
                    {form.city}
                    {form.address}
                    {form.building && ` ${form.building}`}
                  </span>
                </div>
              )}
              {form.chief_complaints && form.chief_complaints.length > 0 && (
                <div>
                  <span className="font-medium text-gray-500">症状：</span>
                  <span>{form.chief_complaints.join('、')}</span>
                </div>
              )}
              {form.pain_onset && (
                <div>
                  <span className="font-medium text-gray-500">発症時期：</span>
                  <span>{form.pain_onset}</span>
                </div>
              )}
              {form.pain_severity && (
                <div>
                  <span className="font-medium text-gray-500">痛みの程度：</span>
                  <span>{form.pain_severity}/10</span>
                </div>
              )}
              {form.occupation && (
                <div>
                  <span className="font-medium text-gray-500">職業：</span>
                  <span>{form.occupation}</span>
                </div>
              )}
              {form.exercise_frequency && (
                <div>
                  <span className="font-medium text-gray-500">運動頻度：</span>
                  <span>{form.exercise_frequency}</span>
                </div>
              )}
              {form.sleep_quality && (
                <div>
                  <span className="font-medium text-gray-500">睡眠：</span>
                  <span>{form.sleep_quality}</span>
                </div>
              )}
              {form.stress_level && (
                <div>
                  <span className="font-medium text-gray-500">ストレス：</span>
                  <span>{form.stress_level}</span>
                </div>
              )}
              {form.referral_source && (
                <div>
                  <span className="font-medium text-gray-500">きっかけ：</span>
                  <span>{form.referral_source}</span>
                </div>
              )}
              {form.visit_motivation && (
                <div>
                  <span className="font-medium text-gray-500">来院目的：</span>
                  <span>{form.visit_motivation}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8 pb-8">
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="flex-1 py-4 rounded-xl border border-gray-300 text-gray-700 font-medium text-base"
            >
              戻る
            </button>
          )}
          {step < 8 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex-1 py-4 rounded-xl text-white font-medium text-base"
              style={{ backgroundColor: '#14252A' }}
            >
              次へ
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-4 rounded-xl text-white font-medium text-base disabled:opacity-50"
              style={{ backgroundColor: '#14252A' }}
            >
              {submitting ? '送信中...' : '送信する'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
