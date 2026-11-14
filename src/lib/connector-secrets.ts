/**
 * Connector configs hold third-party credentials (database / ERP passwords,
 * API keys, tokens). They are only needed server-side, so every API response
 * masks them: at most the last 4 characters are shown, enough to tell keys
 * apart. On update, a secret sent back still masked keeps the stored value, so
 * a client that round-trips a read response can't overwrite the real secret
 * with the mask. Same behaviour as REPORTR's src/lib/connectors/secrets.ts.
 */

export const SECRET_MASK = "••••";

const SECRET_KEY = /key|secret|password|passwd|pwd|token|credential/i;
// user:password@ inside a connection-string style URL
const URL_PASSWORD = /(\/\/[^/:@\s]*:)[^/@\s]+@/;

type Obj = Record<string, unknown>;

function maskSecret(value: unknown): unknown {
  if (value === null || value === undefined || value === "") return value;
  if (typeof value === "string" && value.length >= 12) return SECRET_MASK + value.slice(-4);
  return SECRET_MASK;
}

function maskValue(key: string, value: unknown): unknown {
  if (SECRET_KEY.test(key)) return maskSecret(value);
  if (value && typeof value === "object" && !Array.isArray(value)) return maskObject(value as Obj);
  if (typeof value === "string") return value.replace(URL_PASSWORD, `$1${SECRET_MASK}@`);
  return value;
}

function maskObject(obj: Obj): Obj {
  const out: Obj = {};
  for (const [key, value] of Object.entries(obj)) out[key] = maskValue(key, value);
  return out;
}

function parseObject(config: string): Obj | null {
  try {
    const parsed = JSON.parse(config);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Masked copy of a stored connector config string. Unparseable configs become "{}"; null stays null. */
export function maskConnectorConfig(config: string | null): string | null {
  if (config === null || config === undefined) return config;
  const parsed = parseObject(config);
  return JSON.stringify(parsed ? maskObject(parsed) : {});
}

export function maskConnector<T extends { config: string | null }>(connector: T): T {
  return { ...connector, config: maskConnectorConfig(connector.config) };
}

/** Any value that is (still) the mask of what is stored keeps the stored value. */
function restoreObject(next: Obj, prev: Obj): Obj {
  const out: Obj = { ...next };
  for (const [key, value] of Object.entries(next)) {
    if (!(key in prev)) continue;
    const old = prev[key];
    if (SECRET_KEY.test(key) && typeof value === "string" && value.startsWith(SECRET_MASK)) {
      out[key] = old;
    } else if (
      value && typeof value === "object" && !Array.isArray(value) &&
      old && typeof old === "object" && !Array.isArray(old)
    ) {
      out[key] = restoreObject(value as Obj, old as Obj);
    } else if (typeof value === "string" && value.includes(SECRET_MASK) && value === maskValue(key, old)) {
      // e.g. a connection string whose password part came back masked
      out[key] = old;
    }
  }
  return out;
}

/** For updates: secrets still carrying the mask keep their stored value. */
export function restoreMaskedSecrets(incoming: string, stored: string | null): string {
  const next = parseObject(incoming);
  const prev = stored ? parseObject(stored) : null;
  if (!next || !prev) return incoming;
  return JSON.stringify(restoreObject(next, prev));
}
