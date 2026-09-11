CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE zones (
  id text PRIMARY KEY,
  name text NOT NULL,
  geom geometry(MultiPolygon, 4326) NOT NULL,
  CONSTRAINT zones_geom_valid CHECK (ST_IsValid(geom))
);
CREATE INDEX zones_geom_gix ON zones USING gist (geom);

CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE NOT NULL,
  name text NOT NULL,
  zone_id text REFERENCES zones(id) ON UPDATE CASCADE ON DELETE SET NULL,
  lifecycle_status text NOT NULL CHECK (lifecycle_status IN ('draft','active','archived')),
  review_status text NOT NULL CHECK (review_status IN ('pending','approved','rejected')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  observed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  geom geometry(MultiPolygon, 4326) NOT NULL,
  CONSTRAINT assets_geom_valid CHECK (ST_IsValid(geom))
);
CREATE INDEX assets_geom_gix ON assets USING gist (geom);
CREATE INDEX assets_zone_status_idx ON assets(zone_id, review_status);

CREATE TABLE facilities (
  id text PRIMARY KEY,
  name text NOT NULL,
  facility_type text NOT NULL,
  geom geometry(Point, 4326) NOT NULL,
  CONSTRAINT facilities_geom_valid CHECK (ST_IsValid(geom))
);
CREATE INDEX facilities_geom_gix ON facilities USING gist (geom);

CREATE TABLE survey_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON UPDATE CASCADE ON DELETE CASCADE,
  observed_at timestamptz NOT NULL,
  gps_accuracy_m numeric(8,2) CHECK (gps_accuracy_m IS NULL OR gps_accuracy_m >= 0),
  review_status text NOT NULL CHECK (review_status IN ('pending','approved','rejected')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX survey_asset_observed_idx ON survey_observations(asset_id, observed_at DESC);

CREATE TABLE sync_operations (
  operation_id uuid PRIMARY KEY,
  entity_type text NOT NULL DEFAULT 'asset' CHECK (entity_type IN ('asset')),
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create','update','delete')),
  base_version integer CHECK (base_version IS NULL OR base_version > 0),
  payload jsonb NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','applied','conflict','failed')),
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);
CREATE INDEX sync_operations_state_created_idx ON sync_operations(state, created_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER assets_set_updated_at
BEFORE UPDATE ON assets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
