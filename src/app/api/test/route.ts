import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Health check working',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
}