import { useEffect } from 'react';
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
import 'leaflet-providers';
// @ts-ignore
import * as shp from 'shpjs';
import './App.css';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapControls() {
  const map = useMap();

  useEffect(() => {
    // Add geocoder
    // @ts-ignore
    L.Control.geocoder().addTo(map);

    // Add draw control
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    // @ts-ignore
    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup: drawnItems,
      },
    });
    map.addControl(drawControl);

    map.on('draw:created', (e: any) => {
      drawnItems.addLayer(e.layer);
    });

    // Add layer control
    const baseLayers = {
      OpenStreetMap: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
      // @ts-ignore
      Satellite: L.tileLayer.provider('Esri.WorldImagery'),
      // @ts-ignore
      Streets: L.tileLayer.provider('Esri.WorldStreetMap'),
      // @ts-ignore
      Terrain: L.tileLayer.provider('Esri.WorldTerrain'),
    };
    const overlays = {
      'Drawn Items': drawnItems,
    };
    // @ts-ignore
    L.control.layers(baseLayers, overlays).addTo(map);

    // Geolocation button
    // @ts-ignore
    const geoBtn = L.control({ position: 'topright' });
    geoBtn.onAdd = () => {
      const div = L.DomUtil.create('div', 'geo-btn');
      div.innerHTML = '<button>📍 Locate Me</button>';
      div.onclick = () => {
        map.locate({ setView: true, maxZoom: 16 });
      };
      return div;
    };
    geoBtn.addTo(map);

    map.on('locationfound', (e: any) => {
      L.marker(e.latlng).addTo(map).bindPopup('You are here').openPopup();
    });

    // Store map for file upload
    (window as any).map = map;
  }, [map]);

  return null;
}

function App() {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const map = (window as any).map;
    if (!map) return;

    if (file.name.endsWith('.geojson')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const geojson = JSON.parse(event.target?.result as string);
        L.geoJSON(geojson).addTo(map);
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.zip')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        shp(arrayBuffer).then((geojson: any) => {
          L.geoJSON(geojson).addTo(map);
        });
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const addEsriLayer = () => {
    const url = (document.getElementById('esri-url') as HTMLInputElement).value;
    if (url) {
      const map = (window as any).map;
      // @ts-ignore
      L.esri.featureLayer({ url }).addTo(map);
    }
  };

  return (
    <div className="app">
      <div className="sidebar">
        <h2>Geo Canvas</h2>
        <div className="control-group">
          <label>Upload GeoJSON or Shapefile (.zip)</label>
          <input type="file" accept=".geojson,.zip" onChange={handleFileUpload} />
        </div>
        <div className="control-group">
          <label>Add Esri Feature Layer</label>
          <input type="text" id="esri-url" placeholder="https://..." />
          <button onClick={addEsriLayer}>Add Layer</button>
        </div>
        <div className="control-group">
          <p>Use the map controls to draw shapes, search locations, and switch basemaps.</p>
        </div>
      </div>
      <div className="map-container">
        <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapControls />
        </MapContainer>
      </div>
    </div>
  );
}

export default App;
