// ==========================================================================
// LacakPaket — script.js
// ==========================================================================
// Import Firebase SDK dari CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDQT8VTFnkIdKK4bhj3mSYJyhBw2Ux5fZA",
  authDomain: "lacakpaket-ddf07.firebaseapp.com",
  projectId: "lacakpaket-ddf07",
  storageBucket: "lacakpaket-ddf07.firebasestorage.app",
  messagingSenderId: "225617830485",
  appId: "1:225617830485:web:a9470e42aa14edead6aadc",
  measurementId: "G-CNNE7RH9SX"
};

// Inisialisasi Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', function () {
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var navToggle = document.getElementById('navToggle');
  var navlinks = document.getElementById('navlinks');
  if (navToggle && navlinks) {
    navToggle.addEventListener('click', function () {
      var isOpen = navlinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  initBantuanChat();
  initLacakPage();
  initAddPaketForm();
  initRiwayatPage();
  initDetailPage();
  initPerusahaanPage();
  initKarierCarousel();
  initFeaturesCoverflow();
});

// ==========================================================================
// RIWAYAT (data model) — dipakai bersama oleh halaman Lacak Paket & Riwayat
// ==========================================================================

var HISTORY_KEY = 'lacakpaket_riwayat';
var USERPAKET_KEY = 'lacakpaket_userpaket';

function normalizeResi(str) {
  return (str || '').replace(/\s+/g, '').toUpperCase();
}

// Data paket yang ditambahkan manual oleh pengguna lewat form "Tambah Data
// Paket" — disimpan di localStorage supaya bisa dilacak/dilihat lagi seperti
// resi bawaan di data.js.
function getUserPaketMap() {
  try {
    var raw = localStorage.getItem(USERPAKET_KEY);
    var map = raw ? JSON.parse(raw) : {};
    return (map && typeof map === 'object') ? map : {};
  } catch (e) {
    return {};
  }
}

function saveUserPaketMap(map) {
  try {
    localStorage.setItem(USERPAKET_KEY, JSON.stringify(map));
  } catch (e) {
    /* localStorage tidak tersedia — abaikan */
  }
}

function saveUserPaket(resi, data) {
  var norm = normalizeResi(resi);
  var map = getUserPaketMap();
  map[norm] = data;
  saveUserPaketMap(map);
}

function getTrackData(resi) {
  var norm = normalizeResi(resi);
  var userMap = getUserPaketMap();
  if (userMap[norm]) return userMap[norm];
  var data = window.TRACK_DATA || {};
  return data[norm] || null;
}

function getStatusLabel(status) {
  var labels = window.STATUS_LABELS || {};
  return labels[status] || status;
}

function getHistory() {
  try {
    var raw = localStorage.getItem(HISTORY_KEY);
    var list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];

    // Bersihkan entri yang rusak/tidak lengkap (misalnya sisa data lama
    // dengan skema berbeda) supaya tidak muncul sebagai "undefined" dan
    // supaya tombol hapus/sematkan selalu bisa menemukan datanya lagi.
    var changed = false;
    var clean = [];
    list.forEach(function (item) {
      if (!item || typeof item !== 'object') { changed = true; return; }
      var resi = normalizeResi(item.resi);
      if (!resi || !item.updatedAt || isNaN(new Date(item.updatedAt).getTime())) {
        changed = true;
        return;
      }
      if (item.resi !== resi) { item.resi = resi; changed = true; }
      if (!item.status) { item.status = 'menunggu'; changed = true; }
      if (!item.ekspedisi) { item.ekspedisi = 'Tidak diketahui'; changed = true; }
      if (!item.id) { item.id = generateHistoryId(); changed = true; }
      item.pinned = !!item.pinned;
      clean.push(item);
    });

    if (changed) saveHistoryList(clean);
    return clean;
  } catch (e) {
    return [];
  }
}

function generateHistoryId() {
  return 'h_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function saveHistoryList(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch (e) {
    /* localStorage tidak tersedia — abaikan */
  }
}

// Menyimpan/menyegarkan satu resi ke riwayat. Dipanggil setiap kali
// pelacakan berhasil dari halaman Lacak Paket.
function upsertHistory(resi, trackData) {
  var norm = normalizeResi(resi);
  if (!norm || !trackData) return;

  var list = getHistory();
  var existingIndex = -1;
  for (var i = 0; i < list.length; i++) {
    if (list[i].resi === norm) { existingIndex = i; break; }
  }
  var pinned = existingIndex !== -1 ? !!list[existingIndex].pinned : false;
  var id = existingIndex !== -1 ? list[existingIndex].id : generateHistoryId();
  if (existingIndex !== -1) list.splice(existingIndex, 1);

  list.unshift({
    id: id,
    resi: norm,
    ekspedisi: trackData.ekspedisi || 'Tidak diketahui',
    status: trackData.status || 'menunggu',
    pinned: pinned,
    updatedAt: new Date().toISOString()
  });

  saveHistoryList(list);
}

function deleteHistoryEntry(id) {
  var list = getHistory().filter(function (item) { return item.id !== id; });
  saveHistoryList(list);
}

function toggleHistoryPin(id) {
  var list = getHistory();
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) { list[i].pinned = !list[i].pinned; break; }
  }
  saveHistoryList(list);
}

function clearAllHistory() {
  saveHistoryList([]);
}

