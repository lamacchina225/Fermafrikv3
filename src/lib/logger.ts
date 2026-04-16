/**
 * Logger structuré minimaliste (JSON) compatible edge runtime.
 * Sortie : une ligne JSON par log → parseable par n'importe quel agrégateur.
 *
 * Si NEXT_PUBLIC_SENTRY_DSN / SENTRY_DSN sont définis et @sentry/nextjs est
 * installé, les erreurs sont capturées via le SDK Sentry (import optionnel).
 */

type Level = "debug" | "info" | "warn" | "error";

interface LogPayload {
  [key: string]: unknown;
}

function emit(level: Level, message: string, payload?: LogPayload) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(payload ?? {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

async function captureToSentry(error: unknown, payload?: LogPayload) {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  try {
    const Sentry = await import("@sentry/nextjs").catch(() => null);
    if (!Sentry) return;
    Sentry.captureException(error, { extra: payload });
  } catch {
    // Sentry module absent : on ignore silencieusement.
  }
}

export const logger = {
  debug: (msg: string, payload?: LogPayload) => emit("debug", msg, payload),
  info: (msg: string, payload?: LogPayload) => emit("info", msg, payload),
  warn: (msg: string, payload?: LogPayload) => emit("warn", msg, payload),
  error: (msg: string, error?: unknown, payload?: LogPayload) => {
    const errPayload = {
      ...(payload ?? {}),
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
    };
    emit("error", msg, errPayload);
    void captureToSentry(error ?? new Error(msg), payload);
  },
};
