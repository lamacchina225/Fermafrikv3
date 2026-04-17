import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface BusinessPeriod {
  start: string;
  end: string;
  label: string;
  labelToDate: string;
}

export function getCurrentBusinessPeriod(referenceDate: Date = new Date()): BusinessPeriod {
  const today = new Date(referenceDate);
  const startDate =
    today.getDate() >= 18
      ? new Date(today.getFullYear(), today.getMonth(), 18)
      : new Date(today.getFullYear(), today.getMonth() - 1, 18);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 17);

  return {
    start: format(startDate, "yyyy-MM-dd"),
    end: format(endDate, "yyyy-MM-dd"),
    label: `18 ${format(startDate, "MMM", { locale: fr })} – 17 ${format(endDate, "MMM yyyy", { locale: fr })}`,
    labelToDate: `${format(startDate, "d MMM", { locale: fr })} – aujourd'hui`,
  };
}

export function isIsoDateWithinPeriod(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}
