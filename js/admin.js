// --- Admin Authentication ---
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';
const CONTACTS_KEY = 'crowdsafe_contacts';

function getContacts() {
    return JSON.parse(localStorage.getItem(CONTACTS_KEY) || '[]');
}

function checkLogin() {
    const isLoggedIn = localStorage.getItem('crowdsafe_admin');
    if (isLoggedIn === 'true') {
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        loadAdminDashboard();
    } else {
        document.getElementById('admin-login').style.display = 'flex';
        document.getElementById('admin-dashboard').style.display = 'none';
    }
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        localStorage.setItem('crowdsafe_admin', 'true');
        errorMsg.style.display = 'none';
        checkLogin();
    } else {
        errorMsg.style.display = 'block';
        document.getElementById('password').value = '';
    }
}

function handleLogout() {
    localStorage.removeItem('crowdsafe_admin');
    window.location.href = 'admin.html';
}

// --- Tab Switching ---
function switchAdminTab(tab) {
    const reportsPanel = document.getElementById('panel-reports');
    const contactsPanel = document.getElementById('panel-contacts');
    const tabReports = document.getElementById('tab-reports');
    const tabContacts = document.getElementById('tab-contacts');

    if (tab === 'reports') {
        reportsPanel.style.display = 'block';
        contactsPanel.style.display = 'none';
        tabReports.classList.add('active');
        tabContacts.classList.remove('active');
    } else {
        reportsPanel.style.display = 'none';
        contactsPanel.style.display = 'block';
        tabReports.classList.remove('active');
        tabContacts.classList.add('active');
        loadContactMessages();
    }
}

// --- Admin Dashboard Functions ---
function loadAdminDashboard() {
    const reports = getReports();

    // Update Stats
    document.getElementById('admin-total').textContent = reports.length;
    document.getElementById('admin-active').textContent = reports.filter(r => r.status === 'active').length;
    document.getElementById('admin-resolved').textContent = reports.filter(r => r.status === 'resolved').length;
    document.getElementById('admin-verified').textContent = reports.filter(r => r.verified).length;

    // Render Table (full set, then apply filter)
    renderAdminTable(reports);

    // Update unread badge for contacts tab
    updateUnreadBadge();
}

