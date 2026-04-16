"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const CHUNK_ERROR_RELOAD_KEY = "fermafrik:chunk-reload";

function isChunkLoadError(error: Error | null) {
  if (!error) return false;

  return (
    error.name === "ChunkLoadError" ||
    /ChunkLoadError|Loading chunk .* failed/i.test(error.message)
  );
}

async function resetRuntimeCaches() {
  if (typeof window === "undefined") return;

  try {
    const registrations = await navigator.serviceWorker?.getRegistrations?.();
    await Promise.all(
      (registrations ?? []).map(async (registration) => {
        try {
          await registration.update();
        } catch {
          // Best effort only.
        }
      })
    );
  } catch {
    // Ignore service worker errors and continue with cache cleanup.
  }

  if (!("caches" in window)) return;

  try {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((key) => caches.delete(key)));
  } catch {
    // Ignore cache cleanup failures and continue with reload.
  }
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);

    if (typeof window === "undefined" || !isChunkLoadError(error)) return;

    const hasReloaded = window.sessionStorage.getItem(CHUNK_ERROR_RELOAD_KEY) === "1";
    if (hasReloaded) return;

    window.sessionStorage.setItem(CHUNK_ERROR_RELOAD_KEY, "1");
    void resetRuntimeCaches().finally(() => {
      window.location.reload();
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const chunkError = isChunkLoadError(this.state.error);

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-8 text-center">
          <div className="text-4xl">!</div>
          <h2 className="text-lg font-semibold text-slate-800">
            Une erreur est survenue
          </h2>
          <p className="text-sm text-slate-500 max-w-md">
            {chunkError
              ? "Une ancienne version de l'application est encore en cache. La page va etre rechargee."
              : (this.state.error?.message ?? "Erreur inattendue. Rechargez la page.")}
          </p>
          <button
            onClick={() => {
              if (chunkError) {
                void resetRuntimeCaches().finally(() => {
                  window.location.reload();
                });
                return;
              }

              this.setState({ hasError: false, error: null });
            }}
            className="px-4 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors"
          >
            {chunkError ? "Recharger" : "Reessayer"}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
