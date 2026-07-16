import { NextResponse } from 'next/server';
import {
  consumeRateLimit,
  createRegistrationChallenge,
  getRequestIpFromHeaders,
} from '../../../../lib/auth-security';

export async function GET(request: Request) {
  const ip = getRequestIpFromHeaders(request.headers);
  const rateLimit = await consumeRateLimit({
    scope: 'register-challenge-ip',
    identifier: ip,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: '请求过于频繁，请稍后再试' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  return NextResponse.json(
    {
      challenge: createRegistrationChallenge(),
      turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
