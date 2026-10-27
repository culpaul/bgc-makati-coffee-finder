let map, userMarker, routePolyline;
let cafes = [];
let currentUser = null;
let userLocation = [14.5547, 121.0244]; // Legazpi Village, Makati

document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  setupEventListeners();
  await checkUserSession();
  await loadCafeData();
});

// Initialize Leaflet Map
function initMap() {
  map = L.map('map').setView(userLocation, 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const userIcon = L.divIcon({
    className: 'custom-cafe-pin',
    html: '📍',
    iconSize: [32, 32]
  });

  userMarker = L.marker(userLocation, { icon: userIcon }).addTo(map)
    .bindPopup('<b>Your Location</b><br>Click anywhere on the map to set a new starting point.');

  // Set new starting point on map click
  map.on('click', (e) => {
    userLocation = [e.latlng.lat, e.latlng.lng];
    userMarker.setLatLng(userLocation);
  });
}

// Fetch cafe data from Supabase
async function loadCafeData() {
  cafes = await fetchCafesFromDB();
  renderCafes();
}

// Filter and Render Cafe Pins & Sidebar List
function renderCafes() {
  const districtFilter = document.getElementById('districtFilter').value;
  const priceFilter = document.getElementById('priceFilter').value;
  const wifiFilter = document.getElementById('wifiFilter').checked;
  const socketsFilter = document.getElementById('socketsFilter').checked;

  const cafeListContainer = document.getElementById('cafeList');
  cafeListContainer.innerHTML = '';

  const filtered = cafes.filter(cafe => {
    if (districtFilter !== 'ALL' && cafe.district !== districtFilter) return false;
    if (priceFilter !== 'ALL' && cafe.price_level !== priceFilter) return false;
    if (wifiFilter && !cafe.has_wifi) return false;
    if (socketsFilter && !cafe.has_sockets) return false;
    return true;
  });

  filtered.forEach(cafe => {
    // Map Marker Pin
    const pinIcon = L.divIcon({
      className: 'custom-cafe-pin',
      html: '☕',
      iconSize: [28, 28]
    });

    const marker = L.marker([cafe.lat, cafe.lng], { icon: pinIcon }).addTo(map);
    marker.bindPopup(`
      <div class="p-1">
        <h3 class="font-bold text-amber-900 text-sm">${cafe.name}</h3>
        <p class="text-xs text-gray-600">${cafe.address}</p>
        <p class="text-xs font-semibold text-amber-800 mt-1">${cafe.price_level} • ${cafe.vibe}</p>
      </div>
    `);

    // Sidebar Card Item
    const card = document.createElement('div');
    card.className = "p-3 bg-gray-50 hover:bg-amber-50 rounded-xl border border-gray-200 transition cursor-pointer flex flex-col gap-1";
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <h4 class="font-bold text-gray-800">${cafe.name}</h4>
        <span class="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full">${cafe.price_level}</span>
      </div>
      <p class="text-xs text-gray-500">${cafe.district} — ${cafe.address}</p>
      <div class="flex gap-2 text-[10px] text-gray-600 mt-1">
        <span>${cafe.has_wifi ? '✅ WiFi' : '❌ No WiFi'}</span>
        <span>${cafe.has_sockets ? '⚡ Outlets' : '❌ No Outlets'}</span>
      </div>
      <button onclick="getStreetRoute(${cafe.lat}, ${cafe.lng}, '${cafe.name}')" class="mt-2 w-full py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-lg transition">
        Get Street Route 🗺️
      </button>
    `;
    cafeListContainer.appendChild(card);
  });
}

// Calculate OSRM Street Navigation Route
async function getStreetRoute(destLat, destLng, cafeName) {
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${userLocation[1]},${userLocation[0]};${destLng},${destLat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(osrmUrl);
    const data = await res.json();

    if (!data.routes || data.routes.length === 0) return;

    const route = data.routes[0];
    const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);

    if (routePolyline) map.removeLayer(routePolyline);

    routePolyline = L.polyline(coords, { color: '#0284c7', weight: 5, opacity: 0.8 }).addTo(map);
    map.fitBounds(routePolyline.getBounds(), { padding: [40, 40] });

    const distanceKm = (route.distance / 1000).toFixed(2);
    const durationMin = Math.round(route.duration / 60);

    const banner = document.getElementById('routeBanner');
    document.getElementById('routeTitle').innerText = cafeName;
    document.getElementById('routeDetails').innerHTML = `<b>Distance:</b> ${distanceKm} km | <b>Est. Time:</b> ${durationMin} mins`;
    
    document.getElementById('wazeBtn').href = `https://waze.com/ul?ll=${destLat},${destLng}&navigate=yes`;
    document.getElementById('gmapsBtn').href = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;

    banner.classList.remove('hidden');
  } catch (err) {
    console.error('Routing failed:', err);
  }
}

// Manage User Authentication State & Header Buttons
async function checkUserSession() {
  currentUser = await getCurrentUser();
  const authBtn = document.getElementById('authBtn');
  const dashLink = document.getElementById('dashboardLink');
  
  if (currentUser) {
    authBtn.innerText = 'Logout';
    authBtn.href = '#';
    if (dashLink) dashLink.classList.remove('hidden');
    
    authBtn.onclick = async (e) => {
      e.preventDefault();
      await logoutUser();
      window.location.reload();
    };
  } else {
    authBtn.innerText = 'Login / Sign Up';
    authBtn.href = 'login.html';
    authBtn.onclick = null;
    if (dashLink) dashLink.classList.add('hidden');
  }
}

// Setup Event Listeners
function setupEventListeners() {
  document.getElementById('districtFilter').addEventListener('change', renderCafes);
  document.getElementById('priceFilter').addEventListener('change', renderCafes);
  document.getElementById('wifiFilter').addEventListener('change', renderCafes);
  document.getElementById('socketsFilter').addEventListener('change', renderCafes);

  document.getElementById('resetFilters').addEventListener('click', () => {
    document.getElementById('districtFilter').value = 'ALL';
    document.getElementById('priceFilter').value = 'ALL';
    document.getElementById('wifiFilter').checked = false;
    document.getElementById('socketsFilter').checked = false;
    renderCafes();
  });

  document.getElementById('closeRouteBtn').addEventListener('click', () => {
    document.getElementById('routeBanner').classList.add('hidden');
    if (routePolyline) map.removeLayer(routePolyline);
  });
}