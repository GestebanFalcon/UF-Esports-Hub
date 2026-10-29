import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { userSchema } from '@uf-esports-hub/shared';
import { authConfig } from './config.js';

export async function createAccessToken(userId: string) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const accessToken = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setIssuer(authConfig.issuer)
    .setAudience(authConfig.audience)
    .setJti(randomUUID())
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + authConfig.expiresIn)
    .sign(authConfig.secret);

  return { accessToken, tokenType: 'Bearer' as const, expiresIn: authConfig.expiresIn };
}

export async function verifyAccessToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, authConfig.secret, {
    algorithms: ['HS256'],
    typ: 'JWT',
    issuer: authConfig.issuer,
    audience: authConfig.audience,
    requiredClaims: ['sub', 'iat', 'exp'],
    maxTokenAge: authConfig.expiresIn,
  });

  return userSchema.shape.id.parse(payload.sub);
}
