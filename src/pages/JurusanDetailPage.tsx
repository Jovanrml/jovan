import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { JURUSAN_LIST } from '../data/schoolData';

export default function JurusanDetailPage() {
  const { kode } = useParams<{ kode: string }>();
  const jurusan = JURUSAN_LIST.find((j) => j.kode.toLowerCase() === (kode || '').toLowerCase());

  if (!jurusan) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-6 py-4">
          <Link
            to="/"
            className="text-lg font-extrabold tracking-tight text-zinc-900 whitespace-nowrap shrink-0"
          >
            SMK Prima Unggul
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600">
            {JURUSAN_LIST.map((item) => (
              <Link
                key={item.kode}
                to={`/jurusan/${item.kode.toLowerCase()}`}
                className={`whitespace-nowrap shrink-0 transition-colors ${
                  item.kode === jurusan.kode
                    ? 'font-bold text-red-700'
                    : 'hover:text-zinc-900'
                }`}
              >
                {item.kode}
              </Link>
            ))}
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 whitespace-nowrap shrink-0"
          >
            <span>Masuk Portal</span>
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-12">
        <Link
          to="/#jurusan"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-red-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Kembali ke Beranda</span>
        </Link>

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-6">
            <p className="text-xs font-semibold text-red-700">
              <span className="font-mono">{jurusan.kode}</span>
              <span aria-hidden="true"> · </span>
              <span>{jurusan.bidang}</span>
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
              {jurusan.nama}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-zinc-600">{jurusan.ringkasan}</p>

            <div className="mt-8 border border-zinc-200 bg-white p-6">
              <h2 className="text-sm font-bold text-zinc-900">Kompetensi Inti Lulusan</h2>
              <ul className="mt-4 space-y-3">
                {jurusan.kompetensiUtama.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-zinc-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 border border-zinc-200 bg-white p-6">
              <h2 className="text-sm font-bold text-zinc-900">Prospek Karier Industri</h2>
              <p className="mt-3 text-sm text-zinc-700">{jurusan.prospekKarier.join(' · ')}</p>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="overflow-hidden border border-zinc-200 bg-white">
              <img
                src={jurusan.image}
                alt={`Ruang praktik ${jurusan.nama}`}
                referrerPolicy="no-referrer"
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="border-t border-zinc-200 p-5">
                <p className="text-xs font-medium text-zinc-500">
                  Fasilitas Praktik Kejuruan · SMK Prima Unggul
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
