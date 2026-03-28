'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-6">
        <div className="text-5xl text-red-500">!</div>
        <h1 className="text-xl font-bold" style={{ color: '#14252A' }}>
          エラーが発生しました
        </h1>
        <p className="text-gray-600 text-sm">
          申し訳ございません。予期しないエラーが発生しました。
          <br />
          しばらくしてからもう一度お試しください。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 text-white rounded-xl font-medium text-sm"
            style={{ backgroundColor: '#14252A' }}
          >
            もう一度試す
          </button>
          <a
            href="/staff"
            className="px-6 py-3 rounded-xl font-medium text-sm border-2"
            style={{ borderColor: '#14252A', color: '#14252A' }}
          >
            ダッシュボードに戻る
          </a>
          <a
            href="/"
            className="px-6 py-3 rounded-xl font-medium text-sm border border-gray-300 text-gray-600"
          >
            ホームに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
