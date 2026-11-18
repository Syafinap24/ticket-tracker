/**
 * app.js - Main UI Controller and Event Wiring
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- STATE ---
  let currentTab = 'overview'; // 'overview', 'generator', 'tickets', 'realtime', 'backups', 'settings'
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
    document.querySelectorAll('.nav-tab, .mobile-nav-item, .fitness-nav-item').forEach(el => {
      if (el.dataset.tab === tabId) el.classList.add('active');
      else el.classList.remove('active');
    });

    const targetSection = document.getElementById(`section-${tabId}`);
    if (targetSection) targetSection.style.display = 'block';

    if (tabId === 'overview') {
      renderOverviewAndGoals();
    } else if (tabId === 'generator') {
      renderGeneratorUI();
    } else if (tabId === 'tickets') {
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
    const setTargetUniq = document.getElementById('set-target-uniq');

    if (setXlwoVal) setXlwoVal.value = settings.xlwoValidityDays;
    if (setXlwoRem) setXlwoRem.value = settings.xlwoReminderDays;
    if (setRfcVal) setRfcVal.value = settings.rfcValidityDays;
    if (setRfcRem) setRfcRem.value = settings.rfcReminderDays;
    if (setAppName) setAppName.value = settings.appName;
    if (setTargetUniq && window.achievementTracker) setTargetUniq.value = window.achievementTracker.targetUniq;
  }

  const btnSaveSettings = document.getElementById('btn-save-settings');
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', () => {
      const setTargetUniq = document.getElementById('set-target-uniq');
      if (setTargetUniq && window.achievementTracker) {
        window.achievementTracker.setTargetUniq(parseInt(setTargetUniq.value, 10) || 198);
      }

      const updated = {
        ...window.appStorage.getSettings(),
        xlwoValidityDays: parseInt(document.getElementById('set-xlwo-validity').value, 10) || 7,
        xlwoReminderDays: parseInt(document.getElementById('set-xlwo-reminder').value, 10) || 5,
        rfcValidityDays: parseInt(document.getElementById('set-rfc-validity').value, 10) || 27,
        rfcReminderDays: parseInt(document.getElementById('set-rfc-reminder').value, 10) || 25,
        appName: document.getElementById('set-app-name').value || 'Personal Ticket Tracker'
      };
      window.appStorage.saveSettings(updated);
      showToast('Pengaturan SLA & Target Uniq berhasil disimpan!', 'success');
      renderOverviewAndGoals();
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

  // =========================================================================
  // --- OVERVIEW & PERSONAL GOALS (198 UNIQ ACHIEVEMENT) CONTROLLER ---
  // =========================================================================
  const globalFitnessSearch = document.getElementById('global-fitness-search');
  const btnQuickToGenerator = document.getElementById('btn-quick-to-generator');

  if (globalFitnessSearch) {
    globalFitnessSearch.addEventListener('input', () => {
      renderOverviewAndGoals();
    });
  }

  if (btnQuickToGenerator) {
    btnQuickToGenerator.addEventListener('click', () => {
      switchTab('generator');
    });
  }

  function renderOverviewAndGoals() {
    if (!window.achievementTracker) return;

    const stats = window.achievementTracker.getAchievementStats();
    const kpi = window.ticketTracker ? window.ticketTracker.getKpiSummary() : { reminderCount: 0, criticalCount: 0 };

    // 1. Hero Milestone Badge
    const heroBadge = document.getElementById('hero-milestone-badge');
    if (heroBadge) {
      heroBadge.innerHTML = `🏆 Milestone: <strong>${stats.badgeTier}</strong> • ${stats.doneCount} / ${stats.target} Uniq (${stats.progressPercent}%)`;
    }

    // 2. Card 1: Teal (Uniq Goals)
    const metricUniqVal = document.getElementById('metric-uniq-value');
    const metricUniqPct = document.getElementById('metric-uniq-pct');
    const metricUniqSub = document.getElementById('metric-uniq-sub');
    const metricUniqBar = document.getElementById('metric-uniq-bar');
    if (metricUniqVal) metricUniqVal.textContent = `${stats.doneCount} / ${stats.target}`;
    if (metricUniqPct) metricUniqPct.textContent = `${stats.progressPercent}%`;
    if (metricUniqSub) metricUniqSub.textContent = `${stats.progressPercent}% of your ${stats.target} goals`;
    if (metricUniqBar) metricUniqBar.style.width = `${stats.progressPercent}%`;

    // 3. Card 2: Orange (Done / Selesai)
    const metricDoneVal = document.getElementById('metric-done-value');
    const metricDoneRing = document.getElementById('metric-done-ring');
    if (metricDoneVal) metricDoneVal.textContent = stats.doneCount;
    if (metricDoneRing) {
      metricDoneRing.innerHTML = AchievementTracker.createCircularRingSvg(stats.progressPercent, 48, 4, '#ffffff', 'rgba(255,255,255,0.25)');
    }

    // 4. Card 3: Coral / Pink (Partial)
    const metricPartialVal = document.getElementById('metric-partial-value');
    if (metricPartialVal) metricPartialVal.textContent = stats.partialCount;

    // 5. Card 4: Purple (Urgent SLA)
    const metricUrgentVal = document.getElementById('metric-urgent-value');
    if (metricUrgentVal) metricUrgentVal.textContent = kpi.reminderCount + kpi.criticalCount;

    // 6. Right Side Panel
    const panelTargetVal = document.getElementById('panel-target-val');
    const panelDoneVal = document.getElementById('panel-done-val');
    const panelPercentVal = document.getElementById('panel-percent-val');
    const panelGoalBadge = document.getElementById('panel-goal-badge');
    const panelGoalUniqSub = document.getElementById('panel-goal-uniq-sub');
    const panelRingUniq = document.getElementById('panel-ring-uniq');
    const panelRingRfc = document.getElementById('panel-ring-rfc');
    const panelRingXlwo = document.getElementById('panel-ring-xlwo');

    if (panelTargetVal) panelTargetVal.textContent = stats.target;
    if (panelDoneVal) panelDoneVal.textContent = stats.doneCount;
    if (panelPercentVal) panelPercentVal.textContent = `${stats.progressPercent}%`;
    if (panelGoalBadge) panelGoalBadge.textContent = stats.badgeTier;
    if (panelGoalUniqSub) panelGoalUniqSub.textContent = `${stats.doneCount} / ${stats.target} Fulfill`;

    if (panelRingUniq) {
      panelRingUniq.innerHTML = AchievementTracker.createCircularRingSvg(stats.progressPercent, 36, 3.5, '#0d9488', 'rgba(0,0,0,0.06)');
    }
    if (panelRingRfc) {
      panelRingRfc.innerHTML = AchievementTracker.createCircularRingSvg(Math.min(100, stats.progressPercent + 10), 36, 3.5, '#f97316', 'rgba(0,0,0,0.06)');
    }
    if (panelRingXlwo) {
      panelRingXlwo.innerHTML = AchievementTracker.createCircularRingSvg(Math.min(100, stats.progressPercent + 5), 36, 3.5, '#f43f5e', 'rgba(0,0,0,0.06)');
    }

    // 7. Semi-Circle Gauge Card (Monthly Progress)
    const panelSemiCircleGauge = document.getElementById('panel-semi-circle-gauge');
    const panelSemiCirclePct = document.getElementById('panel-semi-circle-pct');
    const panelSemiCircleDesc = document.getElementById('panel-semi-circle-desc');

    if (panelSemiCircleGauge) {
      panelSemiCircleGauge.innerHTML = AchievementTracker.createSemiCircleGaugeSvg(stats.progressPercent, 160, 90);
    }
    if (panelSemiCirclePct) panelSemiCirclePct.textContent = `${stats.progressPercent}%`;
    if (panelSemiCircleDesc) {
      panelSemiCircleDesc.textContent = `You have achieved ${stats.progressPercent}% of your ${stats.target} Uniq goals this month!`;
    }

    // 8. Donut Status Breakdown
    const donutValDone = document.getElementById('donut-val-done');
    const donutValPartial = document.getElementById('donut-val-partial');
    const donutValPending = document.getElementById('donut-val-pending');
    const estimatedDaysLbl = document.getElementById('estimated-days-lbl');
    const breakdownDonutSvg = document.getElementById('breakdown-donut-svg');

    if (donutValDone) donutValDone.textContent = stats.doneCount;
    if (donutValPartial) donutValPartial.textContent = stats.partialCount;
    if (donutValPending) donutValPending.textContent = stats.pendingCount;
    if (estimatedDaysLbl) estimatedDaysLbl.textContent = `${stats.daysEstimated} Hari Kerja`;

    if (breakdownDonutSvg) {
      breakdownDonutSvg.innerHTML = AchievementTracker.createCircularRingSvg(stats.progressPercent, 110, 10, '#10b981', 'rgba(0,0,0,0.08)');
    }

    // 9. Scheduled List in Right Panel
    const panelScheduledList = document.getElementById('panel-scheduled-list');
    if (panelScheduledList) {
      const schedule = window.achievementTracker.getUpcomingSchedule(4);
      if (schedule.length === 0) {
        panelScheduledList.innerHTML = `<div style="font-size:11px; color:var(--text-muted); text-align:center; padding:10px;">Belum ada jadwal Exe Plan.</div>`;
      } else {
        panelScheduledList.innerHTML = schedule.map(item => `
          <div class="scheduled-list-item">
            <div>
              <div style="font-weight: 700; color: var(--text-main); font-size: 12px;">${item.siteName}</div>
              <div style="font-size: 11px; color: var(--text-dim);">${item.city} • ${item.siteId}</div>
            </div>
            <span style="padding: 2px 8px; border-radius: 4px; background: rgba(249, 115, 22, 0.15); color: #ea580c; font-weight: bold; font-size: 11px;">
              ${item.exePlan}
            </span>
          </div>
        `).join('');
      }
    }

    // 10. Table: Uniq Goals & Activity Progress
    const overviewUniqTbody = document.getElementById('overview-uniq-tbody');
    if (overviewUniqTbody) {
      const q = (document.getElementById('global-fitness-search')?.value || '').toLowerCase().trim();
      let list = stats.uniqList;
      if (q) {
        list = list.filter(u => 
          u.uniq.toLowerCase().includes(q) ||
          u.siteName.toLowerCase().includes(q) ||
          u.city.toLowerCase().includes(q)
        );
      }

      if (list.length === 0) {
        overviewUniqTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">Belum ada data Uniq. Paste Data Master pada tab Generator Email.</td></tr>`;
      } else {
        overviewUniqTbody.innerHTML = list.map((u, idx) => {
          const isDone = (u.status || '').toLowerCase() === 'done';
          const isPartial = (u.status || '').toLowerCase() === 'partial';
          const stClass = isDone ? 'status-done' : (isPartial ? 'status-partial' : 'status-pending');
          const stText = isDone ? 'DONE' : (isPartial ? 'PARTIAL' : 'PENDING');

          return `
            <tr>
              <td>${idx + 1}</td>
              <td><strong>${u.uniq}</strong></td>
              <td>${u.siteName}</td>
              <td>${u.city}</td>
              <td>${u.exePlan}</td>
              <td><span class="status-badge ${stClass}">${stText}</span></td>
              <td>
                <button class="btn btn-secondary btn-sm btn-nav-to-generator" data-site-name="${u.siteName}">
                  Detail
                </button>
              </td>
            </tr>
          `;
        }).join('');

        overviewUniqTbody.querySelectorAll('.btn-nav-to-generator').forEach(btn => {
          btn.addEventListener('click', () => {
            switchTab('generator');
          });
        });
      }
    }
  }

  // =========================================================================
  // --- GENERATOR EMAIL & DATA MASTER CONTROLLER ---
  // =========================================================================
  const genMasterTbody = document.getElementById('gen-master-tbody');
  const emailPreviewContainer = document.getElementById('email-preview-container');
  const genStatsBadge = document.getElementById('gen-stats-badge');
  const neDatabaseCount = document.getElementById('ne-database-count');

  const genInputVendor = document.getElementById('gen-input-vendor');
  const genInputSow = document.getElementById('gen-input-sow');
  const genInputMop = document.getElementById('gen-input-mop');
  const genInputDate = document.getElementById('gen-input-date');
  const genSearchMaster = document.getElementById('gen-search-master');

  const btnSelectAllSites = document.getElementById('btn-select-all-sites');
  const btnDeselectAllSites = document.getElementById('btn-deselect-all-sites');
  const btnCopyEmailHtml = document.getElementById('btn-copy-email-html');
  const btnCopyPreviewBtn = document.getElementById('btn-copy-preview-btn');
  const btnPushToTracker = document.getElementById('btn-push-to-tracker');
  const btnExportEmailCsv = document.getElementById('btn-export-email-csv');
  const btnLoadDemoGenerator = document.getElementById('btn-load-demo-generator');

  // Modals for Generator
  const modalPasteMaster = document.getElementById('modal-paste-master');
  const btnOpenPasteMaster = document.getElementById('btn-open-paste-master');
  const pasteMasterTextarea = document.getElementById('paste-master-textarea');
  const btnProcessMasterPaste = document.getElementById('btn-process-master-paste');

  const modalPasteNe = document.getElementById('modal-paste-ne');
  const btnOpenPasteNe = document.getElementById('btn-open-paste-ne');
  const pasteNeTextarea = document.getElementById('paste-ne-textarea');
  const btnProcessNePaste = document.getElementById('btn-process-ne-paste');

  const modalPushTracker = document.getElementById('modal-push-tracker');
  const pushInputXlwo = document.getElementById('push-input-xlwo');
  const pushInputRfc = document.getElementById('push-input-rfc');
  const pushInputTitle = document.getElementById('push-input-title');
  const btnConfirmPushTracker = document.getElementById('btn-confirm-push-tracker');

  function renderGeneratorUI() {
    if (!window.emailGenerator) return;

    // 1. Sync Batch Config to inputs
    const cfg = window.emailGenerator.batchConfig;
    if (genInputVendor && !genInputVendor.dataset.userEdited) genInputVendor.value = cfg.vendor || '';
    if (genInputSow && !genInputSow.dataset.userEdited) genInputSow.value = cfg.sow || '';
    if (genInputMop && !genInputMop.dataset.userEdited) genInputMop.value = cfg.mop || '';
    if (genInputDate && !genInputDate.dataset.userEdited) {
      genInputDate.value = cfg.dateSubmit || new Date().toISOString().slice(0, 10);
    }

    // 2. Render Master Selection Table
    const masterList = window.emailGenerator.masterList;
    const searchFilter = (genSearchMaster ? genSearchMaster.value : '').toLowerCase().trim();

    let filteredMaster = masterList;
    if (searchFilter) {
      filteredMaster = filteredMaster.filter(m => 
        (m.siteId || '').toLowerCase().includes(searchFilter) ||
        (m.siteName || '').toLowerCase().includes(searchFilter) ||
        (m.city || '').toLowerCase().includes(searchFilter) ||
        (m.area || '').toLowerCase().includes(searchFilter) ||
        (m.hostname || '').toLowerCase().includes(searchFilter) ||
        (m.routerIp || '').toLowerCase().includes(searchFilter) ||
        (m.towerId || '').toLowerCase().includes(searchFilter)
      );
    }

    if (genMasterTbody) {
      if (filteredMaster.length === 0) {
        genMasterTbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 20px; color: var(--text-muted);">Tidak ada data master ditemukan. Klik "Paste Data Master" di atas.</td></tr>`;
      } else {
        genMasterTbody.innerHTML = filteredMaster.map(site => {
          const neCount = window.emailGenerator.getNeCountForSite(site.siteId);
          const neBadge = neCount > 0 
            ? `<span class="ne-tag">📎 ${neCount} NE</span>` 
            : `<span style="font-size:11px; color: var(--text-dim);">(0 NE)</span>`;

          return `
            <tr style="background: ${site.selected ? 'rgba(59, 130, 246, 0.08)' : 'transparent'};">
              <td style="text-align: center;">
                <input type="checkbox" class="checkbox-custom site-checkbox" data-master-id="${site.id}" ${site.selected ? 'checked' : ''}>
              </td>
              <td><strong>${site.siteId || '-'}</strong></td>
              <td>${site.siteName || '-'}</td>
              <td>${neBadge}</td>
              <td>${site.city || '-'}, ${site.area || '-'}</td>
              <td><code>${site.towerId || site.hutId || '-'}</code></td>
              <td>${site.hostname || site.hutRouter || '-'}</td>
              <td><code>${site.routerIp || '-'}</code></td>
              <td>${site.routepath || 'Direct'}</td>
              <td>${site.exePlan || '-'}</td>
            </tr>
          `;
        }).join('');
      }

      // Attach checkbox listeners
      genMasterTbody.querySelectorAll('.site-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
          const id = e.target.dataset.masterId;
          const target = window.emailGenerator.masterList.find(m => m.id === id);
          if (target) {
            target.selected = e.target.checked;
            window.emailGenerator.saveMaster(window.emailGenerator.masterList);
            updateGeneratorStatsAndPreview();
          }
        });
      });
    }

    updateGeneratorStatsAndPreview();
  }

  function updateGeneratorStatsAndPreview() {
    if (!window.emailGenerator) return;

    const emailItems = window.emailGenerator.generateEmailItems();
    const neItems = window.emailGenerator.getAttachedNeItems();

    // Update Stats Badge
    if (genStatsBadge) {
      genStatsBadge.textContent = `${emailItems.length} Site Dipilih • ${neItems.length} NE Terkait`;
    }

    if (neDatabaseCount) {
      const distinctSitesInNe = new Set(window.emailGenerator.neList.map(n => n.siteId)).size;
      neDatabaseCount.textContent = `${window.emailGenerator.neList.length} Record (${distinctSitesInNe} Site)`;
    }

    // Update Live Preview Container
    if (emailPreviewContainer) {
      emailPreviewContainer.innerHTML = window.emailGenerator.generateEmailHtml();
    }
  }

  // Batch Config Input Change Handlers
  function handleBatchConfigChange() {
    const newCfg = {
      vendor: genInputVendor ? genInputVendor.value.trim() : 'Huawei',
      sow: genInputSow ? genInputSow.value.trim() : '',
      mop: genInputMop ? genInputMop.value.trim() : '',
      dateSubmit: genInputDate ? genInputDate.value : ''
    };
    window.emailGenerator.saveBatchConfig(newCfg);
    updateGeneratorStatsAndPreview();
  }

  if (genInputVendor) {
    genInputVendor.addEventListener('input', () => {
      genInputVendor.dataset.userEdited = 'true';
      handleBatchConfigChange();
    });
  }
  if (genInputSow) {
    genInputSow.addEventListener('input', () => {
      genInputSow.dataset.userEdited = 'true';
      handleBatchConfigChange();
    });
  }
  if (genInputMop) {
    genInputMop.addEventListener('input', () => {
      genInputMop.dataset.userEdited = 'true';
      handleBatchConfigChange();
    });
  }
  if (genInputDate) {
    genInputDate.addEventListener('change', () => {
      genInputDate.dataset.userEdited = 'true';
      handleBatchConfigChange();
    });
  }

  if (genSearchMaster) {
    genSearchMaster.addEventListener('input', () => {
      renderGeneratorUI();
    });
  }

  // Select / Deselect All
  if (btnSelectAllSites) {
    btnSelectAllSites.addEventListener('click', () => {
      window.emailGenerator.masterList.forEach(m => m.selected = true);
      window.emailGenerator.saveMaster(window.emailGenerator.masterList);
      renderGeneratorUI();
    });
  }

  if (btnDeselectAllSites) {
    btnDeselectAllSites.addEventListener('click', () => {
      window.emailGenerator.masterList.forEach(m => m.selected = false);
      window.emailGenerator.saveMaster(window.emailGenerator.masterList);
      renderGeneratorUI();
    });
  }

  // Copy Email HTML (Formatted table for Outlook/Gmail)
  async function copyEmailHtmlToClipboard() {
    const html = window.emailGenerator.generateEmailHtml();
    if (!html || window.emailGenerator.generateEmailItems().length === 0) {
      alert('Pilih minimal 1 site dari Data Master terlebih dahulu.');
      return;
    }

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const blobHtml = new Blob([html], { type: 'text/html' });
        const plainText = html.replace(/<[^>]*>?/gm, ' ');
        const blobText = new Blob([plainText], { type: 'text/plain' });

        const item = new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText
        });
        await navigator.clipboard.write([item]);
        showToast('📋 Tabel Email & Lampiran NE berhasil disalin! Siap dipaste (Ctrl+V) di Outlook / Gmail.', 'success');
      } else {
        // Fallback copy
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '-9999px';
        document.body.appendChild(tempDiv);
        const range = document.createRange();
        range.selectNodeContents(tempDiv);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('copy');
        document.body.removeChild(tempDiv);
        showToast('📋 Format email berhasil disalin ke clipboard!', 'success');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menyalin otomatis: ' + err.message);
    }
  }

  if (btnCopyEmailHtml) btnCopyEmailHtml.addEventListener('click', copyEmailHtmlToClipboard);
  if (btnCopyPreviewBtn) btnCopyPreviewBtn.addEventListener('click', copyEmailHtmlToClipboard);

  // Export Email Items to CSV
  if (btnExportEmailCsv) {
    btnExportEmailCsv.addEventListener('click', () => {
      const items = window.emailGenerator.generateEmailItems();
      if (items.length === 0) {
        alert('Pilih minimal 1 site pada Data Master.');
        return;
      }
      window.backupManager.exportToCsv(items);
    });
  }

  // Load Demo Data (Site 2a & 3b with exact 9 NEs from user)
  if (btnLoadDemoGenerator) {
    btnLoadDemoGenerator.addEventListener('click', () => {
      if (confirm('Muat contoh data master (Site 2a & 3b) beserta mapping 9 NE domain?')) {
        window.emailGenerator.saveMaster(INITIAL_DEMO_MASTER);
        window.emailGenerator.saveNe(INITIAL_DEMO_NE);
        renderGeneratorUI();
        showToast('Contoh Data Master & Lampiran NE berhasil dimuat!', 'success');
      }
    });
  }

  // Modal: Paste Data Master
  if (btnOpenPasteMaster && modalPasteMaster) {
    btnOpenPasteMaster.addEventListener('click', () => {
      if (pasteMasterTextarea) pasteMasterTextarea.value = '';
      modalPasteMaster.classList.add('active');
    });
  }

  if (btnProcessMasterPaste) {
    btnProcessMasterPaste.addEventListener('click', () => {
      const text = pasteMasterTextarea.value;
      if (!text || !text.trim()) {
        alert('Silakan paste data tabel Data Master terlebih dahulu.');
        return;
      }

      try {
        const parsed = window.emailGenerator.parseMasterClipboard(text);
        const mode = document.querySelector('input[name="master-import-mode"]:checked').value;

        let newList = parsed;
        if (mode === 'APPEND') {
          newList = [...window.emailGenerator.masterList, ...parsed];
        }

        window.emailGenerator.saveMaster(newList);
        showToast(`Berhasil memproses ${parsed.length} baris Data Master!`, 'success');
        modalPasteMaster.classList.remove('active');
        renderGeneratorUI();
      } catch (err) {
        alert('Gagal memproses Data Master: ' + err.message);
      }
    });
  }

  // Modal: Paste Data Lampiran NE
  if (btnOpenPasteNe && modalPasteNe) {
    btnOpenPasteNe.addEventListener('click', () => {
      if (pasteNeTextarea) pasteNeTextarea.value = '';
      modalPasteNe.classList.add('active');
    });
  }

  if (btnProcessNePaste) {
    btnProcessNePaste.addEventListener('click', () => {
      const text = pasteNeTextarea.value;
      if (!text || !text.trim()) {
        alert('Silakan paste data tabel Lampiran NE (Site ID, NE Name, Technology Domain).');
        return;
      }

      try {
        const parsed = window.emailGenerator.parseNeClipboard(text);
        const mode = document.querySelector('input[name="ne-import-mode"]:checked').value;

        let newList = parsed;
        if (mode === 'APPEND') {
          newList = [...window.emailGenerator.neList, ...parsed];
        }

        window.emailGenerator.saveNe(newList);
        showToast(`Berhasil menyimpan ${parsed.length} data mapping NE!`, 'success');
        modalPasteNe.classList.remove('active');
        renderGeneratorUI();
      } catch (err) {
        alert('Gagal memproses Data Lampiran NE: ' + err.message);
      }
    });
  }

  // --- GOOGLE SPREADSHEET LIVE SYNC CONTROLLER ---
  const modalGsheets = document.getElementById('modal-gsheets');
  const btnOpenGsheets = document.getElementById('btn-open-gsheets');
  const inputGsheetMaster = document.getElementById('gsheet-master-url');
  const inputGsheetNe = document.getElementById('gsheet-ne-url');
  const btnDoGsheetSync = document.getElementById('btn-do-gsheet-sync');
  const gsheetSyncStatus = document.getElementById('gsheet-sync-status');
  const gsheetLastSyncLbl = document.getElementById('gsheet-last-sync-lbl');

  if (btnOpenGsheets && modalGsheets) {
    btnOpenGsheets.addEventListener('click', () => {
      if (inputGsheetMaster) {
        inputGsheetMaster.value = localStorage.getItem('tt_gsheet_master_url') || '';
      }
      if (inputGsheetNe) {
        inputGsheetNe.value = localStorage.getItem('tt_gsheet_ne_url') || '';
      }
      const lastSync = localStorage.getItem('tt_gsheet_last_sync');
      if (gsheetLastSyncLbl) {
        gsheetLastSyncLbl.textContent = lastSync ? `Terakhir sinkron: ${lastSync}` : 'Belum pernah sinkron';
      }
      if (gsheetSyncStatus) {
        gsheetSyncStatus.style.display = 'none';
      }
      modalGsheets.classList.add('active');
    });
  }

  if (btnDoGsheetSync) {
    btnDoGsheetSync.addEventListener('click', async () => {
      const masterUrl = (inputGsheetMaster ? inputGsheetMaster.value : '').trim();
      const neUrl = (inputGsheetNe ? inputGsheetNe.value : '').trim();

      if (!masterUrl) {
        alert('Masukkan minimal Link Google Sheets untuk Data Master (33 Kolom).');
        return;
      }

      const origBtnText = btnDoGsheetSync.innerHTML;
      btnDoGsheetSync.disabled = true;
      btnDoGsheetSync.innerHTML = '⏳ Menghubungkan Google Sheets...';

      if (gsheetSyncStatus) {
        gsheetSyncStatus.style.display = 'block';
        gsheetSyncStatus.style.background = 'rgba(59, 130, 246, 0.15)';
        gsheetSyncStatus.style.color = '#60a5fa';
        gsheetSyncStatus.innerHTML = '🔄 Mengunduh dan memproses Data Master dari spreadsheet...';
      }

      try {
        // Simpan URL agar user tidak perlu ketik ulang
        localStorage.setItem('tt_gsheet_master_url', masterUrl);
        if (neUrl) localStorage.setItem('tt_gsheet_ne_url', neUrl);

        // 1. Fetch & Parse Data Master
        const masterCsv = await window.emailGenerator.fetchGSheet(masterUrl);
        const parsedMaster = window.emailGenerator.parseMasterClipboard(masterCsv);
        if (parsedMaster.length === 0) {
          throw new Error('Data Master di Google Sheet kosong atau tidak memiliki baris data.');
        }
        window.emailGenerator.saveMaster(parsedMaster);

        // 2. Fetch & Parse Data NE jika diisi
        let neCount = 0;
        if (neUrl) {
          if (gsheetSyncStatus) gsheetSyncStatus.innerHTML = '🔄 Mengunduh Data Lampiran NE dari spreadsheet...';
          const neCsv = await window.emailGenerator.fetchGSheet(neUrl);
          const parsedNe = window.emailGenerator.parseNeClipboard(neCsv);
          if (parsedNe.length > 0) {
            window.emailGenerator.saveNe(parsedNe);
            neCount = parsedNe.length;
          }
        }

        const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        localStorage.setItem('tt_gsheet_last_sync', `${new Date().toLocaleDateString('id-ID')} ${nowStr}`);
        if (gsheetLastSyncLbl) gsheetLastSyncLbl.textContent = `Terakhir sinkron: Hari ini ${nowStr}`;

        if (gsheetSyncStatus) {
          gsheetSyncStatus.style.background = 'rgba(16, 185, 129, 0.2)';
          gsheetSyncStatus.style.color = '#34d399';
          gsheetSyncStatus.innerHTML = `✅ Berhasil sinkron! Ditemukan <strong>${parsedMaster.length} baris Master</strong>${neCount > 0 ? ` & <strong>${neCount} baris NE</strong>` : ''}.`;
        }

        showToast(`📊 Sinkronisasi Google Sheets berhasil (${parsedMaster.length} site master)!`, 'success');

        // Re-render seluruh dashboard
        renderOverviewAndGoals();
        renderGeneratorUI();

        // Auto close setelah 1.5 detik
        setTimeout(() => {
          if (modalGsheets) modalGsheets.classList.remove('active');
        }, 1500);

      } catch (err) {
        console.error('Google Sheets Sync Error:', err);
        if (gsheetSyncStatus) {
          gsheetSyncStatus.style.display = 'block';
          gsheetSyncStatus.style.background = 'rgba(239, 68, 68, 0.2)';
          gsheetSyncStatus.style.color = '#f87171';
          gsheetSyncStatus.innerHTML = `❌ ${err.message}`;
        }
        alert('Gagal sinkron Google Sheets: ' + err.message);
      } finally {
        btnDoGsheetSync.disabled = false;
        btnDoGsheetSync.innerHTML = origBtnText;
      }
    });
  }

  // Modal: Push to Ticket Tracker
  if (btnPushToTracker && modalPushTracker) {
    btnPushToTracker.addEventListener('click', () => {
      const selected = window.emailGenerator.masterList.filter(m => m.selected);
      if (selected.length === 0) {
        alert('Pilih minimal 1 site pada Data Master terlebih dahulu.');
        return;
      }

      // Auto-suggest nomor dari master jika ada
      const firstWithXlwo = selected.find(s => s.xlwoTrm || s.xlwoRan);
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      if (pushInputXlwo) {
        pushInputXlwo.value = firstWithXlwo ? (firstWithXlwo.xlwoTrm || firstWithXlwo.xlwoRan) : `XLWO-${todayStr}-00000035`;
      }
      if (pushInputRfc) {
        pushInputRfc.value = firstWithXlwo ? (firstWithXlwo.rfcTrm || firstWithXlwo.rfcRan) : `RFC-${todayStr}-00000023`;
      }
      if (pushInputTitle) {
        pushInputTitle.value = window.emailGenerator.batchConfig.sow || 'Support Delete Configuration EBGP Multihop';
      }

      modalPushTracker.classList.add('active');
    });
  }

  if (btnConfirmPushTracker) {
    btnConfirmPushTracker.addEventListener('click', () => {
      const xlwo = pushInputXlwo.value.trim();
      const rfc = pushInputRfc.value.trim();
      const title = pushInputTitle.value.trim();

      const count = window.emailGenerator.exportToTicketTracker(xlwo, rfc, title);
      showToast(`🚀 ${count} site berhasil dikirim ke Ticket Tracker!`, 'success');
      modalPushTracker.classList.remove('active');

      // Pindahkan langsung ke tab tiket tracker agar user langsung melihat kartu SLA
      switchTab('tickets');
    });
  }

  // --- INITIAL RENDER ---
  renderOverviewAndGoals();
  renderGeneratorUI();
  renderDashboard();
});
