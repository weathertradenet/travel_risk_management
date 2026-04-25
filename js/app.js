const ICON_KEYS = [
  'flood','hurricane','rainfall','heatwave','drought','wildfire',
  'water_stress','water_quality','historical_financial_loss','insurance_claims','vulnerability_index'
];

const LEGEND_LABELS = {
  flood: 'Flood',
  hurricane: 'Hurricane',
  rainfall: 'Extreme Rainfall',
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
  {label:'<10%',color:'#fcf5eb'},{label:'<20%',color:'#f9ecd7'},{label:'<30%',color:'#f5e2c3'},{label:'<40%',color:'#f2d9af'},{label:'>40%',color:'#efcf9b'}
];

let travelDataStore = {};

function exposureColor(pct) {
  if (pct < 10) return '#fcf5eb';
  if (pct < 20) return '#f9ecd7';
  if (pct < 30) return '#f5e2c3';
  if (pct < 40) return '#f2d9af';
  return '#efcf9b';
}

function normalizeName(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .trim()
    .toLowerCase();
}

function deriveFeatureName(feature) {
  const p = feature.properties || {};
  return p.place || p.municipality || p.city || p.gemname || p.prov_name || p.name || 'Unknown municipality';
}

function deriveRegionName(feature) {
  const p = feature.properties || {};
  return p.acom_name || p.prov_area_code || p.gde_nr || p.city || p.municipality || p.gemname || '–';
}

function buildLegend() {
  const grid = document.getElementById('legend-grid');
  const scale = document.getElementById('scale');
  if (!grid || !scale) return;
  grid.innerHTML = '';
  scale.innerHTML = '';
  ICON_KEYS.forEach(key => {
    const div = document.createElement('div');
    div.className = 'legend-item';
    div.innerHTML = `<span class="legend-icon"><img src="icons/${key}.svg" alt="${LEGEND_LABELS[key]}"></span>${LEGEND_LABELS[key]}`;
    grid.appendChild(div);
  });
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
  const rowsValues = ICON_KEYS.map(key => {
  const raw = city.metrics?.[key];
  const value = Array.isArray(raw) ? raw[0] : 'N/A';
  return `<div class="metric"><span class="value">${value}</span></div>`;
}).join('');
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

function makeFallbackCard(name, feature) {
  const p = feature.properties || {};
  return {
    municipality: name,
    place: name,
    exposure_pct: p.exposure_pct ?? 0,
    side_metrics: {
      natcat: ['N/A', 'N/A'],
      days: ['N/A', 'N/A'],
      airquality: ['N/A', 'N/A'],
      naturalspaces: ['N/A', 'N/A']
    },
    monthly_weather: {
      cloudy: [10, 9, 8, 7, 5, 3, 1, 2, 4, 6, 8, 10],
      rainy: [6, 5, 4, 4, 3, 1, 0, 1, 3, 5, 6, 7],
      windy: [7, 6, 6, 5, 4, 3, 3, 3, 4, 5, 6, 7]
    },
    metrics: {
      flood: ['N/A', 'N/A'],
      hurricane: ['N/A', 'N/A'],
      rainfall: ['N/A', 'N/A'],
      heatwave: ['N/A', 'N/A'],
      drought: ['N/A', 'N/A'],
      wildfire: ['N/A', 'N/A'],
      water_stress: ['N/A', 'N/A'],
      water_quality: ['N/A', 'N/A'],
      historical_financial_loss: ['N/A', 'N/A'],
      insurance_claims: ['N/A', 'N/A'],
      vulnerability_index: ['N/A', 'N/A']
}
  };
}

function formatMetric(raw) {
  if (Array.isArray(raw)) {
    const clean = raw.filter(v => v !== undefined && v !== null && String(v).trim() !== '');
    return clean.length ? clean.join(' / ') : 'N/A';
  }
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    return String(raw);
  }

  return 'N/A';
}

function getMonthlyWeather(locationData) {
  if (
    locationData &&
    locationData.monthly_weather &&
    Array.isArray(locationData.monthly_weather.cloudy) &&
    Array.isArray(locationData.monthly_weather.rainy) &&
    Array.isArray(locationData.monthly_weather.windy)
  ) {
    return locationData.monthly_weather;
  }

  console.warn('Missing monthly_weather for selected location:', locationData);

  return {
    cloudy: new Array(12).fill(0),
    rainy: new Array(12).fill(0),
    windy: new Array(12).fill(0)
  };
}

