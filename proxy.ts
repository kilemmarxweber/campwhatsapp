import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const SIGN_IN = "/auth/sign-in";

function isAuthPage(pathname: string) {
  return pathname.startsWith("/auth/");
}

function isProtected(pathname: string) {
  return (
    pathname.startsWith("/o/") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/organisations") ||
    pathname.startsWith("/admin")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/auth/")
  ) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const isAuthenticated = Boolean(session?.user);
  const mustChangePassword = session?.user
    ? Boolean(
        (
          await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { mustChangePassword: true },
          })
        )?.mustChangePassword,
      )
    : false;

  if (mustChangePassword && pathname !== SIGN_IN) {
    const url = new URL(SIGN_IN, request.url);
    if (isProtected(pathname)) {
      url.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
    }
    return NextResponse.redirect(url);
  }

  if (
    isAuthPage(pathname) &&
    isAuthenticated &&
    !mustChangePassword &&
    !pathname.startsWith("/auth/reset-password")
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isProtected(pathname) && !isAuthenticated) {
    const url = new URL(SIGN_IN, request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
