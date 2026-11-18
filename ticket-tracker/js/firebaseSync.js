/**
 * firebaseSync.js - Realtime Cloud Synchronization with Google Firebase Firestore
 * Memungkinkan sinkronisasi instan antara Laptop dan HP secara realtime via Firebase!
 */

const FIREBASE_STORAGE_KEYS = {
  CONFIG: 'tt_firebase_config',
  ACTIVE: 'tt_firebase_active'
};

class FirebaseSyncManager {
  constructor() {
    this.app = null;
    this.db = null;
    this.unsubscribeListener = null;
    this.isConnected = false;
    this.isSyncing = false;
    this.init();
  }

  init() {
    const savedConfig = this.getConfig();
    if (savedConfig && savedConfig.apiKey && savedConfig.projectId && typeof firebase !== 'undefined') {
      try {
        this.initializeFirebase(savedConfig);
      } catch (err) {
        console.error('Firebase initial init error:', err);
      }
    }
  }

  getConfig() {
    try {
      const data = localStorage.getItem(FIREBASE_STORAGE_KEYS.CONFIG);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  // Helper untuk memparsing input konfigurasi Firebase
  // Bisa membaca JSON murni atau potongan kode: const firebaseConfig = { ... };
  static parseConfigString(inputStr) {
    if (!inputStr || typeof inputStr !== 'string') return null;

    let clean = inputStr.trim();

    // Jika user copy-paste seluruh kode "const firebaseConfig = { ... };"
    if (clean.includes('{') && clean.includes('}')) {
      const startIdx = clean.indexOf('{');
      const endIdx = clean.lastIndexOf('}');
      clean = clean.substring(startIdx, endIdx + 1);
    }

    // Normalisasi format agar jadi JSON yang valid
    clean = clean
      .replace(/(\w+)\s*:/g, '"$1":') // Bungkus key tanpa kutip jadi kutip dua
      .replace(/,\s*}/g, '}')         // Hapus trailing comma
      .replace(/'/g, '"');            // Ganti kutip satu jadi kutip dua

    try {
      const parsed = JSON.parse(clean);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    } catch (e) {
      // Fallback regex jika JSON.parse gagal
      const extractField = (key) => {
        const m = inputStr.match(new RegExp(`${key}['"\\s]*[:=]['"\\s]*([^'"\\s,]+)`));
        return m ? m[1] : '';
      };

      const apiKey = extractField('apiKey');
      const projectId = extractField('projectId');
      const authDomain = extractField('authDomain');
      const appId = extractField('appId');

      if (apiKey && projectId) {
        return {
          apiKey,
          projectId,
          authDomain: authDomain || `${projectId}.firebaseapp.com`,
          appId: appId || ''
        };
      }
    }
    return null;
  }

  initializeFirebase(config) {
    if (typeof firebase === 'undefined') {
      throw new Error('SDK Firebase belum termuat di browser.');
    }

    // Jika sudah ada instance sebelumnya, gunakan atau hapus
    if (firebase.apps && firebase.apps.length > 0) {
      this.app = firebase.apps[0];
    } else {
      this.app = firebase.initializeApp(config);
    }

    this.db = firebase.firestore();
    this.connectRealtime();
  }

  async saveConfigAndConnect(configInput) {
    const config = typeof configInput === 'object' ? configInput : FirebaseSyncManager.parseConfigString(configInput);
    if (!config || !config.apiKey || !config.projectId) {
      return {
        success: false,
        message: 'Format konfigurasi Firebase tidak valid. Pastikan ada apiKey dan projectId.'
      };
    }

    try {
      localStorage.setItem(FIREBASE_STORAGE_KEYS.CONFIG, JSON.stringify(config));
      localStorage.setItem(FIREBASE_STORAGE_KEYS.ACTIVE, 'true');

      this.initializeFirebase(config);
      return await this.testAndSync();
    } catch (err) {
      return {
        success: false,
        message: 'Gagal inisialisasi Firebase: ' + err.message
      };
    }
  }

  async testAndSync() {
    if (!this.db) {
      return { success: false, message: 'Database Firestore belum siap.' };
    }

    try {
      // Test read collection tickets
      await this.db.collection('tickets').limit(1).get();
      this.isConnected = true;
      this.updateStatusIndicator();

      // Pull semua data awal dari Firestore
      await this.pullFromCloud();

      // Jika di cloud masih kosong, tapi di lokal ada data, tawarkan sync ke cloud
      const cloudSnapshot = await this.db.collection('tickets').limit(1).get();
      const localTickets = window.appStorage.getTickets();
      if (cloudSnapshot.empty && localTickets.length > 0) {
        await this.pushTickets(localTickets);
      }

      return {
        success: true,
        message: 'Berhasil terhubung ke Google Firebase Firestore! Realtime sync aktif.'
      };
    } catch (err) {
      console.error('Firestore connection test failed:', err);
      this.isConnected = false;
      this.updateStatusIndicator();
      return {
        success: false,
        message: 'Gagal terhubung ke Firestore: ' + (err.message || 'Periksa aturan Rules di Firebase Console.')
      };
    }
  }

  // Tarik data tiket dari Firestore saat pertama kali load
  async pullFromCloud() {
    if (!this.db) return false;

    try {
      this.isSyncing = true;
      const snapshot = await this.db.collection('tickets').get();
      if (!snapshot.empty) {
        const cloudTickets = [];
        snapshot.forEach(doc => {
          cloudTickets.push(doc.data());
        });

        // Simpan ke storage lokal
        window.appStorage.saveTickets(cloudTickets, false);
        if (window.ticketTracker) window.ticketTracker.refresh();
        if (typeof window.refreshDashboardUI === 'function') {
          window.refreshDashboardUI();
        }
      }
      return true;
    } catch (err) {
      console.error('Pull from Firestore error:', err);
      return false;
    } finally {
      this.isSyncing = false;
      this.updateStatusIndicator();
    }
  }

  // Upload/Sync data tiket ke Firestore (Batch write)
  async pushTickets(tickets) {
    if (!this.db || !this.isConnected) return false;
    if (!tickets || tickets.length === 0) return true;

    try {
      // Firestore batch maksimal 500 operasi per batch
      const batchSize = 400;
      for (let i = 0; i < tickets.length; i += batchSize) {
        const chunk = tickets.slice(i, i + batchSize);
        const batch = this.db.batch();

        chunk.forEach(t => {
          const docRef = this.db.collection('tickets').doc(t.id);
          batch.set(docRef, {
            ...t,
            updatedAt: t.updatedAt || new Date().toISOString()
          }, { merge: true });
        });

        await batch.commit();
      }
      return true;
    } catch (err) {
      console.error('Push to Firestore error:', err);
      return false;
    }
  }

  // Listener Realtime onSnapshot dari Firebase
  connectRealtime() {
    if (!this.db) return;

    if (this.unsubscribeListener) {
      this.unsubscribeListener();
    }

    try {
      this.unsubscribeListener = this.db.collection('tickets').onSnapshot(
        (snapshot) => {
          this.isConnected = true;
          this.updateStatusIndicator();

          // Hindari trigger loop jika ini berasal dari sync kita sendiri
          if (this.isSyncing) return;

          let hasChanges = false;
          let localTickets = window.appStorage.getTickets();

          snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            if (change.type === 'added' || change.type === 'modified') {
              const idx = localTickets.findIndex(t => t.id === data.id);
              if (idx >= 0) {
                localTickets[idx] = data;
              } else {
                localTickets.unshift(data);
              }
              hasChanges = true;
            } else if (change.type === 'removed') {
              localTickets = localTickets.filter(t => t.id !== data.id);
              hasChanges = true;
            }
          });

          if (hasChanges) {
            window.appStorage.saveTickets(localTickets, false);
            if (window.ticketTracker) window.ticketTracker.refresh();
            if (typeof window.refreshDashboardUI === 'function') {
              window.refreshDashboardUI();
            }
            if (typeof window.showToast === 'function') {
              window.showToast('🔥 Data tiket terupdate otomatis dari device lain!', 'info');
            }
          }
        },
        (error) => {
          console.error('Firebase snapshot listener error:', error);
          this.isConnected = false;
          this.updateStatusIndicator();
        }
      );
    } catch (err) {
      console.error('Failed to attach Firebase listener:', err);
    }
  }

