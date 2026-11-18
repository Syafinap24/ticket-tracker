/**
 * emailGenerator.js - Modul Kelola Data Master (33 Kolom) & Generator Email + Lampiran NE
 * Memetakan Data Master ke Format Email (14 kolom) + Lampiran NE Domain
 */

const GENERATOR_STORAGE_KEYS = {
  MASTER_DATA: 'tt_master_data',
  NE_MAPPINGS: 'tt_ne_mappings',
  BATCH_CONFIG: 'tt_batch_config'
};

const DEFAULT_BATCH_CONFIG = {
  vendor: 'Huawei',
  sow: 'Support Delete Configuration EBGP Multihop HSO TMC <> PS',
  mop: 'MOP-xxx',
  dateSubmit: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
  xlwoPrefix: 'XLWO',
  rfcPrefix: 'RFC'
};

// Data Contoh Demo Awal Master (33 Kolom) & NE
const INITIAL_DEMO_MASTER = [
  {
    id: 'm-1',
    no: '1',
    uniq: 'UQ-001',
    exePlan: '19-Nov-26',
    towerId: 'JAW-BT-CLG-xxxx',
    siteName: 'GUNUNG SUGIH CILEGON',
    area: 'Banten',
    city: 'Tangerang',
    siteId: '2a',
    hutRouter: 'HUT-01',
    hostname: 'MA-xxxx-xxx',
    routerIp: 'xxx.xx.xxx.xxx',
    routepath: 'Direct',
    hutId: 'HUT-CLG-01',
    assesmentCsr: 'OK',
    assesmentRan: 'OK',
    assesmentCsrRan: 'OK',
    busol: 'BUSOL-01',
    scenario: 'Support Delete Configuration EBGP Multihop HSO TMC <> PS',
    ranSfpType: '10G',
    existingPort: 'GE0/1/1',
    newPort: 'GE0/1/2',
    macAddress: '00:1A:2B:3C:4D:5E',
    xlwoTrm: 'XLWO-20261110-00000035',
    titleXlwoTrm: 'Support Delete Configuration EBGP Multihop HSO TMC <> PS',
    rfcTrm: 'RFC-20261110-00000023',
    ccbDateTrm: '19-Nov-26',
    toaStatusTrm: 'done',
    xlwoRan: 'XLWO-20261110-00000035',
    titleXlwoRan: 'Support Delete Configuration EBGP Multihop HSO TMC <> PS',
    rfcRan: 'RFC-20261110-00000023',
    ccbDateRan: '19-Nov-26',
    toaStatusRan: 'done',
    selected: true
  },
  {
    id: 'm-2',
    no: '2',
    uniq: 'UQ-002',
    exePlan: '19-Nov-26',
    towerId: 'JAW-BT-CLG-cccc',
    siteName: 'GUNUNG bundar',
    area: 'Banten',
    city: 'Tangerang',
    siteId: '3b',
    hutRouter: 'HUT-02',
    hostname: 'MA-xxxx-xxx',
    routerIp: 'xxx.xx.xxx.xxx',
    routepath: 'Direct',
    hutId: 'HUT-CLG-02',
    assesmentCsr: 'OK',
    assesmentRan: 'OK',
    assesmentCsrRan: 'OK',
    busol: 'BUSOL-02',
    scenario: 'Support Delete Configuration EBGP Multihop HSO TMC <> PS',
    ranSfpType: '10G',
    existingPort: 'GE0/1/1',
    newPort: 'GE0/1/2',
    macAddress: '00:1A:2B:3C:4D:5F',
    xlwoTrm: 'XLWO-20261110-00000035',
    titleXlwoTrm: 'Support Delete Configuration EBGP Multihop HSO TMC <> PS',
    rfcTrm: 'RFC-20261110-00000023',
    ccbDateTrm: '19-Nov-26',
    toaStatusTrm: 'partial',
    xlwoRan: 'XLWO-20261110-00000035',
    titleXlwoRan: 'Support Delete Configuration EBGP Multihop HSO TMC <> PS',
    rfcRan: 'RFC-20261110-00000023',
    ccbDateRan: '19-Nov-26',
    toaStatusRan: 'partial',
    selected: true
  }
];

