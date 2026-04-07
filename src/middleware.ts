import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isLoginPage = nextUrl.pathname === "/login";
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isDemoPage = nextUrl.pathname === "/demo";
  const role = req.auth?.user?.role;

  const isPublicAsset =
    nextUrl.pathname.startsWith("/_next/") ||
    nextUrl.pathname === "/favicon.ico" ||
    nextUrl.pathname === "/sw.js" ||
    nextUrl.pathname === "/offline" ||
    nextUrl.pathname.startsWith("/manifest") ||
    nextUrl.pathname.startsWith("/logo") ||
    nextUrl.pathname.startsWith("/apple-icon") ||
    /\.(?:svg|png|jpg|jpeg|gif|webp)$/.test(nextUrl.pathname);

  const isAllowedDemoApi =
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/api/icon");

  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (role === "demo") {
    if (nextUrl.pathname.startsWith("/api/") && !isAllowedDemoApi) {
      return new NextResponse(
        JSON.stringify({
          error: "Compte demo limite a la presentation de l'application.",
        }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        }
      );
    }

    if (!isLoginPage && !isDemoPage && !isPublicAsset) {
      return NextResponse.redirect(new URL("/demo", nextUrl));
    }
  }

  if (role && role !== "demo" && isDemoPage) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL(role === "demo" ? "/demo" : "/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
