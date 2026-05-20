// --- Data Management ---
const STORAGE_KEY = 'crowdsafe_reports';

function getReports() {
    const reports = localStorage.getItem(STORAGE_KEY);
    return reports ? JSON.parse(reports) : [];
}

function saveReport(report) {
    const reports = getReports();
    reports.unshift(report); // Add to top
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

function seedData() {
    if (getReports().length === 0) {
        const dummyData = [
            { id: 1, name: 'John Doe', phone: '9876543210', type: 'Fire', location: 'Library, Block A', lat: 28.6139, lng: 77.2090, description: 'Smoke detected in basement', severity: 'High', timestamp: new Date().toISOString(), status: 'active', verified: true },
            { id: 2, name: 'Jane Smith', phone: '8765432109', type: 'Medical', location: 'Gymnasium, Ground Floor', lat: 19.0760, lng: 72.8777, description: 'Someone collapsed during practice', severity: 'High', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'active', verified: false },
            { id: 3, name: 'Mike Ross', phone: '7654321098', type: 'Accident', location: 'Parking Lot B', lat: 12.9716, lng: 77.5946, description: 'Minor car scratch near gate', severity: 'Low', timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'resolved', verified: true }
        ];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dummyData));
    }
}

// --- Helper Functions ---
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getSeverityBadge(severity) {
    const badgeClass = severity.toLowerCase();
    return `<span class="badge badge-${badgeClass}">${severity}</span>`;
}

const TYPE_ICONS = {
    Fire: '🔥', Medical: '🏥', Accident: '🚗', Flood: '🌊', Other: '⚠️'
};

// --- Count-up Animation ---
function countUp(el, target, duration = 800) {
    if (!el) return;
    const start = 0;
    const startTime = performance.now();
    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(start + (target - start) * eased);
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// --- Home Page Functions ---
function loadHomeData() {
    seedData();
    const reports = getReports();
    const container = document.getElementById('home-alerts-grid');

    if (container) {
        const recentAlerts = reports.slice(0, 3);
        container.innerHTML = recentAlerts.map((alert, i) => createAlertCard(alert, i === 0)).join('');
    }

    // Update Stats with count-up
    const total = reports.length;
    const active = reports.filter(r => r.status === 'active').length;
    const resolved = reports.filter(r => r.status === 'resolved').length;

    countUp(document.getElementById('stat-total'), total);
    countUp(document.getElementById('stat-active'), active);
    countUp(document.getElementById('stat-resolved'), resolved);

    // Update nav badge
    const badge = document.getElementById('navAlertBadge');
    if (badge) {
        if (active > 0) { badge.textContent = active; badge.style.display = 'inline-flex'; }
        else { badge.style.display = 'none'; }
    }
}

function createAlertCard(alert, isNewest = false) {
    const verifiedBadge = alert.verified
        ? '<span class="badge badge-verified">✅ Verified</span>'
        : '<span class="badge badge-pending">⏳ Pending</span>';
    const newBadge = isNewest
        ? '<span class="badge badge-new">NEW</span>'
        : '';
    const icon = TYPE_ICONS[alert.type] || '⚠️';
    const hasCoords = alert.lat && alert.lng;
    const locationClickable = hasCoords
        ? `<a href="#" class="location-link" onclick="openLocationModal(${alert.lat}, ${alert.lng}, '${alert.location.replace(/'/g, "\\'")}',' ${alert.type}', '${alert.severity}'); return false;">📍 ${alert.location}</a>`
        : `<span class="location-link location-link-text" onclick="openLocationByAddress('${alert.location.replace(/'/g, "\\'")}', '${alert.type}', '${alert.severity}')">📍 ${alert.location}</span>`;

    return `
        <div class="card severity-${alert.severity.toLowerCase()}">
            <h3>${icon} ${alert.type} ${newBadge}</h3>
            <p><strong>${locationClickable}</strong></p>
            <p>${alert.description}</p>
            <div class="card-meta">
                ${verifiedBadge}
                ${getSeverityBadge(alert.severity)}
                <span style="margin-left:auto;">🕒 ${formatDate(alert.timestamp)}</span>
            </div>
        </div>
    `;
}

// --- Phone Validation (Inline) ---
function isValidPhone(phone) {
    // Accepts 10-digit Indian mobile numbers (optionally prefixed with +91 or 0)
    const clean = phone.replace(/[\s\-().+]/g, '');
    // Strip country code if present
    const digits = clean.replace(/^(0|91)/, '');
    return /^[6-9]\d{9}$/.test(digits);
}

function validatePhoneInline() {
    const phoneInput = document.getElementById('phone');
    const errorEl = document.getElementById('phone-error');
    if (!phoneInput || !errorEl) return;
    if (phoneInput.value.length > 0 && !isValidPhone(phoneInput.value)) {
        errorEl.style.display = 'inline';
    } else {
        errorEl.style.display = 'none';
    }
}

function isPhoneUnique(phone) {
    const reports = getReports();
    const cleanNew = phone.replace(/[\s\-().+]/g, '').replace(/^(0|91)/, '');
    return !reports.some(r => {
        const cleanExisting = r.phone.replace(/[\s\-().+]/g, '').replace(/^(0|91)/, '');
        return cleanExisting === cleanNew;
    });
}

// --- Current Location Feature ---
function fetchCurrentLocation() {
    const btn = document.getElementById('getLocationBtn');
    const locationInput = document.getElementById('location');
    const statusEl = document.getElementById('location-status');

    if (!navigator.geolocation) {
        statusEl.textContent = '❌ Geolocation is not supported by your browser.';
        statusEl.style.color = 'red';
        return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ Detecting...';
    statusEl.textContent = 'Fetching your location...';
    statusEl.style.color = '#555';

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            statusEl.textContent = `📡 GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} — Resolving address...`;

            // Store coordinates in hidden fields
            const latInput = document.getElementById('report-lat');
            const lngInput = document.getElementById('report-lng');
            if (latInput) latInput.value = latitude;
            if (lngInput) lngInput.value = longitude;

            try {
                // Use OpenStreetMap Nominatim (free, no API key needed)
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
                    { headers: { 'Accept-Language': 'en' } }
                );
                const data = await response.json();

                const addr = data.address || {};
                // Build a human-readable short address
                const parts = [
                    addr.road || addr.pedestrian || addr.path,
                    addr.suburb || addr.neighbourhood || addr.village,
                    addr.city || addr.town || addr.county,
                    addr.state
                ].filter(Boolean);

                const locationText = parts.length > 0 ? parts.join(', ') : data.display_name;
                locationInput.value = locationText;
                statusEl.textContent = '✅ Location detected successfully!';
                statusEl.style.color = 'green';
            } catch (err) {
                // If reverse geocoding fails, just use coordinates
                locationInput.value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
                statusEl.textContent = '✅ Coordinates set (offline mode).';
                statusEl.style.color = 'green';
            }

            btn.disabled = false;
            btn.textContent = '📍 Use My Location';
        },
        (error) => {
            btn.disabled = false;
            btn.textContent = '📍 Use My Location';
            let msg = '❌ Unable to retrieve location.';
            if (error.code === error.PERMISSION_DENIED) msg = '❌ Location permission denied. Please allow access.';
            else if (error.code === error.POSITION_UNAVAILABLE) msg = '❌ Location unavailable. Check GPS.';
            else if (error.code === error.TIMEOUT) msg = '❌ Location request timed out. Try again.';
            statusEl.textContent = msg;
            statusEl.style.color = 'red';
        },
        { timeout: 10000, maximumAge: 60000 }
    );
}