// Data Lampiran NE Contoh (sesuai contoh user: 2a dan 3b)
const INITIAL_DEMO_NE = [
  { siteId: '2a', neName: 'a_ccc_01', technologyDomain: 'test' },
  { siteId: '2a', neName: 'a_ccc_02', technologyDomain: 'test' },
  { siteId: '2a', neName: 'a_ccc_03', technologyDomain: 'test' },
  { siteId: '2a', neName: 'a_ccc_04', technologyDomain: 'test' },
  { siteId: '3b', neName: 'a_ccc_07', technologyDomain: 'uji' },
  { siteId: '3b', neName: 'a_ccc_08', technologyDomain: 'uji' },
  { siteId: '3b', neName: 'a_ccc_09', technologyDomain: 'uji' },
  { siteId: '3b', neName: 'a_ccc_10', technologyDomain: 'uji' },
  { siteId: '3b', neName: 'a_ccc_11', technologyDomain: 'uji' }
];

class EmailGeneratorManager {
  constructor() {
    this.masterList = [];
    this.neList = [];
    this.batchConfig = { ...DEFAULT_BATCH_CONFIG };
    this.init();
  }

  init() {
    // Load Master Data
    try {
      const mData = localStorage.getItem(GENERATOR_STORAGE_KEYS.MASTER_DATA);
      this.masterList = mData ? JSON.parse(mData) : INITIAL_DEMO_MASTER;
    } catch (e) {
      this.masterList = INITIAL_DEMO_MASTER;
    }

    // Load NE Data
    try {
      const neData = localStorage.getItem(GENERATOR_STORAGE_KEYS.NE_MAPPINGS);
      this.neList = neData ? JSON.parse(neData) : INITIAL_DEMO_NE;
    } catch (e) {
      this.neList = INITIAL_DEMO_NE;
    }

    // Load Batch Config
    try {
      const bData = localStorage.getItem(GENERATOR_STORAGE_KEYS.BATCH_CONFIG);
      if (bData) this.batchConfig = { ...DEFAULT_BATCH_CONFIG, ...JSON.parse(bData) };
    } catch (e) {
      this.batchConfig = { ...DEFAULT_BATCH_CONFIG };
    }
  }

  saveMaster(list) {
    this.masterList = list;
    localStorage.setItem(GENERATOR_STORAGE_KEYS.MASTER_DATA, JSON.stringify(list));
  }

  saveNe(list) {
    this.neList = list;
    localStorage.setItem(GENERATOR_STORAGE_KEYS.NE_MAPPINGS, JSON.stringify(list));
  }

  saveBatchConfig(config) {
    this.batchConfig = { ...this.batchConfig, ...config };
    localStorage.setItem(GENERATOR_STORAGE_KEYS.BATCH_CONFIG, JSON.stringify(this.batchConfig));
  }

  // --- PARSER DATA MASTER (Mendukung hingga 33 Kolom Lengkap) ---
  parseMasterClipboard(text) {
    if (!text || !text.trim()) return [];

    const lines = text.trim().split(/\r\n|\n|\r/);
    if (lines.length < 2) throw new Error('Data Master minimal harus ada baris header dan minimal 1 baris data.');

    const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
    const headers = lines[0].split(delimiter).map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cells = line.split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());
      const item = {
        id: 'master-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2, 5),
        selected: true
      };

