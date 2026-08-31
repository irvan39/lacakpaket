// ==========================================================================
// LacakPaket — data.js
// Data dummy/mock untuk nomor resi bawaan (dipakai oleh chip di halaman
// utama). Harus dimuat SEBELUM script.js karena script.js membaca
// window.TRACK_DATA dan window.STATUS_LABELS saat halaman diproses.
// ==========================================================================

// Label tampilan untuk tiap kode status. Dipakai oleh getStatusLabel()
// di script.js untuk menampilkan badge status yang lebih ramah pengguna.
window.STATUS_LABELS = {
  menunggu: 'Menunggu Penjemputan',
  perjalanan: 'Dalam Perjalanan',
  diantar: 'Diterima'
};

// Struktur tiap entri:
// {
//   ekspedisi: string,
//   status: 'menunggu' | 'perjalanan' | 'diantar',
//   barang: string,
//   estimasi: string,
//   courierLocation: { lat, lng, label }  // opsional, dipakai saat status 'perjalanan'
//   timeline: [{ title, time, location }, ...]  // urutan terbaru di paling atas
// }
//
// Catatan: key harus dalam bentuk resi yang sudah dinormalisasi (huruf besar,
// tanpa spasi) karena getTrackData() mencocokkan lewat normalizeResi().
window.TRACK_DATA = {
  TRK2026082077: {
    ekspedisi: 'JNE Express',
    status: 'perjalanan',
    barang: 'Sepatu Sneakers',
    estimasi: 'Estimasi tiba 1-2 September 2026',
    courierLocation: {
      lat: -7.0051,
      lng: 110.4381,
      label: 'Hub Sortir JNE Semarang'
    },
    timeline: [
      {
        title: 'Paket sedang dalam perjalanan menuju kota tujuan',
        time: '31 Agu 2026, 09:20',
        location: 'Hub Sortir JNE Semarang'
      },
      {
        title: 'Paket tiba di gudang transit',
        time: '30 Agu 2026, 22:05',
        location: 'Gudang Transit JNE Yogyakarta'
      },
      {
        title: 'Paket telah dijemput oleh kurir',
        time: '30 Agu 2026, 14:40',
        location: 'Counter JNE Malioboro, Yogyakarta'
      },
      {
        title: 'Paket didaftarkan oleh pengirim',
        time: '30 Agu 2026, 11:15',
        location: 'Yogyakarta'
      }
    ]
  },

  TRK2026081234: {
    ekspedisi: 'SiCepat Halu',
    status: 'diantar',
    barang: 'Buku Pelajaran',
    estimasi: 'Paket telah diterima',
    timeline: [
      {
        title: 'Paket diterima oleh penerima',
        time: '29 Agu 2026, 16:48',
        location: 'Rumah Penerima, Semarang'
      },
      {
        title: 'Paket sedang diantar kurir ke alamat tujuan',
        time: '29 Agu 2026, 08:30',
        location: 'Kantor SiCepat Semarang Selatan'
      },
      {
        title: 'Paket tiba di kota tujuan',
        time: '28 Agu 2026, 20:12',
        location: 'Hub Sortir SiCepat Semarang'
      },
      {
        title: 'Paket didaftarkan oleh pengirim',
        time: '27 Agu 2026, 13:00',
        location: 'Jakarta'
      }
    ]
  },

  TRK2026080711: {
    ekspedisi: 'J&T Cargo',
    status: 'menunggu',
    barang: 'Aksesoris Handphone',
    estimasi: 'Menunggu penjemputan oleh kurir',
    timeline: [
      {
        title: 'Paket didaftarkan, menunggu penjemputan kurir',
        time: '31 Agu 2026, 07:50',
        location: 'Counter J&T Simpang Lima, Semarang'
      }
    ]
  }
};
