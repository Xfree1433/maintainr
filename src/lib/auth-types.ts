import { Role } from "@/generated/prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    organizationId: string;
    organizationName: string;
    role: Role;
  }

  interface JWT {
    id?: string;
    organizationId?: string;
    organizationName?: string;
    role?: Role;
  }
}