      headers.forEach((h, idx) => {
        const val = cells[idx] !== undefined ? cells[idx] : '';
        const norm = h.replace(/[\s_\-\/()]+/g, '');

        if (norm === 'no') item.no = val;
        else if (norm === 'uniq') item.uniq = val;
        else if (norm.includes('exeplan')) item.exePlan = val;
        else if (norm.includes('towerid')) item.towerId = val;
        else if (norm.includes('sitename') && !item.siteName) item.siteName = val;
        else if (norm === 'area' || norm.includes('prov')) item.area = val;
        else if (norm === 'city' || norm.includes('kab') || norm.includes('kota')) item.city = val;
        else if (norm === 'siteid') item.siteId = val;
        else if (norm.includes('hutrouter') || norm.includes('hut')) item.hutRouter = val;
        else if (norm === 'hostname') item.hostname = val;
        else if (norm.includes('routerip') || norm.includes('ip')) item.routerIp = val;
        else if (norm.includes('routepath') || norm.includes('direct') || norm.includes('mw') || norm.includes('fo')) item.routepath = val;
        else if (norm.includes('hutid')) item.hutId = val;
        else if (norm.includes('scenario')) item.scenario = val;
        else if (norm.includes('macaddress')) item.macAddress = val;
        else if (norm.includes('xlwotrm')) item.xlwoTrm = val;
        else if (norm.includes('titlexlwotrm')) item.titleXlwoTrm = val;
        else if (norm.includes('rfctrm')) item.rfcTrm = val;
        else if (norm.includes('xlworan')) item.xlwoRan = val;
        else if (norm.includes('titlexlworan')) item.titleXlwoRan = val;
        else if (norm.includes('rfcran')) item.rfcRan = val;
        else if (norm.includes('toastatus')) item.toaStatus = val;
      });

      // Default fallback
      if (!item.no) item.no = String(i);
      if (!item.siteId) item.siteId = `SITE-${i}`;
      if (!item.siteName) item.siteName = `Site ${item.siteId}`;

