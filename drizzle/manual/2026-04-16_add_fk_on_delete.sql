-- Manual migration: align FK ON DELETE policies with src/db/schema.ts
-- Run manually on target DB. Idempotent (drops then re-adds constraint).

BEGIN;

-- users.farm_id -> farms.id  SET NULL
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_farm_id_farms_id_fk";
ALTER TABLE "users" ADD CONSTRAINT "users_farm_id_farms_id_fk"
  FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE SET NULL;

-- buildings.farm_id -> farms.id  CASCADE
ALTER TABLE "buildings" DROP CONSTRAINT IF EXISTS "buildings_farm_id_farms_id_fk";
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_farm_id_farms_id_fk"
  FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE;

-- cycles: farm_id CASCADE, building_id RESTRICT
ALTER TABLE "cycles" DROP CONSTRAINT IF EXISTS "cycles_farm_id_farms_id_fk";
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_farm_id_farms_id_fk"
  FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE;
ALTER TABLE "cycles" DROP CONSTRAINT IF EXISTS "cycles_building_id_buildings_id_fk";
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_building_id_buildings_id_fk"
  FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT;

-- daily_records: farm CASCADE, cycle CASCADE, building RESTRICT, created_by SET NULL
ALTER TABLE "daily_records" DROP CONSTRAINT IF EXISTS "daily_records_farm_id_farms_id_fk";
ALTER TABLE "daily_records" ADD CONSTRAINT "daily_records_farm_id_farms_id_fk"
  FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE;
ALTER TABLE "daily_records" DROP CONSTRAINT IF EXISTS "daily_records_cycle_id_cycles_id_fk";
ALTER TABLE "daily_records" ADD CONSTRAINT "daily_records_cycle_id_cycles_id_fk"
  FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE CASCADE;
ALTER TABLE "daily_records" DROP CONSTRAINT IF EXISTS "daily_records_building_id_buildings_id_fk";
ALTER TABLE "daily_records" ADD CONSTRAINT "daily_records_building_id_buildings_id_fk"
  FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT;
ALTER TABLE "daily_records" DROP CONSTRAINT IF EXISTS "daily_records_created_by_users_id_fk";
ALTER TABLE "daily_records" ADD CONSTRAINT "daily_records_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;

-- expenses
ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_farm_id_farms_id_fk";
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_farm_id_farms_id_fk"
  FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE;
ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_cycle_id_cycles_id_fk";
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_cycle_id_cycles_id_fk"
  FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE CASCADE;
ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_building_id_buildings_id_fk";
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_building_id_buildings_id_fk"
  FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT;
ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_created_by_users_id_fk";
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;

-- sales
ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_farm_id_farms_id_fk";
ALTER TABLE "sales" ADD CONSTRAINT "sales_farm_id_farms_id_fk"
  FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE;
ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_cycle_id_cycles_id_fk";
ALTER TABLE "sales" ADD CONSTRAINT "sales_cycle_id_cycles_id_fk"
  FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE CASCADE;
ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_building_id_buildings_id_fk";
ALTER TABLE "sales" ADD CONSTRAINT "sales_building_id_buildings_id_fk"
  FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT;
ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_client_id_clients_id_fk";
ALTER TABLE "sales" ADD CONSTRAINT "sales_client_id_clients_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;
ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_created_by_users_id_fk";
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;

-- health_records
ALTER TABLE "health_records" DROP CONSTRAINT IF EXISTS "health_records_farm_id_farms_id_fk";
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_farm_id_farms_id_fk"
  FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE;
ALTER TABLE "health_records" DROP CONSTRAINT IF EXISTS "health_records_cycle_id_cycles_id_fk";
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_cycle_id_cycles_id_fk"
  FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE CASCADE;
ALTER TABLE "health_records" DROP CONSTRAINT IF EXISTS "health_records_building_id_buildings_id_fk";
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_building_id_buildings_id_fk"
  FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT;
ALTER TABLE "health_records" DROP CONSTRAINT IF EXISTS "health_records_created_by_users_id_fk";
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;

-- feed_stock
ALTER TABLE "feed_stock" DROP CONSTRAINT IF EXISTS "feed_stock_farm_id_farms_id_fk";
ALTER TABLE "feed_stock" ADD CONSTRAINT "feed_stock_farm_id_farms_id_fk"
  FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE;
ALTER TABLE "feed_stock" DROP CONSTRAINT IF EXISTS "feed_stock_building_id_buildings_id_fk";
ALTER TABLE "feed_stock" ADD CONSTRAINT "feed_stock_building_id_buildings_id_fk"
  FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT;
ALTER TABLE "feed_stock" DROP CONSTRAINT IF EXISTS "feed_stock_created_by_users_id_fk";
ALTER TABLE "feed_stock" ADD CONSTRAINT "feed_stock_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;

-- clients
ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_farm_id_farms_id_fk";
ALTER TABLE "clients" ADD CONSTRAINT "clients_farm_id_farms_id_fk"
  FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE;

-- settings
ALTER TABLE "settings" DROP CONSTRAINT IF EXISTS "settings_farm_id_farms_id_fk";
ALTER TABLE "settings" ADD CONSTRAINT "settings_farm_id_farms_id_fk"
  FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE;
ALTER TABLE "settings" DROP CONSTRAINT IF EXISTS "settings_updated_by_users_id_fk";
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_users_id_fk"
  FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL;

COMMIT;
