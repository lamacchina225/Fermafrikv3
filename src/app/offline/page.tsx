export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur">
        <p className="mb-3 text-sm uppercase tracking-[0.24em] text-amber-300">
          Ferm&apos;Afrik hors ligne
        </p>
        <h1 className="text-3xl font-semibold">Connexion indisponible</h1>
        <p className="mt-4 text-sm leading-6 text-slate-200">
          L&apos;application reste accessible avec les donnees deja chargees sur cet appareil.
          Reessayez des que le reseau revient pour synchroniser les nouvelles informations.
        </p>
      </div>
    </main>
  );
}