  disconnect() {
    if (this.unsubscribeListener) {
      this.unsubscribeListener();
      this.unsubscribeListener = null;
    }
    localStorage.removeItem(FIREBASE_STORAGE_KEYS.CONFIG);
    localStorage.removeItem(FIREBASE_STORAGE_KEYS.ACTIVE);
    this.isConnected = false;
    this.db = null;
    this.app = null;
    this.updateStatusIndicator();
  }

  updateStatusIndicator() {
    const el = document.getElementById('cloud-sync-status');
    if (!el) return;

    if (this.isConnected) {
      el.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#f97316; margin-right:5px; box-shadow: 0 0 6px #f97316;"></span> 🔥 Firebase: Aktif`;
      el.style.borderColor = 'rgba(249, 115, 22, 0.4)';
      el.style.color = '#f97316';
    } else {
      const cfg = this.getConfig();
      if (cfg && cfg.apiKey) {
        el.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#f59e0b; margin-right:5px;"></span> Menghubungkan Firebase...`;
        el.style.borderColor = 'rgba(245, 158, 11, 0.4)';
        el.style.color = '#f59e0b';
      } else {
        el.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#64748b; margin-right:5px;"></span> Mode Lokal (Offline)`;
        el.style.borderColor = 'var(--border-color)';
        el.style.color = 'var(--text-muted)';
      }
    }
  }
}

window.firebaseSync = new FirebaseSyncManager();
