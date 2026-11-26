import { ArrowRight, ArrowUpRight, Building2, Check, GraduationCap, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BIDANG_KEAHLIAN, JURUSAN_LIST } from '../data/schoolData';

type BidangFilter = 'all' | 'teknologi' | 'penyiaran' | 'bisnis';

export default function LandingPage() {
  const { user } = useAuth();
  const [bidangFilter, setBidangFilter] = useState<BidangFilter>('all');
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const filteredJurusan =
    bidangFilter === 'all'
      ? JURUSAN_LIST
      : JURUSAN_LIST.filter((j) => j.bidangSlug === bidangFilter);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      {/* Top Bar: Strict 3-zone contract */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-6 py-4">
          <Link
            to="/"
            className="text-lg font-extrabold tracking-tight text-zinc-900 whitespace-nowrap shrink-0"
          >
            SMK Prima Unggul
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600">
            <a
              href="#profil"
              className="hover:text-red-700 transition-colors whitespace-nowrap shrink-0"
            >
              Profil Sekolah
            </a>
            <a
              href="#bidang"
              className="hover:text-red-700 transition-colors whitespace-nowrap shrink-0"
            >
              Bidang Keahlian
            </a>
            <a
              href="#jurusan"
              className="hover:text-red-700 transition-colors whitespace-nowrap shrink-0"
            >
              Program Jurusan
            </a>
            <a
              href="#sistem"
              className="hover:text-red-700 transition-colors whitespace-nowrap shrink-0"
            >
              Sistem Absensi
            </a>
          </nav>

          <div className="shrink-0">
            <Link
              to={user ? '/app/dashboard' : '/login'}
              className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800 whitespace-nowrap shrink-0"
            >
              <span>{user ? 'Buka Aplikasi' : 'Masuk Portal'}</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Split */}
        <section className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-[1200px] px-6 py-14 lg:py-20">
            <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
              <div className="flex flex-col justify-between lg:col-span-6">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-red-700">
                    Sekolah Menengah Kejuruan · Pendidikan Vokasi Terpadu
                  </p>
                  <h1
                    className="mt-4 font-extrabold tracking-tight text-zinc-900 leading-[1.08]"
                    style={{
                      fontSize: 'clamp(2.25rem, 4vw, 3.6rem)',
                      textWrap: 'balance',
                    }}
                  >
                    Mencetak Lulusan Vokasi Disiplin, Kompeten, dan Siap Kerja.
                  </h1>
                  <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-600">
                    SMK Prima Unggul memadukan pembelajaran praktik industri pada tiga bidang
                    keahlian utama dengan tata kelola kehadiran digital yang terintegrasi untuk
                    seluruh siswa, guru, dan tenaga kependidikan.
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-5 pt-2">
                  <Link
                    to={user ? '/app/dashboard' : '/login'}
                    className="inline-flex items-center gap-2.5 rounded-lg bg-red-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-800 whitespace-nowrap shrink-0"
                  >
                    <span>{user ? 'Masuk ke Dashboard' : 'Masuk ke Sistem Absensi'}</span>
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </Link>
                  <a
                    href="#jurusan"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-700 hover:text-red-700 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Jelajahi 6 Program Jurusan</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="relative h-full min-h-[320px] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                  {!heroImgFailed ? (
                    <img
                      src="/src/assets/images/hero_smk_campus_clean_1795063634969.jpg"
                      alt="Gedung Kampus SMK Prima Unggul"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="h-full w-full object-cover lg:h-full"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-red-50 to-zinc-100 p-8 text-center">
                      <Building2 className="h-10 w-10 text-red-700" aria-hidden="true" />
                      <p className="mt-3 text-sm font-semibold text-zinc-900">
                        Kampus Terpadu SMK Prima Unggul
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Full-width 4-column Institutional Strip below hero split */}
            <div className="mt-12 grid grid-cols-2 border border-zinc-200 bg-zinc-50 md:grid-cols-4">
              <div className="border-b border-r border-zinc-200 p-5 md:border-b-0">
                <p className="font-mono text-2xl font-bold text-red-700 tabular-nums">03</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">Bidang Keahlian</p>
                <p className="mt-0.5 text-xs text-zinc-500">Teknologi, Penyiaran, Bisnis</p>
              </div>
              <div className="border-b border-zinc-200 p-5 md:border-b-0 md:border-r">
                <p className="font-mono text-2xl font-bold text-red-700 tabular-nums">06</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">Kompetensi Jurusan</p>
                <p className="mt-0.5 text-xs text-zinc-500">TKJ · DKV · BC · AK · MPLB · BD</p>
              </div>
              <div className="border-r border-zinc-200 p-5">
                <p className="font-mono text-2xl font-bold text-red-700 tabular-nums">03</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">Peran Akses Sistem</p>
                <p className="mt-0.5 text-xs text-zinc-500">Admin · Guru · Tendik</p>
              </div>
              <div className="p-5">
                <p className="font-mono text-2xl font-bold text-red-700 tabular-nums">100%</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">Rekap Tersinkronisasi</p>
                <p className="mt-0.5 text-xs text-zinc-500">Absensi siswa dan karyawan</p>
              </div>
            </div>
          </div>
        </section>

        {/* Profil Sekolah */}
        <section id="profil" className="border-b border-zinc-200 bg-zinc-50 py-16 lg:py-20">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <p className="text-xs font-semibold text-red-700">Profil Institusi</p>
                <h2
                  className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900"
                  style={{ textWrap: 'balance' }}
                >
                  Tentang SMK Prima Unggul
                </h2>
              </div>
              <div className="lg:col-span-7 space-y-5 text-base leading-relaxed text-zinc-600">
                <p>
                  SMK Prima Unggul adalah lembaga pendidikan menengah kejuruan yang berfokus pada
                  pembentukan karakter profesional, ketepatan disiplin kerja, serta penguasaan
                  keterampilan teknis sesuai kebutuhan dunia usaha dan dunia industri (DUDI).
                </p>
                <p>
                  Seluruh kegiatan belajar mengajar didukung oleh laboratorium jaringan, studio
                  desain komunikasi visual, studio penyiaran berstandar industri, dan ruang praktik
                  manajemen bisnis modern. Untuk menjaga budaya disiplin sejak dini, sekolah
                  menerapkan pencatatan presensi digital yang akurat bagi peserta didik, pendidik,
                  maupun staf administrasi.
                </p>
                <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2">
                  <div className="border border-zinc-200 bg-white p-5">
                    <h3 className="text-sm font-bold text-zinc-900">Visi Pendidikan Vokasi</h3>
                    <p className="mt-1.5 text-sm text-zinc-600">
                      Menjadi sekolah kejuruan rujukan yang menghasilkan talenta berintegritas,
                      adaptif terhadap teknologi, dan siap bersaing secara nasional.
                    </p>
                  </div>
                  <div className="border border-zinc-200 bg-white p-5">
                    <h3 className="text-sm font-bold text-zinc-900">Standar Disiplin Harian</h3>
                    <p className="mt-1.5 text-sm text-zinc-600">
                      Pemantauan kehadiran siswa per kelas dan presensi mandiri karyawan setiap hari
                      untuk membangun etos kerja profesional.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Bidang Keahlian */}
        <section id="bidang" className="border-b border-zinc-200 bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-red-700">Struktur Akademik</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900">
                Tiga Bidang Keahlian Utama
              </h2>
              <p className="mt-3 text-base text-zinc-600">
                Kurikulum SMK Prima Unggul dibagi ke dalam tiga rumpun bidang keahlian yang
                menaungi enam kompetensi jurusan terapan.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {BIDANG_KEAHLIAN.map((bidang) => (
                <div
                  key={bidang.slug}
                  className="flex flex-col justify-between border border-zinc-200 bg-zinc-50 p-6 transition-colors hover:border-red-300"
                >
                  <div>
                    <span className="font-mono text-sm font-semibold text-red-700 tabular-nums">
                      {bidang.nomor}.
                    </span>
                    <h3 className="mt-3 text-lg font-bold text-zinc-900">{bidang.nama}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                      {bidang.deskripsi}
                    </p>
                  </div>
                  <div className="mt-6 border-t border-zinc-200 pt-4">
                    <p className="text-xs font-medium text-zinc-500">
                      Kompetensi:{' '}
                      <span className="font-semibold text-zinc-900">
                        {bidang.jurusan.join(' · ')}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6 Program Jurusan (TKJ, DKV, AK, BC, MPLB, BD) */}
        <section id="jurusan" className="border-b border-zinc-200 bg-zinc-50 py-16 lg:py-20">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-semibold text-red-700">Kompetensi Keahlian</p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900">
                  Enam Konsentrasi Jurusan
                </h2>
                <p className="mt-2 max-w-xl text-sm text-zinc-600">
                  TKJ, DKV, BC, AK, MPLB, dan BD dirancang bersama praktisi industri untuk
                  memastikan keselarasan praktik kerja.
                </p>
              </div>

              {/* Interactive Filter Controls */}
              <div
                className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1"
                role="tablist"
                aria-label="Filter bidang keahlian"
              >
                {[
                  { key: 'all' as const, label: 'Semua' },
                  { key: 'teknologi' as const, label: 'Teknologi & Desain' },
                  { key: 'penyiaran' as const, label: 'Penyiaran' },
                  { key: 'bisnis' as const, label: 'Bisnis & Manajemen' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setBidangFilter(tab.key)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      bidangFilter === tab.key
                        ? 'bg-red-700 text-white'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredJurusan.map((jurusan) => (
                <article
                  key={jurusan.kode}
                  className="group flex flex-col justify-between overflow-hidden border border-zinc-200 bg-white transition-colors hover:border-red-300"
                >
                  <div>
                    <div className="aspect-[4/3] w-full overflow-hidden border-b border-zinc-200 bg-zinc-100">
                      <img
                        src={jurusan.image}
                        alt={`Laboratorium ${jurusan.nama}`}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                    <div className="p-6">
                      <p className="text-xs font-medium text-zinc-500">
                        <span className="font-mono font-bold text-red-700">{jurusan.kode}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{jurusan.bidang}</span>
                      </p>
                      <h3 className="mt-2 text-lg font-bold text-zinc-900">{jurusan.nama}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                        {jurusan.ringkasan}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-zinc-100 px-6 py-4">
                    <Link
                      to={`/jurusan/${jurusan.kode.toLowerCase()}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-800 whitespace-nowrap"
                    >
                      <span>Lihat Detail Kurikulum</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Sistem Absensi Terpadu */}
        <section id="sistem" className="bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
              <div className="lg:col-span-5">
                <p className="text-xs font-semibold text-red-700">Portal Internal Sekolah</p>
                <h2
                  className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900"
                  style={{ textWrap: 'balance' }}
                >
                  Sistem Absensi Siswa &amp; Karyawan Terintegrasi
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                  Setiap peran memiliki ruang kerja yang terstruktur dengan pencatatan waktu nyata
                  serta rekapitulasi siap unduh.
                </p>
                <div className="mt-6">
                  <Link
                    to={user ? '/app/dashboard' : '/login'}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-800 whitespace-nowrap"
                  >
                    <span>{user ? 'Masuk ke Ruang Kerja' : 'Login Pegawai & Admin'}</span>
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:col-span-7">
                <div className="border border-zinc-200 bg-zinc-50 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-700 text-white">
                      <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-900">Administrator</h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        Mengelola akun pengguna secara penuh, memelihara basis data induk siswa
                        (NIS, nama, kelas), mencatat absensi mandiri, serta mengakses seluruh rekap
                        kehadiran karyawan maupun siswa.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-zinc-200 bg-zinc-50 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
                      <GraduationCap className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-900">Guru</h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        Melakukan presensi harian sebagai karyawan, mencatat kehadiran siswa per
                        kelas dan tanggal, serta meninjau rekapitulasi absensi siswa.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-zinc-200 bg-zinc-50 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-white">
                      <Users className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-900">Tenaga Kependidikan</h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        Mengakses ringkasan kehadiran pribadi pada dashboard dan melakukan absen
                        masuk, pulang, maupun pengajuan izin/sakit secara mandiri.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-zinc-200 bg-zinc-950 text-zinc-300">
        <div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-6 px-6 py-10 md:flex-row md:items-center">
          <div>
            <p className="text-base font-bold text-white">SMK Prima Unggul</p>
            <p className="mt-1 text-xs text-zinc-400">
              Pendidikan Kejuruan Terpadu · TKJ · DKV · BC · AK · MPLB · BD
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-400">
            <a href="#profil" className="hover:text-white transition-colors">
              Profil
            </a>
            <a href="#jurusan" className="hover:text-white transition-colors">
              Program Jurusan
            </a>
            <Link to="/login" className="font-semibold text-red-400 hover:text-red-300">
              Portal Absensi
            </Link>
            <span className="inline-flex items-center gap-1 text-zinc-500">
              <Check className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
              <span>Tahun Ajaran 2026/2027</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