function updateInfoPanel(name, feature, locationData) {
  const region = deriveRegionName(feature);
  const card = locationData || makeFallbackCard(name, feature);

  const sideMetrics = card.side_metrics || {};
  const metrics = card.metrics || {};

    const selectedNameEl = document.getElementById('selected-name');
    const selectedRegionEl = document.getElementById('selected-region');
    const selectedExposureEl = document.getElementById('selected-exposure');

    if (selectedNameEl) selectedNameEl.textContent = name;
    if (selectedRegionEl) selectedRegionEl.textContent = String(region);
    if (selectedExposureEl) selectedExposureEl.textContent = `${card.exposure_pct ?? 0}%`;

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  const daysValue = formatMetric(sideMetrics.days);
  const natcatValue = formatMetric(sideMetrics.natcat);
  const airqualityValue = formatMetric(sideMetrics.airquality || sideMetrics['air-quality']);
  const naturalspacesValue = formatMetric(sideMetrics.naturalspaces || sideMetrics['natural-spaces']);
  const vulnerabilityValue = formatMetric(metrics.vulnerability_index);
  const lossValue = formatMetric(metrics.historical_financial_loss);

  // Desktop cards
  setText('metric-days', daysValue);
  setText('metric-natcat', natcatValue);
  setText('metric-airquality', airqualityValue);
  setText('metric-naturalspaces', naturalspacesValue);
  setText('metric-vulnerability', vulnerabilityValue);
  setText('metric-loss', lossValue);

  // Mobile compact cards
  setText('metric-days-mobile', daysValue);
  setText('metric-natcat-mobile', natcatValue);
  setText('metric-airquality-mobile', airqualityValue);
  setText('metric-naturalspaces-mobile', naturalspacesValue);
  setText('metric-vulnerability-mobile', vulnerabilityValue);
  setText('metric-loss-mobile', lossValue);
}

function setSelectedButton(name) {
  let key = normalizeName(name);

  // Geneva aliases
  if (
    key === normalizeName('Genève') ||
    key === normalizeName('Geneve')
  ) {
    key = normalizeName('Geneva');
  }

  // Malaga aliases
  if (
    key === normalizeName('Málaga') ||
    key === normalizeName('Malaga') ||
    key === normalizeName('Costa del Sol')
  ) {
    key = normalizeName('Málaga');
  }

  document.querySelectorAll('.municipality-button').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.key === key);
  });
}

function initTabs() {
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const target = button.dataset.target;
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(target).classList.add('active');

      if (target === 'tab-main' && window._leafletMap) {
        setTimeout(() => window._leafletMap.invalidateSize(), 50);
      }
    });
  });
}

function initClickableTimelineEvents() {
  const events = document.querySelectorAll('.clickable-event');
  if (!events.length) return;

  events.forEach(event => {
    event.addEventListener('click', () => {
      selectTimelineEvent(event);
    });
  });
}

function selectTimelineEvent(event) {
  document.querySelectorAll('.clickable-event').forEach(item => {
    item.classList.remove('selected-timeline-event');
  });

  event.classList.add('selected-timeline-event');
}

function initRadarCardMobileToggle() {
  const card = document.getElementById('climate-radar-card');
  if (!card) return;

  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

  function applyInitialState() {
    if (isMobile()) {
      card.classList.add('radar-collapsed');
      card.classList.remove('radar-expanded');
    } else {
      card.classList.remove('radar-collapsed');
      card.classList.remove('radar-expanded');
    }
  }

  card.addEventListener('click', event => {
    if (!isMobile()) return;

    event.stopPropagation();

    if (card.classList.contains('radar-collapsed')) {
      card.classList.remove('radar-collapsed');
      card.classList.add('radar-expanded');
    } else {
      card.classList.add('radar-collapsed');
      card.classList.remove('radar-expanded');
    }
  });

  window.addEventListener('resize', applyInitialState);
  applyInitialState();
}

function initMobileLegendToggle() {
  const legend = document.getElementById('map-legend');
  const toggle = document.getElementById('mobile-legend-toggle');

  if (!legend || !toggle) return;

  toggle.addEventListener('click', event => {
    event.stopPropagation();
    legend.classList.toggle('legend-open');
  });
}

