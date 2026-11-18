/**
 * realtimeData.js - Extensible Realtime Data Monitoring & Streaming Module
 * Designed to be easily customized when you connect your live data streams.
 */

class RealtimeMonitor {
  constructor() {
    this.streams = window.appStorage.getRealtimeData();
    this.refreshInterval = null;
    this.isLive = false;
  }

  // Sample initial realtime structure if empty
  getDemoStreams() {
    return [
      {
        siteId: 'xxxxxxxxx',
        siteName: 'GUNUNG SUGIH CILEGON',
        hostnameCsr: 'MA-xxxx-xxx',
        ipLoopback: 'xxx.xx.xxx.xxx',
        linkType: 'Direct',
        linkStatus: 'UP',
        latencyMs: 14,
        packetLossPct: 0.0,
        csrCpuPct: 22,
        bgpState: 'Established',
        lastHeartbeat: new Date().toLocaleTimeString()
      },
      {
        siteId: 'xxxxxxxxx',
        siteName: 'GUNUNG bundar',
        hostnameCsr: 'MA-xxxx-xxx',
        ipLoopback: 'xxx.xx.xxx.xxx',
        linkType: 'Direct',
        linkStatus: 'DEGRADED',
        latencyMs: 85,
        packetLossPct: 4.5,
        csrCpuPct: 68,
        bgpState: 'Connecting (Partial)',
        lastHeartbeat: new Date().toLocaleTimeString()
      }
    ];
  }

  // Upload or ingest new realtime batch
  ingestBatch(dataArray) {
    if (!Array.isArray(dataArray)) {
      throw new Error('Data realtime harus berupa array object');
    }
    this.streams = dataArray.map(item => ({
      ...item,
      updatedAt: new Date().toISOString()
    }));
    window.appStorage.saveRealtimeData(this.streams);
    return this.streams.length;
  }

  // Toggle simulated or live polling
  toggleLive(callback) {
    this.isLive = !this.isLive;
    if (this.isLive) {
      this.refreshInterval = setInterval(() => {
        // Minor telemetry jitter for demo
        this.streams.forEach(s => {
          s.lastHeartbeat = new Date().toLocaleTimeString();
          if (s.linkStatus === 'UP') {
            s.latencyMs = Math.max(8, Math.min(30, s.latencyMs + Math.floor(Math.random() * 5 - 2)));
          }
        });
        if (callback) callback(this.streams);
      }, 3000);
    } else {
      clearInterval(this.refreshInterval);
    }
    return this.isLive;
  }
}

window.realtimeMonitor = new RealtimeMonitor();
