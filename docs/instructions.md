# Ferm'Afrik — Instructions de développement

## Vue d'ensemble

Application web de gestion d'élevage avicole (poules pondeuses) au Burkina Faso.
Stack cible : **Next.js 14 (App Router) + PostgreSQL (Neon) + Vercel + GitHub**

---

## 1. Contexte métier

### 1.1 Activité
- Élevage de poules pondeuses pour la **vente d'œufs fécondés**
- Localisation : Burkina Faso (extensible à d'autres pays)
- Monnaie : **XOF (Franc CFA)**

### 1.2 Cycle de production
Un cycle commence à l'achat des poussins (Jour 1) et dure **18 mois** au total :

| Phase        | Durée       | Description                                          |
|--------------|-------------|------------------------------------------------------|
| Démarrage    | 2 mois      | Chauffage, soins intensifs, vaccination initiale     |
| Croissance   | 4 mois      | Alimentation croissance, suivi sanitaire             |
| Production   | 12 mois     | Récolte et vente d'œufs, suivi ponte quotidien       |

> **Règle calendaire :** Les mois sont comptés du **18 au 17** du mois suivant.

### 1.3 Cycle actuel
- **Début du cycle actuel :** 17 Juillet 2025
- **Phase actuelle :** Production (depuis le 17 Janvier 2026)
- **Fin de cycle prévue :** 17 Juillet 2027
- Lors du démarrage de l'app, calculer dynamiquement la phase et le temps restant

---

## 2. Bâtiments et troupeaux

### 2.1 Bâtiment A (actuel)
- Nom modifiable par l'admin
- Capacité : **600 poules** (modifiable)
- Statut : actif

### 2.2 Bâtiment B (futur)
- Capacité prévue : **1 000 poules**
- À prévoir dans le modèle de données dès maintenant (statut : inactif / en construction)

### 2.3 Règles bâtiments
- Chaque bâtiment a son propre cycle indépendant
- Un bâtiment peut être renommé, sa capacité modifiée par l'admin

---

## 3. Comptes utilisateurs

| Rôle       | Identifiant | Mot de passe | Accès                                                  |
|------------|-------------|--------------|--------------------------------------------------------|
| admin      | admin       | 290686       | Contrôle total (paramètres, utilisateurs, données)     |
| gestionnaire | gestion   | gestion      | Saisies quotidiennes, consultation des rapports        |
| demo       | demo        | demo         | Lecture seule, données fictives ou réelles en lecture  |

> Les mots de passe sont modifiables par l'admin. Hacher les mots de passe (bcrypt).

---

## 4. Fonctionnalités principales

### 4.1 Dashboard
- **Timeline interactive** : barre de progression du cycle avec les 3 phases colorées, position actuelle, jours restants par phase et total
- Résumé du jour : œufs récoltés, mortalité, dépenses
- KPIs : taux de ponte (%), mortalité cumulée, CA du mois, stock actuel
- Alerte si saisie du jour manquante
- Vue multi-bâtiments (switcher bâtiment)

### 4.2 Saisie de production (gestionnaire + admin)
Chaque jour, le gestionnaire renseigne **par bâtiment** :

#### Œufs
- Nombre d'œufs récoltés
- Nombre d'œufs cassés / impropres
- Nombre d'œufs vendus (en plaquettes de 30)
- Prix de vente par plaquette (affiché, modifiable par l'admin uniquement)
- Recette générée automatiquement

#### Troupeau
- Mortalité du jour (nombre de poules mortes)
- Cause de mortalité (liste : maladie, accident, inconnu, autre)
- Effectif vivant recalculé automatiquement

#### Alimentation
- Quantité de nourriture consommée (kg)
- Type d'aliment (démarrage / croissance / ponte)
- Coût (calculé ou saisi manuellement)

#### Santé / Vaccins
- Vaccination effectuée (oui/non)
- Type de vaccin
- Médicament administré (nom, dose, coût)

#### Dépenses diverses
- Libellé
- Montant (XOF)
- Catégorie (alimentation, santé, énergie, main d'œuvre, équipement, autre)

### 4.3 Saisie des ventes
- Enregistrement des ventes avec : date, bâtiment, nombre de plaquettes, prix unitaire, client
- **Gestion des clients** :
  - Sélection d'un client existant par recherche (nom, ville, téléphone)
  - Création d'un nouveau client avec : nom, ville, numéro de téléphone
  - Bouton d'appel (CTA) pour contacter le client directement
- Calcul automatique du chiffre d'affaires
- Historique des ventes filtrable par période

### 4.4 Stocks
- Stock d'œufs en cours (récoltés - vendus - cassés)
- Stock d'aliments (entrées / sorties)
- Alerte stock bas (seuil configurable)

### 4.5 Rapports et statistiques
- Rapport journalier / hebdomadaire / mensuel
- Taux de ponte moyen par période
- Courbe de mortalité
- Évolution des dépenses par catégorie (graphique)
- Bénéfice net = CA ventes - total dépenses
- Export CSV/PDF (admin)

### 4.6 Administration (admin uniquement)
- Prix de vente par plaquette (défaut : **7 000 XOF**)
- Renommer les bâtiments, modifier leur capacité
- Créer / désactiver des utilisateurs
- Configurer les seuils d'alerte stock
- Démarrer un nouveau cycle (avec archivage du cycle précédent)

---

## 5. Modèle de données (PostgreSQL / Neon)

### Tables principales

```sql
-- Utilisateurs
users (id, username, password_hash, role, created_at)

-- Bâtiments
buildings (id, name, capacity, status, created_at)

-- Cycles de production
cycles (id, building_id, start_date, end_date, phase, initial_count, notes)

-- Saisies quotidiennes
daily_records (
  id, cycle_id, building_id, record_date,
  eggs_collected, eggs_broken, eggs_sold, sale_price_per_tray,
  revenue,
  mortality_count, mortality_cause,
  feed_quantity_kg, feed_type, feed_cost,
  created_by, created_at, updated_at
)

-- Dépenses
expenses (
  id, cycle_id, building_id, expense_date,
  label, amount, category, created_by, created_at
)

-- Clients (acheteurs)
clients (
  id, name, city, phone, created_at
)

-- Ventes
sales (
  id, cycle_id, building_id, sale_date,
  trays_sold, unit_price, total_amount,
  client_id, buyer_name, created_by, created_at
)

-- Santé / Vaccinations
health_records (
  id, cycle_id, building_id, record_date,
  type, -- 'vaccination' | 'medication'
  product_name, dose, cost, notes,
  created_by, created_at
)

-- Stocks aliments
feed_stock (
  id, building_id, movement_date,
  movement_type, -- 'in' | 'out'
  quantity_kg, unit_cost, total_cost,
  feed_type, notes, created_by, created_at
)

-- Paramètres globaux
settings (key, value, updated_by, updated_at)
```

---

## 6. PWA – Installation sur écran d'accueil

L'application est **mobile-first** et installable comme une vraie app native.

### Comportement
- **Android Chrome** : bouton "Ajouter à l'écran d'accueil" automatique
- **iOS Safari** : partage → "Sur l'écran d'accueil"
- Mode **standalone** : pas de barre URL, plein écran
- **Bottom navigation** sur mobile (5 items + drawer "Plus")
- **Service worker** : cache l'app shell pour un accès offline partiel
- Safe area iOS (notch / home indicator) géré via `env(safe-area-inset-*)`

### Icônes générées dynamiquement
- `/api/icon?size=192` et `/api/icon?size=512` via `ImageResponse` (Next.js edge)
- `apple-icon` généré automatiquement par Next.js App Router
- Favicon 32x32 généré automatiquement

### Navigation mobile
- **Bottom bar** : Accueil | Production | Ventes | Stocks | Plus(...)
- **Drawer "Plus"** : Santé, Rapports, Administration, Déconnexion
- **Sidebar** : visible uniquement sur desktop (≥ 768px)

---

## 7. Stack technique

| Composant       | Technologie                                  |
|-----------------|----------------------------------------------|
| Framework       | Next.js 14 (App Router, TypeScript)          |
| UI              | Tailwind CSS + shadcn/ui                     |
| Base de données | PostgreSQL via **Neon** (serverless)         |
| ORM             | Drizzle ORM ou Prisma                        |
| Auth            | NextAuth.js v5 (credentials provider)        |
| Graphiques      | Recharts                                     |
| Formulaires     | React Hook Form + Zod                        |
| Déploiement     | Vercel (CI/CD via GitHub)                    |
| Repo            | GitHub                                       |

---

## 7. Architecture des pages (App Router)

```
app/
├── (auth)/
│   └── login/                  # Page de connexion
├── (dashboard)/
│   ├── layout.tsx              # Layout avec sidebar + header
│   ├── page.tsx                # Dashboard principal
│   ├── saisie/
│   │   └── page.tsx            # Saisie de production quotidienne
│   ├── ventes/
│   │   └── page.tsx            # Saisie des ventes et historique
│   ├── sante/
│   │   └── page.tsx            # Vaccins et soins
│   ├── stocks/
│   │   └── page.tsx            # Gestion stocks aliments et œufs
│   ├── rapports/
│   │   └── page.tsx            # Statistiques et exports
│   └── administration/         # Admin uniquement
│       └── page.tsx
├── api/
│   ├── auth/[...nextauth]/
│   ├── daily-records/
│   ├── sales/
│   ├── clients/
│   ├── expenses/
│   ├── health/
│   ├── stocks/
│   └── settings/
```

---

## 8. Règles métier importantes

1. **Effectif vivant** = capacité initiale - cumul mortalité du cycle
2. **Taux de ponte** = (œufs récoltés / effectif vivant) × 100
3. **Stock œufs** = cumul récoltes - cumul ventes - cumul casses
4. **Plaquette** = 30 œufs (valeur fixe)
5. **Prix plaquette** = 7 000 XOF (modifiable admin uniquement)
6. **Bénéfice net** = CA ventes - (alimentation + santé + dépenses diverses)
7. **Phase du cycle** calculée dynamiquement selon la date du cycle :
   - J1 à M+2 → Démarrage
   - M+2 à M+6 → Croissance
   - M+6 à M+18 → Production
8. Une saisie par bâtiment par jour. Si déjà saisie → mode édition
9. Seul l'admin peut modifier le prix de vente et les paramètres globaux
10. Le compte demo ne peut pas créer ou modifier de données

---

## 9. UI/UX

- Design : sobre, fonctionnel, adapté à un usage terrain (tablette/mobile friendly)
- Couleurs thématiques : vert agricole (#2d6a4f), orange pour alertes, gris neutre
- Langue : **Français** uniquement
- Timeline en haut du dashboard : claire, colorée, avec pourcentage d'avancement
- Formulaire de saisie : une seule page, sections accordéon, validation en temps réel
- Notifications toast pour confirmations et erreurs
- Chargement optimiste des données

---

## 10. Ordre de développement recommandé

1. **Initialisation projet** : Next.js + Tailwind + shadcn/ui + Drizzle + Neon
2. **Auth** : NextAuth credentials, middleware de protection des routes
3. **DB Schema** : migrations Drizzle, seed données initiales (cycle actuel + bâtiment A)
4. **Dashboard** : timeline, KPIs du jour, résumé
5. **Saisie de production** : formulaire complet
6. **Saisie des ventes** : enregistrement + historique + gestion clients
7. **Rapports** : graphiques Recharts
8. **Stocks** : aliments + œufs
9. **Santé** : vaccins / médicaments
10. **Administration** : prix, bâtiments, utilisateurs
11. **Export CSV/PDF**
12. **Déploiement** : GitHub → Vercel + Neon production

---

## 11. Données initiales (seed)

```
Cycle actuel :
- Bâtiment : "Bâtiment A", capacité 600
- Début cycle : 2025-07-17
- Phase actuelle : Production
- Effectif de départ : 600 poules

Prix plaquette : 7 000 XOF
```

---

## 12. Variables d'environnement requises

```env
DATABASE_URL=           # Neon PostgreSQL connection string
NEXTAUTH_SECRET=        # Secret NextAuth
NEXTAUTH_URL=           # URL de l'app (https://... sur Vercel)
```
