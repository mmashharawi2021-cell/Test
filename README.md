# Spatial Software Engineering
## هندسة البرمجيات المكانية

**Official companion repository** for the book **«هندسة البرمجيات المكانية: من البيانات الجغرافية إلى التطبيقات الذكية»**.

**Author & Maintainer:** Eng. Mohanad Anwar Khalil Al-Mashharawi — Full-Stack GIS Developer

**Reference implementation:** `GeoSmart Assets` — an educational spatial intelligence platform that connects field data, validation, PostGIS, API services, Web GIS, offline workflows, dashboards, automation, testing, security, and optional GeoAI.

> Book manuscript copyright is separate from the companion code license. Synthetic training data has its own license. Third-party software and standards retain their original ownership and licenses.

---

# GeoSmart Assets — Companion Package v0.2

الحزمة المرجعية المصاحبة لكتاب «هندسة البرمجيات المكانية: من البيانات الجغرافية إلى التطبيقات الذكية».

> البيانات التدريبية اصطناعية ولا تمثل سجلات أو معالم حقيقية. بعض الإحداثيات تقع ضمن فضاء جغرافي حقيقي لأغراض شرح الخرائط فقط.

## ما تغير في v0.2
- تحديث بيئة PostgreSQL/PostGIS المرجعية.
- إضافة health checks وAPI container.
- إصلاح bbox ليستخدم `ST_Intersects` بعد prefilter مكاني.
- إضافة CORS صريح وready check وpagination بسيطة.
- تقوية التحقق من GeoJSON وETL.
- تحويل اختبار المجال إلى اختبار للكود الحقيقي بدل تعريف الدالة داخل الاختبار.
- إضافة CI لـPostGIS/Python/Web.
- إضافة المستودعات والمراجع الرسمية ومصفوفة الإصدارات وقائمة إصدار تقنية.
- فصل ترخيص الكود عن ترخيص Dataset.

## تشغيل كامل
1. انسخ `.env.example` إلى `.env` وغيّر كلمة المرور عند الحاجة.
2. شغّل: `docker compose up --build`.
3. تحقق من API: `http://localhost:8000/health` و`/ready` و`/docs`.
4. للويب: `cd web && npm install && npm run dev`.

## التحقق
- Python: `python -m compileall -q api python tests && pytest -q`
- ETL: `python python/validate_features.py && python python/etl.py`
- Web: `cd web && npm install && npm run build`
- Database: راجع `database/tests/001_smoke.sql` وGitHub Actions.

## مراجع رسمية
راجع `docs/OFFICIAL_REFERENCES.md`.

## ملاحظة امتثال
الـAPI في هذه الحزمة **تعليمي ومتأثر بممارسات OGC API - Features** لكنه لا يُوصف بأنه OGC-compliant ما لم تنفذ نقاط conformance المطلوبة ويُشغّل اختبار امتثال مناسب.
