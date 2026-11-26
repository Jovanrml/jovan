import type { JurusanKode, UserRole } from '../types';

export interface JurusanInfo {
  kode: JurusanKode;
  nama: string;
  bidang: 'Teknologi Informasi & Komunikasi' | 'Seni Kreatif & Penyiaran' | 'Bisnis & Manajemen';
  bidangSlug: 'teknologi' | 'penyiaran' | 'bisnis';
  ringkasan: string;
  kompetensiUtama: string[];
  prospekKarier: string[];
  image: string;
}

export const JURUSAN_LIST: JurusanInfo[] = [
  {
    kode: 'TKJ',
    nama: 'Teknik Komputer dan Jaringan',
    bidang: 'Teknologi Informasi & Komunikasi',
    bidangSlug: 'teknologi',
    ringkasan:
      'Mempersiapkan teknisi infrastruktur jaringan, administrator server Linux/Windows, serta praktisi keamanan siber dan instalasi fiber optik bersertifikasi industri.',
    kompetensiUtama: [
      'Administrasi Sistem & Jaringan Enterprise',
      'Instalasi & Troubleshooting Fiber Optik',
      'Konfigurasi Router MikroTik & Cisco',
      'Keamanan Jaringan & Cloud Infrastructure',
    ],
    prospekKarier: ['Network Engineer', 'System Administrator', 'IT Support Specialist', 'Cloud Technician'],
    image: '/src/assets/images/jurusan_teknologi_1795063617861.jpg',
  },
  {
    kode: 'DKV',
    nama: 'Desain Komunikasi Visual',
    bidang: 'Teknologi Informasi & Komunikasi',
    bidangSlug: 'teknologi',
    ringkasan:
      'Mengasah kepekaan estetika dan penguasaan perangkat lunak kreatif untuk produksi identitas merek, desain antarmuka digital, ilustrasi komersial, dan fotografi produk.',
    kompetensiUtama: [
      'Tipografi & Sistem Identitas Merek',
      'Desain UI/UX Produk Digital',
      'Fotografi Komersial & Olah Citra',
      'Motion Graphic & Aset Kampanye Visual',
    ],
    prospekKarier: ['Graphic Designer', 'UI/UX Designer', 'Visual Brand Strategist', 'Creative Illustrator'],
    image: '/src/assets/images/jurusan_teknologi_1795063617861.jpg',
  },
  {
    kode: 'BC',
    nama: 'Broadcasting dan Perfilman',
    bidang: 'Seni Kreatif & Penyiaran',
    bidangSlug: 'penyiaran',
    ringkasan:
      'Melatih kru produksi siaran televisi, radio, dan sinematografi modern mulai dari penulisan naskah, tata kamera dan cahaya, hingga penyuntingan audio-video profesional.',
    kompetensiUtama: [
      'Tata Kamera & Sinematografi Lapangan',
      'Manajemen Produksi Siaran Langsung',
      'Tata Suara & Audio Mixing Studio',
      'Editing Non-Linear & Color Grading',
    ],
    prospekKarier: ['Videographer & DOP', 'Broadcast Operator', 'Video Editor', 'Production Assistant'],
    image: '/src/assets/images/jurusan_broadcasting_1795063618014.jpg',
  },
  {
    kode: 'AK',
    nama: 'Akuntansi dan Keuangan Lembaga',
    bidang: 'Bisnis & Manajemen',
    bidangSlug: 'bisnis',
    ringkasan:
      'Membentuk tenaga pembukuan, perpajakan, dan audit junior yang teliti menggunakan metode akuntansi manual maupun perangkat lunak akuntansi terkomputerisasi.',
    kompetensiUtama: [
      'Siklus Akuntansi Perusahaan Jasa & Dagang',
      'Komputerisasi Akuntansi (MYOB & Accurate)',
      'Administrasi Perpajakan & Pelaporan SPT',
      'Pengelolaan Kas & Analisis Laporan Keuangan',
    ],
    prospekKarier: ['Accounting Staff', 'Tax Administrator', 'Junior Auditor', 'Finance Officer'],
    image: '/src/assets/images/jurusan_bisnis_1795063617606.jpg',
  },
  {
    kode: 'MPLB',
    nama: 'Manajemen Perkantoran dan Layanan Bisnis',
    bidang: 'Bisnis & Manajemen',
    bidangSlug: 'bisnis',
    ringkasan:
      'Mencetak tenaga administrasi eksekutif dan layanan pelanggan modern yang terampil dalam kearsipan digital, korespondensi bisnis, dan tata kelola operasional kantor.',
    kompetensiUtama: [
      'Korespondensi & Protokoler Eksekutif',
      'Pengelolaan Arsip Elektronik & Basis Data',
      'Otomatisasi Perkantoran Kolaboratif',
      'Komunikasi Bisnis & Layanan Pelanggan',
    ],
    prospekKarier: ['Executive Secretary', 'Office Administrator', 'HR Administration', 'Customer Relations'],
    image: '/src/assets/images/jurusan_bisnis_1795063617606.jpg',
  },
  {
    kode: 'BD',
    nama: 'Bisnis Digital',
    bidang: 'Bisnis & Manajemen',
    bidangSlug: 'bisnis',
    ringkasan:
      'Membekali siswa dengan strategi pemasaran digital, pengelolaan toko niaga elektronik, analitik konten, dan kewirausahaan rintisan berbasis data.',
    kompetensiUtama: [
      'Strategi Pemasaran Media Sosial & SEO',
      'Manajemen Operasional E-Commerce',
      'Copywriting & Konten Komersial Digital',
      'Analitik Konversi & Perencanaan Bisnis',
    ],
    prospekKarier: ['Digital Marketer', 'E-Commerce Specialist', 'Social Media Strategist', 'Digital Entrepreneur'],
    image: '/src/assets/images/jurusan_bisnis_1795063617606.jpg',
  },
];

export const BIDANG_KEAHLIAN = [
  {
    slug: 'teknologi' as const,
    nomor: '01',
    nama: 'Teknologi Informasi & Komunikasi',
    deskripsi: 'Rekayasa jaringan komputer, infrastruktur cloud, dan komunikasi visual digital.',
    jurusan: ['TKJ', 'DKV'] as JurusanKode[],
  },
  {
    slug: 'penyiaran' as const,
    nomor: '02',
    nama: 'Seni Kreatif & Penyiaran',
    deskripsi: 'Produksi media penyiaran, sinematografi, tata suara, dan pascaproduksi film.',
    jurusan: ['BC'] as JurusanKode[],
  },
  {
    slug: 'bisnis' as const,
    nomor: '03',
    nama: 'Bisnis & Manajemen',
    deskripsi: 'Akuntansi lembaga, tata kelola perkantoran modern, dan strategi perdagangan digital.',
    jurusan: ['AK', 'MPLB', 'BD'] as JurusanKode[],
  },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  guru: 'Guru',
  tenaga_kependidikan: 'Tenaga Kependidikan',
};

export const TINGKAT_KELAS = ['X', 'XI', 'XII'] as const;
export const ROMBEL_SUFFIX = ['1', '2'] as const;

export function buildDefaultClassOptions(): string[] {
  const list: string[] = [];
  for (const tingkat of TINGKAT_KELAS) {
    for (const j of JURUSAN_LIST) {
      list.push(`${tingkat} ${j.kode} 1`);
      list.push(`${tingkat} ${j.kode} 2`);
    }
  }
  return list;
}