function relativeTimeFrom(isoString) {
  var then = new Date(isoString).getTime();
  var now = Date.now();
  var diffMin = Math.max(0, Math.round((now - then) / 60000));
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return diffMin + ' menit lalu';
  var diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return diffHour + ' jam lalu';
  var diffDay = Math.round(diffHour / 24);
  if (diffDay < 30) return diffDay + ' hari lalu';
  return new Date(isoString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Membangun markup DETAIL LENGKAP hasil pelacakan (badge besar, rincian
// barang/ekspedisi, peta kurir, dan timeline) — dipakai di halaman Detail
// Resi (detail.html) maupun di dalam modal pop-up kartu ringkas di halaman
// Lacak Paket, supaya keduanya menampilkan data yang sama & konsisten.
function buildTrackDetailHTML(resi, data) {
  var statusLabel = getStatusLabel(data.status);
  var timelineHTML = data.timeline.map(function (t) {
    return (
      '<li><span class="dot"></span><div><p>' + escapeHTML(t.title) + '</p>' +
      '<span class="muted small">' + escapeHTML(t.time) + ' &middot; ' + escapeHTML(t.location) + '</span></div></li>'
    );
  }).join('');

  var mapHTML = '';
  // Peta lokasi kurir hanya ditampilkan saat paket sedang dalam perjalanan /
  // sedang dicarikan kurir untuk pengantaran (belum selesai diantar).
  if (data.status === 'perjalanan' && data.courierLocation) {
    mapHTML = buildMapBlockHTML(data.courierLocation);
  }

  var barangRow = data.barang
    ? '<div class="row"><span>Nama Barang</span><p>' + escapeHTML(data.barang) + '</p></div>'
    : '';

  return (
    '<div class="head">' +
      '<div><p class="muted small">Nomor Resi</p><p class="resi">' + escapeHTML(resi) + '</p></div>' +
      '<span class="badge badge-' + data.status + '">' + escapeHTML(statusLabel) + '</span>' +
    '</div>' +
    '<div class="rows">' +
      barangRow +
      '<div class="row"><span>Ekspedisi</span><p>' + escapeHTML(data.ekspedisi) + '</p></div>' +
      '<div class="row"><span>Status</span><p>' + escapeHTML(data.estimasi) + '</p></div>' +
    '</div>' +
    mapHTML +
    '<p class="section-label">Riwayat Perjalanan</p>' +
    '<ul class="history">' + timelineHTML + '</ul>'
  );
}

// Membangun markup KARTU RINGKAS (compact card) — hanya info esensial:
// nomor resi, badge status, nama barang, dan ekspedisi. Kartu ini yang
// tampil pertama kali setelah pelacakan; klik/Enter/Spasi di kartu ini
// membuka modal detail lengkap (lihat openTrackModal()).
function buildTrackCompactHTML(resi, data) {
  var statusLabel = getStatusLabel(data.status);
  var itemHTML = data.barang
    ? '<span class="track-card-item">' + escapeHTML(data.barang) + '</span><span class="track-card-dot">&middot;</span>'
    : '';

  return (
    '<div class="track-card" tabindex="0" role="button" aria-label="Lihat detail resi ' + escapeHTML(resi) + '">' +
      '<div class="track-card-top">' +
        '<span class="track-card-resi">' + escapeHTML(resi) + '</span>' +
        '<span class="badge badge-' + data.status + '">' + escapeHTML(statusLabel) + '</span>' +
      '</div>' +
      '<div class="track-card-meta">' +
        itemHTML +
        '<span class="track-card-exp">' + escapeHTML(data.ekspedisi) + '</span>' +
      '</div>' +
      '<div class="track-card-foot">' +
        '<span class="track-card-hint">Lihat detail &amp; lokasi kurir</span>' +
        '<span class="track-card-arrow" aria-hidden="true">&rarr;</span>' +
      '</div>' +
    '</div>'
  );
}

// ---------- Modal detail pelacakan (dipakai oleh kartu ringkas di atas) ----------
// Modal dibuat sekali secara lazy (baru di-inject ke <body> saat pertama kali
// dibutuhkan), lalu dipakai ulang setiap kali kartu ringkas diklik — jadi
// tidak perlu menambah markup apa pun secara manual di file HTML.
var trackModalLastFocus = null;

function ensureTrackModal() {
  if (document.getElementById('trackDetailModal')) return;

  var modal = document.createElement('div');
  modal.id = 'trackDetailModal';
  modal.className = 'track-modal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML =
    '<div class="track-modal-backdrop" data-close="true"></div>' +
    '<div class="track-modal-panel" role="dialog" aria-modal="true" aria-label="Detail pelacakan paket">' +
      '<button type="button" class="track-modal-close" data-close="true" aria-label="Tutup detail">&times;</button>' +
      '<div class="track-modal-body" id="trackModalBody"></div>' +
    '</div>';
  document.body.appendChild(modal);

  modal.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) closeTrackModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeTrackModal();
  });
}

function openTrackModal(resi, data, triggerEl) {
  ensureTrackModal();
  var modal = document.getElementById('trackDetailModal');
  var body = document.getElementById('trackModalBody');
  body.innerHTML = buildTrackDetailHTML(resi, data);

  trackModalLastFocus = triggerEl || document.activeElement;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('track-modal-open');

  var closeBtn = modal.querySelector('.track-modal-close');
  if (closeBtn) closeBtn.focus();
}

