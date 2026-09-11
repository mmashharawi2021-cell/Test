from __future__ import annotations

from pathlib import Path
import json
from shapely.geometry import shape
from shapely.validation import explain_validity

REQUIRED_PROPERTIES = {"external_id", "name", "review_status", "version"}


def validate_geojson(path: str) -> list[dict[str, str]]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    errors: list[dict[str, str]] = []
    if data.get("type") != "FeatureCollection":
        return [{"id": "<document>", "error": "not_feature_collection"}]

    seen: set[str] = set()
    for idx, feature in enumerate(data.get("features", [])):
        feature_id = str(feature.get("id") or f"index:{idx}")
        props = feature.get("properties") or {}
        geom_data = feature.get("geometry")

        if feature_id in seen:
            errors.append({"id": feature_id, "error": "duplicate_feature_id"})
        seen.add(feature_id)

        missing = sorted(REQUIRED_PROPERTIES - props.keys())
        if missing:
            errors.append({"id": feature_id, "error": "missing_properties:" + ",".join(missing)})

        if geom_data is None:
            errors.append({"id": feature_id, "error": "missing_geometry"})
            continue
        try:
            geom = shape(geom_data)
        except Exception as exc:
            errors.append({"id": feature_id, "error": f"invalid_geometry_encoding:{type(exc).__name__}"})
            continue

        if geom.is_empty:
            errors.append({"id": feature_id, "error": "empty_geometry"})
        elif not geom.is_valid:
            errors.append({"id": feature_id, "error": "invalid_geometry:" + explain_validity(geom)})
        if geom.geom_type not in {"Polygon", "MultiPolygon"}:
            errors.append({"id": feature_id, "error": "unexpected_geometry_type:" + geom.geom_type})

    return errors


if __name__ == "__main__":
    print(json.dumps(validate_geojson("data/raw/buildings.geojson"), ensure_ascii=False, indent=2))
