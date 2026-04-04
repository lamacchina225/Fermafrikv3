"use client";

import { useEffect, useState } from "react";

const SPLASH_KEY = "fermafrik:splash:lastSeenAt";
const SPLASH_DURATION_MS = 1400;
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
      <div className="startup-screen__panel">
        <div className="startup-screen__brand-mark">FA</div>
        <div className="startup-screen__text">
          <p className="startup-screen__eyebrow">Gestion privee de la ferme</p>
          <h1 className="startup-screen__title">Ferm&apos;Afrik</h1>
          <p className="startup-screen__subtitle">
            Production, stock et suivi quotidien reunis dans une seule application.
          </p>
        </div>
        <div className="startup-screen__loader" />
      </div>
    </div>
  );
}
