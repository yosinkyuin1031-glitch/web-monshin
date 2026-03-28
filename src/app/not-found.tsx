import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-6">
        <div className="text-5xl font-bold text-gray-300">404</div>
        <h1 className="text-xl font-bold" style={{ color: '#14252A' }}>
          ページが見つかりません
        </h1>
        <p className="text-gray-600 text-sm">
          お探しのページは存在しないか、移動した可能性があります。
          <br />
          URLをご確認ください。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/staff"
            className="px-6 py-3 text-white rounded-xl font-medium text-sm inline-block"
            style={{ backgroundColor: '#14252A' }}
          >
            ダッシュボードに戻る
          </Link>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl font-medium text-sm border-2 inline-block"
            style={{ borderColor: '#14252A', color: '#14252A' }}
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
