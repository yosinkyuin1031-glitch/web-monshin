'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div
          className="rounded-2xl p-8 text-white"
          style={{ backgroundColor: '#14252A' }}
        >
          <h1 className="text-2xl font-bold mb-2">WEB問診票</h1>
          <p className="text-sm opacity-80">
            整体院・鍼灸院向けデジタル問診システム
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push('/staff')}
            className="w-full py-4 rounded-xl text-white font-medium text-base"
            style={{ backgroundColor: '#14252A' }}
          >
            管理画面へ
          </button>
          <p className="text-xs text-gray-400">
            患者様は、受付で発行されたQRコードまたはリンクから問診票にアクセスしてください。
          </p>
        </div>
      </div>
    </div>
  );
}
