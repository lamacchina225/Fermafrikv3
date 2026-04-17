type AppIconProps = {
  size: number;
  logoUrl?: string;
  maskable?: boolean;
  logoScale?: number;
};

export function AppIcon({
  size,
  logoUrl,
  maskable = false,
  logoScale = 1,
}: AppIconProps) {
  const resolvedLogoUrl = logoUrl === null ? null : (logoUrl ?? "/logo.png");
  const radius = maskable ? size * 0.26 : size * 0.22;
  const padding = maskable ? size * 0.14 : size * 0.06;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at 30% 25%, rgba(240, 195, 92, 0.28), transparent 32%), linear-gradient(135deg, #1a3a28 0%, #214632 52%, #10261b 100%)",
        borderRadius: `${radius}px`,
        padding: `${padding}px`,
        boxSizing: "border-box",
      }}
    >
      {resolvedLogoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={resolvedLogoUrl}
          alt="Ferm'Afrik"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transform: `scale(${logoScale})`,
            transformOrigin: "center",
          }}
        />
      ) : (
        <div
          style={{
            width: "68%",
            height: "68%",
            borderRadius: "34% 34% 42% 42%",
            background: "linear-gradient(180deg, #efc05d 0%, #d79c31 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#173121",
            fontSize: size * 0.24,
            fontWeight: 800,
            letterSpacing: "-0.06em",
            boxShadow: "0 12px 28px rgba(0, 0, 0, 0.18)",
          }}
        >
          FA
        </div>
      )}
    </div>
  );
}
