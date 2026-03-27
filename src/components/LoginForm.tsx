'use client';

import { useState, useEffect } from 'react';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<{ error: unknown }>;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: err } = await onLogin(email, password);
    if (err) {
      setError('メールアドレスまたはパスワードが正しくありません');
    }
    setLoading(false);
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setError('');

    const { error: err } = await onLogin('demo@clinicapps.jp', 'demo1234');
    if (err) {
      setError('デモアカウントへのログインに失敗しました。しばらくしてからお試しください。');
    }
    setDemoLoading(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true') {
      handleDemoLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-6">
        <div
          className="rounded-2xl p-8 text-white text-center"
          style={{ backgroundColor: '#14252A' }}
        >
          <h1 className="text-xl font-bold">WEB問診 管理画面</h1>
          <p className="text-sm opacity-80 mt-1">ログインしてください</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:border-transparent"
              placeholder="staff@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:border-transparent"
              placeholder="********"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-medium text-base disabled:opacity-50"
            style={{ backgroundColor: '#14252A' }}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>

          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '24px', paddingTop: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>デモ体験はこちら</p>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={demoLoading}
              className="w-full py-3 rounded-xl text-white font-semibold text-base disabled:opacity-50"
              style={{ backgroundColor: '#0ea5e9' }}
            >
              {demoLoading ? 'デモログイン中...' : 'デモアカウントでログイン'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
