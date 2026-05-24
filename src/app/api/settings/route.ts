import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Public: get all site settings
export async function GET() {
  const configs = await prisma.siteSetting.findMany();
  const map: Record<string, string> = {};
  configs.forEach(c => { map[c.key] = c.value; });
  return NextResponse.json({ success: true, data: map });
}

// Admin: update site settings
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value } = body;
    if (!key) return NextResponse.json({ success: false, error: 'Missing key' }, { status: 400 });

    await prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
