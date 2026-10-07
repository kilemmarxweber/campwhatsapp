import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const handler = toNextJsHandler(auth);
export const GET = handler.GET;

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (url.pathname.endsWith("/sign-up/email")) {
    let data: { email?: string; invitationId?: string } = {};
    try {
      data = await request.clone().json();
    } catch {
      return Response.json({ message: "Requête invalide" }, { status: 400 });
    }
    const invitation = data.invitationId
      ? await prisma.invitation.findFirst({
          where: {
            id: data.invitationId,
            email: data.email?.trim().toLowerCase(),
            status: "pending",
            expiresAt: { gt: new Date() },
          },
          select: { id: true },
        })
      : null;
    if (!invitation) {
      return Response.json(
        { message: "Un compte peut être créé uniquement avec une invitation valide." },
        { status: 403 },
      );
    }
  }
  return handler.POST(request);
}
