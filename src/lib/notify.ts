import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma/client";

interface NotifyParams {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  userId?: string;
  organizationId: string;
}

/**
 * Fire-and-forget notification creator.
 * Swallows errors so it never breaks business logic.
 */
export function notify(params: NotifyParams) {
  prisma.notification
    .create({
      data: {
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link ?? null,
        userId: params.userId ?? null,
        organizationId: params.organizationId,
      },
    })
    .catch(() => {});
}
