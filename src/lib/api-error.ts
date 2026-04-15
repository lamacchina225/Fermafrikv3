import { NextResponse } from "next/server";
import { z } from "zod";
import {
  API_ERROR_GENERIC,
  API_ERROR_INVALID_DATA,
} from "@/lib/constants";

/**
 * Types d'erreurs API standardisés
 */
export interface ApiErrorResponse {
  error: string;
  details?: unknown;
  context?: string;
}

/**
 * Gestion centralisée des erreurs API.
 * Utilisation : return handleApiError(error, "vente");
 * 
 * @param error - Erreur capturée
 * @param context - Contexte pour les logs (ex: "vente", "saisie", "client")
 * @returns NextResponse avec erreur standardisée
 */
export function handleApiError(
  error: unknown,
  context: string
): NextResponse<ApiErrorResponse> {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: API_ERROR_INVALID_DATA,
        details: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
        context,
      },
      { status: 400 }
    );
  }

  if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
    return NextResponse.json(
      {
        error: "Cette ressource existe déjà (violation de contrainte unique)",
        context,
      },
      { status: 409 }
    );
  }

  console.error(`[API] Erreur ${context}:`, error);

  return NextResponse.json(
    { error: API_ERROR_GENERIC, context },
    { status: 500 }
  );
}
