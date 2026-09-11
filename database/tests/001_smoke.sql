-- Run after migrations + seed. Any failed assertion raises an error.
DO $$
DECLARE
  invalid_assets integer;
  asset_count integer;
BEGIN
  SELECT count(*) INTO invalid_assets FROM assets WHERE NOT ST_IsValid(geom);
  IF invalid_assets <> 0 THEN
    RAISE EXCEPTION 'invalid asset geometries: %', invalid_assets;
  END IF;

  SELECT count(*) INTO asset_count FROM assets;
  IF asset_count < 3 THEN
    RAISE EXCEPTION 'expected seeded assets, got %', asset_count;
  END IF;
END $$;

-- Exact spatial predicate should return at least one feature for the training envelope.
SELECT count(*) AS intersecting_assets
FROM assets
WHERE geom && ST_MakeEnvelope(35.200,31.890,35.220,31.910,4326)
  AND ST_Intersects(geom, ST_MakeEnvelope(35.200,31.890,35.220,31.910,4326));
