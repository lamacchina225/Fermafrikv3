import { describe, it, expect } from "vitest";
import {
  formatXOF,
  formatNumber,
  calculateTauxPonte,
  calculateEffectifVivant,
  calculateStockOeufs,
  eggsToTrays,
  traysToEggs,
  calculateBeneficeNet,
  canWrite,
  isAdmin,
  getCategoryLabel,
  EGGS_PER_TRAY,
} from "@/lib/utils";

describe("EGGS_PER_TRAY", () => {
  it("est egal a 30", () => {
    expect(EGGS_PER_TRAY).toBe(30);
  });
});

describe("formatXOF", () => {
  it("formate un nombre positif", () => {
    expect(formatXOF(7000)).toContain("7");
    expect(formatXOF(7000)).toContain("XOF");
  });
  it("gère null/undefined", () => {
    expect(formatXOF(null)).toBe("0 XOF");
    expect(formatXOF(undefined)).toBe("0 XOF");
  });
  it("gère les strings", () => {
    expect(formatXOF("3500")).toContain("3");
  });
  it("gère NaN", () => {
    expect(formatXOF("abc")).toBe("0 XOF");
  });
});

describe("formatNumber", () => {
  it("formate avec séparateurs", () => {
    const result = formatNumber(1000);
    expect(result).toContain("1");
    expect(result).toContain("000");
  });
  it("gère null", () => {
    expect(formatNumber(null)).toBe("0");
  });
});

describe("calculateTauxPonte", () => {
  it("calcule correctement", () => {
    expect(calculateTauxPonte(4000, 5000)).toBe(80);
  });
  it("retourne 0 si effectif 0", () => {
    expect(calculateTauxPonte(100, 0)).toBe(0);
  });
  it("retourne 0 si effectif négatif", () => {
    expect(calculateTauxPonte(100, -5)).toBe(0);
  });
});

describe("calculateEffectifVivant", () => {
  it("soustrait la mortalité", () => {
    expect(calculateEffectifVivant(5000, 200)).toBe(4800);
  });
  it("ne descend jamais sous 0", () => {
    expect(calculateEffectifVivant(100, 500)).toBe(0);
  });
});

describe("calculateStockOeufs", () => {
  it("calcule le stock correct", () => {
    expect(calculateStockOeufs(10000, 100, 500)).toBe(6500);
  });
  it("ne descend jamais sous 0", () => {
    expect(calculateStockOeufs(100, 100, 0)).toBe(0);
  });
});

describe("eggsToTrays / traysToEggs", () => {
  it("convertit oeufs en plaquettes", () => {
    expect(eggsToTrays(90)).toBe(3);
    expect(eggsToTrays(89)).toBe(2);
  });
  it("convertit plaquettes en oeufs", () => {
    expect(traysToEggs(3)).toBe(90);
  });
});

describe("calculateBeneficeNet", () => {
  it("calcule le bénéfice", () => {
    expect(calculateBeneficeNet(500000, 300000)).toBe(200000);
  });
  it("gère la perte", () => {
    expect(calculateBeneficeNet(100000, 300000)).toBe(-200000);
  });
});

describe("canWrite", () => {
  it("admin peut écrire", () => expect(canWrite("admin")).toBe(true));
  it("gestionnaire peut écrire", () => expect(canWrite("gestionnaire")).toBe(true));
  it("demo ne peut pas écrire", () => expect(canWrite("demo")).toBe(false));
  it("null ne peut pas écrire", () => expect(canWrite(null)).toBe(false));
  it("undefined ne peut pas écrire", () => expect(canWrite(undefined)).toBe(false));
});

describe("isAdmin", () => {
  it("admin est admin", () => expect(isAdmin("admin")).toBe(true));
  it("gestionnaire n'est pas admin", () => expect(isAdmin("gestionnaire")).toBe(false));
  it("demo n'est pas admin", () => expect(isAdmin("demo")).toBe(false));
});

describe("getCategoryLabel", () => {
  it("retourne le bon label", () => {
    expect(getCategoryLabel("alimentation")).toBe("Alimentation");
    expect(getCategoryLabel("sante")).toBe("Santé");
    expect(getCategoryLabel("main_oeuvre")).toBe("Main d'oeuvre");
  });
  it("retourne la clé si inconnu", () => {
    expect(getCategoryLabel("unknown")).toBe("unknown");
  });
});
