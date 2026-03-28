import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const zipcode = req.nextUrl.searchParams.get('code');
  if (!zipcode) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 });
  }
  if (!/^\d{7}$/.test(zipcode)) {
    return NextResponse.json({ error: 'Invalid zipcode format' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return NextResponse.json({
        prefecture: result.address1,
        city: result.address2,
        address: result.address3,
      });
    }

    return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch address' }, { status: 500 });
  }
}
