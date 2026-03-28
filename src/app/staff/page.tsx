'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Submission } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import LoginForm from '@/components/LoginForm';
import { useToast } from '@/components/Toast';

export default function StaffDashboard() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const { showToast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const url = filter === 'all' ? '/api/submissions' : `/api/submissions?status=${filter}`;
        const res = await fetch(url);
        if (!res.ok) {
          showToast('問診データの取得に失敗しました', 'error');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setSubmissions(data);
      } catch {
        showToast('問診データの取得に失敗しました', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [filter, user]);

  const generateQR = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/qr', { method: 'POST' });
      const data = await res.json();
      const baseUrl = window.location.origin;
      setQrUrl(`${baseUrl}/monshin/${data.token}`);
    } catch {
      showToast('QRコードの生成に失敗しました', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCsvExport = () => {
    window.open('/api/export/csv', '_blank');
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            下書き
          </span>
        );
      case 'submitted':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            未確認
          </span>
        );
      case 'reviewed':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            確認済み
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Client-side filtering by name and date range
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // Name search
      if (searchName.trim()) {
        const query = searchName.trim().toLowerCase();
        const name = (sub.patient_name || '').toLowerCase();
        const furigana = (sub.patient_furigana || '').toLowerCase();
        if (!name.includes(query) && !furigana.includes(query)) {
          return false;
        }
      }
      // Date range filter
      if (dateFrom) {
        const subDate = new Date(sub.created_at).toISOString().slice(0, 10);
        if (subDate < dateFrom) return false;
      }
      if (dateTo) {
        const subDate = new Date(sub.created_at).toISOString().slice(0, 10);
        if (subDate > dateTo) return false;
      }
      return true;
    });
  }, [submissions, searchName, dateFrom, dateTo]);

  // Show spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: '#14252A' }}
        />
      </div>
    );
  }

  // Show login form if not authenticated
  if (!user) {
    return <LoginForm onLogin={signIn} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white py-4 px-6" style={{ backgroundColor: '#14252A' }}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-lg font-bold">WEB問診 管理画面</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/staff/settings"
              className="px-4 py-2 bg-white/20 border border-white/40 rounded-lg text-sm font-medium text-white hover:bg-white/30"
            >
              設問カスタマイズ
            </Link>
            <button
              onClick={handleCsvExport}
              className="px-4 py-2 bg-white/20 border border-white/40 rounded-lg text-sm font-medium text-white hover:bg-white/30"
            >
              CSV出力
            </button>
            <button
              onClick={generateQR}
              disabled={generating}
              className="px-4 py-2 bg-white rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ color: '#14252A' }}
            >
              {generating ? '生成中...' : 'QRコード生成'}
            </button>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-white/20 border border-white/40 rounded-lg text-sm font-medium text-white hover:bg-white/30"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* QR Code Modal */}
        {qrUrl && (
          <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold" style={{ color: '#14252A' }}>
                新しいQRコード
              </h2>
              <button
                onClick={() => {
                  setQrUrl(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                &times;
              </button>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="bg-white p-4 border rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
                  alt="QR Code"
                  width={200}
                  height={200}
                />
              </div>
              <div className="flex-1 space-y-3">
                <p className="text-sm text-gray-600">
                  患者様にこのQRコードを読み取っていただくと、問診票の入力が始まります。
                </p>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">リンクURL</p>
                  <p className="text-sm break-all font-mono">{qrUrl}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(qrUrl);
                    showToast('URLをコピーしました', 'success');
                  }}
                  className="px-4 py-2 text-white rounded-lg text-sm"
                  style={{ backgroundColor: '#14252A' }}
                >
                  URLをコピー
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Count Badges */}
        <div className="flex gap-4 mb-4 flex-wrap">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="text-sm font-medium text-yellow-700">未確認</span>
            <span className="bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {submissions.filter((s) => s.status === 'submitted').length}件
            </span>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="text-sm font-medium text-green-700">確認済み</span>
            <span className="bg-green-200 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {submissions.filter((s) => s.status === 'reviewed').length}件
            </span>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">下書き</span>
            <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {submissions.filter((s) => s.status === 'draft').length}件
            </span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'all', label: 'すべて' },
            { key: 'submitted', label: '未確認' },
            { key: 'reviewed', label: '確認済み' },
            { key: 'draft', label: '下書き' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === tab.key
                  ? 'text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
              style={filter === tab.key ? { backgroundColor: '#14252A' } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Date Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="患者名で検索..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ focusRingColor: '#14252A' } as React.CSSProperties}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2"
              placeholder="開始日"
            />
            <span className="text-gray-400 text-sm">~</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2"
              placeholder="終了日"
            />
            {(searchName || dateFrom || dateTo) && (
              <button
                onClick={() => { setSearchName(''); setDateFrom(''); setDateTo(''); }}
                className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100"
              >
                クリア
              </button>
            )}
          </div>
        </div>

        {/* Submissions Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ borderColor: '#14252A' }}
            />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {submissions.length === 0 ? '問診票がありません' : '条件に一致する問診票がありません'}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* モバイル横スクロールヒント */}
            <div className="md:hidden flex items-center gap-1 px-4 py-2 bg-blue-50 text-blue-600 text-xs">
              <span>&larr;&rarr;</span>
              <span>横にスクロールできます</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                      状態
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                      患者番号
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                      患者名
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                      主訴
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                      受付日時
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((sub) => (
                    <tr
                      key={sub.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">{statusBadge(sub.status)}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-400">
                        {sub.patient?.patient_number
                          ? `P${String(sub.patient.patient_number).padStart(4, '0')}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {sub.patient_name || '（未入力）'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {sub.chief_complaints && sub.chief_complaints.length > 0
                          ? sub.chief_complaints.slice(0, 3).join('、')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDate(sub.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/staff/${sub.id}`}
                          className="text-sm font-medium hover:underline"
                          style={{ color: '#14252A' }}
                        >
                          詳細
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
