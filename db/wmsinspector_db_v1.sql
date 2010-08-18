--
-- WMS Inspector DB v1
--

PRAGMA foreign_keys = OFF;

-- Schema: wmsinspector
BEGIN;
CREATE TABLE "service_types"(
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "name" VARCHAR(45) NOT NULL,
  "title" VARCHAR(200) COLLATE NOCASE
);

CREATE TABLE "versions"(
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "name" VARCHAR(10) NOT NULL,
  "isdefault" INTEGER,
  "service_types_id" INTEGER NOT NULL,
  CONSTRAINT "fk_versions_service_types"
    FOREIGN KEY("service_types_id")
    REFERENCES "service_types"("id")
);

CREATE TABLE "tags"(
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "title" VARCHAR(45) NOT NULL COLLATE NOCASE
);

CREATE TABLE "services"(
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "title" VARCHAR(200) COLLATE NOCASE,
  "url" VARCHAR(300) NOT NULL COLLATE NOCASE,
  "favorite" INTEGER,
  "creation_date" INTEGER NOT NULL,
  "update_date" INTEGER,
  "type" VARCHAR(10) NOT NULL DEFAULT "WMS" COLLATE NOCASE,
  "version" VARCHAR(10),
  "hash" VARCHAR(32) NOT NULL
);

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
		s.type,
                s.version
	FROM services s LEFT JOIN rel_services_tags r
			ON s.id = r.services_id 
		LEFT JOIN tags t 
			ON t.id = r.tags_id
	GROUP BY s.id;


CREATE VIEW v_service_types_versions
	AS SELECT st.id,
		st.name,
		st.title,
		(SELECT v.name FROM versions v WHERE v.isdefault = 1 AND v.service_types_id = st.id) AS default_version,
		group_concat(v.name) AS versions
	FROM service_types st  JOIN versions v
			ON st.id = v.service_types_id
	GROUP BY st.id;


-- Triger to delete services' tags when deleting a service
CREATE TRIGGER services_after_delete_trigger
    AFTER DELETE ON services
        FOR EACH ROW
            WHEN OLD.id IS NOT NULL
                BEGIN
                    DELETE FROM rel_services_tags WHERE services_id = OLD.id;
                END;

-- Triger to delete service types' versions when deleting a service type
CREATE TRIGGER service_types_after_delete_trigger
    AFTER DELETE ON service_types
        FOR EACH ROW
            WHEN OLD.id IS NOT NULL
                BEGIN
                    DELETE FROM versions WHERE service_types_id = OLD.id;
                END;

COMMIT;


--Insert values
BEGIN;
INSERT INTO service_types (id,name,title) VALUES (1,"WMS","Web Map Service");
INSERT INTO service_types (id,name,title) VALUES (2,"WFS","Web Feature Service");
INSERT INTO service_types (id,name,title) VALUES (3,"WCS","Web Coverage Service");


INSERT INTO versions (service_types_id,"name",isdefault) VALUES (1,"1.0.0",0);
INSERT INTO versions (service_types_id,"name",isdefault) VALUES (1,"1.1.0",0);
INSERT INTO versions (service_types_id,"name",isdefault) VALUES (1,"1.1.1",0);
INSERT INTO versions (service_types_id,"name",isdefault) VALUES (1,"1.3.0",1);

INSERT INTO versions (service_types_id,"name",isdefault) VALUES (2,"1.0.0",0);
INSERT INTO versions (service_types_id,"name",isdefault) VALUES (2,"1.1.0",1);

INSERT INTO versions (service_types_id,"name",isdefault) VALUES (3,"1.0.0",0);
INSERT INTO versions (service_types_id,"name",isdefault) VALUES (3,"1.1.0",0);
INSERT INTO versions (service_types_id,"name",isdefault) VALUES (3,"1.1.2",1);


INSERT INTO tags (id,title) VALUES (1,"World");

INSERT INTO services (title,url,version,favorite,type,creation_date,hash) VALUES
("JPL Global Imagery Service","http://wms.jpl.nasa.gov/wms.cgi","1.1.1",0,"WMS",strftime('%s','now'),"c25c93974fcd6b7ce10367a34d535ce5");

INSERT INTO rel_services_tags (services_id,tags_id) VALUES (1,1);
COMMIT;

--Set user version
-- This version MUST be updated at any schema change. The schemaVersion property 
-- of WMSInspector.DB must be the same as this, and a corresponding upgrade
-- method must be provided.
PRAGMA user_version = 1;