function closeTrackModal() {
  var modal = document.getElementById('trackDetailModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('track-modal-open');
  if (trackModalLastFocus && typeof trackModalLastFocus.focus === 'function') {
    trackModalLastFocus.focus();
  }
}

function buildMapBlockHTML(loc) {
  var d = 0.02;
  var bbox = (loc.lng - d) + ',' + (loc.lat - d) + ',' + (loc.lng + d) + ',' + (loc.lat + d);
  var embedSrc = 'https://www.openstreetmap.org/export/embed.html?bbox=' + bbox + '&layer=mapnik&marker=' + loc.lat + ',' + loc.lng;
  var fullMapHref = 'https://www.openstreetmap.org/?mlat=' + loc.lat + '&mlon=' + loc.lng + '#map=14/' + loc.lat + '/' + loc.lng;

  return (
    '<div class="map-block">' +
      '<p class="row"><span>Lokasi Kurir Terakhir</span><span class="muted small" style="text-transform:none;letter-spacing:normal;">' + escapeHTML(loc.label) + '</span></p>' +
      '<div class="map-wrap">' +
        '<iframe src="' + embedSrc + '" width="100%" height="220" style="border:0;" loading="lazy" title="Lokasi kurir terakhir"></iframe>' +
        '<a href="' + fullMapHref + '" target="_blank" rel="noopener" class="map-link">Buka peta lebih besar</a>' +
      '</div>' +
    '</div>'
  );
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ==========================================================================
// LACAK PAKET — halaman utama (index.html)
// ==========================================================================

function initLacakPage() {
  var trackForm = document.getElementById('trackForm');
  var trackInput = document.getElementById('trackInput');
  var trackError = document.getElementById('trackError');
  var resultEl = document.getElementById('quickTrackResult');

  if (!trackForm || !trackInput || !resultEl) return; // bukan halaman lacak

  function showError(message) {
    resultEl.style.display = 'none';
    resultEl.innerHTML = '';
    resultEl.classList.remove('status-card--compact');
    if (trackError) {
      trackError.textContent = message;
      trackError.style.display = 'block';
    }
  }

  function showResult(resi, data) {
    if (trackError) trackError.style.display = 'none';
    resultEl.innerHTML = buildTrackCompactHTML(resi, data);
    resultEl.style.display = 'block';
    // "status-card" (parent) dipakai hanya sebagai posisi/lebar; gaya visual
    // kartu sepenuhnya ditangani oleh .track-card di dalamnya.
    resultEl.classList.add('status-card--compact');

    var card = resultEl.querySelector('.track-card');
    if (!card) return;

    function openDetail() { openTrackModal(resi, data, card); }
    card.addEventListener('click', openDetail);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDetail();
      }
    });
  }

  function trackResi(rawResi) {
    var resi = normalizeResi(rawResi);
    if (!resi) {
      showError('Masukkan nomor resi terlebih dahulu.');
      return;
    }
    var data = getTrackData(resi);
    if (!data) {
      showError('Nomor resi "' + resi + '" tidak ditemukan. Periksa kembali penulisannya.');
      return;
    }
    showResult(resi, data);
    upsertHistory(resi, data);
  }

  // pastikan kartu hasil tersembunyi saat halaman baru dimuat
  resultEl.style.display = 'none';

  trackForm.addEventListener('submit', function (e) {
    e.preventDefault();
    trackResi(trackInput.value);
  });

  document.querySelectorAll('.chip[data-resi]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var resi = chip.getAttribute('data-resi');
      trackInput.value = resi;
      trackResi(resi);
    });
  });
}

// ==========================================================================
// TAMBAH DATA PAKET — form input manual (index.html)
// ==========================================================================

function initAddPaketForm() {
  var form = document.getElementById('addPaketForm');
  if (!form) return; // bukan halaman lacak / form tidak ada

  var resiInput = document.getElementById('addResi');
  var barangInput = document.getElementById('addBarang');
  var ekspedisiInput = document.getElementById('addEkspedisi');
  var statusSelect = document.getElementById('addStatus');
  var lokasiInput = document.getElementById('addLokasi');
  var msgEl = document.getElementById('addPaketMsg');

  var ESTIMASI_TEXT = {
    menunggu: 'Menunggu penjemputan oleh kurir',
    perjalanan: 'Dalam perjalanan menuju tujuan',
    diantar: 'Paket telah diterima'
  };
  var TIMELINE_TITLE = {
    menunggu: 'Paket didaftarkan, menunggu penjemputan',
    perjalanan: 'Paket didaftarkan, sedang dalam perjalanan',
    diantar: 'Paket didaftarkan, sudah diterima'
  };

  function showMsg(text, type) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = 'add-paket-msg' + (type ? ' ' + type : '');
    msgEl.style.display = 'block';
  }

  function formatNow() {
    var d = new Date();
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var resi = normalizeResi(resiInput.value);
    var barang = (barangInput.value || '').trim();
    var ekspedisi = (ekspedisiInput.value || '').trim();
    var status = statusSelect.value;
    var lokasi = (lokasiInput.value || '').trim() || 'Tidak diketahui';

    if (!resi || !barang || !ekspedisi) {
      showMsg('Nomor resi, nama barang, dan ekspedisi wajib diisi.', 'error');
      return;
    }

    var isUpdate = !!getTrackData(resi);

    var data = {
      ekspedisi: ekspedisi,
      status: status,
      barang: barang,
      estimasi: ESTIMASI_TEXT[status] || 'Status tidak diketahui',
      timeline: [
        { title: TIMELINE_TITLE[status] || 'Paket didaftarkan', time: formatNow(), location: lokasi }
      ]
    };

    saveUserPaket(resi, data);
    upsertHistory(resi, data);

    showMsg(
      (isUpdate ? 'Data paket "' + resi + '" berhasil diperbarui ' : 'Paket "' + resi + '" berhasil ditambahkan ') +
      'dan tersimpan ke Riwayat.',
      'success'
    );

    form.reset();
  });
}

// ==========================================================================
// RIWAYAT — halaman riwayat.html
// ==========================================================================

