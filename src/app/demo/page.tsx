import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  HeartPulse,
  LogOut,
  Layers3,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { auth, signOut } from "@/lib/auth";

const modules = [
  {
    title: "Suivi quotidien",
    text: "Enregistrez la production, l'aliment, les incidents et la mortalite sans perdre de temps.",
    icon: ClipboardCheck,
  },
  {
    title: "Vue d'ensemble",
    text: "Reperez rapidement ce qui avance bien et ce qui demande une action.",
    icon: Layers3,
  },
  {
    title: "Rapports utiles",
    text: "Retrouvez l'historique, les exports et les tendances dans un format simple a relire.",
    icon: FileText,
  },
  {
    title: "Suivi sanitaire",
    text: "Gardez une trace claire des soins et traitements pour mieux piloter l'elevage.",
    icon: ShieldCheck,
  },
];

const benefits = [
  "Vous voyez l'essentiel en un coup d'oeil, sans chercher dans plusieurs fichiers.",
  "Votre equipe saisit les informations du jour dans un parcours simple et rapide.",
  "Vous suivez la production, les ventes et les depenses au meme endroit.",
  "Vous partagez des chiffres clairs avec les responsables sans exposer les vraies donnees ici.",
];

const dashboardCards = [
  { label: "Effectif", value: "5 240", accent: "bg-[#dff2df] text-[#295c2f]" },
  { label: "Production du jour", value: "4 860", accent: "bg-[#fff0c7] text-[#8a5c08]" },
  { label: "Taux de ponte", value: "92%", accent: "bg-[#e6eefb] text-[#294b90]" },
  { label: "Stock disponible", value: "162 plaq.", accent: "bg-[#ece8ff] text-[#5a3ea3]" },
];

const formRows = [
  { label: "Oeufs recoltes", value: "4 860" },
  { label: "Oeufs casses", value: "18" },
  { label: "Mortalite", value: "3" },
  { label: "Aliment distribue", value: "610 kg" },
];

const reportRows = [
  { date: "04 avr.", type: "Production", detail: "Synthese journaliere", amount: "+ 4 790 oeufs" },
  { date: "05 avr.", type: "Vente", detail: "Livraison client", amount: "+ 94 plaquettes" },
  { date: "06 avr.", type: "Depense", detail: "Achat aliment", amount: "- 185 000 XOF" },
  { date: "07 avr.", type: "Production", detail: "Saisie du matin", amount: "+ 4 860 oeufs" },
];

