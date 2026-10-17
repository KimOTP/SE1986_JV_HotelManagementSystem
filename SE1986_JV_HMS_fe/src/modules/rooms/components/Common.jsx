import { Alert, Badge, Button, Pagination, Spinner } from 'react-bootstrap';
import { STATUS_LABELS } from '../constants/roomConstants';

export function LoadingState() {
  return (
    <div className="text-center py-5">
      <Spinner animation="border" />
      <div className="text-muted mt-2">Đang tải dữ liệu…</div>
    </div>
  );
}
export function ErrorState({ message, onRetry }) {
  return (
    <Alert variant="danger">
      {message || 'Không thể tải dữ liệu.'}
      {onRetry && (
        <Button variant="outline-danger" size="sm" className="ms-3" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </Alert>
  );
}
export function ActiveBadge({ active }) {
  return (
    <Badge bg={active ? 'success' : 'secondary'}>
      {active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
    </Badge>
  );
}
export function StatusBadge({ status }) {
  const bg =
    { READY: 'success', OCCUPIED: 'danger', DIRTY: 'warning', MAINTENANCE: 'secondary' }[status] ||
    'dark';
  return (
    <Badge bg={bg} text={status === 'DIRTY' ? 'dark' : undefined}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}
export function Pager({ page, total, onChange, count, start, end }) {
  if (total <= 1) return <small className="text-muted">{count} kết quả</small>;
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
      <small className="text-muted">
        Hiển thị {start}–{end} / {count}
      </small>
      <Pagination className="mb-0">
        <Pagination.Prev disabled={page === 1} onClick={() => onChange(page - 1)} />
        {Array.from({ length: total }, (_, i) => (
          <Pagination.Item key={i + 1} active={page === i + 1} onClick={() => onChange(i + 1)}>
            {i + 1}
          </Pagination.Item>
        ))}
        <Pagination.Next disabled={page === total} onClick={() => onChange(page + 1)} />
      </Pagination>
    </div>
  );
}
