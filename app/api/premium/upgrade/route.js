import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { upgradeToPremium } from '@/lib/premium';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { package: pkg } = await request.json();
    const duration = pkg === 'PREMIUM' ? 365 : 30; // default 365

    await upgradeToPremium(user.id, duration);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Upgrade error:', err);
    return NextResponse.json({ error: err.message || 'Gagal upgrade' }, { status: 500 });
  }
}