// --- Report Page Functions ---
async function submitReport() {
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const type = document.getElementById('type').value;
    const severity = document.getElementById('severity').value;
    const location = document.getElementById('location').value.trim();
    const description = document.getElementById('description').value.trim();

    if (!isValidPhone(phone)) {
        const errorEl = document.getElementById('phone-error');
        if (errorEl) errorEl.style.display = 'inline';
        document.getElementById('phone').focus();
        return;
    }

    if (!isPhoneUnique(phone)) {
        alert('❌ This phone number has already been used to submit a report.');
        return;
    }

    // Get stored coordinates from GPS, or try geocoding the text
    let lat = parseFloat((document.getElementById('report-lat') || {}).value);
    let lng = parseFloat((document.getElementById('report-lng') || {}).value);

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        // Try geocoding the location text
        const coords = await geocodeLocation(location);
        if (coords) {
            lat = coords[0];
            lng = coords[1];
        } else {
            lat = null;
            lng = null;
        }
    }

    const report = {
        id: Date.now(),
        name,
        phone,
        type,
        severity,
        location,
        lat,
        lng,
        description,
        timestamp: new Date().toISOString(),
        status: 'active',
        verified: false
    };

    saveReport(report);

    // Show success message
    alert('✅ Emergency Report Submitted Successfully!');

    // Redirect to alerts page
    window.location.href = 'alerts.html';
}

// --- Alerts Page Functions ---
function renderAlerts() {
    seedData();
    const reports = getReports();
    const filterType = document.getElementById('filterType').value;
    const container = document.getElementById('alerts-container');

    let filteredReports = reports;
    if (filterType !== 'All') {
        filteredReports = reports.filter(r => r.type === filterType);
    }

    if (container) {
        if (filteredReports.length === 0) {
            container.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No alerts found.</p>';
        } else {
            container.innerHTML = filteredReports.map((alert, i) => createAlertCard(alert, i === 0)).join('');
        }
    }
}

// --- Map View ---
let _leafletMap = null;

async function geocodeLocation(locationText) {
    // Check if text looks like coordinates "lat, lon"
    const coordMatch = locationText.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
    if (coordMatch) {
        return [parseFloat(coordMatch[1]), parseFloat(coordMatch[2])];
    }
    // Otherwise use Nominatim to geocode the text
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationText)}&limit=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();
        if (data && data.length > 0) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
    } catch (e) { /* ignore */ }
    return null;
}

