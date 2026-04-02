import {
  mysqlTable,
  text,
  varchar,
  int,
  decimal,
  date,
  timestamp,
  mysqlEnum,
  index,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// Enums

// Table users
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: mysqlEnum(["admin", "gestionnaire", "demo"]).notNull().default("gestionnaire"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

// Table buildings (bâtiments)
export const buildings = mysqlTable("buildings", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  capacity: int("capacity").notNull(),
  status: mysqlEnum(["active", "inactive", "construction"]).notNull().default("active"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

// Table cycles
export const cycles = mysqlTable(
  "cycles",
  {
    id: int("id").autoincrement().primaryKey(),
    buildingId: int("building_id")
      .notNull()
      .references(() => buildings.id),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    phase: mysqlEnum(["demarrage", "croissance", "production"]).notNull().default("demarrage"),
    initialCount: int("initial_count").notNull(),
    notes: text("notes"),
  },
  (t) => [index("cycles_building_id_idx").on(t.buildingId)]
);

// Table daily_records (saisies journalières)
export const dailyRecords = mysqlTable(
  "daily_records",
  {
    id: int("id").autoincrement().primaryKey(),
    cycleId: int("cycle_id")
      .notNull()
      .references(() => cycles.id),
    buildingId: int("building_id")
      .notNull()
      .references(() => buildings.id),
    recordDate: date("record_date", { mode: "string" }).notNull(),
    eggsCollected: int("eggs_collected").notNull().default(0),
    eggsBroken: int("eggs_broken").notNull().default(0),
    eggsSold: int("eggs_sold").notNull().default(0),
    salePricePerTray: decimal("sale_price_per_tray", {
      precision: 10,
      scale: 2,
    }),
    revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0"),
    mortalityCount: int("mortality_count").notNull().default(0),
    mortalityCause: text("mortality_cause"),
    feedQuantityKg: decimal("feed_quantity_kg", {
      precision: 8,
      scale: 2,
    }).default("0"),
    feedType: mysqlEnum(["demarrage", "croissance", "ponte"]),
    feedCost: decimal("feed_cost", { precision: 10, scale: 2 }).default("0"),
    createdBy: int("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("daily_records_cycle_id_idx").on(t.cycleId),
    index("daily_records_building_id_idx").on(t.buildingId),
    index("daily_records_record_date_idx").on(t.recordDate),
  ]
);

// Table expenses (dépenses)
export const expenses = mysqlTable(
  "expenses",
  {
    id: int("id").autoincrement().primaryKey(),
    cycleId: int("cycle_id")
      .notNull()
      .references(() => cycles.id),
    buildingId: int("building_id")
      .notNull()
      .references(() => buildings.id),
    expenseDate: date("expense_date", { mode: "string" }).notNull(),
    label: varchar("label", { length: 200 }).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    category: mysqlEnum(["alimentation", "sante", "energie", "main_oeuvre", "equipement", "autre"]).notNull().default("autre"),
    createdBy: int("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => [
    index("expenses_cycle_id_idx").on(t.cycleId),
    index("expenses_expense_date_idx").on(t.expenseDate),
  ]
);

// Table sales (ventes)
export const sales = mysqlTable(
  "sales",
  {
    id: int("id").autoincrement().primaryKey(),
    cycleId: int("cycle_id")
      .notNull()
      .references(() => cycles.id),
    buildingId: int("building_id")
      .notNull()
      .references(() => buildings.id),
    saleDate: date("sale_date", { mode: "string" }).notNull(),
    traysSold: int("trays_sold").notNull(),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    clientId: int("client_id").references(() => clients.id),
    buyerName: varchar("buyer_name", { length: 200 }),
    createdBy: int("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => [
    index("sales_cycle_id_idx").on(t.cycleId),
    index("sales_sale_date_idx").on(t.saleDate),
  ]
);

// Table health_records (santé)
export const healthRecords = mysqlTable(
  "health_records",
  {
    id: int("id").autoincrement().primaryKey(),
    cycleId: int("cycle_id")
      .notNull()
      .references(() => cycles.id),
    buildingId: int("building_id")
      .notNull()
      .references(() => buildings.id),
    recordDate: date("record_date", { mode: "string" }).notNull(),
    type: mysqlEnum(["vaccination", "medication"]).notNull(),
    productName: varchar("product_name", { length: 200 }).notNull(),
    dose: varchar("dose", { length: 100 }),
    cost: decimal("cost", { precision: 10, scale: 2 }).default("0"),
    notes: text("notes"),
    createdBy: int("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => [index("health_records_cycle_id_idx").on(t.cycleId)]
);

// Table feed_stock (stock aliments)
export const feedStock = mysqlTable("feed_stock", {
  id: int("id").autoincrement().primaryKey(),
  buildingId: int("building_id")
    .notNull()
    .references(() => buildings.id),
  movementDate: date("movement_date", { mode: "string" }).notNull(),
  movementType: mysqlEnum(["in", "out"]).notNull(),
  quantityKg: decimal("quantity_kg", { precision: 8, scale: 2 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }),
  feedType: mysqlEnum(["demarrage", "croissance", "ponte"]).notNull(),
  notes: text("notes"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

// Table clients (acheteurs)
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  city: varchar("city", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

// Table settings (paramètres)
export const settings = mysqlTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedBy: int("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
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
