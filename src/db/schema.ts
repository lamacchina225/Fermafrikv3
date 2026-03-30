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

// Table users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("gestionnaire"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Table buildings (bâtiments)
export const buildings = pgTable("buildings", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  capacity: integer("capacity").notNull(),
  status: buildingStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Table cycles
export const cycles = pgTable("cycles", {
  id: serial("id").primaryKey(),
  buildingId: integer("building_id")
    .notNull()
    .references(() => buildings.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  phase: phaseEnum("phase").notNull().default("demarrage"),
  initialCount: integer("initial_count").notNull(),
  notes: text("notes"),
});

// Table daily_records (saisies journalières)
export const dailyRecords = pgTable("daily_records", {
  id: serial("id").primaryKey(),
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
});

// Table expenses (dépenses)
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
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
});

// Table sales (ventes)
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
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
});

// Table health_records (santé)
export const healthRecords = pgTable("health_records", {
  id: serial("id").primaryKey(),
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
});

// Table feed_stock (stock aliments)
export const feedStock = pgTable("feed_stock", {
  id: serial("id").primaryKey(),
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
});

// Table clients (acheteurs)
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  city: varchar("city", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Table settings (paramètres)
export const settings = pgTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const buildingsRelations = relations(buildings, ({ many }) => ({
  cycles: many(cycles),
  dailyRecords: many(dailyRecords),
  expenses: many(expenses),
  sales: many(sales),
  healthRecords: many(healthRecords),
  feedStock: many(feedStock),
}));

export const cyclesRelations = relations(cycles, ({ one, many }) => ({
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

export const clientsRelations = relations(clients, ({ many }) => ({
  sales: many(sales),
}));

export const salesRelations = relations(sales, ({ one }) => ({
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
  building: one(buildings, {
    fields: [feedStock.buildingId],
    references: [buildings.id],
  }),
  createdByUser: one(users, {
    fields: [feedStock.createdBy],
    references: [users.id],
  }),
}));
