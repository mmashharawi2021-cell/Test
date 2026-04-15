import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// @ts-ignore
import 'leaflet-draw';
// @ts-ignore
import 'leaflet-control-geocoder';
// @ts-ignore
import 'leaflet-routing-machine';
// @ts-ignore
import 'esri-leaflet';
// @ts-ignore
import shp from 'shpjs';
import './App.css';

const BASEMAPS = {
  OpenStreetMap: {
    label: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  Satellite: {
    label: 'Esri Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
  },
  Streets: {
    label: 'Esri Streets',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
  },
  Terrain: {
    label: 'Esri Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
  },
};

function MapControls({ onAddLayer }: { onAddLayer: (layer: L.Layer, name: string) => void }) {
  const map = useMap();

  useEffect(() => {
    // Add geocoder control
    // @ts-ignore
    L.Control.geocoder({ position: 'topright' }).addTo(map);

    // Draw tools
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // @ts-ignore
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polyline: true,
        polygon: true,
        rectangle: true,
        circle: true,
        marker: true,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
      },
    });

    map.addControl(drawControl);

    map.on('draw:created', (e: any) => {
      drawnItems.addLayer(e.layer);
      onAddLayer(e.layer, `Drawn ${e.layerType}`);
    });

    // @ts-ignore
    const geoControl = L.control({ position: 'bottomright' });
    geoControl.onAdd = () => {
      const container = L.DomUtil.create('div', 'geo-btn');
      container.innerHTML = '<button type="button">📍 Locate Me</button>';
      container.onclick = () => {
        map.locate({ setView: true, maxZoom: 16 });
      };
      return container;
    };
    geoControl.addTo(map);

    map.on('locationfound', (e: any) => {
      L.marker(e.latlng).addTo(map).bindPopup('You are here').openPopup();
    });
  }, [map, onAddLayer]);

  return null;
}

function MapRefSetter({ onCreate }: { onCreate: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onCreate(map);
  }, [map, onCreate]);
  return null;
}

