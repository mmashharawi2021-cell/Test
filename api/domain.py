from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class BBox:
    minx: float
    miny: float
    maxx: float
    maxy: float


def parse_bbox(value: str) -> BBox:
    parts = value.split(",")
    if len(parts) != 4:
        raise ValueError("bbox must contain four numbers")
    minx, miny, maxx, maxy = map(float, parts)
    if not (-180 <= minx < maxx <= 180 and -90 <= miny < maxy <= 90):
        raise ValueError("bbox is outside EPSG:4326 bounds or has invalid ordering")
    return BBox(minx, miny, maxx, maxy)


def can_approve(*, has_photo: bool, gps_accuracy_m: float | None, max_accuracy_m: float = 15.0) -> bool:
    return bool(has_photo and gps_accuracy_m is not None and 0 <= gps_accuracy_m <= max_accuracy_m)
