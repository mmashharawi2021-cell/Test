from __future__ import annotations

import os
from typing import Literal

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from psycopg import connect
from psycopg.rows import dict_row

from domain import parse_bbox

app = FastAPI(title="GeoSmart Assets API", version="0.2.0")

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required")

origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready():
    try:
        with connect(DATABASE_URL) as conn:
            conn.execute("SELECT 1").fetchone()
    except Exception as exc:
        raise HTTPException(status_code=503, detail={"code": "database_unavailable"}) from exc
    return {"status": "ready"}


@app.get("/assets")
def list_assets(
    request: Request,
    bbox: str | None = Query(default=None, description="minx,miny,maxx,maxy in EPSG:4326"),
    status: Literal["pending", "approved", "rejected"] | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    where: list[str] = []
    params: list[object] = []
    if status:
        where.append("review_status = %s")
        params.append(status)
    if bbox:
        try:
            b = parse_bbox(bbox)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=400, detail={"code": "invalid_bbox"}) from exc
        where.append("geom && ST_MakeEnvelope(%s,%s,%s,%s,4326) AND ST_Intersects(geom, ST_MakeEnvelope(%s,%s,%s,%s,4326))")
        params.extend([b.minx, b.miny, b.maxx, b.maxy] * 2)
    sql = "SELECT external_id,name,review_status,ST_AsGeoJSON(geom, 7)::json AS geometry FROM assets"
    if where:
        sql += " WHERE " + " AND ".join(f"({w})" for w in where)
    sql += " ORDER BY external_id LIMIT %s OFFSET %s"
    params.extend([limit + 1, offset])
    with connect(DATABASE_URL, row_factory=dict_row) as conn:
        rows = conn.execute(sql, params).fetchall()
    has_next = len(rows) > limit
    rows = rows[:limit]
    features = [{"type":"Feature","id":r["external_id"],"geometry":r["geometry"],"properties":{"name":r["name"],"review_status":r["review_status"]}} for r in rows]
    links = [{"rel":"self","href":str(request.url)}]
    if has_next:
        links.append({"rel":"next","href":str(request.url.include_query_params(offset=offset+limit,limit=limit))})
    return JSONResponse(content={"type":"FeatureCollection","features":features,"links":links},media_type="application/geo+json")
