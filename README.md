
# Environmental Risk Dashboard

## Run locally
Because the app loads external JSON and GeoJSON files, open it through a small local web server.

### Option 1
```bash
cd environmental_risk_dashboard_final_project
python -m http.server 8000
```

Then open:
`http://localhost:8000`

### Project structure
- `index.html`
- `css/styles.css`
- `js/app.js`
- `data/locations.json` — all editable per-location metrics
- `data/municipalities.geojson` — editable municipality polygons used by the app
- `icons/` — SVG icon family
- `shapefiles/` — exported polygon shapefile set (proxy municipality boundaries)

## Notes
- Values for each location are stored only in `data/locations.json`.
- Municipality polygons are editable in `data/municipalities.geojson`.