function initRiwayatPage() {
  var historyList = document.getElementById('historyList');
  var statsGrid = document.getElementById('statsGrid');
  if (!historyList || !statsGrid) return; // bukan halaman riwayat

  var statTotal = document.getElementById('statTotal');
  var statMenunggu = document.getElementById('statMenunggu');
  var statPerjalanan = document.getElementById('statPerjalanan');
  var statDiantar = document.getElementById('statDiantar');
  var historyNoMatch = document.getElementById('historyNoMatch');

  var state = { filter: 'semua' };

  function renderStats() {
    var list = getHistory();
    var counts = { menunggu: 0, perjalanan: 0, diantar: 0 };
    list.forEach(function (item) {
      if (counts.hasOwnProperty(item.status)) counts[item.status]++;
    });
    if (statTotal) statTotal.textContent = list.length;
    if (statMenunggu) statMenunggu.textContent = counts.menunggu;
    if (statPerjalanan) statPerjalanan.textContent = counts.perjalanan;
    if (statDiantar) statDiantar.textContent = counts.diantar;
  }

  function getFilteredList() {
    var list = getHistory();
    var filtered = list.filter(function (item) {
      return state.filter === 'semua' || item.status === state.filter;
    });
    // terbaru dulu
    filtered.sort(function (a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); });
    return { filtered: filtered, total: list.length };
  }

  function renderList() {
    var result = getFilteredList();
    var filtered = result.filtered;
    var total = result.total;

    if (total === 0) {
      historyList.classList.add('history-empty');
      historyList.innerHTML =
        '<li><span class="dot"></span><div><p>Belum ada riwayat pencarian</p>' +
        '<span class="muted small">Riwayat tersimpan otomatis di perangkat ini</span></div></li>';
      if (historyNoMatch) historyNoMatch.style.display = 'none';
      return;
    }

    if (filtered.length === 0) {
      historyList.classList.add('history-empty');
      historyList.innerHTML = '';
      if (historyNoMatch) historyNoMatch.style.display = 'block';
      return;
    }

    if (historyNoMatch) historyNoMatch.style.display = 'none';
    historyList.classList.remove('history-empty');

    historyList.innerHTML = filtered.map(function (item) {
      var statusLabel = getStatusLabel(item.status);
      return (
        '<li class="history-card' + (item.pinned ? ' is-pinned' : '') + '" data-id="' + item.id + '">' +
          '<div class="card-actions">' +
            '<button type="button" class="card-icon-btn pin-btn' + (item.pinned ? ' is-pinned' : '') + '" data-action="pin" data-id="' + item.id + '" title="' + (item.pinned ? 'Lepas sematan' : 'Sematkan') + '">' + (item.pinned ? '★' : '☆') + '</button>' +
            '<button type="button" class="card-icon-btn delete-btn" data-action="delete" data-id="' + item.id + '" title="Hapus dari riwayat">✕</button>' +
          '</div>' +
          '<a href="detail.html?resi=' + encodeURIComponent(item.resi) + '" class="history-row">' +
            '<span class="resi-code">' + escapeHTML(item.resi) + '</span>' +
            '<div class="card-meta">' +
              '<span class="badge badge-' + item.status + '">' + escapeHTML(statusLabel) + '</span>' +
              '<span class="muted small">' + relativeTimeFrom(item.updatedAt) + '</span>' +
            '</div>' +
          '</a>' +
        '</li>'
      );
    }).join('');
  }

  function renderAll() {
    renderStats();
    renderList();
  }

  // klik salah satu kartu statistik (Total/Menunggu/Perjalanan/Diterima)
  // berfungsi sebagai filter — daftar resi di bawahnya menyesuaikan.
  statsGrid.addEventListener('click', function (e) {
    var btn = e.target.closest('.stat-card');
    if (!btn) return;
    statsGrid.querySelectorAll('.stat-card').forEach(function (c) { c.classList.remove('is-active'); });
    btn.classList.add('is-active');
    state.filter = btn.getAttribute('data-filter');
    renderList();
  });

  historyList.addEventListener('click', function (e) {
    // pin & delete pakai tombol khusus; klik pada resi/kartu (di luar tombol
    // itu) dibiarkan berjalan sebagai navigasi <a> biasa ke detail.html
    var actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    e.preventDefault();
    e.stopPropagation();
    var action = actionEl.getAttribute('data-action');
    var id = actionEl.getAttribute('data-id');

    if (action === 'pin') {
      toggleHistoryPin(id);
      renderList();
    } else if (action === 'delete') {
      deleteHistoryEntry(id);
      renderAll();
    }
  });

  renderAll();
}

// ==========================================================================
// DETAIL RESI — halaman detail.html (satu resi per halaman)
// ==========================================================================

function initDetailPage() {
  var detailContent = document.getElementById('detailContent');
  if (!detailContent) return; // bukan halaman detail

  var params = new URLSearchParams(window.location.search);
  var resi = normalizeResi(params.get('resi'));
  var data = resi ? getTrackData(resi) : null;

  if (!data) {
    detailContent.innerHTML =
      '<div class="detail-empty">' +
        '<div class="empty-icon">📦</div>' +
        '<p class="title">' + (resi ? 'Resi "' + escapeHTML(resi) + '" tidak ditemukan' : 'Nomor resi tidak ditemukan') + '</p>' +
        '<p class="muted small">Coba lacak ulang dari halaman Lacak Paket, atau pilih resi dari Riwayat.</p>' +
        '<a href="index.html" class="btn">Lacak Paket</a>' +
      '</div>';
    return;
  }

  detailContent.innerHTML = '<div class="state">' + buildTrackDetailHTML(resi, data) + '</div>';
}

// ==========================================================================
// CHAT ASISTEN — halaman Bantuan
// ==========================================================================