function updateMobileSelectedDetails(name, locationData) {
  const titleEl = document.getElementById('mobile-selected-title');
  const gridEl = document.getElementById('mobile-selected-grid');

  if (!titleEl || !gridEl) return;

  const metrics = locationData?.metrics || {};

  titleEl.textContent = name || 'Selected location';

  const items = [
    ['Flood', metrics.flood],
    ['Rainfall', metrics.rainfall],
    ['Heatwave', metrics.heatwave],
    ['Drought', metrics.drought],
    ['Water stress', metrics.water_stress],
    ['Water quality', metrics.water_quality],
    ['Insurance claims', metrics.insurance_claims],
    ['Historical loss', metrics.historical_financial_loss],
    ['Vulnerability', metrics.vulnerability_index]
  ];

  gridEl.innerHTML = items.map(([label, value]) => `
    <div class="mobile-selected-item">
      <div class="mobile-selected-label">${label}</div>
      <div class="mobile-selected-value">${formatMetric(value)}</div>
    </div>
  `).join('');
}

function getTravelNumber(data, keys, fallback = 0) {
  for (const key of keys) {
    const value = data?.[key];

    if (value !== undefined && value !== null && value !== '') {
      return Number(value) || fallback;
    }
  }

  return fallback;
}

function getTravelSummaryNumber(summary, keys, fallback = 0) {
  for (const key of keys) {
    const value = summary?.[key];

    if (value !== undefined && value !== null && value !== '') {
      return Number(value) || fallback;
    }
  }

  return fallback;
}

function hazardIcon(type) {
  const key = normalizeName(type);

  if (key.includes('tornado')) return '🌪';
  if (key.includes('hail')) return '⛈';
  if (key.includes('wind')) return '💨';
  if (key.includes('rain')) return '🌧';
  if (key.includes('heat')) return '🌡';
  if (key.includes('flood')) return '🌊';
  if (key.includes('hurricane')) return '🌀';

  return '⚠';
}

function heatClass(value, low, high) {
  const n = Number(value) || 0;

  if (n >= high) return 'heat-high';
  if (n >= low) return 'heat-mid';
  return 'heat-low';
}

function roomStatusClass(data) {
  return data?.summary?.enough_rooms_for_people_who_cannot_leave
    ? 'status-ok'
    : 'status-critical';
}

