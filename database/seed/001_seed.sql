INSERT INTO zones(id,name,geom) VALUES
('Z-A','منطقة ألف', ST_Multi(ST_GeomFromText('POLYGON((35.200 31.890,35.220 31.890,35.220 31.910,35.200 31.910,35.200 31.890))',4326))),
('Z-B','منطقة باء', ST_Multi(ST_GeomFromText('POLYGON((35.220 31.890,35.240 31.890,35.240 31.910,35.220 31.910,35.220 31.890))',4326)));
INSERT INTO assets(external_id,name,zone_id,lifecycle_status,review_status,observed_at,geom) VALUES
('A-001','أصل تدريبي 1','Z-A','active','approved','2026-08-01T09:00:00Z',ST_Multi(ST_GeomFromText('POLYGON((35.204 31.895,35.206 31.895,35.206 31.897,35.204 31.897,35.204 31.895))',4326))),
('A-002','أصل تدريبي 2','Z-A','active','pending','2026-08-02T09:00:00Z',ST_Multi(ST_GeomFromText('POLYGON((35.210 31.899,35.212 31.899,35.212 31.901,35.210 31.901,35.210 31.899))',4326))),
('A-003','أصل تدريبي 3','Z-B','active','rejected','2026-08-03T09:00:00Z',ST_Multi(ST_GeomFromText('POLYGON((35.226 31.897,35.228 31.897,35.228 31.899,35.226 31.899,35.226 31.897))',4326)));
