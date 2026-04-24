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

  document.getElementById('metric-days').textContent =
    formatMetric(sideMetrics.days);

  document.getElementById('metric-natcat').textContent =
    formatMetric(sideMetrics.natcat);

  document.getElementById('metric-airquality').textContent =
    formatMetric(sideMetrics.airquality || sideMetrics['air-quality']);

  document.getElementById('metric-naturalspaces').textContent =
    formatMetric(sideMetrics.naturalspaces || sideMetrics['natural-spaces']);

  document.getElementById('metric-vulnerability').textContent =
    formatMetric(metrics.vulnerability_index);

  document.getElementById('metric-loss').textContent =
    formatMetric(metrics.historical_financial_loss);
}

function setSelectedButton(name) {
  const key = normalizeName(name);
  document.querySelectorAll('.municipality-button').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.key === key);
  });
}

function initTimelineAnimation(forceReveal = false) {
  const events = document.querySelectorAll('.timeline .event');
  if (!events.length) return;

  const reveal = () => {
    const trigger = window.innerHeight * 0.9;
    events.forEach(event => {
      const rect = event.getBoundingClientRect();
      if (forceReveal || rect.top < trigger) {
        event.classList.add('visible');
      }
    });
  };

  reveal();
  window.removeEventListener('scroll', reveal);
  window.addEventListener('scroll', reveal, { passive: true });
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
      if (target === 'tab-2') {
        setTimeout(() => initTimelineAnimation(true), 50);
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
  const locationName = event.dataset.location || event.dataset.place || '–';
  const time = event.dataset.time || '–';
  const eventTitle = event.querySelector('h3')?.textContent?.trim() || '–';

  document.querySelectorAll('.clickable-event').forEach(item => {
    item.classList.remove('selected-timeline-event');
  });

  event.classList.add('selected-timeline-event');

  const selectedCityEl = document.getElementById('realtime-selected-city');
  const selectedTimeEl = document.getElementById('realtime-selected-time');
  const selectedEventEl = document.getElementById('realtime-selected-event');

  if (selectedCityEl) selectedCityEl.textContent = locationName;
  if (selectedTimeEl) selectedTimeEl.textContent = time;
  if (selectedEventEl) selectedEventEl.textContent = eventTitle;

  renderTravelNetworkD3(locationName, {
    time,
    eventTitle
  });

//  const key = normalizeName(locationName);
//  const targetButton = document.querySelector(`.municipality-button[data-key="${key}"]`);

//  if (targetButton) {
//    targetButton.click();
//  }
}

async function main() {
  initTabs();
  buildLegend();

  const [locationsRes, locationsSpainRes, municipalitiesRes, genevaRes, spainRes, travelDataRes] = await Promise.all([
      fetch('data/locations.json'),
      fetch('data/locations_spain.json'),
      fetch('data/municipalities.geojson'),
      fetch('data/geneva.json'),
      fetch('data/spain_provinces.geojson'),
      fetch('data/travel_data.json')
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

  renderClimateRadar(
    'climate-radar',
    name,
    getMonthlyWeather(locationData)
  );

  if (centerMap && layer.getBounds) {
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
      layer.on('click', () => selectFeature(layer, feature, false));
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

  renderClimateRadar(
    'climate-radar',
    malagaCard.municipality || malagaCard.place || 'Málaga',
    getMonthlyWeather(malagaCard)
  );
}

    initTimelineAnimation(false);
    initClickableTimelineEvents();

    const defaultTimelineEvent =
      document.querySelector('.clickable-event[data-location="Málaga"]') ||
      document.querySelector('.clickable-event[data-location="Malaga"]');

    if (defaultTimelineEvent) {
      selectTimelineEvent(defaultTimelineEvent);
    }
}

function getTravelDataForCity(locationName) {
  const key = normalizeName(locationName);

  const match = Object.entries(travelDataStore).find(([name]) =>
    normalizeName(name) === key
  );

  return match ? match[1] : null;
}

function buildTravelNetworkData(cityData, eventContext = {}) {
  const city = cityData.selected_city || 'Selected city';
  const airport = cityData.airport || 'Airport';
  const iata = cityData.iata_code || '–';
  const disruption = cityData.disruption_type || eventContext.eventTitle || '–';
  const flights3h = Number(cityData.flights_departing_next_3h) || 0;

  const cancelled = cityData.cancelled_flight || {};
  const flight1 = cityData.next_two_flights?.[0] || {};
  const flight2 = cityData.next_two_flights?.[1] || {};
  const realloc = cityData.flight_reallocation || {};
  const hotel = cityData.hotel_availability_12_24h || {};

  const cancelledTravelers = Number(cancelled.travelers_in_window) || 0;
  const flight1Booked = Number(flight1.booked_pct) || 0;
  const flight2Booked = Number(flight2.booked_pct) || 0;
  const hotelBooked = Number(hotel.currently_booked_pct) || 0;
  const roomsAvailable = Number(hotel.rooms_available) || 0;
  const combinedSeats = Number(realloc.combined_available_seats) || 0;

  const nodes = [
    {
      id: 'city',
      label: city,
      subtitle: 'Selected city',
      group: 'city',
      value: Math.max(cancelledTravelers, 120),
      fixedRadius: 58,
      tooltip: `Selected city: ${city}`
    },
    {
      id: 'airport',
      label: 'Airport',
      subtitle: airport,
      group: 'airport',
      value: 90,
      tooltip: `Airport: ${airport}`
    },
    {
      id: 'iata',
      label: iata,
      subtitle: 'IATA code',
      group: 'airport',
      value: 45,
      tooltip: `IATA code: ${iata}`
    },
    {
      id: 'disruption',
      label: disruption,
      subtitle: 'Disruption type',
      group: 'risk',
      value: 85,
      tooltip: `Disruption type: ${disruption}`
    },
    {
      id: 'flights3h',
      label: String(flights3h),
      subtitle: 'Flights next 3h',
      group: 'flights',
      value: flights3h,
      tooltip: `${flights3h} flights departing in the next 3 hours`
    },
    {
      id: 'cancelled',
      label: cancelled.flight_code || 'Cancelled flight',
      subtitle: `${cancelledTravelers} travelers`,
      group: 'flights',
      value: cancelledTravelers,
      tooltip: `${cancelled.flight_code || 'Cancelled flight'}: ${cancelledTravelers} travelers affected`
    },
    {
      id: 'nextFlights',
      label: 'Next 2 flights',
      subtitle: 'Availability',
      group: 'availability',
      value: combinedSeats,
      tooltip: realloc.message || 'Next two same-destination flights availability'
    },
    {
      id: 'flight1',
      label: flight1.label || 'Flight +1',
      subtitle: `${flight1Booked}% booked`,
      group: 'availability',
      value: Math.max(100 - flight1Booked, 5),
      tooltip: `${flight1.flight_code || 'Flight +1'}: ${flight1Booked}% booked, ${flight1.available_seats ?? '–'} seats available`
    },
    {
      id: 'flight2',
      label: flight2.label || 'Flight +2',
      subtitle: `${flight2Booked}% booked`,
      group: 'availability',
      value: Math.max(100 - flight2Booked, 5),
      tooltip: `${flight2.flight_code || 'Flight +2'}: ${flight2Booked}% booked, ${flight2.available_seats ?? '–'} seats available`
    },
    {
      id: 'hotel',
      label: 'Hotel',
      subtitle: '12–24h availability',
      group: 'hotel',
      value: roomsAvailable,
      tooltip: hotel.message || 'Hotel availability for the next 12–24 hours'
    },
    {
      id: 'hotelBooked',
      label: `${hotelBooked}%`,
      subtitle: 'Already booked',
      group: 'hotel',
      value: hotelBooked,
      tooltip: `Hotel currently booked: ${hotelBooked}%`
    },
    {
      id: 'hotelExtension',
      label: hotel.same_hotel_extension_possible ? 'Yes' : 'No',
      subtitle: 'Same-hotel extension',
      group: 'hotel',
      value: hotel.same_hotel_extension_possible ? 80 : 35,
      tooltip: hotel.same_hotel_extension_possible
        ? 'Same-hotel extension is possible'
        : 'Same-hotel extension is not sufficient'
    },
    {
      id: 'flightDecision',
      label: realloc.can_absorb_cancelled_travelers ? 'Enough capacity' : 'Capacity gap',
      subtitle: `${combinedSeats} seats`,
      group: realloc.can_absorb_cancelled_travelers ? 'success' : 'warning',
      value: combinedSeats,
      tooltip: realloc.message || 'Capacity decision'
    },
    {
      id: 'hotelDecision',
      label: hotel.can_absorb_cancelled_travelers ? 'Hotel OK' : 'Hotel gap',
      subtitle: `${roomsAvailable} rooms`,
      group: hotel.can_absorb_cancelled_travelers ? 'success' : 'warning',
      value: roomsAvailable,
      tooltip: hotel.message || 'Hotel decision'
    }
  ];

  const links = [
    { source: 'city', target: 'airport' },
    { source: 'airport', target: 'iata' },
    { source: 'city', target: 'disruption' },
    { source: 'city', target: 'flights3h' },
    { source: 'flights3h', target: 'cancelled' },
    { source: 'city', target: 'nextFlights' },
    { source: 'nextFlights', target: 'flight1' },
    { source: 'nextFlights', target: 'flight2' },
    { source: 'nextFlights', target: 'flightDecision' },
    { source: 'city', target: 'hotel' },
    { source: 'hotel', target: 'hotelBooked' },
    { source: 'hotel', target: 'hotelExtension' },
    { source: 'hotel', target: 'hotelDecision' },
    { source: 'disruption', target: 'flights3h' },
    { source: 'disruption', target: 'hotel' }
  ];

  return { nodes, links };
}

function renderTravelNetworkD3(locationName, eventContext = {}) {
  const container = document.getElementById('travel-network-graph');
  const tooltip = document.getElementById('travel-network-tooltip');

  if (!container) return;

  if (typeof d3 === 'undefined') {
    container.innerHTML = '<div class="travel-network-empty">D3 library is not loaded.</div>';
    return;
  }

  const cityData = getTravelDataForCity(locationName);

  if (!cityData) {
    container.innerHTML = `<div class="travel-network-empty">No travel_data.json entry found for ${locationName}.</div>`;
    return;
  }

  container.innerHTML = '';

  const { nodes, links } = buildTravelNetworkData(cityData, eventContext);

  const width = container.clientWidth || 900;
  const height = 640;

  const colorByGroup = {
    city: '#5b78ec',
    airport: '#dfeeff',
    risk: '#fff0f2',
    flights: '#eaf3ff',
    availability: '#e8fbfb',
    hotel: '#fff8e6',
    success: '#ecfff4',
    warning: '#fff6e8'
  };

  const strokeByGroup = {
    city: '#5b78ec',
    airport: '#7da8f7',
    risk: '#e88998',
    flights: '#7da8f7',
    availability: '#32aeb3',
    hotel: '#e3b83d',
    success: '#4dbb77',
    warning: '#e0a536'
  };

  const textByGroup = {
    city: '#ffffff',
    airport: '#17314f',
    risk: '#9d3041',
    flights: '#17314f',
    availability: '#078c93',
    hotel: '#8a6810',
    success: '#167a45',
    warning: '#9a6514'
  };

  const radiusScale = d3.scaleSqrt()
    .domain([0, d3.max(nodes, d => Number(d.value) || 1)])
    .range([22, 58]);

  nodes.forEach(d => {
    d.radius = d.fixedRadius || radiusScale(Number(d.value) || 1);
  });

  const svg = d3.select(container)
    .append('svg')
    .attr('class', 'travel-network-svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const graphLayer = svg.append('g');

  const zoom = d3.zoom()
    .scaleExtent([0.65, 2.2])
    .on('zoom', event => {
      graphLayer.attr('transform', event.transform);
    });

  svg.call(zoom);

  const link = graphLayer.append('g')
    .attr('class', 'travel-network-links')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('class', 'travel-network-link');

  const node = graphLayer.append('g')
    .attr('class', 'travel-network-nodes')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('class', 'travel-network-node')
    .call(dragSimulation());

  node.append('circle')
    .attr('r', d => d.radius)
    .attr('fill', d => colorByGroup[d.group] || '#ffffff')
    .attr('stroke', d => strokeByGroup[d.group] || '#9ab')
    .attr('stroke-width', d => d.group === 'city' ? 0 : 1.6);

  node.append('text')
    .attr('class', 'travel-network-node-label')
    .attr('text-anchor', 'middle')
    .attr('dy', d => d.subtitle ? '-0.15em' : '0.35em')
    .attr('fill', d => textByGroup[d.group] || '#17314f')
    .style('font-size', d => d.group === 'city' ? '22px' : '13px')
    .style('font-weight', '800')
    .text(d => d.label);

  node.append('text')
    .attr('class', 'travel-network-node-subtitle')
    .attr('text-anchor', 'middle')
    .attr('dy', '1.35em')
    .attr('fill', d => d.group === 'city' ? '#ffffff' : '#43556e')
    .style('font-size', '10.5px')
    .text(d => d.subtitle || '');

  node.on('mouseenter', (event, d) => {
      if (!tooltip) return;
      tooltip.textContent = d.tooltip || d.label;
      tooltip.classList.add('visible');
    })
    .on('mousemove', event => {
      if (!tooltip) return;
      const rect = container.getBoundingClientRect();
      tooltip.style.left = `${event.clientX - rect.left + 14}px`;
      tooltip.style.top = `${event.clientY - rect.top + 14}px`;
    })
    .on('mouseleave', () => {
      if (!tooltip) return;
      tooltip.classList.remove('visible');
    });

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(d => {
      if (d.source.id === 'city' || d.target.id === 'city') return 175;
      return 105;
    }))
    .force('charge', d3.forceManyBody().strength(-760))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(d => d.radius + 16))
    .force('x', d3.forceX(d => {
      if (['airport', 'iata', 'disruption'].includes(d.id)) return width * 0.25;
      if (['flights3h', 'cancelled'].includes(d.id)) return width * 0.75;
      if (['nextFlights', 'flight1', 'flight2', 'flightDecision'].includes(d.id)) return width * 0.78;
      if (['hotel', 'hotelBooked', 'hotelExtension', 'hotelDecision'].includes(d.id)) return width * 0.35;
      return width * 0.5;
    }).strength(0.08))
    .force('y', d3.forceY(d => {
      if (['airport', 'iata'].includes(d.id)) return height * 0.22;
      if (['disruption'].includes(d.id)) return height * 0.42;
      if (['flights3h', 'cancelled'].includes(d.id)) return height * 0.22;
      if (['nextFlights', 'flight1', 'flight2', 'flightDecision'].includes(d.id)) return height * 0.62;
      if (['hotel', 'hotelBooked', 'hotelExtension', 'hotelDecision'].includes(d.id)) return height * 0.72;
      return height * 0.5;
    }).strength(0.08));

  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });

  function dragSimulation() {
    return d3.drag()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.25).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }
}

function renderClimateRadar(containerId, locationName, data) {
  const container = document.getElementById(containerId);
  const titleEl = document.getElementById("climate-radar-title");
  if (!container || !titleEl) return;

  titleEl.textContent = `${locationName} – monthly weather profile`;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const series = [
    { key: "cloudy", label: "Cloudy days", polygonClass: "radar-series-cloudy", pointClass: "radar-point-cloudy", color: "#e53935" },
    { key: "rainy",  label: "Rainy days",  polygonClass: "radar-series-rainy",  pointClass: "radar-point-rainy",  color: "#1e88e5" },
    { key: "windy",  label: "Windy days",  polygonClass: "radar-series-windy",  pointClass: "radar-point-windy",  color: "#f5a201" }
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
          <span class="radar-legend-swatch" style="background:${s.color}"></span>
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
