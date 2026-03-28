'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import LoginForm from '@/components/LoginForm';
import { useToast } from '@/components/Toast';

interface QuestionOptions {
  complaint_options: string[];
  exercise_options: string[];
  sleep_options: string[];
  stress_options: string[];
  referral_options: string[];
  is_default?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  complaint_options: 'お悩みの症状',
  exercise_options: '運動頻度',
  sleep_options: '睡眠の状態',
  stress_options: 'ストレスの程度',
  referral_options: '来院のきっかけ',
};

export default function SettingsPage() {
  const { user, loading: authLoading, signIn } = useAuth();
  const { showToast } = useToast();
  const [options, setOptions] = useState<QuestionOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newItems, setNewItems] = useState<Record<string, string>>({
    complaint_options: '',
    exercise_options: '',
    sleep_options: '',
    stress_options: '',
    referral_options: '',
  });

  useEffect(() => {
    if (!user) return;
    fetch('/api/questions')
      .then((r) => r.json())
      .then((data) => {
        setOptions(data);
        setLoading(false);
      });
  }, [user]);

  const addItem = (category: keyof QuestionOptions) => {
    const value = newItems[category]?.trim();
    if (!value || !options) return;
    const current = options[category] as string[];
    if (current.includes(value)) return;
    setOptions({ ...options, [category]: [...current, value] });
    setNewItems({ ...newItems, [category]: '' });
  };

  const removeItem = (category: keyof QuestionOptions, index: number) => {
    if (!options) return;
    const current = [...(options[category] as string[])];
    current.splice(index, 1);
    setOptions({ ...options, [category]: current });
  };

  const moveItem = (category: keyof QuestionOptions, index: number, direction: 'up' | 'down') => {
    if (!options) return;
    const current = [...(options[category] as string[])];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= current.length) return;
    [current[index], current[newIndex]] = [current[newIndex], current[index]];
    setOptions({ ...options, [category]: current });
  };

  const handleSave = async () => {
    if (!options) return;
    setSaving(true);
    try {
      const res = await fetch('/api/questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      if (res.ok) {
        showToast('設定を保存しました', 'success');
      } else {
        showToast('保存に失敗しました', 'error');
      }
    } catch {
      showToast('保存に失敗しました', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#14252A' }} />
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={signIn} />;
  }

  if (loading || !options) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#14252A' }} />
      </div>
    );
  }

  const categories = ['complaint_options', 'exercise_options', 'sleep_options', 'stress_options', 'referral_options'] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white py-4 px-6" style={{ backgroundColor: '#14252A' }}>
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/staff" className="text-white hover:opacity-80">
              &larr; 戻る
            </Link>
            <h1 className="text-lg font-bold">問診項目カスタマイズ</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-white rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ color: '#14252A' }}
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {options.is_default && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-xl p-4">
            現在はデフォルトの設問を使用しています。カスタマイズして保存すると、この院専用の設問として保存されます。
          </div>
        )}

        {categories.map((category) => (
          <div key={category} className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-sm mb-4" style={{ color: '#14252A' }}>
              {CATEGORY_LABELS[category]}
            </h3>

            <div className="space-y-2 mb-4">
              {(options[category] as string[]).map((item, index) => (
                <div
                  key={`${category}-${index}`}
                  className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
                >
                  <span className="text-xs text-gray-400 w-6">{index + 1}</span>
                  <span className="flex-1 text-sm">{item}</span>
                  <button
                    onClick={() => moveItem(category, index, 'up')}
                    className="text-gray-400 hover:text-gray-600 text-xs px-1"
                    disabled={index === 0}
                  >
                    &#9650;
                  </button>
                  <button
                    onClick={() => moveItem(category, index, 'down')}
                    className="text-gray-400 hover:text-gray-600 text-xs px-1"
                    disabled={index === (options[category] as string[]).length - 1}
                  >
                    &#9660;
                  </button>
                  <button
                    onClick={() => removeItem(category, index)}
                    className="text-red-400 hover:text-red-600 text-sm px-1"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newItems[category] || ''}
                onChange={(e) =>
                  setNewItems({ ...newItems, [category]: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addItem(category);
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                placeholder="新しい項目を追加..."
              />
              <button
                onClick={() => addItem(category)}
                className="px-4 py-2 text-white rounded-lg text-sm"
                style={{ backgroundColor: '#14252A' }}
              >
                追加
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
