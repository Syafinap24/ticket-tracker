/**
 * achievementTracker.js - Modul Penghitung Achievement & Goal Fulfillment (198 Uniq Goals)
 * Menampilkan statistik personal, radial progress rings, schedule, dan grafik aktivitas.
 */

class AchievementTracker {
  constructor() {
    this.targetUniq = 198; // Target default sesuai instruksi user
    this.init();
  }

  init() {
    const savedTarget = localStorage.getItem('tt_target_uniq');
    if (savedTarget) {
      this.targetUniq = parseInt(savedTarget, 10) || 198;
    }
  }

  setTargetUniq(val) {
    this.targetUniq = parseInt(val, 10) || 198;
    localStorage.setItem('tt_target_uniq', String(this.targetUniq));
  }

  // Analisis data Uniq dari Master Data dan Tiket Tracker
  getAchievementStats() {
    const masterList = window.emailGenerator ? window.emailGenerator.masterList : [];
    const tickets = window.ticketTracker ? window.ticketTracker.tickets : [];

    // Kumpulkan status unik per nomor Uniq
    const uniqMap = new Map();

    // 1. Dari Master List
    masterList.forEach(m => {
      const uKey = (m.uniq || m.siteId || '').trim();
      if (!uKey) return;

      if (!uniqMap.has(uKey)) {
        uniqMap.set(uKey, {
          uniq: uKey,
          siteName: m.siteName || '-',
          city: m.city || '-',
          exePlan: m.exePlan || '-',
          status: m.toaStatus || m.status || 'pending'
        });
      } else {
        const item = uniqMap.get(uKey);
        // Jika ada status done, prioritaskan
        if ((m.toaStatus || m.status || '').toLowerCase() === 'done') {
          item.status = 'done';
        }
      }
    });

    // 2. Dari Tiket Tracker
    tickets.forEach(t => {
      const uKey = (t.uniq || t.siteId || '').trim();
      if (uKey && uniqMap.has(uKey)) {
        const item = uniqMap.get(uKey);
        if ((t.status || '').toLowerCase() === 'done') item.status = 'done';
        else if ((t.status || '').toLowerCase() === 'partial' && item.status !== 'done') item.status = 'partial';
      }
    });

    // Hitung counts
    const totalFoundInMaster = uniqMap.size;
    let doneCount = 0;
    let partialCount = 0;
    let pendingCount = 0;

    uniqMap.forEach(item => {
      const st = (item.status || '').toLowerCase();
      if (st === 'done') doneCount++;
      else if (st === 'partial') partialCount++;
      else pendingCount++;
    });

    // Target total
    const target = this.targetUniq;
    // Sisa belum dikerjakan dari target 198
    const remainingToFulfill = Math.max(0, target - doneCount);
    const progressPercent = Math.min(100, Math.round((doneCount / target) * 100));

    // Milestone Badge
    let badgeTier = '🌱 NOC Starter';
    let badgeColor = '#94a3b8';
    if (progressPercent >= 100) { badgeTier = '💎 Diamond NOC Master'; badgeColor = '#06b6d4'; }
    else if (progressPercent >= 75) { badgeTier = '🥇 Gold Achiever'; badgeColor = '#f59e0b'; }
    else if (progressPercent >= 50) { badgeTier = '🥈 Silver Specialist'; badgeColor = '#8b5cf6'; }
    else if (progressPercent >= 25) { badgeTier = '🥉 Bronze Engineer'; badgeColor = '#f97316'; }

    // Rata-rata per hari & estimasi selesai
    const dailyAverage = 4; // estimasi 4 site per hari kerja
    const daysEstimated = Math.ceil(remainingToFulfill / dailyAverage);

    return {
      target,
      totalFoundInMaster,
      doneCount,
      partialCount,
      pendingCount: pendingCount + Math.max(0, target - totalFoundInMaster),
      remainingToFulfill,
      progressPercent,
      badgeTier,
      badgeColor,
      daysEstimated,
      uniqList: Array.from(uniqMap.values())
    };
  }

  // Dapatkan jadwal upcoming activities dari Exe Plan (Int)
  getUpcomingSchedule(limit = 5) {
    const masterList = window.emailGenerator ? window.emailGenerator.masterList : [];
    if (!masterList || masterList.length === 0) return [];

    // Filter yang punya exePlan
    const scheduled = masterList
      .filter(m => m.exePlan && m.exePlan !== '-')
      .map(m => ({
        siteId: m.siteId,
        siteName: m.siteName,
        city: m.city,
        exePlan: m.exePlan,
        status: m.toaStatus || m.status || 'pending',
        scenario: m.scenario || 'Activity Execution'
      }));

    return scheduled.slice(0, limit);
  }

  // Helper untuk membuat SVG Circular Ring Progress
  static createCircularRingSvg(percent, size = 60, stroke = 5, color = '#f97316', bgColor = 'rgba(255,255,255,0.1)') {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    return `
      <svg width="${size}" height="${size}" style="transform: rotate(-90deg); display: block;">
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="${bgColor}" stroke-width="${stroke}" fill="transparent" />
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="${color}" stroke-width="${stroke}" fill="transparent"
          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" 
          style="transition: stroke-dashoffset 0.6s ease;" />
      </svg>
    `;
  }

  // Helper untuk membuat Semi-Circle Radial Gauge (seperti di Image 2 "Monthly Progress 80%")
  static createSemiCircleGaugeSvg(percent, width = 160, height = 90) {
    const stroke = 12;
    const r = (width - stroke * 2) / 2;
    const cx = width / 2;
    const cy = height - 10;
    const circumference = Math.PI * r;
    const offset = circumference - (percent / 100) * circumference;

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display: block; margin: 0 auto;">
        <!-- Background Arc -->
        <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" 
          fill="none" stroke="rgba(249, 115, 22, 0.15)" stroke-width="${stroke}" stroke-linecap="round" />
        <!-- Progress Arc -->
        <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" 
          fill="none" stroke="url(#orangeGradient)" stroke-width="${stroke}" stroke-linecap="round"
          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" 
          style="transition: stroke-dashoffset 0.8s ease;" />
        <defs>
          <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#fb923c" />
            <stop offset="100%" stop-color="#ea580c" />
          </linearGradient>
        </defs>
      </svg>
    `;
  }
}

window.achievementTracker = new AchievementTracker();
