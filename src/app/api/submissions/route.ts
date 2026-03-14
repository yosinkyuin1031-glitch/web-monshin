import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateSummary } from '@/lib/types';
import crypto from 'crypto';

// GET: list all submissions (for staff dashboard)
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status');

  let query = supabase
    .from('ms_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST: create a new submission (generates token)
export async function POST() {
  const token = crypto.randomBytes(16).toString('hex');

  const { data, error } = await supabase
    .from('ms_submissions')
    .insert({ token, status: 'draft' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PUT: update a submission by token
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { token, ...updates } = body;

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  // If submitting, generate summary
  if (updates.status === 'submitted') {
    // First fetch current data
    const { data: current } = await supabase
      .from('ms_submissions')
      .select('*')
      .eq('token', token)
      .single();

    const merged = { ...current, ...updates };
    updates.summary_text = generateSummary(merged);
    updates.updated_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('ms_submissions')
    .update(updates)
    .eq('token', token)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
