import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { env } from "@/lib/env"; // Valide les env au démarrage

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isAuthPage =
    nextUrl.pathname === "/login" || nextUrl.pathname === "/register";
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isApiRegister = nextUrl.pathname === "/api/register";

  // Permettre les routes d'auth et l'inscription
  if (isApiAuthRoute || isApiRegister) {
    return NextResponse.next();
  }

  // Rediriger vers login si non connecté
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Rediriger vers dashboard si déjà connecté et sur page auth
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