function initBantuanChat() {
  var chatMessages = document.getElementById('chatMessages');
  var chatForm = document.getElementById('chatForm');
  var chatInput = document.getElementById('chatInput');
  var chatQuick = document.getElementById('chatQuick');
  var chatReset = document.getElementById('chatReset');

  if (!chatMessages || !chatForm || !chatInput) return; // bukan halaman bantuan

  var GREETING =
    'Halo! Aku asisten LacakPaket. Ceritakan kendala yang kamu alami — misalnya status paket, resi tidak ditemukan, paket rusak/hilang, atau cara menghubungi kurir — nanti aku bantu carikan solusinya.';

  // -------------------- Basis pengetahuan (intent) --------------------
  // Setiap intent punya kata kunci pemicu dan jawaban. Semakin banyak kata
  // kunci yang cocok dengan pesan pengguna, semakin tinggi skornya.
  var INTENTS = [
    {
      id: 'sapaan',
      keywords: ['halo', 'hai', 'hi', 'hello', 'pagi', 'siang', 'sore', 'malam', 'permisi'],
      minScore: 1,
      reply:
        'Halo juga! Silakan ceritakan kendalamu seputar pengiriman atau nomor resi, aku bantu carikan jawabannya ya.'
    },
    {
      id: 'terima_kasih',
      keywords: ['terima kasih', 'makasih', 'thanks', 'thank you', 'oke makasih', 'sip'],
      minScore: 1,
      reply:
        'Sama-sama! Kalau masih ada yang ingin ditanyakan seputar paket atau resi, tinggal tulis di sini ya.'
    },
    {
      id: 'paket_hilang',
      keywords: ['hilang', 'raib', 'gak ketemu paket', 'menghilang', 'lenyap'],
      minScore: 1,
      reply:
        'Kalau paketmu terindikasi hilang, ini yang bisa kamu lakukan:\n1) Cek dulu status terakhir di halaman Lacak Paket — kadang statusnya "diantar" padahal masih di gudang transit.\n2) Simpan bukti pemesanan dan nomor resi.\n3) Hubungi customer service jasa ekspedisi terkait untuk mengajukan klaim/investigasi, biasanya diproses dalam beberapa hari kerja.\n4) Jika dibeli lewat marketplace, laporkan juga ke penjual atau pusat bantuan marketplace karena biasanya ada jaminan ganti rugi.',
      chips: ['Cara mengajukan klaim', 'Hubungi kurir']
    },
    {
      id: 'paket_rusak',
      keywords: ['rusak', 'pecah', 'penyok', 'cacat', 'bocor', 'sobek'],
      minScore: 1,
      reply:
        'Maaf mendengar paketmu rusak. Langkah yang disarankan:\n1) Foto kondisi paket dan barang sebelum dibuka lebih lanjut (termasuk label resi dan kemasan luar).\n2) Jangan buang kemasan asli dulu, biasanya jadi syarat klaim.\n3) Laporkan ke jasa ekspedisi atau penjual/marketplace maksimal 1x24 jam setelah paket diterima.\n4) Sertakan nomor resi dan foto tadi saat mengajukan klaim.'
    },
    {
      id: 'status_belum_update',
      keywords: [
        'belum update', 'belum berubah', 'tidak update', 'ga update', 'gak update',
        'status sama', 'lama banget', 'kelamaan', 'belum sampai', 'belum gerak', 'tidak bergerak', 'stuck'
      ],
      minScore: 1,
      reply:
        'Status paket yang belum berubah biasanya karena:\n• Kurir belum sempat memindai ulang saat transit antar kota/gudang sortir.\n• Ada penumpukan pengiriman di jam atau musim tertentu.\n• Cuaca atau kendala armada di kota tujuan.\n\nCoba cek lagi dalam beberapa jam. Kalau status benar-benar tidak berubah lebih dari 2-3 hari kerja, sebaiknya hubungi langsung customer service ekspedisi dengan nomor resi di tangan.',
      chips: ['Hubungi kurir']
    },
    {
      id: 'resi_tidak_ditemukan',
      keywords: [
        'resi tidak ditemukan', 'resi salah', 'nomor resi tidak valid', 'tidak ketemu',
        'tidak ditemukan', 'invalid', 'salah ketik', 'ga ketemu', 'gak ketemu'
      ],
      minScore: 1,
      reply:
        'Kalau nomor resi tidak ditemukan, coba cek beberapa hal ini:\n1) Pastikan tidak ada spasi, huruf besar/kecil, atau karakter tambahan yang salah ketik.\n2) Nomor resi biasanya baru bisa dilacak setelah paket discan pertama kali oleh kurir (belum tentu langsung aktif saat baru dipesan).\n3) Pastikan kamu memasukkan nomor resi dari kurir/ekspedisi yang benar, bukan nomor invoice atau nomor pesanan marketplace.\n\nKalau sudah dicek dan tetap tidak ketemu, coba lacak ulang di halaman utama, atau tanyakan langsung ke penjual/ekspedisi terkait.'
    },
    {
      id: 'alamat_salah',
      keywords: ['alamat salah', 'ganti alamat', 'pindah alamat', 'pindah rumah', 'salah alamat', 'ubah alamat'],
      minScore: 1,
      reply:
        'Untuk perubahan alamat pengiriman:\n1) Segera hubungi customer service jasa ekspedisi secepat mungkin sebelum paket "keluar untuk pengantaran".\n2) Siapkan nomor resi dan alamat baru yang lengkap.\n3) Jika paket sudah dalam perjalanan ke alamat lama, biasanya proses reroute butuh waktu tambahan atau paket akan diretur dulu.\n\nSemakin cepat dilaporkan, semakin besar kemungkinan alamat bisa diubah.'
    },
    {
      id: 'retur',
      keywords: ['retur', 'dikembalikan', 'return', 'pengembalian barang', 'dikembalikan ke pengirim'],
      minScore: 1,
      reply:
        'Paket biasanya diretur (dikembalikan ke pengirim) kalau penerima tidak ada di alamat setelah beberapa kali percobaan pengantaran, alamat tidak ditemukan, atau ditolak penerima. Kamu bisa cek status "retur" di halaman Lacak Paket, lalu hubungi penjual/ekspedisi untuk atur ulang pengiriman atau proses pengembalian dana.'
    },
    {
      id: 'hubungi_kurir',
      keywords: ['hubungi kurir', 'nomor cs', 'kontak kurir', 'customer service', 'call center', 'hubungi ekspedisi', 'kontak ekspedisi'],
      minScore: 1,
      reply:
        'Cara paling cepat menghubungi kurir/ekspedisi:\n1) Siapkan nomor resi dan detail pesanan.\n2) Buka situs resmi atau aplikasi jasa ekspedisi yang mengirim paketmu (nama ekspedisinya biasanya tertera di hasil pelacakan).\n3) Gunakan live chat atau call center resmi mereka — hindari nomor yang tidak resmi/tersebar di media sosial.\n\nLacakPaket sendiri hanya menampilkan status pelacakan, jadi untuk tindakan seperti klaim atau reroute tetap perlu lewat ekspedisi terkait.'
    },
    {
      id: 'cara_lacak',
      keywords: ['cara lacak', 'cara pakai', 'gimana cara', 'bagaimana cara melacak', 'cara menggunakan', 'cara cek resi'],
      minScore: 1,
      reply:
        'Gampang kok:\n1) Buka halaman "Lacak Paket".\n2) Masukkan nomor resi ke kolom pencarian, lalu tekan tombol Lacak.\n3) Status, riwayat perjalanan, dan lokasi kurir terakhir akan muncul di kartu hasil.\n4) Setiap resi yang kamu cari otomatis tersimpan di halaman Riwayat untuk dicek lagi nanti.'
    },
    {
      id: 'ongkir',
      keywords: ['ongkir', 'biaya kirim', 'harga kirim', 'tarif', 'biaya pengiriman'],
      minScore: 1,
      reply:
        'LacakPaket khusus untuk melacak status pengiriman, bukan menghitung ongkos kirim. Untuk info tarif/ongkir, silakan cek langsung di situs atau aplikasi jasa ekspedisi yang kamu gunakan, atau di halaman checkout toko tempat kamu belanja.'
    },
    {
      id: 'komplain',
      keywords: ['komplain', 'kecewa', 'lambat banget', 'pelayanan buruk', 'jelek', 'parah', 'kesal', 'marah'],
      minScore: 1,
      reply:
        'Aku paham ini pasti bikin kesal, maaf atas ketidaknyamanannya. Supaya bisa ditindaklanjuti dengan tepat, boleh ceritakan lebih detail — apakah soal status yang tidak update, paket rusak/hilang, atau pelayanan kurir? Setelah itu aku bisa arahkan ke langkah yang paling sesuai.'
    }
  ];

  var FALLBACK_REPLIES = [
    'Aku belum sepenuhnya menangkap maksudnya. Bisa dijelaskan lebih detail — apakah ini soal status paket, resi tidak ditemukan, paket rusak/hilang, atau cara menghubungi kurir?',
    'Hmm, coba ceritakan dengan kata lain ya. Misalnya: "resi saya tidak ditemukan" atau "paket saya belum sampai".'
  ];

  var messages = [];

  function stripDiacriticsLower(str) {
    return str.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  }

  function matchIntent(text) {
    var norm = ' ' + stripDiacriticsLower(text) + ' ';
    var best = null;
    var bestScore = 0;

    for (var i = 0; i < INTENTS.length; i++) {
      var intent = INTENTS[i];
      var score = 0;
      for (var k = 0; k < intent.keywords.length; k++) {
        if (norm.indexOf(intent.keywords[k]) !== -1) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        best = intent;
      }
    }

    if (best && bestScore >= (best.minScore || 1)) return best;
    return null;
  }

  function formatTime() {
    var d = new Date();
    var h = String(d.getHours()).padStart(2, '0');
    var m = String(d.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function renderMessage(role, text) {
    var wrap = document.createElement('div');
    wrap.className = 'chat-msg ' + role;

    var avatar = document.createElement('span');
    avatar.className = 'chat-bubble-avatar';
    avatar.textContent = role === 'bot' ? 'LP' : 'Kamu'.slice(0, 2).toUpperCase();

    var col = document.createElement('div');
    col.className = 'chat-bubble-col';

    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = text;

    var time = document.createElement('span');
    time.className = 'chat-time';
    time.textContent = formatTime();

    col.appendChild(bubble);
    col.appendChild(time);
    wrap.appendChild(avatar);
    wrap.appendChild(col);
    chatMessages.appendChild(wrap);
    scrollToBottom();
  }

  function showTyping() {
    var wrap = document.createElement('div');
    wrap.className = 'chat-msg bot';
    wrap.id = 'chatTypingIndicator';

    var avatar = document.createElement('span');
    avatar.className = 'chat-bubble-avatar';
    avatar.textContent = 'LP';

    var typing = document.createElement('div');
    typing.className = 'chat-bubble chat-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';

    wrap.appendChild(avatar);
    wrap.appendChild(typing);
    chatMessages.appendChild(wrap);
    scrollToBottom();
  }

  function hideTyping() {
    var el = document.getElementById('chatTypingIndicator');
    if (el) el.remove();
  }

  function pickFallback() {
    return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
  }

  function respondTo(userText) {
    var intent = matchIntent(userText);
    var reply = intent ? intent.reply : pickFallback();

    showTyping();
    var delay = 500 + Math.min(userText.length * 12, 700);
    setTimeout(function () {
      hideTyping();
      renderMessage('bot', reply);
      messages.push({ role: 'bot', text: reply });
    }, delay);
  }

  function sendMessage(text) {
    text = (text || '').trim();
    if (!text) return;
    renderMessage('user', text);
    messages.push({ role: 'user', text: text });
    respondTo(text);
  }

  function resetChat() {
    chatMessages.innerHTML = '';
    messages = [];
    renderMessage('bot', GREETING);
    messages.push({ role: 'bot', text: GREETING });
    if (chatQuick) chatQuick.style.display = 'flex';
  }

  chatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = chatInput.value;
    chatInput.value = '';
    sendMessage(text);
  });

  if (chatQuick) {
    chatQuick.addEventListener('click', function (e) {
      var btn = e.target.closest('.chat-chip');
      if (!btn) return;
      sendMessage(btn.getAttribute('data-q'));
    });
  }

  if (chatReset) {
    chatReset.addEventListener('click', resetChat);
  }

  resetChat();
}

