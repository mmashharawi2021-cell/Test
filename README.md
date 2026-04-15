# Geo Canvas

A luxurious web application for creating and displaying interactive map interfaces, inspired by Esri's mapping experiences.

This project uses React, TypeScript, Vite, and Leaflet with advanced plugins for a comprehensive mapping tool.

## Features

- **Interactive Map**: Pan, zoom, and explore maps worldwide
- **Multiple Basemaps**: Switch between OpenStreetMap, Satellite, Streets, and Terrain views
- **Drawing Tools**: Add markers, lines, polygons, and shapes directly on the map
- **Geocoding Search**: Search for locations and navigate to them
- **Geolocation**: Find your current location on the map
- **Layer Management**: Add and manage multiple data layers
- **Data Import**: Upload GeoJSON files or shapefiles (.zip) to display custom data
- **Esri Integration**: Add Esri feature layers by URL for professional GIS data
- **Responsive Design**: Works on desktop and mobile devices
- **Admin Canvas**: Designed for administrators to build map interfaces and share links

## Technologies Used

- [React](https://react.dev/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vite.dev/) - Build tool
- [Leaflet](https://leafletjs.com/) - Core mapping library
- [React Leaflet](https://react-leaflet.js.org/) - React integration
- [Leaflet Draw](https://leaflet.github.io/Leaflet.draw/) - Drawing tools
- [Leaflet Control Geocoder](https://github.com/perliedman/leaflet-control-geocoder) - Search functionality
- [Esri Leaflet](https://esri.github.io/esri-leaflet/) - Esri service integration
- [Leaflet Providers](https://leaflet-extras.github.io/leaflet-providers/) - Additional basemaps
- [shpjs](https://github.com/calvinmetcalf/shp.js/) - Shapefile parsing

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

Start the development server:

```bash
npm run dev
```

Open [http://localhost:5176](http://localhost:5176) in your browser to view the application.

### Building for Production

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## Usage

1. **Navigate the Map**: Use mouse to pan and zoom
2. **Switch Basemaps**: Use the layers control in the top-right
3. **Search Locations**: Use the search box in the top-left
4. **Draw Shapes**: Use the drawing tools in the top-left to add markers, lines, etc.
5. **Upload Data**: Use the sidebar to upload GeoJSON or shapefiles
6. **Add Esri Layers**: Enter an Esri feature service URL and click "Add Layer"
7. **Geolocate**: Click the "📍 Locate Me" button to find your position

## Data Sources

- **GeoJSON**: Standard format for geographic data
- **Shapefiles**: Compressed .zip files containing shapefile data
- **Esri Services**: URLs to ArcGIS feature services (e.g., from ArcGIS Online or Enterprise)
  import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
globalIgnores(['dist']),
{
files: ['**/*.{ts,tsx}'],
extends: [
// Other configs...
// Enable lint rules for React
reactX.configs['recommended-typescript'],
// Enable lint rules for React DOM
reactDom.configs.recommended,
],
languageOptions: {
parserOptions: {
project: ['./tsconfig.node.json', './tsconfig.app.json'],
tsconfigRootDir: import.meta.dirname,
},
// other options...
},
},
])

```

```
