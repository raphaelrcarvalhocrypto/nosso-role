import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

const GENERIC_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const GENERIC_RATE_LIMIT_MAX_REQUESTS = 100;

function applyRateLimitHeaders(response: NextResponse, limitData: { limit: number; remaining: number; resetAt: number }) {
  response.headers.set('RateLimit-Limit', String(limitData.limit));
  response.headers.set('RateLimit-Remaining', String(limitData.remaining));
  response.headers.set('RateLimit-Reset', String(Math.floor(limitData.resetAt / 1000)));
}

function applySecurityAndCorsHeaders(response: NextResponse) {
  const appUrl = process.env.APP_URL;
  const isDev = process.env.NODE_ENV === 'development';

  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  response.headers.set('Access-Control-Allow-Origin', appUrl || '*');
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  // Strict Transport Security
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // In dev, Next.js needs extra script permissions for HMR and overlays.
  if (isDev) {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self' data: blob: http: https: ws: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: http: https:; style-src 'self' 'unsafe-inline' http: https:; img-src 'self' data: blob: http: https:; font-src 'self' data: http: https:; connect-src 'self' ws: wss: http: https:;"
    );
  } else {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; worker-src 'self' blob:; child-src 'self' blob:;"
    );
  }

  // X-Content-Type-Options
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options
  response.headers.set('X-Frame-Options', 'DENY');

  // X-XSS-Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  return response;
}

export async function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';

  if (request.method === 'OPTIONS') {
    return applySecurityAndCorsHeaders(new NextResponse(null, { status: 204 }));
  }

  if (!isDev) {
    const rateLimit = checkRateLimit(request, {
      windowMs: GENERIC_RATE_LIMIT_WINDOW_MS,
      max: GENERIC_RATE_LIMIT_MAX_REQUESTS,
      keyPrefix: 'middleware',
    });

    if (rateLimit.isLimited) {
      const limitedResponse = NextResponse.json(
        {
          error: 'Muitas requisições criadas a partir deste IP, por favor tente novamente após 15 minutos.',
        },
        { status: 429 }
      );
      applyRateLimitHeaders(limitedResponse, rateLimit);
      return applySecurityAndCorsHeaders(limitedResponse);
    }

    const response = NextResponse.next();
    applyRateLimitHeaders(response, rateLimit);
    applySecurityAndCorsHeaders(response);

    return response;
  }

  const response = NextResponse.next();
  applySecurityAndCorsHeaders(response);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next|favicon.ico).*)',
  ],
};
