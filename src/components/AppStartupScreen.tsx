"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SPLASH_KEY = "fermafrik:splash:lastSeenAt";
const SPLASH_DURATION_MS = 2200;
const SPLASH_COOLDOWN_MS = 1000 * 60 * 15;

export function AppStartupScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const lastSeen = Number(window.sessionStorage.getItem(SPLASH_KEY) ?? "0");
    const shouldShow = Date.now() - lastSeen > SPLASH_COOLDOWN_MS;

    if (!shouldShow) {
      return;
    }

    setVisible(true);
    window.sessionStorage.setItem(SPLASH_KEY, String(Date.now()));

    const timeout = window.setTimeout(() => {
      setVisible(false);
    }, SPLASH_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`startup-screen ${visible ? "startup-screen--visible" : ""}`}
    >
      <div className="startup-screen__card">
        <div className="startup-screen__logo-wrap">
          <div className="startup-screen__ring" />
          <div className="startup-screen__logo">
            <Image
              src="/logo.png"
              alt="Ferm'Afrik — Smart Farming, Simplified"
              width={180}
              height={180}
              priority
              className="startup-screen__logo-img"
            />
            <span className="startup-screen__shine" aria-hidden="true" />
          </div>
        </div>
        <div className="startup-screen__progress" aria-hidden="true">
          <span className="startup-screen__progress-bar" />
        </div>
      </div>
    </div>
  );
}