function renderTimelineFromTravelData() {
  const container = document.getElementById('incident-heatmap');
  if (!container) return;

  const entries = Object.entries(travelDataStore || {});

  if (!entries.length) {
    container.innerHTML = `<div class="incident-empty">No travel data loaded</div>`;
    return;
  }

  container.innerHTML = `
    <div class="incident-heatmap-header">
      <div>Time</div>
      <div>City</div>
      <div>Hazard</div>

      <div class="heatmap-help">
        Travelers
        <span class="heatmap-tooltip">Travelers affected by the disruption during the selected time window.</span>
      </div>

      <div class="heatmap-help">
        Flights
        <span class="heatmap-tooltip">Number of disrupted flights linked to this city and hazard during the selected time window.</span>
      </div>

      <div class="heatmap-help">
        Seats
        <span class="heatmap-tooltip">Total seats available on the next possible replacement flights.</span>
      </div>

      <div class="heatmap-help">
        No seats
        <span class="heatmap-tooltip">Travelers who cannot be accommodated on the next available flights because there are not enough seats.</span>
      </div>

      <div class="heatmap-help">
        Need hotel
        <span class="heatmap-tooltip">Travelers who need another hotel because they cannot leave and their current hotel cannot keep them.</span>
      </div>

      <div class="heatmap-help">
        Rooms
        <span class="heatmap-tooltip">Rooms available for the next 24 hours.</span>
      </div>

      <div class="heatmap-help">
        Status
        <span class="heatmap-tooltip">Operational status based on whether available rooms are enough for travelers who cannot leave.</span>
      </div>
    </div>

    ${entries.map(([key, cityData], index) => {
      const summary = cityData.summary || {};

      const city = cityData.city || cityData.selected_city || key;
      const disruption = cityData.disruption_type || 'Disruption';
      const timeWindow = cityData.time_window || '–';

      const travelersAffected = getTravelNumber(cityData, [
        'travelers_affected_next_3h',
        'travelers_affected_next',
        'travelers_affected'
      ]);

      const disruptedFlights = getTravelNumber(cityData, [
        'disrupted_flights_count'
      ]);

      const seatsAvailable = getTravelSummaryNumber(summary, [
        'total_next_two_flights_available_seats'
      ]);

      const notAccommodated = getTravelSummaryNumber(summary, [
        'total_people_not_accommodated_on_next_two_flights',
        'total_people_not_accommodated_on_next_flights'
      ]);

      const needHotel = getTravelSummaryNumber(summary, [
        'total_people_needing_another_hotel_next_24h',
        'total_people_needing_another_hotel'
      ]);

      const roomsTotal = getTravelSummaryNumber(summary, [
        'rooms_available_next_24h_total'
      ]);

      const statusLabel = cityData.summary?.enough_rooms_for_people_who_cannot_leave
        ? 'OK'
        : 'Critical';

      return `
        <button
          class="incident-row clickable-event ${index === 0 ? 'selected-timeline-event' : ''}"
          type="button"
          data-time="${timeWindow}"
          data-place="${city}"
          data-location="${city}"
        >
          <div class="incident-time">${timeWindow}</div>
          <div class="incident-city">${city}</div>
          <div class="incident-hazard">
            <span class="incident-hazard-icon">${hazardIcon(disruption)}</span>
            <span>${disruption}</span>
          </div>

          <div class="incident-cell ${heatClass(travelersAffected, 800, 1500)}">
            ${travelersAffected.toLocaleString()}
          </div>

          <div class="incident-cell ${heatClass(disruptedFlights, 5, 10)}">
            ${disruptedFlights.toLocaleString()}
          </div>

          <div class="incident-cell heat-good">
            ${seatsAvailable.toLocaleString()}
          </div>

          <div class="incident-cell ${heatClass(notAccommodated, 300, 800)}">
            ${notAccommodated.toLocaleString()}
          </div>

          <div class="incident-cell ${heatClass(needHotel, 150, 350)}">
            ${needHotel.toLocaleString()}
          </div>

          <div class="incident-cell ${roomsTotal >= needHotel ? 'heat-good' : 'heat-high'}">
            ${roomsTotal.toLocaleString()}
          </div>

          <div class="incident-status ${roomStatusClass(cityData)}">
            ${statusLabel}
          </div>
        </button>
      `;
    }).join('')}
  `;
}