      records.push(item);
    }

    return records;
  }

  // --- PARSER DATA LAMPIRAN NE ---
  // Kolom: Site ID | NE Name | Technology Domain
  parseNeClipboard(text) {
    if (!text || !text.trim()) return [];

    const lines = text.trim().split(/\r\n|\n|\r/);
    if (lines.length < 2) throw new Error('Data Lampiran NE minimal harus ada header dan 1 baris data.');

    const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
    const headers = lines[0].split(delimiter).map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cells = line.split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());
      const item = {};

      headers.forEach((h, idx) => {
        const val = cells[idx] !== undefined ? cells[idx] : '';
        const norm = h.replace(/[\s_\-\/()]+/g, '');

        if (norm.includes('siteid') || norm === 'site') item.siteId = val;
        else if (norm.includes('nename') || norm === 'ne') item.neName = val;
        else if (norm.includes('tech') || norm.includes('domain')) item.technologyDomain = val;
      });

      if (item.siteId && item.neName) {
        if (!item.technologyDomain) item.technologyDomain = '-';
        records.push(item);
      }
    }

    return records;
  }

  // --- GOOGLE SPREADSHEET DIRECT SYNC ---
  formatGSheetUrl(rawUrl, defaultGid = '0') {
    if (!rawUrl || !rawUrl.trim()) return null;
    let url = rawUrl.trim();

    if (url.includes('format=csv') || url.includes('output=csv') || url.includes('/gviz/tq?tqx=out:csv')) {
      return url;
    }

    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return url;
    const docId = match[1];

    const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : defaultGid;

    return `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  }

  async fetchGSheet(url) {
    const csvUrl = this.formatGSheetUrl(url);
    if (!csvUrl) throw new Error('URL Google Sheets tidak valid.');

    try {
      const resp = await fetch(csvUrl);
      if (!resp.ok) {
        throw new Error(`Gagal membaca Google Sheets (HTTP ${resp.status}). Pastikan sharing sheet diset ke "Anyone with the link can view".`);
      }
      return await resp.text();
    } catch (err) {
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        const docId = match[1];
        const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
        const gid = gidMatch ? gidMatch[1] : '0';
        const fallbackUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&id=${docId}&gid=${gid}`;
        const fallbackResp = await fetch(fallbackUrl);
        if (fallbackResp.ok) return await fallbackResp.text();
      }
      throw err;
    }
  }

  // Hitung berapa banyak NE yang terdaftar untuk Site ID tertentu
  getNeCountForSite(siteId) {
    if (!siteId) return 0;
    const target = siteId.toLowerCase().trim();
    return this.neList.filter(ne => (ne.siteId || '').toLowerCase().trim() === target).length;
  }

  // Format baris email (14 Kolom Tujuan Email)
  generateEmailItems() {
    const selectedSites = this.masterList.filter(m => m.selected);
    const cfg = this.batchConfig;

    return selectedSites.map((site, index) => {
      // Format tanggal submit (e.g. 12-Nov-26)
      let formattedDateSubmit = cfg.dateSubmit || '-';
      if (formattedDateSubmit && formattedDateSubmit.includes('-')) {
        const parts = formattedDateSubmit.split('-');
        if (parts.length === 3) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const mIdx = parseInt(parts[1], 10) - 1;
          const yShort = parts[0].length === 4 ? parts[0].slice(2) : parts[0];
          formattedDateSubmit = `${parts[2]}-${months[mIdx] || parts[1]}-${yShort}`;
        }
      }

      return {
        no: String(index + 1),
        vendor: cfg.vendor || '-',
        sow: cfg.sow || site.scenario || '-',
        province: site.area || '-',
        kabupaten: site.city || '-',
        towerId: site.towerId || site.hutId || '-',
        siteId: site.siteId || '-',
        siteName: site.siteName || '-',
        hostnameCsr: site.hostname || site.hutRouter || '-',
        ipLoopback: site.routerIp || '-',
        directMwFo: site.routepath || 'Direct',
        mop: cfg.mop || '-',
        planActivity: site.exePlan || '-',
        dateSubmit: formattedDateSubmit
      };
    });
  }

  // Ambil data lampiran NE hanya untuk Site ID yang dipilih
  getAttachedNeItems() {
    const selectedSites = this.masterList.filter(m => m.selected);
    const selectedSiteIds = new Set(selectedSites.map(s => (s.siteId || '').toLowerCase().trim()));

    return this.neList.filter(ne => 
      selectedSiteIds.has((ne.siteId || '').toLowerCase().trim())
    );
  }

  // Generate HTML tabel yang rapi dan siap dipaste ke Outlook / Gmail
  generateEmailHtml() {
    const emailRows = this.generateEmailItems();
    const neRows = this.getAttachedNeItems();

    if (emailRows.length === 0) {
      return '<p style="color: #64748b; font-style: italic;">Pilih minimal 1 site pada tabel Data Master untuk membuat preview email.</p>';
    }

    const tableStyle = 'border-collapse: collapse; width: 100%; margin-bottom: 24px; font-family: Calibri, Arial, sans-serif; font-size: 11pt;';
    const thStyle = 'background-color: #0284c7; color: #ffffff; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-weight: bold; font-size: 10pt; white-space: nowrap;';
    const tdStyle = 'border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10pt; color: #1e293b;';
    const tdAltStyle = 'border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10pt; color: #1e293b; background-color: #f8fafc;';

    // Tabel 1: Detail Ringkasan Tiket (14 Kolom)
    let html = `
      <p style="font-family: Calibri, Arial, sans-serif; font-size: 11pt; margin-bottom: 8px;">
        <strong>Dear Tim / All,</strong><br>
        Berikut kami submit activity dan permohonan ticket RFC / XLWO:
      </p>

      <table style="${tableStyle}">
        <thead>
          <tr>
            <th style="${thStyle}">No</th>
            <th style="${thStyle}">Vendor</th>
            <th style="${thStyle}">SOW</th>
            <th style="${thStyle}">Province</th>
            <th style="${thStyle}">Kabupaten</th>
            <th style="${thStyle}">Tower ID</th>
            <th style="${thStyle}">Site ID</th>
            <th style="${thStyle}">Site Name</th>
            <th style="${thStyle}">Hostname CSR</th>
            <th style="${thStyle}">IP Loopback</th>
            <th style="${thStyle}">Direct/MW/FO</th>
            <th style="${thStyle}">MOP</th>
            <th style="${thStyle}">Plan Activity</th>
            <th style="${thStyle}">Date Submit</th>
          </tr>
        </thead>
        <tbody>
    `;

    emailRows.forEach((r, idx) => {
      const curTd = (idx % 2 === 0) ? tdStyle : tdAltStyle;
      html += `
        <tr>
          <td style="${curTd}; text-align: center;">${r.no}</td>
          <td style="${curTd}">${r.vendor}</td>
          <td style="${curTd}">${r.sow}</td>
          <td style="${curTd}">${r.province}</td>
          <td style="${curTd}">${r.kabupaten}</td>
          <td style="${curTd}">${r.towerId}</td>
          <td style="${curTd}; font-weight: bold;">${r.siteId}</td>
          <td style="${curTd}">${r.siteName}</td>
          <td style="${curTd}">${r.hostnameCsr}</td>
          <td style="${curTd}">${r.ipLoopback}</td>
          <td style="${curTd}">${r.directMwFo}</td>
          <td style="${curTd}">${r.mop}</td>
          <td style="${curTd}">${r.planActivity}</td>
          <td style="${curTd}">${r.dateSubmit}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    // Tabel 2: Lampiran NE Name & Technology Domain
    html += `
      <p style="font-family: Calibri, Arial, sans-serif; font-size: 11pt; margin-top: 16px; margin-bottom: 8px;">
        <strong>Lampiran Data NE Name & Technology Domain:</strong>
      </p>

      <table style="${tableStyle}; max-width: 600px;">
        <thead>
          <tr>
            <th style="${thStyle}">Site ID</th>
            <th style="${thStyle}">NE Name</th>
            <th style="${thStyle}">Technology Domain</th>
          </tr>
        </thead>
        <tbody>
    `;

    if (neRows.length > 0) {
      neRows.forEach((ne, idx) => {
        const curTd = (idx % 2 === 0) ? tdStyle : tdAltStyle;
        html += `
          <tr>
            <td style="${curTd}; font-weight: bold;">${ne.siteId}</td>
            <td style="${curTd}">${ne.neName}</td>
            <td style="${curTd}">${ne.technologyDomain}</td>
          </tr>
        `;
      });
    } else {
      html += `
        <tr>
          <td colspan="3" style="${tdStyle}; text-align: center; color: #64748b; font-style: italic;">
            (Belum ada data mapping NE untuk Site ID terpilih. Silakan upload data NE di tombol "Paste Data NE").
          </td>
        </tr>
      `;
    }

    html += `
        </tbody>
      </table>
      <p style="font-family: Calibri, Arial, sans-serif; font-size: 11pt; margin-top: 14px;">
        Demikian kami sampaikan, mohon support dan approvalnya.<br>
        Terima kasih.<br>
        <strong>NOC / Implementation Team</strong>
      </p>
    `;

    return html;
  }

  // Ekspor hasil generator langsung ke Ticket Tracker (agar otomatis masuk ke pemantauan SLA 7 hari & 27 hari)
  exportToTicketTracker(xlwoNum, rfcNum, xlwoTitle) {
    const selectedSites = this.masterList.filter(m => m.selected);
    const emailItems = this.generateEmailItems();
    if (emailItems.length === 0) return 0;

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const formattedRecords = emailItems.map((item, idx) => {
      const orig = selectedSites[idx] || {};

      const finalXlwo = xlwoNum || orig.xlwoTrm || orig.xlwoRan || `XLWO-${todayStr}-00000001`;
      const finalRfc = rfcNum || orig.rfcTrm || orig.rfcRan || `RFC-${todayStr}-00000001`;
      const finalTitle = xlwoTitle || orig.titleXlwoTrm || orig.titleXlwoRan || item.sow;
      const finalStatus = orig.toaStatusTrm || orig.toaStatusRan || orig.toaStatus || 'partial';

      return {
        id: 'site-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substr(2, 5),
        no: item.no,
        vendor: item.vendor,
        sow: item.sow,
        province: item.province,
        kabupaten: item.kabupaten,
        towerId: item.towerId,
        siteId: item.siteId,
        siteName: item.siteName,
        hostnameCsr: item.hostnameCsr,
        ipLoopback: item.ipLoopback,
        directMwFo: item.directMwFo,
        mop: item.mop,
        planActivity: item.planActivity,
        dateSubmit: item.dateSubmit,
        xlwoTitle: finalTitle,
        xlwoNum: finalXlwo,
        rfcNum: finalRfc,
        status: finalStatus,
        updatedAt: new Date().toISOString()
      };
    });

    const result = window.ticketTracker.importRecords(formattedRecords, 'MERGE');
    return result.count;
  }
}

window.emailGenerator = new EmailGeneratorManager();