function App() {
  const [basemap, setBasemap] = useState<'OpenStreetMap' | 'Satellite' | 'Streets' | 'Terrain'>(
    'OpenStreetMap'
  );
  const [layers, setLayers] = useState<
    Array<{ id: string; name: string; layer: L.Layer; visible: boolean }>
  >([]);
  const [projectName, setProjectName] = useState('Geo Canvas Builder');
  const [projectDescription, setProjectDescription] = useState(
    'Create premium map interfaces with advanced layers, data upload, and builder controls.'
  );
  const [esriUrl, setEsriUrl] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const mapRef = useRef<L.Map | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !mapRef.current) return;

    if (file.name.endsWith('.geojson')) {
      const text = await file.text();
      const geojson = JSON.parse(text);
      const layer = L.geoJSON(geojson, {
        style: { color: '#14b8a6', weight: 3 },
      }).addTo(mapRef.current);
      setLayers((prev) => [
        ...prev,
        { id: crypto.randomUUID(), name: file.name, layer, visible: true },
      ]);
      mapRef.current.fitBounds(layer.getBounds());
    } else if (file.name.endsWith('.zip')) {
      const arrayBuffer = await file.arrayBuffer();
      const geojson = await shp(arrayBuffer);
      const layer = L.geoJSON(geojson as any, {
        style: { color: '#f97316', weight: 2 },
      }).addTo(mapRef.current);
      setLayers((prev) => [
        ...prev,
        { id: crypto.randomUUID(), name: file.name, layer, visible: true },
      ]);
      mapRef.current.fitBounds(layer.getBounds());
    }

    event.target.value = '';
  };

  const addEsriLayer = () => {
    if (!esriUrl || !mapRef.current) return;
    // @ts-ignore
    const layer = L.esri.featureLayer({ url: esriUrl }).addTo(mapRef.current);
    setLayers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: 'Esri Layer', layer, visible: true },
    ]);
    setEsriUrl('');
  };

  const handleAddLayer = (layer: L.Layer, name: string) => {
    setLayers((prev) => [...prev, { id: crypto.randomUUID(), name, layer, visible: true }]);
  };

  const layerCount = layers.length;
  const activeLayerCount = layers.filter((item) => item.visible).length;
  const projectCards = [
    { title: 'Active Layers', value: activeLayerCount, color: 'blue' },
    { title: 'Uploaded Files', value: layerCount, color: 'teal' },
    { title: 'Map Widgets', value: 6, color: 'purple' },
    { title: 'Project Score', value: 'A+', color: 'gold' },
  ];
  const sampleProjects = [
    { project: 'Road Clearance', governorate: 'North Gaza', status: 'Active' },
    { project: 'Health Facilities', governorate: 'Gaza', status: 'Published' },
    { project: 'Water Distribution', governorate: 'Khan Yunis', status: 'Draft' },
    { project: 'Education Analytics', governorate: 'Middle', status: 'Active' },
  ];

  const toggleLayer = (id: string) => {
    setLayers((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (item.visible) {
          item.layer.remove();
        } else if (mapRef.current) {
          item.layer.addTo(mapRef.current);
        }
        return { ...item, visible: !item.visible };
      })
    );
  };

  const removeLayer = (id: string) => {
    setLayers((prev) => {
      const next = prev.filter((item) => {
        if (item.id === id) {
          item.layer.remove();
          return false;
        }
        return true;
      });
      return next;
    });
  };

  const saveProject = () => {
    localStorage.setItem(
      'geo-canvas-project',
      JSON.stringify({
        projectName,
        projectDescription,
        basemap,
        savedAt: new Date().toISOString(),
      })
    );
    setSaveMessage('Project saved in browser local storage.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const loadProject = () => {
    const stored = localStorage.getItem('geo-canvas-project');
    if (!stored) return;
    const data = JSON.parse(stored);
    setProjectName(data.projectName || projectName);
    setProjectDescription(data.projectDescription || projectDescription);
    setBasemap(data.basemap || basemap);
    setSaveMessage('Project loaded from local storage.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <div className="builder-app">
      <aside className="builder-sidebar">
        <div className="brand-panel">
          <span className="logo">Geo Canvas</span>
          <p>{projectDescription}</p>
        </div>

        <section className="panel">
          <h3>Project Settings</h3>
          <label>Project Name</label>
          <input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
          <label>Project Description</label>
          <textarea
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            rows={3}
          />
          <div className="button-row">
            <button onClick={saveProject}>Save Project</button>
            <button className="secondary" onClick={loadProject}>
              Load
            </button>
          </div>
          {saveMessage && <div className="message">{saveMessage}</div>}
        </section>

        <section className="panel">
          <h3>Data & Layers</h3>
          <label>Upload GeoJSON / Shapefile</label>
          <input type="file" accept=".geojson,.zip" onChange={handleFileUpload} />
          <label>Esri Feature Service</label>
          <input
            value={esriUrl}
            placeholder="Paste Esri URL"
            onChange={(e) => setEsriUrl(e.target.value)}
          />
          <button onClick={addEsriLayer}>Add Esri Layer</button>
        </section>

        <section className="panel">
          <h3>Layer Manager</h3>
          <div className="layer-list">
            {layers.length === 0 && <p className="small-text">No active layers yet.</p>}
            {layers.map((item) => (
              <div key={item.id} className="layer-item">
                <span>{item.name}</span>
                <div>
                  <button onClick={() => toggleLayer(item.id)}>
                    {item.visible ? 'Hide' : 'Show'}
                  </button>
                  <button className="danger" onClick={() => removeLayer(item.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </aside>

      <main className="builder-main">
        <section className="main-top">
          <div className="map-panel">
            <div className="map-toolbar">
              <div>
                <span className="map-badge">LIVE</span>
                <span>Interactive Map Workspace</span>
              </div>
              <div>
                <button>Preview</button>
                <button className="secondary">Export</button>
              </div>
            </div>
            <div className="builder-map-frame">
              <MapContainer
                center={[24.774265, 46.738586]}
                zoom={5}
                className="builder-map"
              >
                <MapRefSetter onCreate={(map) => (mapRef.current = map)} />
                <TileLayer
                  key={basemap}
                  attribution={BASEMAPS[basemap].attribution}
                  url={BASEMAPS[basemap].url}
                />
                <MapControls onAddLayer={handleAddLayer} />
              </MapContainer>
            </div>
          </div>

          <aside className="dashboard-panel">
            <div className="dashboard-header">
              <h2>Project Overview</h2>
              <small>Live analytics for the map builder</small>
            </div>
            <div className="overview-cards">
              {projectCards.map((card) => (
                <div key={card.title} className={`overview-card ${card.color}`}>
                  <span>{card.title}</span>
                  <strong>{card.value}</strong>
                </div>
              ))}
            </div>
            <div className="kpi-card">
              <h3>Main Insights</h3>
              <div className="kpi-grid">
                <div>
                  <span>Total Length</span>
                  <strong>58.18 km</strong>
                </div>
                <div>
                  <span>Data Points</span>
                  <strong>1,362</strong>
                </div>
                <div>
                  <span>Active Widgets</span>
                  <strong>12</strong>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="main-bottom">
          <div className="chart-panel">
            <h3>Project Status</h3>
            <div className="chart-grid">
              <div className="chart-card small">
                <h4>Completion</h4>
                <div className="chart-value">72%</div>
                <div className="chart-bar">
                  <div style={{ width: '72%' }}></div>
                </div>
              </div>
              <div className="chart-card small">
                <h4>Layer Coverage</h4>
                <div className="chart-value">{layerCount * 10}%</div>
                <div className="chart-bar">
                  <div style={{ width: `${Math.min(layerCount * 10, 100)}%` }}></div>
                </div>
              </div>
              <div className="chart-card medium">
                <h4>Latest Published Projects</h4>
                <ul>
                  {sampleProjects.map((row) => (
                    <li key={row.project}>
                      <strong>{row.project}</strong>
                      <span>
                        {row.governorate} · {row.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="table-panel">
            <h3>Recent Project Data</h3>
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Governorate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sampleProjects.map((row) => (
                  <tr key={row.project}>
                    <td>{row.project}</td>
                    <td>{row.governorate}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