// ==========================================================================
// PERUSAHAAN (Tentang Kami) — kolase 3 foto yang bertukar tempat
// ==========================================================================

// Foto yang di-hover pindah ke slot besar; foto yang tadinya besar geser ke
// slot sedang; foto yang tadinya sedang geser ke slot kecil — semuanya lewat
// transisi CSS (left/top/width/transform) supaya terasa "berputar" halus,
// bukan tiba-tiba muncul/timbul di tempat baru.
function initPerusahaanPage() {
  var trio = document.getElementById('photoTrio');
  if (!trio) return;

  var SLOTS = ['slot-big', 'slot-medium', 'slot-small'];

  function getSlotIndex(el) {
    for (var i = 0; i < SLOTS.length; i++) {
      if (el.classList.contains(SLOTS[i])) return i;
    }
    return -1;
  }

  function getOrderedPhotos() {
    var photos = Array.prototype.slice.call(trio.querySelectorAll('.photo'));
    return SLOTS.map(function (slotClass) {
      for (var i = 0; i < photos.length; i++) {
        if (photos[i].classList.contains(slotClass)) return photos[i];
      }
      return null;
    });
  }

  function applyOrder(ordered) {
    ordered.forEach(function (el, i) {
      if (!el) return;
      SLOTS.forEach(function (s) { el.classList.remove(s); });
      el.classList.add(SLOTS[i]);
    });
    syncDots();
  }

  function rotateToFront(target) {
    var idx = getSlotIndex(target);
    if (idx <= 0) return; // sudah di slot besar, atau elemen tidak dikenal

    var ordered = getOrderedPhotos();
    // Putar urutan supaya foto yang di-hover/klik berada paling depan (besar),
    // sisanya tetap mengikuti urutan siklus yang sama (besar → sedang → kecil).
    applyOrder(ordered.slice(idx).concat(ordered.slice(0, idx)));
  }

  // Geser satu langkah: depan → belakang, belakang → maju satu tingkat.
  function step(direction) {
    var ordered = getOrderedPhotos();
    if (direction === 1) {
      // next: slot besar pindah ke paling belakang, yang lain maju.
      applyOrder(ordered.slice(1).concat(ordered.slice(0, 1)));
    } else {
      // prev: slot paling belakang pindah ke depan, yang lain mundur.
      applyOrder(ordered.slice(-1).concat(ordered.slice(0, -1)));
    }
  }

  var photos = trio.querySelectorAll('.photo');
  for (var i = 0; i < photos.length; i++) {
    photos[i].addEventListener('mouseenter', function (e) {
      rotateToFront(e.currentTarget);
    });
    // Klik / tap juga memicu efek berputar (termasuk layar sentuh).
    photos[i].addEventListener('click', function (e) {
      rotateToFront(e.currentTarget);
    });
    photos[i].addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        rotateToFront(e.currentTarget);
      }
    });
  }

  // ---------- Navigasi panah + dots + autoplay ----------
  var prevBtn = document.getElementById('photoTrioPrev');
  var nextBtn = document.getElementById('photoTrioNext');
  var dotsWrap = document.getElementById('photoTrioDots');
  var dots = [];

  if (dotsWrap) {
    photos.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'card3d-dot';
      dot.setAttribute('aria-label', 'Tampilkan foto ' + (i + 1));
      dot.addEventListener('click', function () {
        rotateToFront(photos[i]);
      });
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });
  }

  function syncDots() {
    if (!dots.length) return;
    var photosArr = Array.prototype.slice.call(photos);
    var frontEl = trio.querySelector('.slot-big');
    dots.forEach(function (dot, i) {
      dot.classList.toggle('is-active', photosArr[i] === frontEl);
    });
  }

  if (nextBtn) nextBtn.addEventListener('click', function () { step(1); play(); });
  if (prevBtn) prevBtn.addEventListener('click', function () { step(-1); play(); });

  var AUTOPLAY_MS = 3500; // rotasi otomatis setiap 3-4 detik
  var timer = null;
  function play() {
    stop();
    timer = setInterval(function () { step(1); }, AUTOPLAY_MS);
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  // Pause on hover: berhenti saat kursor di area foto, lanjut lagi saat keluar.
  trio.addEventListener('mouseenter', stop);
  trio.addEventListener('mouseleave', play);
  // Bonus aksesibilitas: berhenti juga saat salah satu foto sedang difokus
  // lewat keyboard (Tab), lanjut lagi saat fokus berpindah keluar dari trio.
  trio.addEventListener('focusin', stop);
  trio.addEventListener('focusout', play);

  syncDots();
  play();
}