async function main() {
  initTabs();
  buildLegend();
  initRadarCardMobileToggle();
  initMobileLegendToggle();

  const [locationsRes, locationsSpainRes, municipalitiesRes, genevaRes, spainRes, travelDataRes] = await Promise.all([
      fetch('data/locations.json'),
      fetch('data/locations_spain.json'),
      fetch('data/municipalities.geojson'),
      fetch('data/geneva.json'),
      fetch('data/spain_provinces.geojson'),
      fetch(`data/travel_data.json?v=${Date.now()}`, { cache: 'no-store' })
    ]);

  if (
      !locationsRes.ok ||
      !locationsSpainRes.ok ||
      !municipalitiesRes.ok ||
      !genevaRes.ok ||
      !spainRes.ok ||
      !travelDataRes.ok
    ) {
      throw new Error('One or more data files could not be loaded.');
    }

  const baseLocations = await locationsRes.json();
  const spainLocations = await locationsSpainRes.json();

 const locations = {
  ...spainLocations,
  ...baseLocations
};

  let municipalities = await municipalitiesRes.json();
const geneva = await genevaRes.json();
const spain = await spainRes.json();
travelDataStore = await travelDataRes.json();
renderTimelineFromTravelData();

function getLocationDataByAnyName(targetName) {
  const targetKey = normalizeName(targetName);

  return Object.entries(locations).find(([key, value]) => {
    return normalizeName(key) === targetKey ||
           normalizeName(value?.municipality) === targetKey ||
           normalizeName(value?.place) === targetKey;
  })?.[1] || null;
}

function isGenevaFeature(feature) {
  const p = feature.properties || {};

  const names = [
    p.place,
    p.municipality,
    p.city,
    p.gemname,
    p.name
  ].map(normalizeName);

  return names.includes(normalizeName('Geneva')) ||
         names.includes(normalizeName('Genève')) ||
         names.includes(normalizeName('Geneve'));
}

/*
  Remove fake/simple Geneva and fake/simple Spanish features
  from municipalities.geojson.

  We keep real Spain polygons from spain_provinces.geojson.
  We keep real Geneva polygon from geneva.json.
*/
const realSpainProvinceKeys = new Set(
  spain.features.map(f =>
    normalizeName(f.properties?.prov_name || f.properties?.name || '')
  )
);

function isFakeSpainFeature(feature) {
  const p = feature.properties || {};

  const names = [
    p.place,
    p.municipality,
    p.city,
    p.gemname,
    p.prov_name,
    p.name
  ].map(normalizeName);

  return names.some(name => realSpainProvinceKeys.has(name));
}

municipalities.features = municipalities.features.filter(feature => {
  return !isGenevaFeature(feature) && !isFakeSpainFeature(feature);
});

/* Add real Geneva polygon from geneva.json */
const genevaData = getLocationDataByAnyName('Geneva');

municipalities.features.push({
  type: 'Feature',
  geometry: geneva.geometry,
  properties: {
    ...geneva.properties,
    municipality: geneva.properties?.gemname || 'Genève',
    place: geneva.properties?.gemname || 'Genève',
    exposure_pct: genevaData?.exposure_pct ?? 0
  }
});

/* Add real Spain province polygons from spain_provinces.geojson */
spain.features.forEach(f => {
  const provinceName = f.properties?.prov_name || f.properties?.name || 'Unknown province';

  let locationData = getLocationDataByAnyName(provinceName);

  /*
    Special alias:
    Your locations.json uses "Costa del Sol" for Málaga data.
    The real polygon is called Málaga / Malaga in spain_provinces.geojson.
  */
  if (
    normalizeName(provinceName) === normalizeName('Málaga') ||
    normalizeName(provinceName) === normalizeName('Malaga')
  ) {
    locationData = getLocationDataByAnyName('Costa del Sol');
  }

  municipalities.features.push({
    type: 'Feature',
    geometry: f.geometry,
    properties: {
      ...f.properties,
      municipality: provinceName,
      place: provinceName,
      exposure_pct: locationData?.exposure_pct ?? 0
    }
  });
});

function isProvinceFeature(feature, targetName) {
  const p = feature.properties || {};

  const names = [
    p.prov_name,
    p.name,
    p.municipality,
    p.place
  ].map(normalizeName);

  return names.includes(normalizeName(targetName));
}


  const locationsByKey = {};
    Object.entries(locations).forEach(([key, value]) => {
      locationsByKey[normalizeName(key)] = value;

      if (value.municipality) {
        locationsByKey[normalizeName(value.municipality)] = value;
      }

      if (value.place) {
        locationsByKey[normalizeName(value.place)] = value;
      }
    });

  if (baseLocations['Costa del Sol']) {
    locationsByKey[normalizeName('Málaga')] = baseLocations['Costa del Sol'];
    locationsByKey[normalizeName('Malaga')] = baseLocations['Costa del Sol'];
    locationsByKey[normalizeName('Costa del Sol')] = baseLocations['Costa del Sol'];
  }

  if (baseLocations['Geneva']) {
      locationsByKey[normalizeName('Geneva')] = baseLocations['Geneva'];
      locationsByKey[normalizeName('Genève')] = baseLocations['Geneva'];
      locationsByKey[normalizeName('Geneve')] = baseLocations['Geneva'];
    }
   if (baseLocations['Barcelona']) {
      locationsByKey[normalizeName('Barcelona')] = baseLocations['Barcelona'];
    }

  const map = L.map('map', {
    zoomControl: false,
    scrollWheelZoom: true
  }).setView([36.7213, -4.4214], 8);

  window._leafletMap = map;

  function focusLocationWithOffset(map, lat, lng, zoom = 8, offsetX = 250, offsetY = 0) {
  map.setView([lat, lng], zoom);

  setTimeout(() => {
    map.panBy([offsetX, offsetY], { animate: true });
  }, 100);
}

  const lightGray = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 20
  }).addTo(map);

  const satellite = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Tiles &copy; Esri', maxZoom: 19 }
  );

  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.control.layers({ Simplistic: lightGray, Satellite: satellite }, null, {
    position: 'bottomright',
    collapsed: true
  }).addTo(map);

  const municipalityButtons = document.getElementById('municipality-buttons');
  const buttonTargets = ['Málaga', 'Barcelona', 'Dubai', 'Auckland', 'Geneva','Catania','Rhodes','Melilla','Springfield'];
  buttonTargets.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'municipality-button';
    btn.dataset.key = normalizeName(name);
    btn.textContent = name;
    municipalityButtons.appendChild(btn);
  });

  let selectedLayer = null;
  let featureLayerPairs = [];

  let geojsonLayer;
  function selectFeature(layer, feature, centerMap = false) {
    const name = deriveFeatureName(feature);
    const locationData = locationsByKey[normalizeName(name)] || null;

    console.log('Selected:', name);
    console.log('Matched location:', locationData);
    console.log('Monthly weather:', locationData?.monthly_weather);

    const overlayKey =
     normalizeName(locationData?.municipality || locationData?.place || name);

  showSelectedOverlay(overlayKey);
  if (selectedLayer && geojsonLayer) {
    geojsonLayer.resetStyle(selectedLayer);
  }

  selectedLayer = layer;

  layer.setStyle({
    weight: 2.5,
    fillOpacity: 0.5
  });

  if (layer.bringToFront) {
    layer.bringToFront();
  }

  setSelectedButton(name);
  updateInfoPanel(name, feature, locationData);
  updateMobileSelectedDetails(name, locationData);

  renderClimateRadar(
    'climate-radar',
    name,
    getMonthlyWeather(locationData)
  );

  if (centerMap) {
      if (
        locationData &&
        typeof locationData.lat === 'number' &&
        typeof locationData.lng === 'number'
      ) {
        focusLocationWithOffset(map, locationData.lat, locationData.lng, 8, 250, 0);
      } else if (layer.getBounds) {
        map.fitBounds(layer.getBounds().pad(0.35));

        setTimeout(() => {
          map.panBy([250, 0], { animate: true });
        }, 100);

        setTimeout(() => {
          if (map.getZoom() < 8) {
            map.setZoom(8);
          }
        }, 80);
      }
      }
}

  geojsonLayer = L.geoJSON(municipalities, {
    style: feature => {
      const pct = feature.properties?.exposure_pct ?? 0;
      const color = exposureColor(pct);
      return {
        color,
        weight: 0.1,
        fillColor: color,
        fillOpacity: 0.2,
        className: 'municipality'
      };
    },
    onEachFeature: (feature, layer) => {
      featureLayerPairs.push([feature, layer]);
      layer.on('click', () => selectFeature(layer, feature, true));
    }
  }).addTo(map);

  const overlaysByKey = {};
