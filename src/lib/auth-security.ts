import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { headers } from 'next/headers';
import { db } from './db';

const CHALLENGE_MIN_AGE_MS = 3_000;
const CHALLENGE_MAX_AGE_MS = 20 * 60 * 1000;

function securitySecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET 未配置');
  return secret;
}

function hmac(value: string) {
  return createHmac('sha256', securitySecret()).update(value).digest('hex');
}

export function hashSecurityIdentifier(scope: string, value: string) {
  return hmac(`${scope}:${value.trim().toLowerCase()}`);
}

export function getRequestIpFromHeaders(requestHeaders: Headers) {
  const forwarded = requestHeaders.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return (
    requestHeaders.get('x-real-ip') ||
    requestHeaders.get('cf-connecting-ip') ||
    'unknown'
  );
}

export async function getCurrentRequestIp() {
  return getRequestIpFromHeaders(await headers());
}

export function createRegistrationChallenge() {
  const issuedAt = Date.now();
  const nonce = randomUUID();
  const payload = `${issuedAt}.${nonce}`;
  return `${payload}.${hmac(`register:${payload}`)}`;
}

export function verifyRegistrationChallenge(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [issuedAtText, nonce, signature] = parts;
  const issuedAt = Number(issuedAtText);
  if (!Number.isFinite(issuedAt) || !nonce || !signature) return false;

  const age = Date.now() - issuedAt;
  if (age < CHALLENGE_MIN_AGE_MS || age > CHALLENGE_MAX_AGE_MS) return false;

  const expected = hmac(`register:${issuedAtText}.${nonce}`);
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

export async function consumeRateLimit({
  scope,
  identifier,
  limit,
  windowMs,
}: {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
}) {
  const key = `${scope}:${hashSecurityIdentifier(scope, identifier)}`;
  const cutoff = new Date(Date.now() - windowMs);
  const now = new Date();

  const rows = await db.$queryRaw<Array<{ count: number; windowStart: Date }>>`
    INSERT INTO "SecurityRateLimit" ("key", "count", "windowStart", "updatedAt")
    VALUES (${key}, 1, ${now}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "SecurityRateLimit"."windowStart" < ${cutoff} THEN 1
        ELSE "SecurityRateLimit"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "SecurityRateLimit"."windowStart" < ${cutoff} THEN ${now}
        ELSE "SecurityRateLimit"."windowStart"
      END,
      "updatedAt" = ${now}
    RETURNING "count", "windowStart"
  `;

  const result = rows[0];
  const allowed = result.count <= limit;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((result.windowStart.getTime() + windowMs - Date.now()) / 1000)
  );

  return { allowed, retryAfterSeconds };
}

export async function clearRateLimit(scope: string, identifier: string) {
  const key = `${scope}:${hashSecurityIdentifier(scope, identifier)}`;
  await db.securityRateLimit.delete({ where: { key } }).catch(() => undefined);
}

export async function verifyTurnstileToken(token: string, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip === 'unknown' ? '' : ip,
  });
  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    { method: 'POST', body, cache: 'no-store' }
  );
  if (!response.ok) return false;
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}
