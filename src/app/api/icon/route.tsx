import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const size = Math.min(
    512,
    Math.max(32, parseInt(req.nextUrl.searchParams.get("size") ?? "192"))
  );

  return new ImageResponse(
    (
      <div
        style={{
          background: "#2d6a4f",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: size > 64 ? 8 : 0,
          borderRadius: size * 0.18 + "px",
        }}
      >
        <div style={{ fontSize: size * 0.48, lineHeight: 1 }}>🐔</div>
        {size >= 128 && (
          <div
            style={{
              fontSize: size * 0.11,
              color: "white",
              fontWeight: "bold",
              letterSpacing: "-0.02em",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Ferm&apos;Afrik
          </div>
        )}
      </div>
    ),
    { width: size, height: size }
  );
}
