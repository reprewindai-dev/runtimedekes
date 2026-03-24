export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${status}`}>{status.replaceAll('_', ' ')}</span>
}
