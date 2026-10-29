import 'dotenv/config';

export function readAuthConfig(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 bytes of random secret material.');
  }

  const expiresIn = Number(env.JWT_EXPIRES_IN_SECONDS ?? 900);
  if (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > 86400) {
    throw new Error('JWT_EXPIRES_IN_SECONDS must be an integer between 1 and 86400.');
  }

  return {
    secret: new TextEncoder().encode(secret),
    expiresIn,
    issuer: 'uf-esports-hub',
    audience: 'uf-esports-hub-api',
  };
}

// Fail at startup rather than issue tokens with a missing or weak default key.
export const authConfig = readAuthConfig();
