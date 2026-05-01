import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Esta rota é apenas para demonstrar a configuração do rate limit
  // Na prática, o rate limiting será aplicado via middleware
  return NextResponse.json({ 
    message: 'Rate limiting configurado com sucesso!',
    windowMs: '15 minutos',
    maxRequests: 100
  });
}