let selectedOverlay = null;

Object.entries(locations).forEach(([name, city]) => {
  if (typeof city.lat !== 'number' || typeof city.lng !== 'number') return;

  const key = normalizeName(city.municipality || city.place || name);

  const dot = L.circleMarker([city.lat, city.lng], {
    radius: 5,
    color: '#ffffff',
    weight: 2,
    fillColor: '#183b63',
    fillOpacity: 1
  }).addTo(map);

  const anchorX = city.side === 'left' ? 446 : 74;

  const marker = L.marker([city.lat, city.lng], {
    interactive: false,
    icon: L.divIcon({
      className: 'city-overlay',
      html: cardHTML(city),
      iconSize: [520, 168],
      iconAnchor: [anchorX, 162]
    })
  });

  overlaysByKey[key] = marker;

  dot.on('click', () => {
    let match = null;

    if (key === normalizeName('Malaga') || key === normalizeName('Málaga')) {
      match = featureLayerPairs.find(([feature]) =>
        isProvinceFeature(feature, 'Málaga') || isProvinceFeature(feature, 'Malaga')
      );
    } else if (key === normalizeName('Barcelona')) {
      match = featureLayerPairs.find(([feature]) =>
        isProvinceFeature(feature, 'Barcelona')
      );
    } else if (
      key === normalizeName('Geneva') ||
      key === normalizeName('Genève') ||
      key === normalizeName('Geneve')
    ) {
      match = featureLayerPairs.find(([feature]) =>
        isGenevaFeature(feature)
      );
    } else {
      match = featureLayerPairs.find(([feature]) =>
        normalizeName(deriveFeatureName(feature)) === key
      );
    }

    if (match) {
      const [feature, layer] = match;
      selectFeature(layer, feature, true);
    } else {
      const locationData = locationsByKey[key] || city;
      showSelectedOverlay(key);
      updateInfoPanel(city.municipality || city.place || name, { properties: {} }, locationData);
      updateMobileSelectedDetails(city.municipality || city.place || name, locationData);
      renderClimateRadar(
        'climate-radar',
        city.municipality || city.place || name,
        getMonthlyWeather(locationData)
      );
      focusLocationWithOffset(map, locationData.lat, locationData.lng, 8, 250, 0);
    }
  });
});

