import { GeoJSONSource, Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

const API_BASE = 'http://localhost:8000';
const map = new Map({
  container: 'map',
  style: 'https://demotiles.maplibre.org/style.json',
  center: [35.22, 31.90],
  zoom: 12,
});
let requestController: AbortController | null = null;
async function loadVisibleAssets() {
  const b = map.getBounds();
  const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(',');
  requestController?.abort();
  requestController = new AbortController();
  const res = await fetch(`${API_BASE}/assets?bbox=${encodeURIComponent(bbox)}&limit=500`, {signal: requestController.signal});
  if (!res.ok) throw new Error(`API ${res.status}`);
  const fc = await res.json();
  const source = map.getSource('assets') as GeoJSONSource | undefined;
  source?.setData(fc);
}
map.on('load', () => {
  map.addSource('assets', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({id:'assets-fill',type:'fill',source:'assets',paint:{'fill-opacity':0.45,'fill-outline-color':'#333'}});
  void loadVisibleAssets();
});
map.on('moveend', () => void loadVisibleAssets());
