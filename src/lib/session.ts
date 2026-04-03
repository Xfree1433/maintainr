import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

export async function requireOrg() {
  const session = await requireSession();
  const orgId = (session as any).organizationId as string | undefined;
  if (!orgId) {
    redirect("/login");
  }
  return { session, organizationId: orgId, role: (session as any).role as string };
}
