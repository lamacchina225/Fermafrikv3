import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { AppIcon } from "@/lib/app-icon";
import { ICON_VERSION, PWA_LOGO_PATH } from "@/lib/icon-url";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const size = Math.min(
    512,
    Math.max(32, parseInt(req.nextUrl.searchParams.get("size") ?? "192"))
  );
  const maskable = req.nextUrl.searchParams.get("maskable") === "1";

  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost ?? req.headers.get("host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const protocol =
    forwardedProto ??
    (host?.includes("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https");
  const logoUrl = host
    ? `${protocol}://${host}${PWA_LOGO_PATH}?v=${ICON_VERSION}`
    : `${PWA_LOGO_PATH}?v=${ICON_VERSION}`;

  return new ImageResponse(
    <AppIcon size={size} logoUrl={logoUrl} maskable={maskable} logoScale={1.55} />,
    { width: size, height: size }
  );
}
