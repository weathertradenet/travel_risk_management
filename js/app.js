
const ICON_KEYS = [
  'flood','hurricane','rainfall','heatwave','drought','wildfire',
  'water_stress','water_quality','historical_financial_loss','insurance_claims','vulnerability_index'
];

const LEGEND_LABELS = {
  flood: 'Flood',
  hurricane: 'Hurricane',
  rainfall: 'Rainfall',
  heatwave: 'Heat Waves',
  drought: 'Drought',
  wildfire: 'Wildfire',
  water_stress: 'Water stress',
  water_quality: 'Water quality',
  historical_financial_loss: 'Historical financial loss',
  insurance_claims: 'Insurance claims',
  vulnerability_index: 'Vulnerability index'
};

const SCALE_STEPS = [
  {label:'0%',color:'#eef2f6'},{label:'<1%',color:'#dbe5ef'},{label:'<5%',color:'#c5d4e3'},{label:'<10%',color:'#acc1d6'},
  {label:'<20%',color:'#8ba8c2'},{label:'<30%',color:'#6789aa'},{label:'<40%',color:'#456987'},{label:'>40%',color:'#183b63'}
];

function exposureColor(pct) {
  if (pct <= 0) return '#eef2f6';
  if (pct < 1) return '#dbe5ef';
  if (pct < 5) return '#c5d4e3';
  if (pct < 10) return '#acc1d6';
  if (pct < 20) return '#8ba8c2';
  if (pct < 30) return '#6789aa';
  if (pct < 40) return '#456987';
  return '#183b63';
}

function buildLegend() {
  const grid = document.getElementById('legend-grid');
  ICON_KEYS.forEach(key => {
    const div = document.createElement('div');
    div.className = 'legend-item';
    div.innerHTML = `<span class="legend-icon"><img src="icons/${key}.svg" alt="${LEGEND_LABELS[key]}"></span>${LEGEND_LABELS[key]}`;
    grid.appendChild(div);
  });

  const scale = document.getElementById('scale');
  SCALE_STEPS.forEach(step => {
    const col = document.createElement('div');
    col.innerHTML = `<div class="swatch" style="background:${step.color}"></div><div class="scale-label">${step.label}</div>`;
    scale.appendChild(col);
  });
}

function cardHTML(city) {
  const anchorX = city.side === 'left' ? 446 : 74;
  const rowsIcons = ICON_KEYS.map(key =>
    `<div class="metric"><span class="icon"><img src="icons/${key}.svg" alt="${LEGEND_LABELS[key]}"></span></div>`
  ).join('');
  const rowsValues = ICON_KEYS.map(key =>
    `<div class="metric"><span class="value">${city.metrics[key][0]}</span></div>`
  ).join('');
  return `
    <div class="line-card" style="--anchor-x:${anchorX}px;">
      <div class="line-title">${city.place}</div>
      <div class="line-horizontal"></div>
      <div class="line-vertical"></div>
      <div class="line-dot"></div>
      <div class="metric-row icons">${rowsIcons}</div>
      <div class="metric-row values">${rowsValues}</div>
    </div>
  `;
}

async function main() {
  buildLegend();

  const [locationsRes, municipalitiesRes] = await Promise.all([
    fetch('data/locations.json'),
    fetch('data/municipalities.geojson')
  ]);
  const locations = await locationsRes.json();
  const municipalities = await municipalitiesRes.json();

  const lightGray = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution:'&copy; OpenStreetMap contributors &copy; CARTO', maxZoom:20
  });
  const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution:'Tiles &copy; Esri', maxZoom:19
  });

  const map = L.map('map', { zoomControl:false, scrollWheelZoom:true, layers:[lightGray] }).setView([0,70], 2);
  L.control.zoom({ position:'topright' }).addTo(map);
  L.control.layers({ 'Simplistic':lightGray, 'Satellite':satellite }, null, { position:'bottomright', collapsed:true }).addTo(map);

  const municipalityLayer = L.geoJSON(municipalities, {
    style: feature => {
      const pct = feature.properties.exposure_pct;
      const color = exposureColor(pct);
      return { color, weight: 1.2, fillColor: color, fillOpacity: 0.32, className:'municipality' };
    }
  }).addTo(map);

  const overlays = [];
  Object.entries(locations).forEach(([name, city]) => {
    L.circleMarker([city.lat, city.lng], {
      radius:5, color:'#ffffff', weight:2, fillColor:'#183b63', fillOpacity:1
    }).addTo(map);

    const anchorX = city.side === 'left' ? 446 : 74;
    const marker = L.marker([city.lat, city.lng], {
      interactive:false,
      icon: L.divIcon({
        className:'city-overlay',
        html: cardHTML(city),
        iconSize:[520,168],
        iconAnchor:[anchorX,162]
      })
    });
    overlays.push(marker);
  });

  const allLatLngs = [];
  municipalityLayer.eachLayer(layer => {
    const bounds = layer.getBounds();
    allLatLngs.push(bounds.getSouthWest(), bounds.getNorthEast());
  });
  map.fitBounds(L.latLngBounds(allLatLngs).pad(0.12));

  function updateCardsVisibility() {
    const show = map.getZoom() > 6;
    overlays.forEach(m => {
      if (show) {
        if (!map.hasLayer(m)) m.addTo(map);
      } else {
        if (map.hasLayer(m)) map.removeLayer(m);
      }
    });
  }
  updateCardsVisibility();
  map.on('zoomend', updateCardsVisibility);
}

main().catch(err => {
  console.error(err);
  alert('Unable to load project data. Run this project with a local web server, for example: python -m http.server 8000');
});
