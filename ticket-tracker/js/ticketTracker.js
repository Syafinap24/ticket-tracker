/**
 * ticketTracker.js - Ticket Parser, SLA & Expiry Calculator, Grouping & Filtering
 */

class TicketTracker {
  constructor() {
    this.tickets = [];
    this.refresh();
  }

  refresh() {
    this.tickets = window.appStorage.getTickets();
  }

  // Extract YYYYMMDD from string like XLWO-20261110-00000035 or RFC-20261110-00000023
  static extractDateFromTicketNum(ticketStr) {
    if (!ticketStr || typeof ticketStr !== 'string') return null;
    
    // Pattern matches 8 digits between dashes or following prefix
    const match = ticketStr.match(/(\d{4})(\d{2})(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // 0-indexed
      const day = parseInt(match[3], 10);
      
      const d = new Date(year, month, day, 0, 0, 0);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
    return null;
  }

  // Calculate SLA, Expiry and Reminder Status for a ticket
  static calculateTicketSla(ticketNum, type = 'XLWO', settings = null) {
    if (!settings) settings = window.appStorage.getSettings();

    const isXlwo = type === 'XLWO';
    const validityDays = isXlwo ? settings.xlwoValidityDays : settings.rfcValidityDays;
    const reminderDaysThreshold = isXlwo ? settings.xlwoReminderDays : settings.rfcReminderDays;

    const createDate = TicketTracker.extractDateFromTicketNum(ticketNum);
    if (!createDate) {
      return {
        createDate: null,
        expireDate: null,
        daysRemaining: null,
        formattedRemaining: 'Format tanggal tidak terdeteksi',
        statusKey: 'UNKNOWN',
        statusLabel: 'Unknown Date',
        tagClass: 'tag-dim',
        isExpired: false,
        isReminder: false,
        isCritical: false
      };
    }

    const expireDate = new Date(createDate.getTime() + validityDays * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    // Calculate difference in milliseconds & days
    const diffMs = expireDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    const hoursRemaining = Math.max(0, Math.floor(diffMs / (60 * 60 * 1000)));

    let statusKey = 'SAFE';
    let statusLabel = 'Aman';
    let tagClass = 'tag-safe';
    let isExpired = false;
    let isReminder = false;
    let isCritical = false;

    if (diffMs <= 0) {
      statusKey = 'EXPIRED';
      statusLabel = `Expired (${Math.abs(diffDays)} hari lalu)`;
      tagClass = 'tag-expired';
      isExpired = true;
    } else if (diffDays <= 2) {
      statusKey = 'CRITICAL';
      statusLabel = `Kritis! (${diffDays} hari / ${hoursRemaining}j)`;
      tagClass = 'tag-critical';
      isCritical = true;
      isReminder = true;
    } else if (diffDays <= reminderDaysThreshold) {
      statusKey = 'REMINDER';
      statusLabel = `Reminder H-${reminderDaysThreshold} (${diffDays} hari tersisa)`;
      tagClass = 'tag-warning';
      isReminder = true;
    } else {
      statusKey = 'SAFE';
      statusLabel = `Aman (${diffDays} hari tersisa)`;
      tagClass = 'tag-safe';
    }

    return {
      createDate,
      createDateStr: createDate.toISOString().split('T')[0],
      expireDate,
      expireDateStr: expireDate.toISOString().split('T')[0],
      daysRemaining: diffDays,
      hoursRemaining,
      validityDays,
      reminderDaysThreshold,
      formattedRemaining: diffDays <= 0 ? `Expired` : `${diffDays} hari lagi`,
      statusKey,
      statusLabel,
      tagClass,
      isExpired,
      isReminder,
      isCritical
    };
  }

  // Group flat site rows by XLWO and RFC number
  getGroupedTickets(filterCriteria = {}) {
    this.refresh();
    const groups = new Map();
    const settings = window.appStorage.getSettings();

    this.tickets.forEach(site => {
      const groupKey = `${(site.xlwoNum || 'NO-XLWO').trim()}___${(site.rfcNum || 'NO-RFC').trim()}`;
      
      if (!groups.has(groupKey)) {
        const xlwoSla = TicketTracker.calculateTicketSla(site.xlwoNum, 'XLWO', settings);
        const rfcSla = TicketTracker.calculateTicketSla(site.rfcNum, 'RFC', settings);

        groups.set(groupKey, {
          groupKey,
          xlwoNum: site.xlwoNum || '-',
          rfcNum: site.rfcNum || '-',
          xlwoTitle: site.xlwoTitle || '-',
          vendor: site.vendor || '-',
          sow: site.sow || '-',
          dateSubmit: site.dateSubmit || '-',
          planActivity: site.planActivity || '-',
          xlwoSla,
          rfcSla,
          sites: [],
          stats: {
            total: 0,
            done: 0,
            partial: 0,
            pending: 0
          }
        });
      }

      const grp = groups.get(groupKey);
      grp.sites.push(site);
      grp.stats.total++;

      const st = (site.status || '').toLowerCase().trim();
      if (st === 'done') {
        grp.stats.done++;
      } else if (st === 'partial') {
        grp.stats.partial++;
      } else {
        grp.stats.pending++;
      }
    });

    // Convert map to array and calculate overall status & urgency
    let result = Array.from(groups.values()).map(grp => {
      let overallStatus = 'PENDING';
      let overallBadge = 'badge-pending';
      let overallLabel = 'Belum Selesai';

      if (grp.stats.done === grp.stats.total && grp.stats.total > 0) {
        overallStatus = 'DONE';
        overallBadge = 'status-done';
        overallLabel = 'Selesai Semua';
      } else if (grp.stats.partial > 0) {
        overallStatus = 'PARTIAL';
        overallBadge = 'status-partial';
        overallLabel = `${grp.stats.partial} Site Partial`;
      } else if (grp.stats.done > 0) {
        overallStatus = 'IN_PROGRESS';
        overallBadge = 'status-pending';
        overallLabel = `${grp.stats.done}/${grp.stats.total} Selesai`;
      }

      // Check urgency across XLWO and RFC
      const isUrgent = grp.xlwoSla.isReminder || grp.rfcSla.isReminder;
      const isCritical = grp.xlwoSla.isCritical || grp.rfcSla.isCritical;
      const isExpired = grp.xlwoSla.isExpired || grp.rfcSla.isExpired;

      return {
        ...grp,
        overallStatus,
        overallBadge,
        overallLabel,
        isUrgent,
        isCritical,
        isExpired,
        hasPartial: grp.stats.partial > 0
      };
    });

    // Apply Filters
    if (filterCriteria.search) {
      const q = filterCriteria.search.toLowerCase().trim();
      result = result.filter(g => 
        g.xlwoNum.toLowerCase().includes(q) ||
        g.rfcNum.toLowerCase().includes(q) ||
        g.xlwoTitle.toLowerCase().includes(q) ||
        g.vendor.toLowerCase().includes(q) ||
        g.sites.some(s => 
          (s.siteName || '').toLowerCase().includes(q) ||
          (s.siteId || '').toLowerCase().includes(q) ||
          (s.towerId || '').toLowerCase().includes(q) ||
          (s.hostnameCsr || '').toLowerCase().includes(q) ||
          (s.ipLoopback || '').toLowerCase().includes(q) ||
          (s.kabupaten || '').toLowerCase().includes(q) ||
          (s.province || '').toLowerCase().includes(q)
        )
      );
    }

    if (filterCriteria.status) {
      const st = filterCriteria.status;
      if (st === 'PARTIAL') {
        result = result.filter(g => g.hasPartial);
      } else if (st === 'DONE') {
        result = result.filter(g => g.overallStatus === 'DONE');
      } else if (st === 'REMINDER') {
        result = result.filter(g => g.isUrgent && !g.isExpired);
      } else if (st === 'CRITICAL') {
        result = result.filter(g => g.isCritical && !g.isExpired);
      } else if (st === 'EXPIRED') {
        result = result.filter(g => g.isExpired);
      } else if (st === 'NOT_DONE') {
        result = result.filter(g => g.overallStatus !== 'DONE');
      }
    }

    if (filterCriteria.vendor && filterCriteria.vendor !== 'ALL') {
      result = result.filter(g => g.vendor.toLowerCase() === filterCriteria.vendor.toLowerCase());
    }

    // Default sorting: Most critical/reminder first, then partials, then others
    result.sort((a, b) => {
      // Expired or Critical tickets first
      if (a.isCritical && !b.isCritical) return -1;
      if (!a.isCritical && b.isCritical) return 1;
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      if (a.hasPartial && !b.hasPartial) return -1;
      if (!a.hasPartial && b.hasPartial) return 1;
      return 0;
    });

    return result;
  }

  // Get KPI Stats for top summary bar
  getKpiSummary() {
    this.refresh();
    const settings = window.appStorage.getSettings();
    const groups = this.getGroupedTickets({});

    let totalTickets = groups.length;
    let totalSites = this.tickets.length;
    let reminderCount = 0;
    let criticalCount = 0;
    let partialCount = 0;
    let doneCount = 0;
    let expiredCount = 0;

    groups.forEach(g => {
      if (g.isExpired) expiredCount++;
      else if (g.isCritical) criticalCount++;
      else if (g.isUrgent) reminderCount++;

      if (g.hasPartial) partialCount++;
      if (g.overallStatus === 'DONE') doneCount++;
    });

    return {
      totalTickets,
      totalSites,
      reminderCount: reminderCount + criticalCount, // Combined for quick attention
      criticalCount,
      partialCount,
      doneCount,
      expiredCount
    };
  }

  // Update status of a specific site
  updateSiteStatus(siteId, newStatus, newNotes = '') {
    const list = window.appStorage.getTickets();
    const target = list.find(s => s.id === siteId);
    if (target) {
      target.status = newStatus;
      if (newNotes) target.notes = newNotes;
      target.updatedAt = new Date().toISOString();
      window.appStorage.saveTickets(list, true, `Update status site: ${target.siteName} -> ${newStatus}`);
      this.refresh();
      
      // Auto-push ke cloud jika aktif
      if (window.firebaseSync && window.firebaseSync.isConnected) {
        window.firebaseSync.pushTickets([target]);
      }
      return true;
    }
    return false;
  }

  // --- PARSERS FOR EXCEL & CSV ---

  // Standardize column keys from various variations
  static normalizeHeader(rawHeader) {
    if (!rawHeader) return '';
    const h = rawHeader.toString().toLowerCase().trim().replace(/[\s_\-\/]+/g, '');
    
    if (h === 'no') return 'no';
    if (h.includes('vendor')) return 'vendor';
    if (h.includes('sow')) return 'sow';
    if (h.includes('prov')) return 'province';
    if (h.includes('kab') || h.includes('kota')) return 'kabupaten';
    if (h.includes('towerid')) return 'towerId';
    if (h.includes('siteid')) return 'siteId';
    if (h.includes('sitename') || h === 'site') return 'siteName';
    if (h.includes('csr') || h.includes('hostname')) return 'hostnameCsr';
    if (h.includes('loopback') || h.includes('ip')) return 'ipLoopback';
    if (h.includes('direct') || h.includes('mw') || h.includes('fo')) return 'directMwFo';
    if (h.includes('mop')) return 'mop';
    if (h.includes('plan')) return 'planActivity';
    if (h.includes('datesubmit') || h.includes('submit')) return 'dateSubmit';
    if (h.includes('xlwotitle') || (h.includes('title') && !h.includes('num'))) return 'xlwoTitle';
    if (h.includes('xlwonum') || h.includes('xlwo')) return 'xlwoNum';
    if (h.includes('rfcnum') || h.includes('rfc')) return 'rfcNum';
    if (h.includes('status')) return 'status';
    
    return rawHeader.toString().trim();
  }

  // Parse TSV (Direct copy & paste from Excel / Google Sheets)
  static parseClipboardData(text) {
    if (!text || !text.trim()) return [];
    
    const lines = text.trim().split(/\r\n|\n|\r/);
    if (lines.length < 2) {
      throw new Error('Data paste minimal harus ada header dan minimal 1 baris data.');
    }

    // Determine delimiter: tab (\t) or comma (,) or semicolon (;)
    const firstLine = lines[0];
    let delimiter = '\t';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';
    else if (firstLine.includes(',')) delimiter = ',';

    const rawHeaders = firstLine.split(delimiter).map(h => h.replace(/^["']|["']$/g, '').trim());
    const mappedHeaders = rawHeaders.map(h => TicketTracker.normalizeHeader(h));

    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cells = line.split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());
      const rowObj = {
        id: 'site-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2, 5),
        updatedAt: new Date().toISOString()
      };

      mappedHeaders.forEach((key, colIdx) => {
        if (key) {
          rowObj[key] = cells[colIdx] !== undefined ? cells[colIdx] : '';
        }
      });

      // Default status if empty
      if (!rowObj.status) rowObj.status = 'partial';

      records.push(rowObj);
    }

    return records;
  }

  // Ingest parsed rows with either Smart Merge or Overwrite mode
  importRecords(newRecords, mode = 'MERGE') {
    if (!newRecords || newRecords.length === 0) return { count: 0, updated: 0, added: 0 };

    if (mode === 'REPLACE') {
      window.appStorage.saveTickets(newRecords, true, `Import Replace (${newRecords.length} baris)`);
      this.refresh();
      return { count: newRecords.length, updated: 0, added: newRecords.length };
    }

    // Smart Merge: Match by (XLWO Num + Site ID) or (Tower ID)
    const existing = window.appStorage.getTickets();
    let updatedCount = 0;
    let addedCount = 0;

    newRecords.forEach(newItem => {
      const matchIndex = existing.findIndex(e => 
        ((e.xlwoNum && newItem.xlwoNum && e.xlwoNum === newItem.xlwoNum) && 
         (e.siteId && newItem.siteId && e.siteId === newItem.siteId)) ||
        (e.towerId && newItem.towerId && e.towerId === newItem.towerId && e.xlwoNum === newItem.xlwoNum)
      );

      if (matchIndex >= 0) {
        // Update existing record, preserve id and history
        existing[matchIndex] = {
          ...existing[matchIndex],
          ...newItem,
          id: existing[matchIndex].id,
          updatedAt: new Date().toISOString()
        };
        updatedCount++;
      } else {
        existing.push(newItem);
        addedCount++;
      }
    });

    window.appStorage.saveTickets(existing, true, `Smart Merge Import (+${addedCount} baru, ~${updatedCount} update)`);
    this.refresh();

    // Auto-push ke cloud jika aktif
    if (window.firebaseSync && window.firebaseSync.isConnected) {
      window.firebaseSync.pushTickets(existing);
    }

    return { count: newRecords.length, updated: updatedCount, added: addedCount };
  }
}

window.ticketTracker = new TicketTracker();
