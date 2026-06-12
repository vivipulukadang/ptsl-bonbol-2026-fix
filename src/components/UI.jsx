export function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4' : 'w-7 h-7';
  return (
    <div className={`${s} border-2 border-navy border-t-transparent rounded-full animate-spin`} />
  );
}

export function LoadingState({ message = 'Memuat data...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Spinner />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500 text-xl">!</div>
      <p className="text-sm text-red-600 text-center max-w-xs">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-sm">Coba Lagi</button>
      )}
    </div>
  );
}

export function EmptyState({ message = 'Tidak ada data.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2">
      <div className="text-3xl">📭</div>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    'Issued':              'badge-issued',
    'Draft_TanggalDiBook': 'badge-draft',
    'Aktif':               'badge-ok',
    'Superseded':          'bg-gray-100 text-gray-600 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
    'Mutasi':              'bg-orange-100 text-orange-700 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
  };
  const cls = map[status] || 'badge-draft';
  return <span className={cls}>{status}</span>;
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-navy">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
