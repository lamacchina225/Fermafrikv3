/**
 * Constantes métier centralisées
 * Réutilisables partout dans l'application
 */

// ── Poultry & Eggs ──────────────────────────────────────────────────────────

/** Nombre standard d'oeufs par plaquette (Afrique Ouest) */
export const EGGS_PER_TRAY = 30;

// ── Password Requirements ───────────────────────────────────────────────────

/** Longueur minimale du mot de passe */
export const PASSWORD_MIN_LENGTH = 8;

/** Mot de passe doit contenir au moins 1 majuscule */
export const PASSWORD_REQUIRES_UPPERCASE = /[A-Z]/;

/** Mot de passe doit contenir au moins 1 minuscule */
export const PASSWORD_REQUIRES_LOWERCASE = /[a-z]/;

/** Mot de passe doit contenir au moins 1 chiffre */
export const PASSWORD_REQUIRES_NUMBER = /[0-9]/;

/** Mot de passe doit contenir au moins 1 caractère spécial */
export const PASSWORD_REQUIRES_SPECIAL = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

// ── Pagination ──────────────────────────────────────────────────────────────

/** Limite par défaut pour la pagination */
export const DEFAULT_PAGINATION_LIMIT = 50;

/** Limite maximale de résultats par page */
export const MAX_PAGINATION_LIMIT = 200;

/** Limite pour health records */
export const HEALTH_RECORDS_DEFAULT_LIMIT = 100;

/** Limite maximale pour health records */
export const HEALTH_RECORDS_MAX_LIMIT = 500;

// ── Rate Limiting ───────────────────────────────────────────────────────────

/** Tentatives de login avant blocage */
export const LOGIN_RATE_LIMIT_ATTEMPTS = 5;

/** Fenêtre de rate-limit pour login (minutes) */
export const LOGIN_RATE_LIMIT_WINDOW_MIN = 15;

/** Tentatives de registration avant blocage */
export const REGISTER_RATE_LIMIT_ATTEMPTS = 3;

/** Fenêtre de rate-limit pour registration (minutes) */
export const REGISTER_RATE_LIMIT_WINDOW_MIN = 30;

// ── Session & Auth ──────────────────────────────────────────────────────────

/** Durée d'une session JWT (secondes) */
export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

// ── API Responses ───────────────────────────────────────────────────────────

/** Message d'erreur générique pour les réponses API */
export const API_ERROR_GENERIC = "Erreur serveur";

/** Message pour données invalides */
export const API_ERROR_INVALID_DATA = "Données invalides";

/** Message pour accès non autorisé */
export const API_ERROR_UNAUTHORIZED = "Non autorisé";

/** Message pour accès interdit */
export const API_ERROR_FORBIDDEN = "Accès interdit";

/** Message pour ressource non trouvée */
export const API_ERROR_NOT_FOUND = "Ressource non trouvée";

/** Message pour conflit (ex: doublon) */
export const API_ERROR_CONFLICT = "Ce n'existe uniquement conflit";

// ── Roles ───────────────────────────────────────────────────────────────────

export const ROLE_ADMIN = "admin";
export const ROLE_MANAGER = "gestionnaire";
export const ROLE_DEMO = "demo";

/** Rôles avec permissions d'écriture */
export const WRITABLE_ROLES = ["admin", "gestionnaire"];

// ── Status building ─────────────────────────────────────────────────────────

export const BUILDING_STATUS_ACTIVE = "active";
export const BUILDING_STATUS_INACTIVE = "inactive";
export const BUILDING_STATUS_CONSTRUCTION = "construction";

// ── Cycle phases ────────────────────────────────────────────────────────────

export const PHASE_DEMARRAGE = "demarrage";
export const PHASE_CROISSANCE = "croissance";
export const PHASE_PRODUCTION = "production";
