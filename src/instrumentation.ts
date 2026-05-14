const PLACEHOLDER_AUTH_SECRETS = new Set([
  "maintainr-dev-secret-change-in-production",
  "CHANGE_ME_IN_PRODUCTION_USE_openssl_rand_base64_32",
]);

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  const secret = process.env.AUTH_SECRET;
  if (!secret || PLACEHOLDER_AUTH_SECRETS.has(secret)) {
    throw new Error(
      "AUTH_SECRET is not set (or is still the placeholder). " +
        "Generate one with: openssl rand -base64 32"
    );
  }

  if (!process.env.NEXTAUTH_URL && !process.env.AUTH_URL) {
    console.warn(
      "[MAINTAINR] Neither NEXTAUTH_URL nor AUTH_URL is set. NextAuth will " +
        "infer the URL, which can produce wrong callback URLs behind a " +
        "reverse proxy. Set one explicitly."
    );
  }
}
