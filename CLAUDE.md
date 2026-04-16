# Ferm'Afrik v3

Application de gestion de ferme avicole (poules pondeuses) pour l'Afrique de l'Ouest, principalement le Burkina Faso.

## Stack technique

- **Framework** : Next.js 15 (App Router)
- **Frontend** : React 18, Tailwind CSS, Radix UI, Recharts, SWR
- **Backend** : API Routes Next.js, NextAuth v5 (JWT + Credentials)
- **Base de données** : PostgreSQL (Neon serverless), Drizzle ORM
- **Tests** : Vitest, Testing Library, MSW
- **Déploiement** : Vercel
- **PWA** : manifest.json + service worker

## Architecture

```
src/
├── app/
│   ├── (auth)/          # Pages login/register (pas de sidebar)
│   ├── (dashboard)/     # Pages protégées avec sidebar + bottom nav
│   └── api/             # Routes API RESTful
├── components/
│   ├── ui/              # Composants Radix/shadcn réutilisables
│   ├── layout/          # Sidebar, BottomNav, Header
│   ├── dashboard/       # Composants du tableau de bord
│   ├── ventes/          # Composants page ventes
│   └── saisie/          # Composants page saisie
├── db/
│   ├── schema.ts        # Schéma Drizzle (source de vérité)
│   └── index.ts         # Connexion DB
├── lib/
│   ├── auth.ts          # Configuration NextAuth
│   ├── api-auth.ts      # Wrapper withAuth pour API routes
│   ├── api-error.ts     # Gestion d'erreurs centralisée
│   ├── rate-limit.ts    # Rate limiter réutilisable
│   ├── env.ts           # Validation des variables d'environnement
│   └── utils.ts         # Utilitaires métier (formatXOF, EGGS_PER_TRAY, etc.)
└── tests/               # Tests Vitest
```

## Multi-tenant

L'application est multi-tenant : chaque ferme (`farms`) est isolée par `farmId`. Le wrapper `withAuth()` dans `api-auth.ts` injecte automatiquement le `farmId` depuis la session JWT. **Toutes les requêtes DB doivent filtrer par farmId.**

## Conventions

- **Langue** : Interface en français, code en anglais
- **Devise** : XOF (Franc CFA), formaté avec `formatXOF()`
- **Constante métier** : `EGGS_PER_TRAY = 30` (ne pas utiliser `30` en dur)
- **Erreurs API** : Utiliser `handleApiError(error, "contexte")` de `lib/api-error.ts`
- **Protection API** : Toujours wrapper avec `withAuth()`, utiliser `requireWrite()` pour les mutations
- **Validation** : Zod pour tous les inputs API
- **Date** : Format `yyyy-MM-dd` pour les dates DB, `date-fns` + locale `fr` pour l'affichage
- **Pagination** : Toujours paginer les endpoints qui peuvent retourner beaucoup de données

## Commandes

```bash
npm run dev          # Serveur de développement
npm run build        # Build production
npm run test         # Tests Vitest
npm run test:watch   # Tests en mode watch
npm run test:e2e     # Tests E2E Playwright (a11y inclus)
npm run lint         # ESLint
npm run db:push      # Push le schéma vers la DB
npm run db:studio    # Interface Drizzle Studio
```

## Variables d'environnement

**Requises :**
- `DATABASE_URL` : URL de connexion PostgreSQL (Neon)
- `AUTH_SECRET` : Secret pour NextAuth JWT (32+ caractères)

**Optionnelles :**
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` : Bascule le rate limiter sur Redis (requis en multi-instance)
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` : Active la capture d'erreurs Sentry

## Migrations DB manuelles

Le projet utilise `db:push` pour le dev. Les changements de FK/contraintes sensibles en prod sont placés dans `drizzle/manual/` et doivent être appliqués via `psql` sur la base cible.
