--
-- WMS Inspector DB v1
--

PRAGMA foreign_keys = OFF;

-- Schema: wmsinspector
BEGIN;
CREATE TABLE "service_type"(
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "name" VARCHAR(45) NOT NULL,
  "title" VARCHAR(200) COLLATE NOCASE
);
CREATE TABLE "tags"(
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "title" VARCHAR(45) NOT NULL COLLATE NOCASE
);
CREATE TABLE "services"(
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "title" VARCHAR(200) COLLATE NOCASE,
  "url" VARCHAR(300) NOT NULL COLLATE NOCASE,
  "version" VARCHAR(10),
  "favorite" INTEGER,
  "creation_date" INTEGER NOT NULL,
  "update_date" INTEGER,
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


CREATE VIEW v_services 
	AS SELECT s.id,
		s.title,
		s.url,
		s.favorite,
		group_concat(t.title) AS tags,
		s.creation_date,
		st.name AS type,
                s.version
	FROM services s JOIN service_type st 
			ON s.service_type_id = st.id 
		LEFT JOIN rel_services_tags r 
			ON s.id = r.services_id 
		LEFT JOIN tags t 
			ON t.id = r.tags_id 
	GROUP BY s.id;

-- Triger to delete services' tags when deleting a service
CREATE TRIGGER services_after_delete_trigger
    AFTER DELETE ON services
        FOR EACH ROW
            WHEN OLD.id IS NOT NULL
                BEGIN
                    DELETE FROM rel_services_tags WHERE services_id = OLD.id;
                END;

COMMIT;


--Insert values
BEGIN;
INSERT INTO service_type (name,title) VALUES ("WMS","Web Map Service");
INSERT INTO service_type (name,title) VALUES ("WFS","Web Feature Service");
INSERT INTO service_type (name,title) VALUES ("WCS","Web Coverage Service");

INSERT INTO tags (id,title) VALUES (1,"World");

INSERT INTO services (title,url,version,favorite,service_type_id,creation_date) VALUES
("JPL Global Imagery Service","http://wms.jpl.nasa.gov/wms.cgi","1.1.1",0,1,strftime('%s','now'));

INSERT INTO rel_services_tags (services_id,tags_id) VALUES (1,1);
COMMIT;

--Set user version
-- This version MUST be updated at any schema change. The schemaVersion property 
-- of WMSInspector.DB must be the same as this, and a corresponding upgrade
-- method must be provided.
PRAGMA user_version = 1;
