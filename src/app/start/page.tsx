'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StartPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const createAndRedirect = async () => {
      try {
        const res = await fetch('/api/qr', { method: 'POST' });
        if (!res.ok) {
          setError('問診票の作成に失敗しました。もう一度お試しください。');
          return;
        }
        const data = await res.json();
        router.replace(`/monshin/${data.token}`);
      } catch {
        setError('通信エラーが発生しました。もう一度お試しください。');
      }
    };
    createAndRedirect();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[#14252A] text-white rounded-xl font-medium"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#14252A] mx-auto"></div>
        <p className="text-gray-600">問診票を準備しています...</p>
      </div>
    </div>
  );
}
