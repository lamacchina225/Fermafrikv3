"use client";

import { useEffect, useState } from "react";
import { CloudOff, Wifi } from "lucide-react";

export function ConnectivityBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const syncStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);

      if (online) {
        setShowBackOnline(true);
        window.setTimeout(() => setShowBackOnline(false), 3000);
      }
    };

    syncStatus();
    window.addEventListener("online", syncStatus);
    window.addEventListener("offline", syncStatus);

    return () => {
      window.removeEventListener("online", syncStatus);
      window.removeEventListener("offline", syncStatus);
    };
  }, []);

  if (isOnline && !showBackOnline) {
    return null;
  }

  return (
    <div
      className={`connectivity-banner ${
        isOnline ? "connectivity-banner--online" : "connectivity-banner--offline"
      }`}
      role="status"
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>Connexion retablie. Les donnees se synchronisent a nouveau.</span>
        </>
      ) : (
        <>
          <CloudOff className="h-4 w-4" />
          <span>Mode hors ligne actif. La consultation reste disponible sur les donnees deja chargees.</span>
        </>
      )}
    </div>
  );
}
