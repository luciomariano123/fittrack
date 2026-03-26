import { NextResponse } from 'next/server';

// This webhook has been replaced by the Telegram webhook at /api/webhook/telegram
export async function POST() {
  return NextResponse.json(
    { error: 'Este webhook fue reemplazado por Telegram. Usá /api/webhook/telegram' },
    { status: 410 }
  );
}
