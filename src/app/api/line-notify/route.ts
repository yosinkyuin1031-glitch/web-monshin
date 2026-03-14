import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { patient_name, chief_complaints } = body;

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const adminUserId = process.env.LINE_ADMIN_USER_ID;

  if (!token || !adminUserId) {
    return NextResponse.json({ skipped: true, reason: 'LINE credentials not configured' });
  }

  const complaints = Array.isArray(chief_complaints)
    ? chief_complaints.join('、')
    : '未入力';

  const message = {
    type: 'text',
    text: `【新規問診票提出】\n\n${patient_name || '名前未入力'}様\n主訴: ${complaints}\n\nWEB問診管理画面をご確認ください。`,
  };

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: adminUserId,
        messages: [message],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
