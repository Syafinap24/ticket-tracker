# 📡 Ticket Tracker & NOC Realtime Dashboard

Aplikasi web personal untuk tracking tiket **XLWO & RFC**, monitoring masa berlaku SLA & reminder dini, mengelola status site (`done`, `partial`, `pending`) dan kebutuhan lain terkait ticketing project (temporary XLWO only).

Dirancang **mobile-first (PWA)** sehingga bisa langsung dibuka di browser HP (Chrome, Safari, Firefox) tanpa perlu install aplikasi Android APK.
serta agar bisa dipakai untuk mempermudah pekerjaan orang pengganti cuti saya :D

---

## 🔥 Fitur Realtime Cloud Sync (Google Firebase Firestore)

Web ini memiliki **dua mode kerja**:
1. **Mode Lokal (Offline):** Data tersimpan aman di browser masing-masing tanpa internet.
2. **Mode Firebase Realtime:** Begitu kamu upload Excel di Laptop, layar HP kamu yang sedang terbuka langsung **otomatis terupdate seketika via Firestore listener (`onSnapshot`) tanpa reload!**

### 🛠️ Cara Cepat Setup Firebase (1 Menit, Tanpa SQL):
1. Buka [console.firebase.google.com](https://console.firebase.google.com) lalu login dengan akun Google/Gmail kamu.
2. Klik **Add project** (beri nama bebas, misal `tiket-tracker`), lalu ikuti wizard sampai selesai.
3. Di menu sebelah kiri, buka **Build ➔ Firestore Database**:
   - Klik **Create Database**.
   - Pada pilihan lokasi, pilih default (atau yang terdekat, misal `asia-southeast2` Jakarta / `asia-southeast1` Singapura).
   - Pada pilihan Rules, pilih **Start in test mode** (agar bisa dibaca/tulis dari web kamu).
4. Masuk ke **Project Settings** (klik ikon roda gigi ⚙️ di kiri atas dekat tulisan *Project Overview*).
5. Scroll ke bawah ke bagian **Your apps**, klik ikon Web **`</>`**:
   - Beri nama aplikasi (misal `web-tracker`), lalu klik **Register app**.
   - Salin blok kode **`firebaseConfig = { ... }`**.
6. Buka web aplikasi kamu, klik tombol **`Mode Lokal`** di kanan atas, paste potongan konfigurasi tersebut, lalu klik **Hubungkan Firebase & Sinkron**. Selesai!

---

## 🌐 Cara Deploy ke GitHub Pages (Akses 24/7 di HP dari Mana Saja)

1. Buka [github.com](https://github.com) dan buat repository baru (misal: `ticket-tracker`), pilih **Public**.
2. Masuk ke repository tersebut, pilih opsi **"uploading an existing file"**.
3. Buka folder [ticket-tracker](file:///C:/Users/andiy/.gemini/antigravity/scratch/ticket-tracker), drag & drop seluruh file dan folder ke halaman GitHub:
   - `index.html`
   - Folder `css/`
   - Folder `js/`
   - Folder `data/`
   - `.gitignore`
   *(Catatan: folder `backups/` tidak perlu diupload).*
4. Klik **Commit changes**.
5. Di repo GitHub kamu, buka **Settings ➔ Pages**:
   - Di bagian **Source**, pilih **Deploy from a branch**.
   - Pada dropdown Branch, pilih **`main`** dan folder **`/(root)`**, lalu klik **Save**.
6. Dalam waktu ~1 menit, web kamu sudah online 24/7 di:
   ```text
   https://<username-kamu>.github.io/ticket-tracker/
   ```
7. Buka link tersebut di HP kamu, ketuk menu Chrome (⋮) ➔ **Add to Home screen**. Web langsung terpasang seperti aplikasi Android native!

---

## ⏱️ Logika SLA, Tanggal Tiket & Reminder

Tanggal pembuatan tiket otomatis diekstrak dari format nomor tiket:
- Contoh: `XLWO-20261110-00000035` ➔ Dibuat tanggal **10 November 2026**.
- Contoh: `RFC-20261110-00000023` ➔ Dibuat tanggal **10 November 2026**.

**Kalkulasi & Tingkat Peringatan:**
| Jenis Tiket | Masa Berlaku | Mulai Reminder | Status Indikator di Web |
| :--- | :--- | :--- | :--- |
| **XLWO** | **7 Hari** | **H-5 sebelum Expire** *(sisa ≤ 5 hari)* | 🟢 **Aman** (> 5 hari tersisa)<br>🟡 **Reminder H-5** (≤ 5 hari tersisa)<br>🔴 **Kritis** (≤ 2 hari tersisa)<br>⚫ **Expired** (≤ 0 hari) |
| **RFC** | **27 Hari** | **H-25 sebelum Expire** *(sisa ≤ 25 hari)* | 🟢 **Aman** (> 25 hari tersisa)<br>🟡 **Reminder H-25** (≤ 25 hari tersisa)<br>🔴 **Kritis** (≤ 5 hari tersisa)<br>⚫ **Expired** (≤ 0 hari) |

*(Masa hari berlaku dan batas reminder ini juga dapat kamu sesuaikan sendiri sewaktu-waktu lewat tab **"SLA & Reminder"**).*

---

## 📑 Penanganan Status Partial & Multi-Site

Untuk nomor XLWO & RFC yang memiliki banyak baris site (misalnya satu site `done` dan satu site `partial`):
- Dikumpulkan otomatis ke dalam 1 kartu tiket utama.
- Diberi badge **`⚠️ Ada Partial - Perlu Lanjutan`**.
- Filter khusus: *Ada Partial*, *Perlu Tindakan (Reminder)*, *Selesai*, *Expired*.
- Tombol **`✏️ Status`** pada tiap site untuk mengubah dari `partial` ke `done` dan menambahkan catatan progress langsung tersinkron ke cloud!

---

## 💾 Backup & Rollback

- **Backup Data (JSON):** Tab **Backup & Snapshot** ➔ klik **"Download Backup (JSON)"**.
- **Auto-Snapshot Rollback:** Setiap kali kamu upload data baru atau ubah status, sistem mencatat snapshot riwayat (hingga 10 snapshot terakhir). Jika salah import, cukup klik **"Rollback ke Sini"**!
- **Backup Source Code Project (.zip):** Klik ganda [backup_project.bat](file:///C:/Users/andiy/.gemini/antigravity/scratch/ticket-tracker/backup_project.bat) kapan saja sebelum memodifikasi kode.
