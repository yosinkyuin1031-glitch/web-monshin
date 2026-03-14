'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Submission } from '@/lib/types';

export default function StaffDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      const url = filter === 'all' ? '/api/submissions' : `/api/submissions?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setSubmissions(data);
      setLoading(false);
    };
    fetchSubmissions();
  }, [filter]);

  const generateQR = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/qr', { method: 'POST' });
      const data = await res.json();
      const baseUrl = window.location.origin;
      setQrUrl(`${baseUrl}/monshin/${data.token}`);
    } catch {
      alert('QRコードの生成に失敗しました');
    } finally {
      setGenerating(false);
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white py-4 px-6" style={{ backgroundColor: '#14252A' }}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-lg font-bold">WEB問診 管理画面</h1>
          <button
            onClick={generateQR}
            disabled={generating}
            className="px-4 py-2 bg-white rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ color: '#14252A' }}
          >
            {generating ? '生成中...' : 'QRコード生成'}
          </button>
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
                    alert('URLをコピーしました');
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

        {/* Submissions Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ borderColor: '#14252A' }}
            />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            問診票がありません
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      状態
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      患者名
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">
                      主訴
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">
                      受付日時
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr
                      key={sub.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">{statusBadge(sub.status)}</td>
                      <td className="px-4 py-3 font-medium">
                        {sub.patient_name || '（未入力）'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                        {sub.chief_complaints && sub.chief_complaints.length > 0
                          ? sub.chief_complaints.slice(0, 3).join('、')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
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
