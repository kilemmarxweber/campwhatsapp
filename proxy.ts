import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const SIGN_IN = "/auth/sign-in";

function isAuthPage(pathname: string) {
  return pathname.startsWith("/auth/");
}

function isProtected(pathname: string) {
  return (
    pathname.startsWith("/o/") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
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

  if (isAuthPage(pathname) && isAuthenticated) {
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