function renderAdminTable(reports) {
    const tbody = document.getElementById('admin-table-body');
    const noResults = document.getElementById('admin-no-results');
    const rowCount = document.getElementById('admin-row-count');

    if (reports.length === 0) {
        tbody.innerHTML = '';
        noResults.style.display = 'block';
        rowCount.textContent = '';
        return;
    }

    noResults.style.display = 'none';
    rowCount.textContent = `Showing ${reports.length} report(s)`;

    tbody.innerHTML = reports.map((report, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td><strong>${escapeHTML(report.name)}</strong></td>
            <td>${escapeHTML(report.phone)}</td>
            <td>${escapeHTML(report.type)}</td>
            <td title="${escapeHTML(report.location)}">${report.lat && report.lng
                ? `<a href="#" class="location-link" onclick="openLocationModal(${report.lat}, ${report.lng}, '${escapeHTML(report.location).replace(/'/g, "\\'")}',' ${escapeHTML(report.type)}', '${escapeHTML(report.severity)}'); return false;">📍 ${escapeHTML(report.location)}</a>`
                : `<span class="location-link location-link-text" onclick="openLocationByAddress('${escapeHTML(report.location).replace(/'/g, "\\'")}', '${escapeHTML(report.type)}', '${escapeHTML(report.severity)}')">📍 ${escapeHTML(report.location)}</span>`
            }</td>
            <td>${getSeverityBadge(report.severity)}</td>
            <td style="white-space:nowrap; font-size:0.82rem;">${formatDateAdmin(report.timestamp)}</td>
            <td>
                <span class="badge ${report.status === 'active' ? 'badge-high' : 'badge-low'}">
                    ${report.status === 'active' ? '🔴 Active' : '✅ Resolved'}
                </span>
            </td>
            <td>
                <span class="badge ${report.verified ? 'badge-verified' : 'badge-pending'}">
                    ${report.verified ? '🛡 Yes' : '⏳ No'}
                </span>
            </td>
            <td class="action-cell">
                <button class="btn btn-primary action-btn" onclick="resolveReport(${report.id})">
                    ${report.status === 'active' ? 'Resolve' : 'Reopen'}
                </button>
                <button class="btn ${report.verified ? 'btn-danger' : 'btn-success'} action-btn" onclick="toggleVerifyReport(${report.id})">
                    ${report.verified ? 'Unverify' : 'Verify'}
                </button>
                <button class="btn btn-danger action-btn" onclick="deleteReport(${report.id})">🗑</button>
            </td>
        </tr>
    `).join('');
}

// --- Filter/Search ---
function filterAdminTable() {
    const search = document.getElementById('adminSearch').value.toLowerCase();
    const status = document.getElementById('filterStatus').value;
    const severity = document.getElementById('filterSeverity').value;
    const type = document.getElementById('filterType').value;

    let reports = getReports();

    if (status !== 'All') reports = reports.filter(r => r.status === status);
    if (severity !== 'All') reports = reports.filter(r => r.severity === severity);
    if (type !== 'All') reports = reports.filter(r => r.type === type);

    if (search) {
        reports = reports.filter(r =>
            r.name.toLowerCase().includes(search) ||
            r.location.toLowerCase().includes(search) ||
            r.type.toLowerCase().includes(search) ||
            r.description.toLowerCase().includes(search) ||
            r.phone.includes(search)
        );
    }

    renderAdminTable(reports);
}

// --- Actions ---
function resolveReport(id) {
    let reports = getReports();
    const index = reports.findIndex(r => r.id === id);
    if (index !== -1) {
        reports[index].status = reports[index].status === 'active' ? 'resolved' : 'active';
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
        loadAdminDashboard();
    }
}

function toggleVerifyReport(id) {
    let reports = getReports();
    const index = reports.findIndex(r => r.id === id);
    if (index !== -1) {
        reports[index].verified = !reports[index].verified;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
        loadAdminDashboard();
    }
}

function deleteReport(id) {
    if (confirm('Are you sure you want to delete this report? This cannot be undone.')) {
        let reports = getReports();
        reports = reports.filter(r => r.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
        loadAdminDashboard();
    }
}

// --- Export CSV ---
function exportCSV() {
    const reports = getReports();
    if (reports.length === 0) {
        alert('No reports to export.');
        return;
    }
    const headers = ['#', 'Name', 'Phone', 'Type', 'Location', 'Severity', 'Description', 'Timestamp', 'Status', 'Verified'];
    const rows = reports.map((r, i) => [
        i + 1,
        `"${r.name}"`,
        `"${r.phone}"`,
        r.type,
        `"${r.location}"`,
        r.severity,
        `"${r.description}"`,
        new Date(r.timestamp).toLocaleString('en-IN'),
        r.status,
        r.verified ? 'Yes' : 'No'
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crowdsafe_reports_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// --- Contact Messages Functions ---
function loadContactMessages() {
    const contacts = getContacts();

    // Update contact stats
    document.getElementById('contact-total').textContent = contacts.length;
    document.getElementById('contact-unread').textContent = contacts.filter(c => !c.read).length;
    document.getElementById('contact-read').textContent = contacts.filter(c => c.read).length;

    renderContactTable(contacts);
    updateUnreadBadge();
}

function renderContactTable(contacts) {
    const tbody = document.getElementById('contact-table-body');
    const noResults = document.getElementById('contact-no-results');
    const rowCount = document.getElementById('contact-row-count');

    if (contacts.length === 0) {
        tbody.innerHTML = '';
        noResults.style.display = 'block';
        rowCount.textContent = '';
        return;
    }

    noResults.style.display = 'none';
    rowCount.textContent = `Showing ${contacts.length} message(s)`;

    tbody.innerHTML = contacts.map((c, idx) => `
        <tr class="${c.read ? '' : 'unread-row'}">
            <td>${idx + 1}</td>
            <td><strong>${escapeHTML(c.name)}</strong></td>
            <td><a href="mailto:${escapeHTML(c.email)}" style="color:var(--primary);">${escapeHTML(c.email)}</a></td>
            <td class="message-preview" title="${escapeHTML(c.message)}">${escapeHTML(c.message.length > 50 ? c.message.substring(0, 50) + '...' : c.message)}</td>
            <td style="white-space:nowrap; font-size:0.82rem;">${formatDateAdmin(c.timestamp)}</td>
            <td>
                <span class="badge ${c.read ? 'badge-low' : 'badge-high'}">
                    ${c.read ? '👁️ Read' : '🔵 Unread'}
                </span>
            </td>
            <td class="action-cell">
                <button class="btn btn-primary action-btn" onclick="viewContactMessage(${c.id})">👁️ View</button>
                <button class="btn ${c.read ? 'btn-outline' : 'btn-success'} action-btn" onclick="toggleReadContact(${c.id})">
                    ${c.read ? 'Mark Unread' : 'Mark Read'}
                </button>
                <button class="btn btn-danger action-btn" onclick="deleteContact(${c.id})">🗑</button>
            </td>
        </tr>
    `).join('');
}

function filterContactTable() {
    const search = document.getElementById('contactSearch').value.toLowerCase();
    const readStatus = document.getElementById('filterReadStatus').value;

    let contacts = getContacts();

    if (readStatus === 'unread') contacts = contacts.filter(c => !c.read);
    if (readStatus === 'read') contacts = contacts.filter(c => c.read);

    if (search) {
        contacts = contacts.filter(c =>
            c.name.toLowerCase().includes(search) ||
            c.email.toLowerCase().includes(search) ||
            c.message.toLowerCase().includes(search)
        );
    }

    renderContactTable(contacts);
}

function viewContactMessage(id) {
    const contacts = getContacts();
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;

    // Mark as read
    if (!contact.read) {
        contact.read = true;
        localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
        loadContactMessages();
    }

    const modal = document.getElementById('contactModal');
    const body = document.getElementById('modalBody');

    body.innerHTML = `
        <div class="modal-detail">
            <div class="detail-row">
                <span class="detail-label">👤 Name</span>
                <span class="detail-value">${escapeHTML(contact.name)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">📧 Email</span>
                <span class="detail-value"><a href="mailto:${escapeHTML(contact.email)}" style="color:var(--primary);">${escapeHTML(contact.email)}</a></span>
            </div>
            <div class="detail-row">
                <span class="detail-label">🕒 Received</span>
                <span class="detail-value">${formatDateAdmin(contact.timestamp)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">📄 Status</span>
                <span class="detail-value">
                    <span class="badge ${contact.read ? 'badge-low' : 'badge-high'}">
                        ${contact.read ? '👁️ Read' : '🔵 Unread'}
                    </span>
                </span>
            </div>
            <div class="detail-message">
                <span class="detail-label">💬 Message</span>
                <p>${escapeHTML(contact.message)}</p>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

function closeContactModal() {
    document.getElementById('contactModal').style.display = 'none';
}

function toggleReadContact(id) {
    let contacts = getContacts();
    const idx = contacts.findIndex(c => c.id === id);
    if (idx !== -1) {
        contacts[idx].read = !contacts[idx].read;
        localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
        loadContactMessages();
    }
}

function deleteContact(id) {
    if (confirm('Delete this contact message? This cannot be undone.')) {
        let contacts = getContacts();
        contacts = contacts.filter(c => c.id !== id);
        localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
        loadContactMessages();
    }
}

function updateUnreadBadge() {
    const contacts = getContacts();
    const unread = contacts.filter(c => !c.read).length;
    const badge = document.getElementById('contact-unread-badge');
    if (unread > 0) {
        badge.textContent = unread;
        badge.style.display = 'inline-flex';
    } else {
        badge.style.display = 'none';
    }
}

// --- Helpers ---
function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDateAdmin(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// --- Initialize Admin Page ---
document.addEventListener('DOMContentLoaded', () => {
    checkLogin();
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Close modal on overlay click
    document.getElementById('contactModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeContactModal();
    });
});
