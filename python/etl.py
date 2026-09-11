from __future__ import annotations
from pathlib import Path
import geopandas as gpd
RAW = Path("data/raw")
OUT = Path("data/processed")
OUT.mkdir(parents=True, exist_ok=True)
buildings = gpd.read_file(RAW / "buildings.geojson")
zones = gpd.read_file(RAW / "zones.geojson")
if buildings.crs is None or zones.crs is None:
    raise ValueError("All input layers must declare a CRS")
if buildings.crs != zones.crs:
    zones = zones.to_crs(buildings.crs)
joined = gpd.sjoin(buildings, zones[["zone_id", "geometry"]], how="left", predicate="within")
if joined.index.duplicated().any():
    raise ValueError("A building matched more than one zone; validate zone topology")
joined = joined.drop(columns=["index_right"], errors="ignore")
if joined.crs.to_epsg() != 4326:
    joined = joined.to_crs(4326)
output = OUT / "buildings_enriched.geojson"
joined.to_file(output, driver="GeoJSON")
print(f"processed={len(joined)} output={output}")
