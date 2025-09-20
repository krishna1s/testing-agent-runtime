import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = {
      status: 'healthy',
      timestamp: new Date(),
      version: '1.0.0',
      opencode_available: false // We'll fix this later
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        timestamp: new Date(),
        version: '1.0.0',
        opencode_available: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}