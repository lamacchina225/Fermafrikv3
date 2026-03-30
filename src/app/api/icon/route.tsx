import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const size = Math.min(
    512,
    Math.max(32, parseInt(req.nextUrl.searchParams.get("size") ?? "192"))
  );

  const baseUrl = new URL(req.url).origin;
  const logoUrl = `${baseUrl}/logo.png`;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#2d6a4f",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: size * 0.18 + "px",
          padding: size * 0.1 + "px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt="Ferm'Afrik"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
    ),
    { width: size, height: size }
  );
}
