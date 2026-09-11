# Version matrix

تاريخ المراجعة: 2026-09-12.

هذه المصفوفة تفصل بين **إصدارات مرجعية حالية** وبين ما تم اختباره محليًا في جلسة إعداد الكتاب. لا ينبغي للكتاب أن يَعِد بأن كل إصدار مستقبلي متوافق دون إعادة تشغيل الاختبارات.

| Component | Reference/current target | Local verification in this review |
|---|---:|---:|
| PostgreSQL | 18.6 | SQL static review only; no local server |
| PostGIS | 3.6.4 / Docker `18-3.6` | SQL static review only; no local PostGIS |
| FastAPI | 0.141.x | Python syntax checked |
| MapLibre GL JS | 6.1.x | TypeScript syntax checked |
| GeoPandas | 1.1.4 | ETL executed |
| Shapely | 2.1.2 | geometry validation executed |
| pyproj | 3.7.2 | installed locally |
| GDAL | 3.13.3 | reference only in this package |
| STAC | 1.1.0 | specification reference |

## Publication rule
Before tagging a book release, CI must run against the repository's pinned/locked dependency set and the tag used by the printed edition must be recorded in the book.
