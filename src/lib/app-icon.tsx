type AppIconProps = {
  size: number;
  logoUrl?: string;
  maskable?: boolean;
  showWordmark?: boolean;
};

export function AppIcon({ size, logoUrl, maskable = false, showWordmark = false }: AppIconProps) {
  const resolvedLogoUrl = logoUrl === undefined ? null : (logoUrl ?? "/logo.png");
  const radius = maskable ? size * 0.26 : size * 0.22;
  const padding = maskable ? size * 0.18 : size * 0.12;
  const logoScale = showWordmark ? 0.9 : 1.75;
  const logoShift = showWordmark ? 0 : -size * 0.34;

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
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: `${radius * 0.7}px`,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255, 255, 255, 0.04)",
            boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.05)",
          }}
        >
          {resolvedLogoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={resolvedLogoUrl}
              alt="Ferm'Afrik"
              style={{
                width: `${logoScale * 100}%`,
                height: `${logoScale * 100}%`,
                objectFit: "contain",
                transform: `translateX(${logoShift}px)`,
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
    </div>
  );
}
