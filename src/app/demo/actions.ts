"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { demoCredentials } from "./config";

export async function startDemo(): Promise<{ ok: boolean }> {
  const creds = demoCredentials();
  if (!creds) return { ok: false };
  try {
    // Sets the session cookie; the client navigates on { ok: true }.
    await signIn("credentials", { ...creds, redirect: false });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) return { ok: false };
    throw error;
  }
}
