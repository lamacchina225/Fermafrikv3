"use client";

import { format, addDays, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  selectedDate: string;
  onChange: (date: string) => void;
}

export function DateNavigator({ selectedDate, onChange }: Props) {
  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");
  const dateLabel = format(new Date(`${selectedDate}T00:00:00`), "EEEE d MMMM yyyy", { locale: fr });

  const navigate = (dir: 1 | -1) => {
    const d = new Date(`${selectedDate}T00:00:00`);
    onChange(format(dir === 1 ? addDays(d, 1) : subDays(d, 1), "yyyy-MM-dd"));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
      <button
        onClick={() => navigate(-1)}
        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="flex-1 text-center">
        <p className="text-sm font-semibold text-slate-900 capitalize">{dateLabel}</p>
      </div>
      <button
        onClick={() => navigate(1)}
        disabled={isToday}
        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-30"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => onChange(e.target.value)}
        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
      {!isToday && (
        <button
          onClick={() => onChange(format(new Date(), "yyyy-MM-dd"))}
          className="text-xs font-medium text-amber-600 hover:underline whitespace-nowrap"
        >
          Aujourd&apos;hui
        </button>
      )}
    </div>
  );
}
