import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  decimal,
  date,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const roleEnum = pgEnum("role", ["admin", "gestionnaire", "demo"]);
export const buildingStatusEnum = pgEnum("building_status", [
  "active",
  "inactive",
  "construction",
]);
export const phaseEnum = pgEnum("phase", [
  "demarrage",
  "croissance",
  "production",
]);
export const expenseCategoryEnum = pgEnum("expense_category", [
  "alimentation",
  "sante",
  "energie",
  "main_oeuvre",
  "equipement",
  "autre",
]);
export const feedMovementTypeEnum = pgEnum("feed_movement_type", ["in", "out"]);
export const feedTypeEnum = pgEnum("feed_type", [
  "demarrage",
  "croissance",
  "ponte",
]);
export const healthTypeEnum = pgEnum("health_type", [
  "vaccination",
  "medication",
]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "free",
  "premium",
]);

// ─── Table farms (NOUVEAU — multi-tenant) ─────────────────────────────────
export const farms = pgTable("farms", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  ownerId: integer("owner_id"),
  subscriptionPlan: subscriptionPlanEnum("subscription_plan")
    .notNull()
    .default("free"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Table users ───────────────────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    email: varchar("email", { length: 255 }),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull().default("gestionnaire"),
    farmId: integer("farm_id").references(() => farms.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("users_farm_id_idx").on(t.farmId)]
);

// ─── Table buildings (bâtiments) ───────────────────────────────────────────
export const buildings = pgTable(
  "buildings",
  {
    id: serial("id").primaryKey(),
    farmId: integer("farm_id")
      .notNull()
      .references(() => farms.id),
    name: varchar("name", { length: 100 }).notNull(),
    capacity: integer("capacity").notNull(),
    status: buildingStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("buildings_farm_id_idx").on(t.farmId)]
);

// ─── Table cycles ──────────────────────────────────────────────────────────
export const cycles = pgTable(
  "cycles",
  {
    id: serial("id").primaryKey(),
    farmId: integer("farm_id")
      .notNull()
      .references(() => farms.id),
    buildingId: integer("building_id")
      .notNull()
      .references(() => buildings.id),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    phase: phaseEnum("phase").notNull().default("demarrage"),
    initialCount: integer("initial_count").notNull(),
    notes: text("notes"),
  },
  (t) => [
    index("cycles_building_id_idx").on(t.buildingId),
    index("cycles_farm_id_idx").on(t.farmId),
  ]
);

// ─── Table daily_records (saisies journalières) ────────────────────────────
export const dailyRecords = pgTable(
  "daily_records",
  {
    id: serial("id").primaryKey(),
    farmId: integer("farm_id")
      .notNull()
      .references(() => farms.id),
    cycleId: integer("cycle_id")
      .notNull()
      .references(() => cycles.id),
    buildingId: integer("building_id")
      .notNull()
      .references(() => buildings.id),
    recordDate: date("record_date").notNull(),
    eggsCollected: integer("eggs_collected").notNull().default(0),
    eggsBroken: integer("eggs_broken").notNull().default(0),
    eggsSold: integer("eggs_sold").notNull().default(0),
    salePricePerTray: decimal("sale_price_per_tray", {
      precision: 10,
      scale: 2,
    }),
    revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0"),
    mortalityCount: integer("mortality_count").notNull().default(0),
    mortalityCause: text("mortality_cause"),
    feedQuantityKg: decimal("feed_quantity_kg", {
      precision: 8,
      scale: 2,
    }).default("0"),
    feedType: feedTypeEnum("feed_type"),
    feedCost: decimal("feed_cost", { precision: 10, scale: 2 }).default("0"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("daily_records_cycle_id_idx").on(t.cycleId),
    index("daily_records_building_id_idx").on(t.buildingId),
    index("daily_records_record_date_idx").on(t.recordDate),
    index("daily_records_farm_id_idx").on(t.farmId),
    uniqueIndex("daily_records_farm_building_date_idx").on(
      t.farmId,
      t.buildingId,
      t.recordDate
    ),
  ]
);

// ─── Table expenses (dépenses) ─────────────────────────────────────────────
export const expenses = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    farmId: integer("farm_id")
      .notNull()
      .references(() => farms.id),
    cycleId: integer("cycle_id")
      .notNull()
      .references(() => cycles.id),
    buildingId: integer("building_id")
      .notNull()
      .references(() => buildings.id),
    expenseDate: date("expense_date").notNull(),
    label: varchar("label", { length: 200 }).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    category: expenseCategoryEnum("category").notNull().default("autre"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("expenses_cycle_id_idx").on(t.cycleId),
    index("expenses_expense_date_idx").on(t.expenseDate),
    index("expenses_farm_id_idx").on(t.farmId),
  ]
);

// ─── Table sales (ventes) ──────────────────────────────────────────────────
export const sales = pgTable(
  "sales",
  {
    id: serial("id").primaryKey(),
    farmId: integer("farm_id")
      .notNull()
      .references(() => farms.id),
    cycleId: integer("cycle_id")
      .notNull()
      .references(() => cycles.id),
    buildingId: integer("building_id")
      .notNull()
      .references(() => buildings.id),
    saleDate: date("sale_date").notNull(),
    traysSold: integer("trays_sold").notNull(),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    clientId: integer("client_id").references(() => clients.id),
    buyerName: varchar("buyer_name", { length: 200 }),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("sales_cycle_id_idx").on(t.cycleId),
    index("sales_sale_date_idx").on(t.saleDate),
    index("sales_farm_id_idx").on(t.farmId),
  ]
);

// ─── Table health_records (santé) ──────────────────────────────────────────
export const healthRecords = pgTable(
  "health_records",
  {
    id: serial("id").primaryKey(),
    farmId: integer("farm_id")
      .notNull()
      .references(() => farms.id),
    cycleId: integer("cycle_id")
      .notNull()
      .references(() => cycles.id),
    buildingId: integer("building_id")
      .notNull()
      .references(() => buildings.id),
    recordDate: date("record_date").notNull(),
    type: healthTypeEnum("type").notNull(),
    productName: varchar("product_name", { length: 200 }).notNull(),
    dose: varchar("dose", { length: 100 }),
    cost: decimal("cost", { precision: 10, scale: 2 }).default("0"),
    notes: text("notes"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("health_records_cycle_id_idx").on(t.cycleId),
    index("health_records_farm_id_idx").on(t.farmId),
  ]
);

// ─── Table feed_stock (stock aliments) ─────────────────────────────────────
export const feedStock = pgTable(
  "feed_stock",
  {
    id: serial("id").primaryKey(),
    farmId: integer("farm_id")
      .notNull()
      .references(() => farms.id),
    buildingId: integer("building_id")
      .notNull()
      .references(() => buildings.id),
    movementDate: date("movement_date").notNull(),
    movementType: feedMovementTypeEnum("movement_type").notNull(),
    quantityKg: decimal("quantity_kg", { precision: 8, scale: 2 }).notNull(),
    unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
    totalCost: decimal("total_cost", { precision: 12, scale: 2 }),
    feedType: feedTypeEnum("feed_type").notNull(),
    notes: text("notes"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("feed_stock_farm_id_idx").on(t.farmId)]
);

// ─── Table clients (acheteurs) ─────────────────────────────────────────────
export const clients = pgTable(
  "clients",
  {
    id: serial("id").primaryKey(),
    farmId: integer("farm_id")
      .notNull()
      .references(() => farms.id),
    name: varchar("name", { length: 200 }).notNull(),
    city: varchar("city", { length: 100 }),
    phone: varchar("phone", { length: 20 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("clients_farm_id_idx").on(t.farmId)]
);

// ─── Table settings (paramètres par ferme) ─────────────────────────────────
export const settings = pgTable(
  "settings",
  {
    id: serial("id").primaryKey(),
    farmId: integer("farm_id")
      .notNull()
      .references(() => farms.id),
    key: varchar("key", { length: 100 }).notNull(),
    value: text("value").notNull(),
    updatedBy: integer("updated_by").references(() => users.id),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("settings_farm_key_idx").on(t.farmId, t.key),
  ]
);

// ═══════════════════════════════════════════════════════════════════════════
// Relations
// ═══════════════════════════════════════════════════════════════════════════

export const farmsRelations = relations(farms, ({ many }) => ({
  users: many(users),
  buildings: many(buildings),
  cycles: many(cycles),
  clients: many(clients),
}));

export const usersRelations = relations(users, ({ one }) => ({
  farm: one(farms, {
    fields: [users.farmId],
    references: [farms.id],
  }),
}));

export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  farm: one(farms, {
    fields: [buildings.farmId],
    references: [farms.id],
  }),
  cycles: many(cycles),
  dailyRecords: many(dailyRecords),
  expenses: many(expenses),
  sales: many(sales),
  healthRecords: many(healthRecords),
  feedStock: many(feedStock),
}));

export const cyclesRelations = relations(cycles, ({ one, many }) => ({
  farm: one(farms, {
    fields: [cycles.farmId],
    references: [farms.id],
  }),
  building: one(buildings, {
    fields: [cycles.buildingId],
    references: [buildings.id],
  }),
  dailyRecords: many(dailyRecords),
  expenses: many(expenses),
  sales: many(sales),
  healthRecords: many(healthRecords),
}));

export const dailyRecordsRelations = relations(dailyRecords, ({ one }) => ({
  farm: one(farms, {
    fields: [dailyRecords.farmId],
    references: [farms.id],
  }),
  cycle: one(cycles, {
    fields: [dailyRecords.cycleId],
    references: [cycles.id],
  }),
  building: one(buildings, {
    fields: [dailyRecords.buildingId],
    references: [buildings.id],
  }),
  createdByUser: one(users, {
    fields: [dailyRecords.createdBy],
    references: [users.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  farm: one(farms, {
    fields: [expenses.farmId],
    references: [farms.id],
  }),
  cycle: one(cycles, {
    fields: [expenses.cycleId],
    references: [cycles.id],
  }),
  building: one(buildings, {
    fields: [expenses.buildingId],
    references: [buildings.id],
  }),
  createdByUser: one(users, {
    fields: [expenses.createdBy],
    references: [users.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  farm: one(farms, {
    fields: [clients.farmId],
    references: [farms.id],
  }),
  sales: many(sales),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  farm: one(farms, {
    fields: [sales.farmId],
    references: [farms.id],
  }),
  cycle: one(cycles, {
    fields: [sales.cycleId],
    references: [cycles.id],
  }),
  building: one(buildings, {
    fields: [sales.buildingId],
    references: [buildings.id],
  }),
  client: one(clients, {
    fields: [sales.clientId],
    references: [clients.id],
  }),
  createdByUser: one(users, {
    fields: [sales.createdBy],
    references: [users.id],
  }),
}));

export const healthRecordsRelations = relations(healthRecords, ({ one }) => ({
  farm: one(farms, {
    fields: [healthRecords.farmId],
    references: [farms.id],
  }),
  cycle: one(cycles, {
    fields: [healthRecords.cycleId],
    references: [cycles.id],
  }),
  building: one(buildings, {
    fields: [healthRecords.buildingId],
    references: [buildings.id],
  }),
  createdByUser: one(users, {
    fields: [healthRecords.createdBy],
    references: [users.id],
  }),
}));

export const feedStockRelations = relations(feedStock, ({ one }) => ({
  farm: one(farms, {
    fields: [feedStock.farmId],
    references: [farms.id],
  }),
  building: one(buildings, {
    fields: [feedStock.buildingId],
    references: [buildings.id],
  }),
  createdByUser: one(users, {
    fields: [feedStock.createdBy],
    references: [users.id],
  }),
}));
