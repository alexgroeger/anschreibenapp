import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    message: 'Hello World!',
    status: 'success',
    timestamp: new Date().toISOString()
  })
}


