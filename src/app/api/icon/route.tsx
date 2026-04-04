import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { AppIcon } from "@/lib/app-icon";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const size = Math.min(
    512,
    Math.max(32, parseInt(req.nextUrl.searchParams.get("size") ?? "192"))
  );
  const maskable = req.nextUrl.searchParams.get("maskable") === "1";

  const baseUrl = new URL(req.url).origin;
  const logoUrl = `${baseUrl}/logo.png`;

  return new ImageResponse(
    <AppIcon size={size} logoUrl={logoUrl} maskable={maskable} />,
    { width: size, height: size }
  );
}
