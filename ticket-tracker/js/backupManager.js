/**
 * backupManager.js - Full Backup, Restore, CSV/Excel Export & Snapshot Rollback
 */

class BackupManager {
  // Download full JSON backup file
  static downloadFullBackup() {
    const backupData = window.appStorage.exportFullBackup();
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `ticket_tracker_backup_${dateStr}.json`;

    BackupManager.triggerDownload(blob, filename);
  }

  // Restore from uploaded JSON backup file
  static restoreFromFile(file, onSuccess, onError) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        window.appStorage.importFullBackup(json);
        if (window.ticketTracker) window.ticketTracker.refresh();
        if (onSuccess) onSuccess('Backup berhasil di-restore!');
      } catch (err) {
        console.error(err);
        if (onError) onError('Gagal restore: File backup tidak valid atau rusak (' + err.message + ')');
      }
    };
    reader.onerror = () => {
      if (onError) onError('Gagal membaca file.');
    };
    reader.readAsText(file);
  }

  // Export current tickets to CSV
  static exportToCsv(customList = null) {
    const list = customList || window.appStorage.getTickets();
    if (!list || list.length === 0) {
      alert('Tidak ada data tiket untuk di-export.');
      return;
    }

    const headers = [
      'No', 'Vendor', 'SOW', 'Province', 'Kabupaten', 'Tower ID', 
      'Site ID', 'Site Name', 'Hostname CSR', 'IP Loopback', 'Direct/MW/FO', 
      'MOP', 'Plan Activity', 'Date Submit', 'XLWO Title', 'XLWO Num', 'RFC Num', 'status'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    csvContent += headers.map(escapeCsv).join(',') + '\r\n';

    list.forEach(item => {
      const row = [
        item.no || '',
        item.vendor || '',
        item.sow || '',
        item.province || '',
        item.kabupaten || '',
        item.towerId || '',
        item.siteId || '',
        item.siteName || '',
        item.hostnameCsr || '',
        item.ipLoopback || '',
        item.directMwFo || '',
        item.mop || '',
        item.planActivity || '',
        item.dateSubmit || '',
        item.xlwoTitle || '',
        item.xlwoNum || '',
        item.rfcNum || '',
        item.status || ''
      ];
      csvContent += row.map(escapeCsv).join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    BackupManager.triggerDownload(blob, `ticket_data_export_${dateStr}.csv`);
  }

  // Download Sample Excel/CSV Template
  static downloadTemplate() {
    const headers = [
      'No', 'Vendor', 'SOW', 'Province', 'Kabupaten', 'Tower ID', 
      'Site ID', 'Site Name', 'Hostname CSR', 'IP Loopback', 'Direct/MW/FO', 
      'MOP', 'Plan Activity', 'Date Submit', 'XLWO Title', 'XLWO Num', 'RFC Num', 'status'
    ];

    const sampleRow = [
      '1', 'xxxxx', 'xxxxx', 'Tangerang', 'Banten', 'JAW-BT-CLG-xxxx',
      'xxxxxxxxx', 'GUNUNG SUGIH CILEGON', 'MA-xxxx-xxx', 'xxx.xx.xxx.xxx', 'Direct',
      'MOP-xxx', '19-Nov-26', '12-Nov-26', 'Support Delete Configuration EBGP Multihop HSO TMC <> PS',
      'XLWO-20261110-00000035', 'RFC-20261110-00000023', 'done'
    ];

    const sampleRow2 = [
      '1', 'xxxxx', 'xxxxx', 'Tangerang', 'Banten', 'JAW-BT-CLG-cccc',
      'xxxxxxxxx', 'GUNUNG bundar', 'MA-xxxx-xxx', 'xxx.xx.xxx.xxx', 'Direct',
      'MOP-xxx', '19-Nov-26', '12-Nov-26', 'Support Delete Configuration EBGP Multihop HSO TMC <> PS',
      'XLWO-20261110-00000035', 'RFC-20261110-00000023', 'partial'
    ];

    const escapeCsv = (val) => `"${String(val).replace(/"/g, '""')}"`;

    let csvContent = '\uFEFF';
    csvContent += headers.map(escapeCsv).join(',') + '\r\n';
    csvContent += sampleRow.map(escapeCsv).join(',') + '\r\n';
    csvContent += sampleRow2.map(escapeCsv).join(',') + '\r\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    BackupManager.triggerDownload(blob, 'Template_Upload_Tiket_RFC.csv');
  }

  static triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
}

window.backupManager = BackupManager;