function showSelectedOverlay(key) {
  if (selectedOverlay && map.hasLayer(selectedOverlay)) {
    map.removeLayer(selectedOverlay);
  }

  selectedOverlay = overlaysByKey[key];

  if (selectedOverlay) {
    selectedOverlay.addTo(map);
  }
}

  municipalityButtons.querySelectorAll('.municipality-button').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.key;

    let match = null;

    if (key === normalizeName('Malaga') || key === normalizeName('Málaga')) {
      match = featureLayerPairs.find(([feature]) =>
        isProvinceFeature(feature, 'Málaga') || isProvinceFeature(feature, 'Malaga')
      );
    } else if (key === normalizeName('Barcelona')) {
      match = featureLayerPairs.find(([feature]) =>
        isProvinceFeature(feature, 'Barcelona')
      );
    } else if (
      key === normalizeName('Geneva') ||
      key === normalizeName('Genève') ||
      key === normalizeName('Geneve')
    ) {
      match = featureLayerPairs.find(([feature]) =>
        isGenevaFeature(feature)
      );
    } else {
      match = featureLayerPairs.find(([feature]) =>
        normalizeName(deriveFeatureName(feature)) === key
      );
    }

    const card = locationsByKey[key] || null;

    if (match) {
      const [feature, layer] = match;
      selectFeature(layer, feature, true);
    } else {
      updateInfoPanel(btn.textContent, { properties: {} }, card);
      updateMobileSelectedDetails(btn.textContent, card);

      renderClimateRadar(
        'climate-radar',
        btn.textContent,
        getMonthlyWeather(card)
      );
      showSelectedOverlay(key);
      setSelectedButton(btn.textContent);

      if (card && typeof card.lat === 'number' && typeof card.lng === 'number') {
        focusLocationWithOffset(map, card.lat, card.lng, 8, 250, 0);
      }
    }
  });
});

  const defaultMatch = featureLayerPairs.find(([feature]) =>
      isProvinceFeature(feature, 'Málaga') || isProvinceFeature(feature, 'Malaga')
    );

if (defaultMatch) {
  const [feature, layer] = defaultMatch;
  selectFeature(layer, feature, false);
}

focusLocationWithOffset(map, 36.7213, -4.4214, 8, 250, 0);

const malagaCard =
  locationsByKey[normalizeName('Málaga')] ||
  locationsByKey[normalizeName('Malaga')] ||
  locationsByKey[normalizeName('Costa del Sol')];

if (malagaCard) {
  updateInfoPanel(
    malagaCard.municipality || malagaCard.place || 'Málaga',
    { properties: { municipality: malagaCard.municipality || malagaCard.place || 'Málaga' } },
    malagaCard
  );
  updateMobileSelectedDetails(
    malagaCard.municipality || malagaCard.place || 'Málaga',
    malagaCard
  );

  renderClimateRadar(
    'climate-radar',
    malagaCard.municipality || malagaCard.place || 'Málaga',
    getMonthlyWeather(malagaCard)
  );
}

    initClickableTimelineEvents();

    const defaultTimelineEvent = document.querySelector('#tab-2 .clickable-event');

    if (defaultTimelineEvent) {
      selectTimelineEvent(defaultTimelineEvent);
    }
}

function getTravelDataForCity(locationName) {
  const key = normalizeName(locationName);

  const match = Object.entries(travelDataStore).find(([name, data]) => {
    return (
      normalizeName(name) === key ||
      normalizeName(data?.city) === key ||
      normalizeName(data?.selected_city) === key ||
      normalizeName(data?.airport) === key ||
      normalizeName(data?.iata_code) === key
    );
  });

  return match ? match[1] : null;
}

