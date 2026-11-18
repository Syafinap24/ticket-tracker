/**
 * storage.js - LocalStorage & IndexedDB Manager with Auto-Snapshot and Backup
 */

const STORAGE_KEYS = {
  TICKETS: 'tt_tickets_data',
  SETTINGS: 'tt_settings_config',
  SNAPSHOTS: 'tt_snapshots_history',
  REALTIME_DATA: 'tt_realtime_streams',
  THEME: 'tt_theme_preference'
};

const DEFAULT_SETTINGS = {
  xlwoValidityDays: 7,
  xlwoReminderDays: 5, // Triggers when remaining days <= 5
  rfcValidityDays: 27,
  rfcReminderDays: 25, // Triggers when remaining days <= 25
  appName: 'Personal Ticket Tracker & Realtime NOC',
  autoBackupOnUpload: true,
  maxSnapshots: 10
};

// Default sample data provided by the user
const INITIAL_DEMO_DATA = [
  {
    id: 'demo-1',
    no: '1',
    vendor: 'xxxxx',
    sow: 'xxxxx',
    province: 'Tangerang',
    kabupaten: 'Banten',
    towerId: 'JAW-BT-CLG-xxxx',
    siteId: 'xxxxxxxxx',
    siteName: 'GUNUNG SUGIH CILEGON',
    hostnameCsr: 'MA-xxxx-xxx',
    ipLoopback: 'xxx.xx.xxx.xxx',
    directMwFo: 'Direct',
    mop: 'MOP-xxx',
    planActivity: '19-Nov-26',
    dateSubmit: '12-Nov-26',
    xlwoTitle: 'Support Delete Configuration EBGP Multihop HSO TMC <> PS',
    xlwoNum: 'XLWO-20261110-00000035',
    rfcNum: 'RFC-20261110-00000023',
    status: 'done',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-2',
    no: '1',
    vendor: 'xxxxx',
    sow: 'xxxxx',
    province: 'Tangerang',
    kabupaten: 'Banten',
    towerId: 'JAW-BT-CLG-cccc',
    siteId: 'xxxxxxxxx',
    siteName: 'GUNUNG bundar',
    hostnameCsr: 'MA-xxxx-xxx',
    ipLoopback: 'xxx.xx.xxx.xxx',
    directMwFo: 'Direct',
    mop: 'MOP-xxx',
    planActivity: '19-Nov-26',
    dateSubmit: '12-Nov-26',
    xlwoTitle: 'Support Delete Configuration EBGP Multihop HSO TMC <> PS',
    xlwoNum: 'XLWO-20261110-00000035',
    rfcNum: 'RFC-20261110-00000023',
    status: 'partial',
    updatedAt: new Date().toISOString()
  }
];

class StorageManager {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.saveSettings(DEFAULT_SETTINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TICKETS)) {
      this.saveTickets(INITIAL_DEMO_DATA, false);
      this.createSnapshot('Inisialisasi Data Default');
    }
  }

  // --- SETTINGS ---
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (e) {
      console.error('Failed to parse settings', e);
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return true;
    } catch (e) {
      console.error('Failed to save settings', e);
      return false;
    }
  }

  // --- TICKETS ---
  getTickets() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TICKETS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to parse tickets', e);
      return [];
    }
  }

  saveTickets(tickets, autoSnapshot = true, reason = 'Update Tiket') {
    try {
      if (autoSnapshot && this.getSettings().autoBackupOnUpload) {
        this.createSnapshot(reason);
      }
      localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
      return true;
    } catch (e) {
      console.error('Failed to save tickets', e);
      return false;
    }
  }

  // --- SNAPSHOTS (AUTO-BACKUP & ROLLBACK) ---
  getSnapshots() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SNAPSHOTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  createSnapshot(reason = 'Manual Snapshot') {
    try {
      const currentTickets = this.getTickets();
      if (!currentTickets || currentTickets.length === 0) return;

      const snapshots = this.getSnapshots();
      const max = this.getSettings().maxSnapshots || 10;

      const snapshot = {
        id: 'snap-' + Date.now(),
        timestamp: new Date().toISOString(),
        reason: reason,
        count: currentTickets.length,
        tickets: currentTickets
      };

      snapshots.unshift(snapshot);
      if (snapshots.length > max) {
        snapshots.pop();
      }

      localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify(snapshots));
    } catch (e) {
      console.error('Snapshot failed', e);
    }
  }

  restoreSnapshot(snapshotId) {
    const snapshots = this.getSnapshots();
    const snap = snapshots.find(s => s.id === snapshotId);
    if (snap && snap.tickets) {
      // Save current state as snapshot first just in case
      this.createSnapshot('Sebelum Rollback');
      this.saveTickets(snap.tickets, false);
      return true;
    }
    return false;
  }

  deleteSnapshot(snapshotId) {
    let snapshots = this.getSnapshots();
    snapshots = snapshots.filter(s => s.id !== snapshotId);
    localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify(snapshots));
    return true;
  }

  // --- FULL SYSTEM EXPORT & IMPORT ---
  exportFullBackup() {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appName: this.getSettings().appName,
      settings: this.getSettings(),
      tickets: this.getTickets(),
      realtimeData: this.getRealtimeData(),
      snapshots: this.getSnapshots()
    };
  }

  importFullBackup(backupObj) {
    if (!backupObj || !Array.isArray(backupObj.tickets)) {
      throw new Error('Format file backup tidak valid.');
    }
    this.createSnapshot('Sebelum Restore File Backup');
    if (backupObj.settings) this.saveSettings(backupObj.settings);
    if (backupObj.tickets) this.saveTickets(backupObj.tickets, false);
    if (backupObj.realtimeData) this.saveRealtimeData(backupObj.realtimeData);
    return true;
  }

  // --- REALTIME DATA (FOR FUTURE REALTIME STREAMS) ---
  getRealtimeData() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REALTIME_DATA);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveRealtimeData(streamData) {
    try {
      localStorage.setItem(STORAGE_KEYS.REALTIME_DATA, JSON.stringify(streamData));
      return true;
    } catch (e) {
      return false;
    }
  }

  // --- THEME ---
  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  }

  saveTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }
}

window.appStorage = new StorageManager();
