'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';

export default function LineMonshinPage() {
  const [creating, setCreating] = useState(false);
  const { showToast } = useToast();

  const handleStart = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/submissions', { method: 'POST' });
      const data = await res.json();
      if (data.token) {
        window.location.href = `/monshin/${data.token}`;
      }
    } catch {
      showToast('問診票の作成に失敗しました', 'error');
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#06C755]/10 to-white">
      <header className="bg-[#14252A] text-white py-4 px-4 text-center">
        <h1 className="text-lg font-bold">WEB問診票</h1>
        <p className="text-xs text-gray-300 mt-1">LINE からの問診入力</p>
      </header>

      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-3">📝</div>
          <h2 className="text-xl font-bold text-gray-800">ご来院前の問診入力</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            事前にWEB問診にご回答いただくと、
            <br />
            当日の待ち時間が短縮されスムーズに施術を受けられます。
          </p>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-2xl shadow-sm border p-5 space-y-3">
          <h3 className="font-bold text-sm text-gray-700">WEB問診のメリット</h3>
          {[
            { icon: '⏰', text: '待合室での記入時間が不要' },
            { icon: '📱', text: 'スマホから5分で入力完了' },
            { icon: '🔒', text: '個人情報は暗号化して安全に管理' },
            { icon: '💬', text: '事前に症状を伝えることで施術がスムーズ' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
              <span className="text-lg">{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleStart}
          disabled={creating}
          className="w-full py-4 bg-[#06C755] text-white rounded-2xl font-bold text-lg hover:bg-[#05b34c] transition shadow-lg disabled:opacity-50"
        >
          {creating ? '準備中...' : '問診に回答する'}
        </button>

        <p className="text-xs text-gray-400 text-center">
          所要時間：約5分 | ご来院の前日までにご回答ください
        </p>

        {/* FAQ */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <h3 className="font-bold text-xs text-gray-600">よくある質問</h3>
          <div className="text-xs text-gray-500 space-y-1.5">
            <p><span className="font-medium text-gray-700">Q. 途中で保存できますか？</span><br />
            はい。各ステップで自動保存されるため、途中で閉じても再開できます。</p>
            <p><span className="font-medium text-gray-700">Q. 2回目以降も入力が必要ですか？</span><br />
            初回のみご入力をお願いしています。症状に変化がある場合は再度ご入力ください。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