function renderClimateRadar(containerId, locationName, data) {
  const container = document.getElementById(containerId);
  const titleEl = document.getElementById("climate-radar-title");
  if (!container || !titleEl) return;

  titleEl.textContent = `${locationName}: months to avoid / bad weather`;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const series = [
    {
      key: "cloudy",
      label: "Cloudy",
      polygonClass: "radar-series-cloudy",
      pointClass: "radar-point-cloudy",
      color: "#e53935",
      icon: "icons/cloud.svg"
    },
    {
      key: "rainy",
      label: "Rainy",
      polygonClass: "radar-series-rainy",
      pointClass: "radar-point-rainy",
      color: "#1dd3b0",
      icon: "icons/rainfall.svg"
    },
    {
      key: "windy",
      label: "Windy",
      polygonClass: "radar-series-windy",
      pointClass: "radar-point-windy",
      color: "#f5a201",
      icon: "icons/hurricane.svg"
    }
  ];

  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 110;
  const levels = 5;

  // max expected monthly days; keep fixed for comparability between locations
  const maxValue = 20;

  function polarToCartesian(angle, r) {
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r
    };
  }

  function pointString(values) {
  const safeValues = Array.isArray(values) && values.length === 12
    ? values
    : new Array(12).fill(0);

  return safeValues.map((value, i) => {
    const numeric = Number(value) || 0;
    const angle = (-Math.PI / 2) + (i * 2 * Math.PI / 12);
    const r = (Math.max(0, Math.min(numeric, maxValue)) / maxValue) * radius;
    const p = polarToCartesian(angle, r);
    return `${p.x},${p.y}`;
  }).join(" ");
}

  let svg = `
    <svg class="climate-radar-svg" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  `;

  // grid polygons
  for (let level = 1; level <= levels; level++) {
    const r = (level / levels) * radius;
    const pts = months.map((_, i) => {
      const angle = (-Math.PI / 2) + (i * 2 * Math.PI / 12);
      const p = polarToCartesian(angle, r);
      return `${p.x},${p.y}`;
    }).join(" ");
    svg += `<polygon class="radar-grid" points="${pts}" />`;
  }

  // axis lines + month labels
  months.forEach((month, i) => {
    const angle = (-Math.PI / 2) + (i * 2 * Math.PI / 12);
    const outer = polarToCartesian(angle, radius);
    const label = polarToCartesian(angle, radius + 18);

    svg += `<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${outer.x}" y2="${outer.y}" />`;
    svg += `<text class="radar-label" x="${label.x}" y="${label.y}" text-anchor="middle" dominant-baseline="middle">${month}</text>`;
  });

    // series polygons
  series.forEach(s => {
    const values = Array.isArray(data?.[s.key]) && data[s.key].length === 12
      ? data[s.key]
      : new Array(12).fill(0);

    svg += `<polygon class="${s.polygonClass}" points="${pointString(values)}" />`;

    values.forEach((value, i) => {
      const numeric = Number(value) || 0;
      const angle = (-Math.PI / 2) + (i * 2 * Math.PI / 12);
      const r = (Math.max(0, Math.min(numeric, maxValue)) / maxValue) * radius;
      const p = polarToCartesian(angle, r);

      // Visible dot
      svg += `<circle class="${s.pointClass}" cx="${p.x}" cy="${p.y}" r="3.2"></circle>`;

      // Larger invisible hover area with tooltip
      svg += `<circle
        cx="${p.x}"
        cy="${p.y}"
        r="11"
        fill="transparent"
        stroke="transparent"
        style="pointer-events: all;"
      >
        <title>${s.label} – ${months[i]}: ${numeric}</title>
      </circle>`;
    });
  });

  svg += `</svg>`;

  const legend = `
  <div class="radar-legend">
    ${series.map(s => `
      <div class="radar-legend-item">
        <span
          class="radar-legend-icon-mask radar-legend-icon-${s.key}"
          aria-hidden="true"
        ></span>
        <span>${s.label}</span>
      </div>
    `).join("")}
  </div>
`;

container.innerHTML = svg + legend;
}

main().catch(err => {
  console.error(err);
  alert(err.message);
});
