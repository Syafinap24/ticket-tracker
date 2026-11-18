/**
 * app.js - Main UI Controller and Event Wiring
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- STATE ---
  let currentTab = 'tickets'; // 'tickets', 'realtime', 'backups', 'settings'
  let currentViewMode = 'grouped'; // 'grouped' or 'flat'
  let currentFilter = {
    status: '',
    vendor: 'ALL',
    search: ''
  };

  // --- DOM ELEMENTS ---
  const kpiTotalEl = document.getElementById('kpi-total');
  const kpiReminderEl = document.getElementById('kpi-reminder');
  const kpiPartialEl = document.getElementById('kpi-partial');
  const kpiDoneEl = document.getElementById('kpi-done');
  const kpiExpiredEl = document.getElementById('kpi-expired');

  const ticketsContainer = document.getElementById('tickets-container');
  const flatTableContainer = document.getElementById('flat-table-container');
  const searchInput = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');
  const vendorFilter = document.getElementById('vendor-filter');

  // --- INIT THEME ---
  const currentTheme = window.appStorage.getTheme();
  document.documentElement.setAttribute('data-theme', currentTheme);
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.textContent = currentTheme === 'dark' ? '☀️ Light' : '🌙 Dark';
    themeToggleBtn.addEventListener('click', () => {
      const nextTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      window.appStorage.saveTheme(nextTheme);
      themeToggleBtn.textContent = nextTheme === 'dark' ? '☀️ Light' : '🌙 Dark';
    });
  }

  // --- TAB SWITCHING ---
  function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-tab, .mobile-nav-item').forEach(el => {
      if (el.dataset.tab === tabId) el.classList.add('active');
      else el.classList.remove('active');
    });

    const targetSection = document.getElementById(`section-${tabId}`);
    if (targetSection) targetSection.style.display = 'block';

    if (tabId === 'tickets') {
      renderDashboard();
    } else if (tabId === 'realtime') {
      renderRealtimeSection();
    } else if (tabId === 'backups') {
      renderBackupSection();
    } else if (tabId === 'settings') {
      loadSettingsForm();
    }
  }

  document.querySelectorAll('[data-tab]').forEach(el => {
    el.addEventListener('click', (e) => {
      const tab = e.currentTarget.dataset.tab;
      if (tab) switchTab(tab);
    });
  });

  // --- VIEW MODE SWITCHER ---
  const btnViewGrouped = document.getElementById('btn-view-grouped');
  const btnViewFlat = document.getElementById('btn-view-flat');

  if (btnViewGrouped && btnViewFlat) {
    btnViewGrouped.addEventListener('click', () => {
      currentViewMode = 'grouped';
      btnViewGrouped.classList.add('active');
      btnViewFlat.classList.remove('active');
      renderDashboard();
    });

    btnViewFlat.addEventListener('click', () => {
      currentViewMode = 'flat';
      btnViewFlat.classList.add('active');
      btnViewGrouped.classList.remove('active');
      renderDashboard();
    });
  }

  // --- FILTERS & SEARCH ---
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilter.search = e.target.value;
      renderDashboard();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      currentFilter.status = e.target.value;
      renderDashboard();
    });
  }

  if (vendorFilter) {
    vendorFilter.addEventListener('change', (e) => {
      currentFilter.vendor = e.target.value;
      renderDashboard();
    });
  }

  // --- RENDER DASHBOARD & TICKETS ---
  function renderDashboard() {
    // 1. Update KPI Summary
    const kpi = window.ticketTracker.getKpiSummary();
    if (kpiTotalEl) kpiTotalEl.textContent = kpi.totalTickets;
    if (kpiReminderEl) kpiReminderEl.textContent = kpi.reminderCount;
    if (kpiPartialEl) kpiPartialEl.textContent = kpi.partialCount;
    if (kpiDoneEl) kpiDoneEl.textContent = kpi.doneCount;
    if (kpiExpiredEl) kpiExpiredEl.textContent = kpi.expiredCount;

    // 2. Populate Vendor Filter Options dynamically
    updateVendorDropdown();

    // 3. Render Tickets based on View Mode
    const grouped = window.ticketTracker.getGroupedTickets(currentFilter);

    if (currentViewMode === 'grouped') {
      ticketsContainer.style.display = 'flex';
      flatTableContainer.style.display = 'none';
      renderGroupedCards(grouped);
    } else {
      ticketsContainer.style.display = 'none';
      flatTableContainer.style.display = 'block';
      renderFlatTable();
    }
  }

  function updateVendorDropdown() {
    if (!vendorFilter) return;
    const allTickets = window.appStorage.getTickets();
    const vendors = Array.from(new Set(allTickets.map(t => (t.vendor || '').trim()).filter(Boolean)));
    
    const currVal = vendorFilter.value || 'ALL';
    let opts = '<option value="ALL">Semua Vendor</option>';
    vendors.forEach(v => {
      opts += `<option value="${v}" ${v === currVal ? 'selected' : ''}>${v}</option>`;
    });
    vendorFilter.innerHTML = opts;
  }

  function renderGroupedCards(groups) {
    if (!ticketsContainer) return;

    if (groups.length === 0) {
      ticketsContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 16px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-color); color: var(--text-muted);">
          <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
          <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px;">Tidak ada tiket ditemukan</div>
          <div style="font-size: 12px;">Coba ubah kata kunci pencarian, filter status, atau import data Excel baru.</div>
        </div>
      `;
      return;
    }

    let html = '';
    groups.forEach((grp, idx) => {
      let cardClassModifier = '';
      if (grp.isExpired) cardClassModifier = 'is-expired';
      else if (grp.isCritical) cardClassModifier = 'is-critical';
      else if (grp.isUrgent) cardClassModifier = 'is-reminder';
      else if (grp.hasPartial) cardClassModifier = 'has-partial';

      // SOW & Plan info
      const sowBadge = grp.sow ? `<span style="font-size: 11px; padding: 2px 6px; background: rgba(255,255,255,0.06); border-radius: 4px; color: var(--text-muted);">SOW: ${grp.sow}</span>` : '';
      const vendorBadge = grp.vendor ? `<span style="font-size: 11px; padding: 2px 6px; background: rgba(59,130,246,0.1); border-radius: 4px; color: #60a5fa;">${grp.vendor}</span>` : '';

      html += `
        <div class="ticket-card ${cardClassModifier}">
          <div class="ticket-header">
            <div>
              <div class="ticket-ids">
                <span class="ticket-badge badge-xlwo">
                  📄 ${grp.xlwoNum}
                </span>
                <span class="ticket-badge badge-rfc">
                  📑 ${grp.rfcNum}
                </span>
                ${vendorBadge}
                ${sowBadge}
              </div>
              <div class="ticket-title">${grp.xlwoTitle}</div>
            </div>
            <div>
              <span class="status-badge ${grp.overallBadge}">
                ${grp.overallLabel}
              </span>
            </div>
          </div>

          <!-- SLA Expiry Countdown Box -->
          <div class="expiry-box-container">
            <div class="expiry-item">
              <div class="expiry-title">
                <span>XLWO (Masa Berlaku 7 Hari)</span>
                <span class="detail-k">Buat: ${grp.xlwoSla.createDateStr || '-'}</span>
              </div>
              <div class="expiry-countdown ${grp.xlwoSla.tagClass}">
                <span>⏱️ Expire: ${grp.xlwoSla.expireDateStr || '-'}</span>
                <span>•</span>
                <strong>${grp.xlwoSla.statusLabel}</strong>
              </div>
            </div>

            <div class="expiry-item">
              <div class="expiry-title">
                <span>RFC (Masa Berlaku 27 Hari)</span>
                <span class="detail-k">Buat: ${grp.rfcSla.createDateStr || '-'}</span>
              </div>
              <div class="expiry-countdown ${grp.rfcSla.tagClass}">
                <span>⏱️ Expire: ${grp.rfcSla.expireDateStr || '-'}</span>
                <span>•</span>
                <strong>${grp.rfcSla.statusLabel}</strong>
              </div>
            </div>
          </div>

          <!-- Sites Summary & Collapsible List -->
          <div class="sites-section">
            <div class="sites-header">
              <span>DAFTAR SITE (${grp.stats.total} Site: ${grp.stats.done} Done, ${grp.stats.partial} Partial)</span>
              <button class="btn btn-secondary btn-sm toggle-sites-btn" data-grp-idx="${idx}">
                Tampilkan / Sembunyikan Site
              </button>
            </div>

            <div class="sites-list-wrapper" id="sites-list-${idx}">
              ${grp.sites.map(site => renderSiteItemCard(site)).join('')}
            </div>
          </div>
        </div>
      `;
    });

    ticketsContainer.innerHTML = html;

    // Attach Toggle Site Visibility listeners
    document.querySelectorAll('.toggle-sites-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.dataset.grpIdx;
        const target = document.getElementById(`sites-list-${idx}`);
        if (target) {
          target.style.display = target.style.display === 'none' ? 'block' : 'none';
        }
      });
    });

    // Attach Edit Site Status listeners
    document.querySelectorAll('.btn-edit-site').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const siteId = e.currentTarget.dataset.siteId;
        openEditStatusModal(siteId);
      });
    });
  }

  function renderSiteItemCard(site) {
    const isDone = (site.status || '').toLowerCase() === 'done';
    const isPartial = (site.status || '').toLowerCase() === 'partial';
    const statusClass = isDone ? 'status-done' : (isPartial ? 'status-partial' : 'status-pending');
    const statusText = site.status ? site.status.toUpperCase() : 'PENDING';

    return `
      <div class="site-item-card">
        <div class="site-item-row1">
          <div class="site-name-wrap">
            <span>📍 ${site.siteName || '-'}</span>
            <span class="site-id-badge">${site.siteId || '-'}</span>
            <span class="site-id-badge">${site.towerId || '-'}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="status-badge ${statusClass}">${statusText}</span>
            <button class="btn btn-secondary btn-sm btn-edit-site" data-site-id="${site.id}" title="Ubah status site ini">
              ✏️ Status
            </button>
          </div>
        </div>

        <div class="site-details-grid">
          <div class="site-detail-entry">
            <span class="detail-k">CSR:</span>
            <span class="detail-v">${site.hostnameCsr || '-'}</span>
          </div>
          <div class="site-detail-entry">
            <span class="detail-k">IP Loopback:</span>
            <span class="detail-v">${site.ipLoopback || '-'}</span>
          </div>
          <div class="site-detail-entry">
            <span class="detail-k">Koneksi:</span>
            <span class="detail-v">${site.directMwFo || '-'}</span>
          </div>
          <div class="site-detail-entry">
            <span class="detail-k">MOP:</span>
            <span class="detail-v">${site.mop || '-'}</span>
          </div>
          <div class="site-detail-entry">
            <span class="detail-k">Lokasi:</span>
            <span class="detail-v">${site.kabupaten || '-'}, ${site.province || '-'}</span>
          </div>
          <div class="site-detail-entry">
            <span class="detail-k">Plan:</span>
            <span class="detail-v">${site.planActivity || '-'}</span>
          </div>
        </div>

        ${site.notes ? `
          <div style="font-size: 11px; background: rgba(255,255,255,0.03); padding: 4px 8px; border-radius: 4px; color: var(--text-dim); border-left: 2px solid var(--border-color); margin-top: 4px;">
            💬 Catatan: ${site.notes}
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderFlatTable() {
    if (!flatTableContainer) return;
    const all = window.appStorage.getTickets();

    // Apply Filter
    let filtered = all;
    if (currentFilter.search) {
      const q = currentFilter.search.toLowerCase().trim();
      filtered = filtered.filter(s => 
        (s.siteName || '').toLowerCase().includes(q) ||
        (s.siteId || '').toLowerCase().includes(q) ||
        (s.towerId || '').toLowerCase().includes(q) ||
        (s.xlwoNum || '').toLowerCase().includes(q) ||
        (s.rfcNum || '').toLowerCase().includes(q) ||
        (s.hostnameCsr || '').toLowerCase().includes(q) ||
        (s.ipLoopback || '').toLowerCase().includes(q)
      );
    }
    if (currentFilter.status) {
      if (currentFilter.status === 'DONE') filtered = filtered.filter(s => (s.status || '').toLowerCase() === 'done');
      else if (currentFilter.status === 'PARTIAL') filtered = filtered.filter(s => (s.status || '').toLowerCase() === 'partial');
    }
    if (currentFilter.vendor && currentFilter.vendor !== 'ALL') {
      filtered = filtered.filter(s => (s.vendor || '').toLowerCase() === currentFilter.vendor.toLowerCase());
    }

    let rowsHtml = filtered.map((s, idx) => {
      const isDone = (s.status || '').toLowerCase() === 'done';
      const isPartial = (s.status || '').toLowerCase() === 'partial';
      const statusClass = isDone ? 'status-done' : (isPartial ? 'status-partial' : 'status-pending');

      return `
        <tr>
          <td>${idx + 1}</td>
          <td><span class="status-badge ${statusClass}">${(s.status || 'PENDING').toUpperCase()}</span></td>
          <td><strong>${s.siteName || '-'}</strong></td>
          <td><code>${s.siteId || '-'}</code></td>
          <td><code>${s.towerId || '-'}</code></td>
          <td><code>${s.xlwoNum || '-'}</code></td>
          <td><code>${s.rfcNum || '-'}</code></td>
          <td>${s.hostnameCsr || '-'}</td>
          <td>${s.ipLoopback || '-'}</td>
          <td>${s.directMwFo || '-'}</td>
          <td>${s.mop || '-'}</td>
          <td>${s.vendor || '-'}</td>
          <td>${s.kabupaten || '-'}, ${s.province || '-'}</td>
          <td>${s.planActivity || '-'}</td>
          <td>
            <button class="btn btn-secondary btn-sm btn-edit-site" data-site-id="${s.id}">Ubah</button>
          </td>
        </tr>
      `;
    }).join('');

    flatTableContainer.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Status</th>
              <th>Site Name</th>
              <th>Site ID</th>
              <th>Tower ID</th>
              <th>XLWO Num</th>
              <th>RFC Num</th>
              <th>Hostname CSR</th>
              <th>IP Loopback</th>
              <th>Direct/MW/FO</th>
              <th>MOP</th>
              <th>Vendor</th>
              <th>Wilayah</th>
              <th>Plan Activity</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="15" style="text-align: center; padding: 20px;">Tidak ada data</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    flatTableContainer.querySelectorAll('.btn-edit-site').forEach(btn => {
      btn.addEventListener('click', (e) => {
        openEditStatusModal(e.currentTarget.dataset.siteId);
      });
    });
  }

  // --- MODAL: EDIT SITE STATUS ---
  const editStatusModal = document.getElementById('modal-edit-status');
  const editSiteNameEl = document.getElementById('edit-site-name');
  const editStatusSelect = document.getElementById('edit-status-select');
  const editNotesInput = document.getElementById('edit-notes-input');
  const btnSaveStatus = document.getElementById('btn-save-status');
  let activeEditingSiteId = null;

  function openEditStatusModal(siteId) {
    activeEditingSiteId = siteId;
    const tickets = window.appStorage.getTickets();
    const site = tickets.find(s => s.id === siteId);
    if (!site) return;

    if (editSiteNameEl) editSiteNameEl.textContent = `${site.siteName} (${site.siteId || site.towerId || '-'})`;
    if (editStatusSelect) editStatusSelect.value = (site.status || 'partial').toLowerCase();
    if (editNotesInput) editNotesInput.value = site.notes || '';

    if (editStatusModal) editStatusModal.classList.add('active');
  }

  if (btnSaveStatus) {
    btnSaveStatus.addEventListener('click', () => {
      if (!activeEditingSiteId) return;
      const newSt = editStatusSelect.value;
      const newNotes = editNotesInput.value;
      window.ticketTracker.updateSiteStatus(activeEditingSiteId, newSt, newNotes);
      showToast('Status site berhasil diperbarui!', 'success');
      if (editStatusModal) editStatusModal.classList.remove('active');
      renderDashboard();
    });
  }

  // --- MODAL: PASTE DIRECTLY FROM EXCEL ---
  const pasteModal = document.getElementById('modal-paste-excel');
  const btnOpenPaste = document.getElementById('btn-open-paste');
  const pasteTextarea = document.getElementById('paste-textarea');
  const btnProcessPaste = document.getElementById('btn-process-paste');

  if (btnOpenPaste && pasteModal) {
    btnOpenPaste.addEventListener('click', () => {
      if (pasteTextarea) pasteTextarea.value = '';
      pasteModal.classList.add('active');
      if (pasteTextarea) pasteTextarea.focus();
    });
  }

  if (btnProcessPaste) {
    btnProcessPaste.addEventListener('click', () => {
      const text = pasteTextarea.value;
      if (!text || !text.trim()) {
        alert('Silakan paste data tabel dari Excel terlebih dahulu.');
        return;
      }

      try {
        const parsed = TicketTracker.parseClipboardData(text);
        const mode = document.querySelector('input[name="paste-import-mode"]:checked').value;
        const result = window.ticketTracker.importRecords(parsed, mode);
        
        showToast(`Berhasil import ${result.count} data (${result.added} baru, ${result.updated} update)!`, 'success');
        pasteModal.classList.remove('active');
        renderDashboard();
      } catch (err) {
        alert('Gagal membaca data paste: ' + err.message);
      }
    });
  }

  // --- MODAL: UPLOAD FILE (CSV / XLSX) ---
  const uploadModal = document.getElementById('modal-upload-file');
  const btnOpenUpload = document.getElementById('btn-open-upload');
  const fileDropzone = document.getElementById('file-dropzone');
  const fileInput = document.getElementById('file-input');

  if (btnOpenUpload && uploadModal) {
    btnOpenUpload.addEventListener('click', () => {
      uploadModal.classList.add('active');
    });
  }

  if (fileDropzone && fileInput) {
    fileDropzone.addEventListener('click', () => fileInput.click());

    fileDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileDropzone.classList.add('dragover');
    });

    fileDropzone.addEventListener('dragleave', () => {
      fileDropzone.classList.remove('dragover');
    });

    fileDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      fileDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleIncomingFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleIncomingFile(e.target.files[0]);
      }
    });
  }

  function handleIncomingFile(file) {
    const filename = file.name.toLowerCase();
    const mode = document.querySelector('input[name="file-import-mode"]:checked').value;

    if (filename.endsWith('.csv') || filename.endsWith('.txt') || filename.endsWith('.tsv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const records = TicketTracker.parseClipboardData(e.target.result);
          const result = window.ticketTracker.importRecords(records, mode);
          showToast(`File CSV berhasil diimport: ${result.count} data (${result.added} baru, ${result.updated} update)!`, 'success');
          if (uploadModal) uploadModal.classList.remove('active');
          renderDashboard();
        } catch (err) {
          alert('Gagal membaca file CSV: ' + err.message);
        }
      };
      reader.readAsText(file);
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      // Check if SheetJS XLSX library is loaded
      if (typeof XLSX !== 'undefined') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            
            const records = TicketTracker.parseClipboardData(csv);
            const result = window.ticketTracker.importRecords(records, mode);
            showToast(`File Excel (.xlsx) berhasil diimport: ${result.count} baris!`, 'success');
            if (uploadModal) uploadModal.classList.remove('active');
            renderDashboard();
          } catch (err) {
            alert('Gagal memproses Excel: ' + err.message);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        alert('Library pembaca Excel (.xlsx) belum termuat. Anda dapat Save As ke .csv di Excel atau gunakan tombol "Paste dari Excel" yang sangat cepat!');
      }
    } else {
      alert('Format file tidak didukung. Harap upload file .xlsx atau .csv');
    }
  }

  // Close modals when clicking close button or background overlay
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      if (modal) modal.classList.remove('active');
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  // --- TEMPLATE & EXPORT BUTTONS ---
  const btnDownloadTemplate = document.getElementById('btn-download-template');
  if (btnDownloadTemplate) {
    btnDownloadTemplate.addEventListener('click', () => {
      window.backupManager.downloadTemplate();
    });
  }

  const btnExportCsv = document.getElementById('btn-export-csv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      window.backupManager.exportToCsv();
    });
  }

  // --- BACKUP & SNAPSHOT SECTION ---
  function renderBackupSection() {
    const snapshots = window.appStorage.getSnapshots();
    const container = document.getElementById('snapshots-list-container');
    if (!container) return;

    if (snapshots.length === 0) {
      container.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; padding: 12px 0;">Belum ada snapshot riwayat.</div>`;
      return;
    }

    container.innerHTML = snapshots.map(s => {
      const timeStr = new Date(s.timestamp).toLocaleString();
      return `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
          <div>
            <div style="font-weight: 700; font-size: 13px;">${s.reason || 'Auto Snapshot'}</div>
            <div style="font-size: 11px; color: var(--text-dim);">${timeStr} • ${s.count} Data Tiket</div>
          </div>
          <div>
            <button class="btn btn-secondary btn-sm btn-rollback-snap" data-snap-id="${s.id}">
              🔄 Rollback ke Sini
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-rollback-snap').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.snapId;
        if (confirm('Yakin ingin mengembalikan data ke titik waktu ini? Snapshot saat ini akan disimpan otomatis.')) {
          if (window.appStorage.restoreSnapshot(id)) {
            showToast('Data berhasil di-rollback!', 'success');
            renderBackupSection();
            renderDashboard();
          }
        }
      });
    });
  }

  const btnDownloadJsonBackup = document.getElementById('btn-download-json-backup');
  if (btnDownloadJsonBackup) {
    btnDownloadJsonBackup.addEventListener('click', () => {
      window.backupManager.downloadFullBackup();
      showToast('File backup JSON berhasil didownload!', 'success');
    });
  }

  const btnRestoreJsonFile = document.getElementById('btn-restore-json-file');
  const inputRestoreJson = document.getElementById('input-restore-json');
  if (btnRestoreJsonFile && inputRestoreJson) {
    btnRestoreJsonFile.addEventListener('click', () => inputRestoreJson.click());
    inputRestoreJson.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        window.backupManager.restoreFromFile(
          e.target.files[0],
          (msg) => {
            showToast(msg, 'success');
            renderBackupSection();
            renderDashboard();
          },
          (err) => alert(err)
        );
      }
    });
  }

  // --- SETTINGS FORM ---
  function loadSettingsForm() {
    const settings = window.appStorage.getSettings();
    const setXlwoVal = document.getElementById('set-xlwo-validity');
    const setXlwoRem = document.getElementById('set-xlwo-reminder');
    const setRfcVal = document.getElementById('set-rfc-validity');
    const setRfcRem = document.getElementById('set-rfc-reminder');
    const setAppName = document.getElementById('set-app-name');

    if (setXlwoVal) setXlwoVal.value = settings.xlwoValidityDays;
    if (setXlwoRem) setXlwoRem.value = settings.xlwoReminderDays;
    if (setRfcVal) setRfcVal.value = settings.rfcValidityDays;
    if (setRfcRem) setRfcRem.value = settings.rfcReminderDays;
    if (setAppName) setAppName.value = settings.appName;
  }

  const btnSaveSettings = document.getElementById('btn-save-settings');
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', () => {
      const updated = {
        ...window.appStorage.getSettings(),
        xlwoValidityDays: parseInt(document.getElementById('set-xlwo-validity').value, 10) || 7,
        xlwoReminderDays: parseInt(document.getElementById('set-xlwo-reminder').value, 10) || 5,
        rfcValidityDays: parseInt(document.getElementById('set-rfc-validity').value, 10) || 27,
        rfcReminderDays: parseInt(document.getElementById('set-rfc-reminder').value, 10) || 25,
        appName: document.getElementById('set-app-name').value || 'Personal Ticket Tracker'
      };
      window.appStorage.saveSettings(updated);
      showToast('Pengaturan SLA & Reminder berhasil disimpan!', 'success');
      renderDashboard();
    });
  }

  // --- REALTIME SECTION ---
  function renderRealtimeSection() {
    const listEl = document.getElementById('realtime-list-container');
    if (!listEl) return;

    let streams = window.appStorage.getRealtimeData();
    if (streams.length === 0) {
      streams = window.realtimeMonitor.getDemoStreams();
      window.appStorage.saveRealtimeData(streams);
    }

    listEl.innerHTML = streams.map(s => `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div>
            <strong>📍 ${s.siteName}</strong> (${s.siteId})
            <div style="font-size: 11px; color: var(--text-dim); font-family: monospace;">${s.hostnameCsr} | ${s.ipLoopback}</div>
          </div>
          <span class="status-badge ${s.linkStatus === 'UP' ? 'status-done' : 'status-pending'}">
            LINK: ${s.linkStatus}
          </span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; font-size: 12px; background: var(--bg-primary); padding: 8px 12px; border-radius: 6px;">
          <div><span class="detail-k">Latency:</span> <strong>${s.latencyMs} ms</strong></div>
          <div><span class="detail-k">Packet Loss:</span> <strong>${s.packetLossPct}%</strong></div>
          <div><span class="detail-k">CSR CPU:</span> <strong>${s.csrCpuPct}%</strong></div>
          <div><span class="detail-k">BGP:</span> <strong>${s.bgpState}</strong></div>
          <div><span class="detail-k">Heartbeat:</span> <span>${s.lastHeartbeat || '-'}</span></div>
        </div>
      </div>
    `).join('');
  }

  const btnToggleLiveTelemetry = document.getElementById('btn-toggle-live-telemetry');
  if (btnToggleLiveTelemetry) {
    btnToggleLiveTelemetry.addEventListener('click', () => {
      const isLive = window.realtimeMonitor.toggleLive(() => {
        renderRealtimeSection();
      });
      btnToggleLiveTelemetry.textContent = isLive ? '⏹️ Hentikan Live Polling' : '▶️ Mulai Live Simulation';
      btnToggleLiveTelemetry.className = isLive ? 'btn btn-danger btn-sm' : 'btn btn-primary btn-sm';
      showToast(isLive ? 'Live stream aktif!' : 'Live stream dihentikan', 'info');
    });
  }

  // --- TOAST HELPER ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<div>${message}</div>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
  window.showToast = showToast;
  window.refreshDashboardUI = renderDashboard;

  // --- CLOUD SYNC MODAL & EVENT WIRING (FIREBASE) ---
  const cloudSyncStatusBtn = document.getElementById('cloud-sync-status');
  const cloudSyncModal = document.getElementById('modal-cloud-sync');
  const inputFirebaseConfig = document.getElementById('input-firebase-config');
  const btnSaveCloudConfig = document.getElementById('btn-save-cloud-config');
  const btnDisconnectCloud = document.getElementById('btn-disconnect-cloud');
  const cloudTestResult = document.getElementById('cloud-test-result');

  if (cloudSyncStatusBtn && cloudSyncModal) {
    cloudSyncStatusBtn.addEventListener('click', () => {
      const cfg = window.firebaseSync.getConfig();
      if (inputFirebaseConfig) {
        inputFirebaseConfig.value = cfg ? JSON.stringify(cfg, null, 2) : '';
      }
      if (cloudTestResult) cloudTestResult.style.display = 'none';
      cloudSyncModal.classList.add('active');
    });
  }

  if (btnSaveCloudConfig) {
    btnSaveCloudConfig.addEventListener('click', async () => {
      const configText = inputFirebaseConfig.value.trim();

      if (!configText) {
        alert('Harap paste konfigurasi firebaseConfig terlebih dahulu.');
        return;
      }

      btnSaveCloudConfig.textContent = 'Menghubungkan ke Firebase...';
      btnSaveCloudConfig.disabled = true;

      const res = await window.firebaseSync.saveConfigAndConnect(configText);
      btnSaveCloudConfig.textContent = 'Hubungkan Firebase & Sinkron';
      btnSaveCloudConfig.disabled = false;

      if (cloudTestResult) {
        cloudTestResult.style.display = 'block';
        cloudTestResult.style.color = res.success ? 'var(--success)' : 'var(--danger)';
        cloudTestResult.textContent = res.message;
      }

      if (res.success) {
        showToast('🔥 Firebase Realtime Cloud berhasil terhubung!', 'success');
        setTimeout(() => {
          if (cloudSyncModal) cloudSyncModal.classList.remove('active');
          renderDashboard();
        }, 1200);
      }
    });
  }

  if (btnDisconnectCloud) {
    btnDisconnectCloud.addEventListener('click', () => {
      if (confirm('Yakin ingin memutuskan koneksi Firebase? Web akan kembali ke mode penyimpanan lokal.')) {
        window.firebaseSync.disconnect();
        if (inputFirebaseConfig) inputFirebaseConfig.value = '';
        if (cloudTestResult) {
          cloudTestResult.style.display = 'block';
          cloudTestResult.style.color = 'var(--text-muted)';
          cloudTestResult.textContent = 'Koneksi Firebase diputuskan. Berjalan di mode lokal.';
        }
        showToast('Kembali ke mode penyimpanan lokal.', 'info');
      }
    });
  }

  // Init Firebase Status Indicator & initial cloud pull if config exists
  if (window.firebaseSync) {
    window.firebaseSync.updateStatusIndicator();
    if (window.firebaseSync.db) {
      window.firebaseSync.pullFromCloud();
    }
  }

  // --- INITIAL RENDER ---
  renderDashboard();
});
