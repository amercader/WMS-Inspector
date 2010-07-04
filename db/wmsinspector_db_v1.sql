-- Creator:       MySQL Workbench 5.2.22/ExportSQLite plugin 2009.12.02
-- Author:        Adrià Mercader
-- Caption:       DB v1
-- Project:       WMS Inspector
-- Changed:       2010-06-20 23:34
-- Created:       2010-06-18 15:35
PRAGMA foreign_keys = OFF;

-- Schema: wmsinspector
BEGIN;
CREATE TABLE "service_type"(
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "name" VARCHAR(45) NOT NULL,
  "title" VARCHAR(200)
);
CREATE TABLE "tags"(
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "title" VARCHAR(45) NOT NULL
);
CREATE TABLE "services"(
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "title" VARCHAR(200),
  "url" VARCHAR(300) NOT NULL,
  "version" VARCHAR(10),
  "service_type_id" INTEGER NOT NULL,
  CONSTRAINT "fk_services_service_type"
    FOREIGN KEY("service_type_id")
    REFERENCES "service_type"("id")
);
CREATE INDEX "services.fk_services_service_type" ON "services"("service_type_id");
CREATE TABLE "rel_services_tags"(
  "services_id" INTEGER NOT NULL,
  "tags_id" INTEGER NOT NULL,
  PRIMARY KEY("tags_id","services_id"),
  CONSTRAINT "fk_rel_services_tags_services1"
    FOREIGN KEY("services_id")
    REFERENCES "services"("id"),
  CONSTRAINT "fk_rel_services_tags_tags1"
    FOREIGN KEY("tags_id")
    REFERENCES "tags"("id")
);
CREATE INDEX "rel_services_tags.fk_rel_services_tags_services1" ON "rel_services_tags"("services_id");
CREATE INDEX "rel_services_tags.fk_rel_services_tags_tags1" ON "rel_services_tags"("tags_id");
COMMIT;

--Set user version
-- This version MUST be updated at any schema change. The schemaVersion property 
-- of WMSInspector.DB must be the same as this, and a corresponding upgrade
-- method must be provided.
PRAGMA user_version = 1;