function FakeWindow({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[21rem] rounded-[24px] border border-[#d9dfd0] bg-[#fcfbf7] p-2.5 shadow-[0_28px_70px_-45px_rgba(31,54,32,0.55)] sm:max-w-none sm:rounded-[28px] sm:p-3">
      <div className="rounded-[18px] border border-[#e7ebdf] bg-white sm:rounded-[22px]">
        <div className="flex items-center justify-between border-b border-[#eef1ea] px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#e48d80]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#e6c567]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#7cc18a]" />
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-[#243726] sm:text-sm">{title}</p>
            <p className="text-xs text-[#6c7968]">{subtitle}</p>
          </div>
        </div>
        <div className="p-3 sm:p-4">{children}</div>
      </div>
    </div>
  );
}

export default async function DemoPage() {
  async function exitDemo() {
    "use server";

    await signOut({ redirectTo: "/login" });
  }

  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "demo") redirect("/");

  return (
    <main className="min-h-screen overflow-hidden bg-[#f3f0e8] text-[#1f2a1f]">
      <section className="relative isolate px-5 py-8 sm:px-8 lg:px-12">
        <div className="absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_top_left,_rgba(212,168,67,0.28),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(57,103,60,0.18),_transparent_35%),linear-gradient(180deg,_#fff8ea_0%,_#f3f0e8_72%)]" />
        <div className="absolute left-[-80px] top-16 h-48 w-48 rounded-full bg-[#d9c26d]/40 blur-3xl demo-glow" />
        <div className="absolute right-[-40px] top-40 h-56 w-56 rounded-full bg-[#6a8f4e]/25 blur-3xl demo-glow" />

        <div className="relative mx-auto max-w-7xl">
          <div className="demo-rise flex items-start justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#b9c7ad] bg-white/85 px-4 py-2 text-sm text-[#47623d] shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Demo guidee de Ferm'Afrik
            </div>
            <form action={exitDemo}>
              <button
                type="submit"
                aria-label="Quitter la demo"
                title="Quitter la demo"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#f0c9c9] bg-white/90 text-[#b42318] shadow-sm transition hover:bg-[#fff5f5]"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-6">
              <div className="demo-rise demo-rise-delay-1 space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8a6b20]">
                  Mieux gerer l'elevage, plus simplement
                </p>
                <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-[#203321] sm:text-5xl lg:text-6xl">
                  Suivez votre activite, saisissez vos donnees du jour et retrouvez vos rapports sans complexite.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-[#52624f]">
                  Cette demo vous montre comment l'application aide votre equipe
                  a travailler plus vite, mieux suivre l'elevage et prendre des
                  decisions avec des ecrans clairs et faciles a utiliser.
                </p>
              </div>

              <div className="demo-rise demo-rise-delay-2 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#apercus"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#2f5a35] px-6 text-base font-medium text-white shadow-lg shadow-[#2f5a35]/20 transition hover:bg-[#25492b]"
                >
                  Voir les ecrans
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#modules"
                  className="inline-flex h-12 items-center justify-center rounded-lg border border-white/30 bg-white/75 px-6 text-base font-medium text-[#27432b] transition hover:bg-white"
                >
                  Comprendre ce que fait l'app
                </Link>
              </div>

              <div className="demo-rise demo-rise-delay-3 grid gap-3 sm:grid-cols-2">
                {benefits.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/70 bg-white/80 px-4 py-4 shadow-[0_18px_50px_-30px_rgba(53,73,33,0.45)] backdrop-blur"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#6b8a45]" />
                      <p className="text-sm leading-6 text-[#445240]">{item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="demo-float relative">
              <div className="rounded-[30px] border border-[#d8ddcf] bg-[#fcfbf6] p-4 shadow-[0_35px_80px_-45px_rgba(36,55,27,0.6)]">
                <div className="rounded-[24px] bg-[linear-gradient(160deg,_#2f5a35_0%,_#466a34_45%,_#c5932e_130%)] p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-white/70">En un seul outil</p>
                      <h2 className="mt-2 text-2xl font-semibold">Tableau de bord, saisie et rapports</h2>
                    </div>
                    <div className="rounded-2xl bg-white/15 p-3">
                      <Wand2 className="h-7 w-7" />
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/60">Pour le terrain</p>
                      <p className="mt-2 text-2xl font-semibold">Rapide</p>
                      <p className="mt-1 text-sm text-white/70">Des saisies simples, meme sur mobile.</p>
                    </div>
                    <div className="rounded-2xl bg-[#f7edd1] p-4 text-[#27432b]">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#8a6b20]">Pour le pilotage</p>
                      <p className="mt-2 text-2xl font-semibold">Clair</p>
                      <p className="mt-1 text-sm text-[#5d683d]">Les informations utiles restent faciles a relire.</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-white/10 p-4 backdrop-blur">
                    <div className="flex items-center justify-between text-sm text-white/75">
                      <span>Ce que vous pouvez faire</span>
                      <span>Au quotidien</span>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {[
                        "Saisir la production",
                        "Suivre les ventes",
                        "Relire les rapports",
                      ].map((line, index) => (
                        <div key={line} className="grid grid-cols-[130px_1fr_38px] items-center gap-3">
                          <span className="text-sm text-white/80">{line}</span>
                          <div className="h-2 rounded-full bg-white/15">
                            <div
                              className="h-2 rounded-full bg-[#f2c45d]"
                              style={{ width: `${74 + index * 10}%` }}
                            />
                          </div>
                          <span className="text-right text-xs text-white/65">{74 + index * 10}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Lecture immediate", icon: BarChart3 },
                    { label: "Saisie guidee", icon: ClipboardCheck },
                    { label: "Suivi sanitaire", icon: HeartPulse },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-2xl border border-[#e4e7db] bg-white px-4 py-4">
                        <Icon className="h-5 w-5 text-[#466a34]" />
                        <p className="mt-3 text-sm font-medium text-[#243726]">{item.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="apercus" className="px-5 pb-10 pt-2 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8a6b20]">
              Apercus de l'application
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[#243726] sm:text-4xl">
              Les ecrans principaux, presentes avec des informations factices pour la demonstration.
            </h2>
            <p className="mt-3 text-base leading-7 text-[#566253]">
              Vous voyez ici le style reel de l'application, mais avec des donnees
              de presentation pour montrer l'experience sans afficher les chiffres d'exploitation.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-3">
              <FakeWindow title="Tableau de bord" subtitle="Vision rapide de l'activite">
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {dashboardCards.map((card) => (
                    <div key={card.label} className="rounded-xl border border-[#edf0e8] bg-[#fbfcfa] p-2.5 sm:rounded-2xl sm:p-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${card.accent}`}>
                        {card.label}
                      </span>
                      <p className="mt-2 text-lg font-semibold text-[#223424] sm:mt-3 sm:text-2xl">{card.value}</p>
                      <div className="mt-3 h-2 rounded-full bg-[#edf1ea] sm:mt-4">
                        <div className="h-2 rounded-full bg-[#5d8d4f]" style={{ width: "78%" }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl border border-[#edf0e8] bg-[#f9fbf7] p-3 sm:mt-4 sm:rounded-2xl sm:p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#243726]">Resume recent</p>
                    <span className="text-xs text-[#6b7766]">7 derniers jours</span>
                  </div>
                  <div className="mt-3 flex h-24 items-end gap-1.5 sm:mt-4 sm:h-28 sm:gap-2">
                    {[42, 58, 51, 63, 60, 70, 68].map((h, index) => (
                      <div key={h + index} className="flex-1 rounded-t-xl bg-[#cfe0c7]" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </FakeWindow>
              <p className="px-2 text-sm leading-6 text-[#556352]">
                Le tableau de bord aide a voir l'essentiel tout de suite: activite, stock, production et points d'attention.
              </p>
            </div>

            <div className="space-y-3">
              <FakeWindow title="Saisie de production" subtitle="Enregistrement du jour">
                <div className="rounded-xl border border-[#edf0e8] bg-[#fbfcfa] p-3 sm:rounded-2xl sm:p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#243726]">Date de saisie</p>
                    <span className="rounded-full bg-[#eef4e8] px-3 py-1 text-xs text-[#3a6137]">Aujourd'hui</span>
                  </div>
                  <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
                    {formRows.map((row) => (
                      <div key={row.label} className="grid grid-cols-[1fr_90px] items-center gap-2 sm:grid-cols-[1fr_110px] sm:gap-3">
                        <span className="text-xs text-[#5d6958] sm:text-sm">{row.label}</span>
                        <div className="rounded-xl border border-[#e7ebe1] bg-white px-2.5 py-2 text-right text-xs font-medium text-[#243726] sm:px-3 sm:text-sm">
                          {row.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3">
                    <div className="rounded-xl bg-[#fff6dc] px-3 py-3 text-xs text-[#8a5c08] sm:text-sm">
                      Plaquettes calculees automatiquement
                    </div>
                    <div className="rounded-xl bg-[#eef4ff] px-3 py-3 text-xs text-[#36539a] sm:text-sm">
                      Historique recent a relire
                    </div>
                  </div>
                </div>
              </FakeWindow>
              <p className="px-2 text-sm leading-6 text-[#556352]">
                La saisie reste rapide et guidee pour que l'equipe enregistre les bonnes informations sans friction.
              </p>
            </div>

            <div className="space-y-3">
              <FakeWindow title="Rapports" subtitle="Historique et exports">
                <div className="rounded-xl border border-[#edf0e8] bg-[#fbfcfa] p-3 sm:rounded-2xl sm:p-4">
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {["Periode", "Type", "Export"].map((item) => (
                      <div key={item} className="rounded-xl border border-[#e7ebe1] bg-white px-2 py-2 text-center text-[11px] font-medium text-[#5c6858] sm:px-3 sm:text-xs">
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-2 sm:mt-4">
                    {reportRows.map((row) => (
                      <div key={`${row.date}-${row.detail}`} className="rounded-xl border border-[#edf0e8] bg-white px-3 py-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-[#576354]">{row.date}</span>
                          <span className="rounded-full bg-[#eef4e8] px-2 py-1 text-center text-[11px] text-[#3a6137]">{row.type}</span>
                        </div>
                        <p className="mt-2 text-[#556352]">{row.detail}</p>
                        <p className="mt-2 text-right font-medium text-[#233525]">{row.amount}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </FakeWindow>
              <p className="px-2 text-sm leading-6 text-[#556352]">
                Les rapports rassemblent l'historique et facilitent la lecture des resultats, des ventes et des depenses.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="modules" className="px-5 pb-10 pt-4 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8a6b20]">
              Ce que l'app vous apporte
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[#243726] sm:text-4xl">
              Un outil unique pour suivre le terrain, mieux piloter et gagner du temps.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {modules.map((module, index) => {
              const Icon = module.icon;
              return (
                <article
                  key={module.title}
                  className={`demo-rise demo-rise-delay-${Math.min(index, 3)} rounded-[24px] border border-[#dde2d5] bg-white p-6 shadow-[0_20px_50px_-35px_rgba(36,55,27,0.5)]`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf3e6] text-[#45673c]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold text-[#243726]">{module.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-[#556352]">{module.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 pb-14 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] bg-[#243b23] p-7 text-white shadow-[0_26px_70px_-45px_rgba(24,38,24,0.8)]">
            <p className="text-sm uppercase tracking-[0.22em] text-[#d2c487]">Comment l'equipe l'utilise</p>
            <div className="mt-6 space-y-5">
              {[
                "Le terrain saisit la production, l'aliment et les incidents du jour.",
                "Le gestionnaire suit l'activite sans attendre qu'un fichier soit consolide.",
                "Le responsable consulte une vision claire pour decider plus vite.",
              ].map((step, index) => (
                <div key={step} className="grid grid-cols-[34px_1fr] gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d4a843] text-sm font-semibold text-[#243b23]">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-sm leading-7 text-white/80">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#d8dfd2] bg-[linear-gradient(180deg,_#ffffff_0%,_#f8f6ef_100%)] p-7 shadow-[0_24px_70px_-45px_rgba(36,55,27,0.6)]">
            <p className="text-sm uppercase tracking-[0.22em] text-[#8a6b20]">Pourquoi cette demo</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                "Vous decouvrez les ecrans cles de l'application dans un contexte simple a comprendre.",
                "Vous pouvez presenter l'outil sans afficher les vraies valeurs de l'exploitation.",
                "Vous voyez tout de suite a quoi sert chaque partie de l'application.",
                "Vous gardez une experience propre, utile et rassurante pour une demonstration.",
              ].map((line) => (
                <div key={line} className="rounded-2xl border border-[#ece9de] bg-white px-4 py-4">
                  <p className="text-sm leading-7 text-[#4f5e4c]">{line}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="#apercus"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2f5a35] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#25492b]"
              >
                Revoir les ecrans
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-lg border border-[#d8dfd2] bg-white px-5 py-3 text-sm font-medium text-[#27432b] transition hover:bg-[#f8faf5]"
              >
                Retour a la connexion
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