// ==========================================================================
// PERUSAHAAN (Karier) — carousel 3D screenshot (stack berputar otomatis)
// ==========================================================================

// Tiga gambar disusun di 3 slot (front/left/right). Klik gambar samping atau
// titik navigasi memindahkannya ke depan; carousel juga berputar otomatis
// dan berhenti sejenak saat kursor/keyboard fokus berada di atasnya.
function initKarierCarousel() {
  var stage = document.getElementById('karierStage');
  if (!stage) return;

  var items = Array.prototype.slice.call(stage.querySelectorAll('.card3d-item'));
  if (items.length < 2) return;

  var dotsWrap = document.getElementById('karierDots');
  var POS_BY_SLOT = ['front', 'right', 'left']; // urutan visual searah jarum jam
  var order = items.map(function (_, i) { return i; }); // order[slot] = index item

  var dots = [];
  if (dotsWrap) {
    items.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'card3d-dot';
      dot.setAttribute('aria-label', 'Tampilkan gambar ' + (i + 1));
      dot.addEventListener('click', function () { goToFront(i); });
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });
  }

  function render() {
    order.forEach(function (itemIdx, slot) {
      items[itemIdx].setAttribute('data-pos', POS_BY_SLOT[slot] || 'right');
    });
    var frontIdx = order[0];
    dots.forEach(function (dot, i) {
      dot.classList.toggle('is-active', i === frontIdx);
    });
  }

  function advance() {
    order.push(order.shift());
    render();
  }

  function goToFront(itemIdx) {
    var slot = order.indexOf(itemIdx);
    if (slot <= 0) return;
    order = order.slice(slot).concat(order.slice(0, slot));
    render();
  }

  var AUTOPLAY_MS = 3800;
  var timer = null;
  function play() {
    stop();
    timer = setInterval(advance, AUTOPLAY_MS);
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  items.forEach(function (el, i) {
    el.addEventListener('click', function () { goToFront(i); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goToFront(i);
      }
    });
  });

  stage.addEventListener('mouseenter', stop);
  stage.addEventListener('mouseleave', play);
  stage.addEventListener('focusin', stop);
  stage.addEventListener('focusout', play);

  render();
  play();
}

