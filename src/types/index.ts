// Types utilisateurs
export type UserRole = "admin" | "gestionnaire" | "demo";

export interface User {
  id: number;
  username: string;
  role: UserRole;
  createdAt: Date;
}

// Types bâtiments
export type BuildingStatus = "active" | "inactive" | "construction";

export interface Building {
  id: number;
  name: string;
  capacity: number;
  status: BuildingStatus;
  createdAt: Date;
}

// Types cycles
export type CyclePhase = "demarrage" | "croissance" | "production";

export interface Cycle {
  id: number;
  buildingId: number;
  startDate: string;
  endDate?: string | null;
  phase: CyclePhase;
  initialCount: number;
  notes?: string | null;
}

export interface CycleWithBuilding extends Cycle {
  building: Building;
}

// Types saisie journalière
export type FeedType = "demarrage" | "croissance" | "ponte";

export interface DailyRecord {
  id: number;
  cycleId: number;
  buildingId: number;
  recordDate: string;
  eggsCollected: number;
  eggsBroken: number;
  eggsSold: number;
  salePricePerTray: string | null;
  revenue: string | null;
  mortalityCount: number;
  mortalityCause: string | null;
  feedQuantityKg: string | null;
  feedType: FeedType | null;
  feedCost: string | null;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Types dépenses
export type ExpenseCategory =
  | "alimentation"
  | "sante"
  | "energie"
  | "main_oeuvre"
  | "equipement"
  | "autre";

export interface Expense {
  id: number;
  cycleId: number;
  buildingId: number;
  expenseDate: string;
  label: string;
  amount: string;
  category: ExpenseCategory;
  createdBy: number | null;
  createdAt: Date;
}

// Types ventes
export interface Sale {
  id: number;
  cycleId: number;
  buildingId: number;
  saleDate: string;
  traysSold: number;
  unitPrice: string;
  totalAmount: string;
  clientId: number | null;
  buyerName: string | null;
  createdBy: number | null;
  createdAt: Date;
}

// Types clients
export interface Client {
  id: number;
  name: string;
  city: string | null;
  phone: string | null;
  createdAt: Date;
}

// Types santé
export type HealthType = "vaccination" | "medication";

export interface HealthRecord {
  id: number;
  cycleId: number;
  buildingId: number;
  recordDate: string;
  type: HealthType;
  productName: string;
  dose: string | null;
  cost: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: Date;
}

// Types stock aliments
export type FeedMovementType = "in" | "out";

export interface FeedStockEntry {
  id: number;
  buildingId: number;
  movementDate: string;
  movementType: FeedMovementType;
  quantityKg: string;
  unitCost: string | null;
  totalCost: string | null;
  feedType: FeedType;
  notes: string | null;
  createdBy: number | null;
  createdAt: Date;
}

// Types paramètres
export interface Setting {
  key: string;
  value: string;
  updatedBy: number | null;
  updatedAt: Date;
}

// Types KPI Dashboard
export interface DashboardKpis {
  effectifVivant: number;
  tauxPonte: number;
  oeufsAujourdHui: number;
  stockOeufs: number;
  stockPlaquettes: number;
  revenueTotal: number;
  depensesTotal: number;
  beneficeNet: number;
  mortaliteTotale: number;
}

// Types formulaires
export interface DailyRecordFormData {
  buildingId: number;
  cycleId: number;
  recordDate: string;
  eggsCollected: number;
  eggsBroken: number;
  mortalityCount: number;
  mortalityCause?: string;
  feedQuantityKg?: number;
  feedType?: FeedType;
  feedCost?: number;
}

export interface SaleFormData {
  buildingId: number;
  cycleId: number;
  saleDate: string;
  traysSold: number;
  unitPrice: number;
  buyerName?: string;
}

export interface ExpenseFormData {
  buildingId: number;
  cycleId: number;
  expenseDate: string;
  label: string;
  amount: number;
  category: ExpenseCategory;
}

export interface HealthFormData {
  buildingId: number;
  cycleId: number;
  recordDate: string;
  type: HealthType;
  productName: string;
  dose?: string;
  cost?: number;
  notes?: string;
}

export interface FeedStockFormData {
  buildingId: number;
  movementDate: string;
  movementType: FeedMovementType;
  quantityKg: number;
  unitCost?: number;
  feedType: FeedType;
  notes?: string;
}

// Types réponses API
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Types pour les graphiques
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface MultiSeriesDataPoint {
  date: string;
  [key: string]: string | number;
}
