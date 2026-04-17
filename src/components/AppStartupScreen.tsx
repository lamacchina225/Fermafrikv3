"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SPLASH_KEY = "fermafrik:splash:lastSeenAt";
const SPLASH_COOLDOWN_MS = 1000 * 60 * 15;
const MIN_LOADING_MS = 1300;
const DONE_STEP_MS = 450;
const EXIT_STEP_MS = 1150;

type SplashStep = "idle" | "loading" | "done" | "exit";

export function AppStartupScreen() {
  const [step, setStep] = useState<SplashStep>("idle");

  useEffect(() => {
    const lastSeen = Number(window.sessionStorage.getItem(SPLASH_KEY) ?? "0");
    const shouldShow = Date.now() - lastSeen > SPLASH_COOLDOWN_MS;

    if (!shouldShow) {
      return;
    }

    setStep("loading");
    window.sessionStorage.setItem(SPLASH_KEY, String(Date.now()));

    let cancelled = false;
    const startedAt = Date.now();
    const timeouts: number[] = [];

    const markReady = () => {
      if (cancelled) return;

      const remaining = Math.max(0, MIN_LOADING_MS - (Date.now() - startedAt));
      timeouts.push(
        window.setTimeout(() => {
          if (cancelled) return;
          setStep("done");

          timeouts.push(
            window.setTimeout(() => {
              if (cancelled) return;
              setStep("exit");
            }, DONE_STEP_MS)
          );

          timeouts.push(
            window.setTimeout(() => {
              if (cancelled) return;
              setStep("idle");
            }, EXIT_STEP_MS)
          );
        }, remaining)
      );
    };

    if (document.readyState === "complete") {
      markReady();
    } else {
      window.addEventListener("load", markReady, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", markReady);
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
    };
  }, []);

  const visible = step !== "idle";

  return (
    <div
      aria-hidden={!visible}
      className={`startup-screen ${visible ? "startup-screen--visible" : ""} ${
        step === "done" ? "startup-screen--done" : ""
      } ${step === "exit" ? "startup-screen--exit" : ""}`}
    >
      <div className="startup-screen__card">
        <div className="startup-screen__logo-wrap">
          <svg className="startup-screen__progress-ring" viewBox="0 0 120 120" aria-hidden="true">
            <circle className="startup-screen__ring-bg" cx="60" cy="60" r="52" />
            <circle
              className={`startup-screen__ring ${
                step === "done" || step === "exit" ? "startup-screen__ring--complete" : ""
              }`}
              cx="60"
              cy="60"
              r="52"
            />
          </svg>

          <div className="startup-screen__logo">
            <Image
              src="/logo.png"
              alt="Ferm'Afrik - Smart Farming, Simplified"
              width={260}
              height={260}
              priority
              className="startup-screen__logo-img"
            />
          </div>

          <div
            className={`startup-screen__check ${
              step === "done" || step === "exit" ? "startup-screen__check--visible" : ""
            }`}
          >
            ✓
          </div>
        </div>

        <p className="startup-screen__brand">FERM&apos;AFRIK</p>
        <p className="startup-screen__slogan">Smart Farming, Simplified</p>
      </div>
    </div>
  );
}