function getSeverityColor(severity) {
    const s = (severity || '').toLowerCase();
    if (s === 'high')   return '#ef4444';
    if (s === 'medium') return '#f59e0b';
    return '#10b981'; // low
}

function makeCircleIcon(color) {
    return L.divIcon({
        className: '',
        html: `<div style="
            width:18px; height:18px;
            background:${color};
            border:3px solid white;
            border-radius:50%;
            box-shadow:0 2px 6px rgba(0,0,0,0.35);
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -12]
    });
}

async function renderMap() {
    const filterType = (document.getElementById('filterType') || {}).value || 'All';
    let reports = getReports();
    if (filterType !== 'All') {
        reports = reports.filter(r => r.type === filterType);
    }

    // Init or reset map
    if (_leafletMap) {
        _leafletMap.remove();
        _leafletMap = null;
    }

    // Default center: India
    _leafletMap = L.map('alertsMap').setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(_leafletMap);

    if (reports.length === 0) return;

    const markers = [];

    // Prefer stored coordinates, fallback to geocoding
    const geocodePromises = reports.map(report => {
        if (report.lat && report.lng) {
            return Promise.resolve([report.lat, report.lng]);
        }
        return geocodeLocation(report.location);
    });
    const coords = await Promise.all(geocodePromises);

    coords.forEach((latlng, i) => {
        if (!latlng) return;
        const report = reports[i];
        const color = getSeverityColor(report.severity);
        const icon = makeCircleIcon(color);
        const verifiedLabel = report.verified
            ? '<span style="color:#10b981;font-weight:bold;">✅ Verified</span>'
            : '<span style="color:#f59e0b;">⏳ Pending Verification</span>';

        const popup = `
            <div style="min-width:200px;">
                <div class="map-popup-title">🚨 ${report.type}</div>
                <div class="map-popup-loc">📍 ${report.location}</div>
                <div class="map-popup-desc">${report.description}</div>
                <div class="map-popup-meta">
                    Severity: <strong style="color:${color}">${report.severity}</strong> &nbsp;|&nbsp;
                    ${verifiedLabel}<br>
                    🕒 ${formatDate(report.timestamp)}
                </div>
                <a href="https://www.google.com/maps/dir/?api=1&destination=${latlng[0]},${latlng[1]}" target="_blank" class="map-popup-directions">🧭 Get Directions</a>
            </div>`;

        const marker = L.marker(latlng, { icon }).addTo(_leafletMap);
        marker.bindPopup(popup, { maxWidth: 260 });
        markers.push(marker);
    });

    // Fit map to all markers
    if (markers.length > 0) {
        const group = L.featureGroup(markers);
        _leafletMap.fitBounds(group.getBounds().pad(0.3));
    }
}

// --- Location Map Modal ---
let _modalMap = null;

function openLocationModal(lat, lng, locationText, type, severity) {
    const modal = document.getElementById('locationMapModal');
    if (!modal) return;

    modal.style.display = 'flex';
    document.getElementById('locModal-title').textContent = `📍 ${locationText}`;
    document.getElementById('locModal-type').textContent = type || '';

    // Setup directions link
    const dirBtn = document.getElementById('locModal-directions');
    dirBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    // Render map after modal is visible
    setTimeout(() => {
        const mapContainer = document.getElementById('locModalMap');
        if (_modalMap) {
            _modalMap.remove();
            _modalMap = null;
        }

        _modalMap = L.map('locModalMap').setView([lat, lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        }).addTo(_modalMap);

        const color = getSeverityColor(severity || 'Low');
        const icon = makeCircleIcon(color);
        L.marker([lat, lng], { icon }).addTo(_modalMap)
            .bindPopup(`<strong>📍 ${locationText}</strong>`)
            .openPopup();
    }, 150);
}

async function openLocationByAddress(locationText, type, severity) {
    const coords = await geocodeLocation(locationText);
    if (coords) {
        openLocationModal(coords[0], coords[1], locationText, type, severity);
    } else {
        // Fallback: open Google Maps search
        window.open(`https://www.google.com/maps/search/${encodeURIComponent(locationText)}`, '_blank');
    }
}

function closeLocationModal() {
    const modal = document.getElementById('locationMapModal');
    if (modal) modal.style.display = 'none';
    if (_modalMap) {
        _modalMap.remove();
        _modalMap = null;
    }
}

// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
    seedData();

    // Navbar scroll effect
    const nav = document.getElementById('mainNav');
    if (nav) {
        window.addEventListener('scroll', () => {
            nav.classList.toggle('scrolled', window.scrollY > 20);
        }, { passive: true });
    }

    // Close location modal on overlay click
    const locModal = document.getElementById('locationMapModal');
    if (locModal) {
        locModal.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeLocationModal();
        });
    }
});
