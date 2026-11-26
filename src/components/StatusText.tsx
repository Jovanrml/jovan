import { AlertCircle, CheckCircle2, Clock, FileText, XCircle } from 'lucide-react';
import type { EmployeeAttendanceStatus, StudentAttendanceStatus } from '../types';

type AnyStatus = EmployeeAttendanceStatus | StudentAttendanceStatus;

const STATUS_CONFIG: Record<
  AnyStatus,
  { label: string; colorClass: string; Icon: typeof CheckCircle2 }
> = {
  hadir: {
    label: 'Hadir',
    colorClass: 'text-emerald-700',
    Icon: CheckCircle2,
  },
  terlambat: {
    label: 'Terlambat',
    colorClass: 'text-red-700',
    Icon: Clock,
  },
  izin: {
    label: 'Izin',
    colorClass: 'text-amber-700',
    Icon: FileText,
  },
  sakit: {
    label: 'Sakit',
    colorClass: 'text-sky-700',
    Icon: AlertCircle,
  },
  alpa: {
    label: 'Alpa',
    colorClass: 'text-red-700',
    Icon: XCircle,
  },
};

export function StatusText({ status }: { status: AnyStatus | null | undefined }) {
  if (!status) {
    return <span className="text-xs text-zinc-400">Belum dicatat</span>;
  }
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${cfg.colorClass}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  );
}