// ==========================================================================
// FEATURES SCROLLER — geser otomatis terus-menerus, berhenti saat cursor
// diam di atasnya, dan bisa digeser manual dengan cursor/jari (drag),
// tanpa bergantung pada tombol panah atau dots.
// ==========================================================================
function initFeaturesCoverflow() {
  var viewport = document.getElementById('fcViewport');
  var track = document.getElementById('fcTrack');
  if (!viewport || !track) return;

  var originalSlides = Array.prototype.slice.call(track.children);
  if (!originalSlides.length) return;

  // gandakan satu set slide supaya loop-nya mulus (tanpa "patah" di ujung)
  originalSlides.forEach(function (slide) {
    track.appendChild(slide.cloneNode(true));
  });

  var pos = 0; // posisi translateX saat ini (negatif = geser ke kiri)
  var speed = 46; // kecepatan auto-geser dalam px per detik
  var hovering = false;
  var dragging = false;
  var moved = false;
  var startX = 0;
  var startPos = 0;
  var lastTime = null;
  var setWidth = 0;
  var lockedSlide = null; // kartu yang "dikunci" di depan lewat klik

  function measure() {
    setWidth = track.scrollWidth / 2;
  }

  function wrap() {
    if (setWidth <= 0) return;
    while (pos <= -setWidth) pos += setWidth;
    while (pos > 0) pos -= setWidth;
  }

  function apply() {
    track.style.transform = 'translateX(' + pos + 'px)';
  }

  function frame(time) {
    if (lastTime === null) lastTime = time;
    var dt = (time - lastTime) / 1000;
    lastTime = time;

    if (!dragging && !hovering && !lockedSlide) {
      pos -= speed * dt;
      wrap();
      apply();
    }
    requestAnimationFrame(frame);
  }

  measure();
  window.addEventListener('resize', measure);
  requestAnimationFrame(frame);

  // ---------- Kartu maju ke depan saat di-hover atau diklik ----------
  var allSlides = Array.prototype.slice.call(track.querySelectorAll('.fc-slide'));

  function clearFront() {
    allSlides.forEach(function (s) { s.classList.remove('is-front'); });
    track.classList.remove('has-focus');
  }
  function setFront(slide) {
    clearFront();
    slide.classList.add('is-front');
    track.classList.add('has-focus');
  }

  allSlides.forEach(function (slide) {
    slide.addEventListener('mouseenter', function () {
      if (!lockedSlide) setFront(slide);
    });
    slide.addEventListener('mouseleave', function () {
      if (!lockedSlide) clearFront();
    });
    slide.addEventListener('click', function () {
      if (moved) return; // abaikan kalau ini sebenarnya drag, bukan klik
      if (lockedSlide === slide) {
        lockedSlide = null;
        clearFront();
      } else {
        lockedSlide = slide;
        setFront(slide);
      }
    });
  });

  // Berhenti begitu cursor diam/berada di atas blok, lanjut lagi saat pergi
  viewport.addEventListener('mouseenter', function () { hovering = true; });
  viewport.addEventListener('mouseleave', function () {
    hovering = false;
    pointerUp();
  });

  function pointerDown(x) {
    dragging = true;
    moved = false;
    startX = x;
    startPos = pos;
    viewport.classList.add('is-dragging');
  }
  function pointerMove(x) {
    if (!dragging) return;
    var delta = x - startX;
    if (Math.abs(delta) > 3) moved = true;
    pos = startPos + delta;
    wrap();
    apply();
  }
  function pointerUp() {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('is-dragging');
  }

  viewport.addEventListener('mousedown', function (e) {
    pointerDown(e.clientX);
    e.preventDefault();
  });
  window.addEventListener('mousemove', function (e) {
    if (dragging) pointerMove(e.clientX);
  });
  window.addEventListener('mouseup', pointerUp);

  viewport.addEventListener('touchstart', function (e) {
    pointerDown(e.touches[0].clientX);
  }, { passive: true });
  viewport.addEventListener('touchmove', function (e) {
    pointerMove(e.touches[0].clientX);
  }, { passive: true });
  viewport.addEventListener('touchend', pointerUp);

  // Cegah gambar/teks ikut ter-drag oleh browser saat digeser
  viewport.addEventListener('dragstart', function (e) { e.preventDefault(); });

  // Cegah klik "nyangkut" jadi navigasi kalau ternyata itu drag; klik di
  // luar kartu (area kosong viewport) membatalkan kartu yang terkunci di depan.
  viewport.addEventListener('click', function (e) {
    if (moved) { e.preventDefault(); e.stopPropagation(); return; }
    if (!e.target.closest('.fc-slide')) {
      lockedSlide = null;
      clearFront();
    }
  }, true);
}

// ==========================================================================
// HALAMAN LEGAL — Kebijakan Privasi & Syarat Layanan
// ==========================================================================
// Sejak diubah menjadi 2 halaman terpisah (privasi.html & syarat.html),
// tidak ada lagi modal/JS khusus yang dibutuhkan di sini — kontennya sudah
// langsung ditulis di masing-masing file HTML.
