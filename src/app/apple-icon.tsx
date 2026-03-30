import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          gap: 6,
          borderRadius: "36px",
        }}
      >
        <div style={{ fontSize: 90, lineHeight: 1 }}>🐔</div>
        <div
          style={{
            fontSize: 22,
            color: "white",
            fontWeight: "bold",
            letterSpacing: "-0.02em",
          }}
        >
          Ferm&apos;Afrik
        </div>
      </div>
    ),
    size
  );
}
