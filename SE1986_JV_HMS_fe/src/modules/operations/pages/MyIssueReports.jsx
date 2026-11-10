import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Alert, Button, Card, Pagination } from 'react-bootstrap';
import { getMyReports } from '../api/followUpApi';
import IssueStatusBadge from '../components/IssueStatusBadge';
import OperationsPageHeader from '../components/OperationsPageHeader';
export default function MyIssueReports() {
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true, items: [], error: false });
  useEffect(() => {
    const controller = new AbortController();
    getMyReports(page, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setState({ loading: false, items, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ loading: false, items: [], error: true });
      });
    return () => controller.abort();
  }, [page, attempt]);
  function move(next) {
    setState({ loading: true, items: [], error: false });
    setPage(next);
  }
  return (
    <div>
      <OperationsPageHeader
        title="Yêu cầu hỗ trợ của tôi"
        description="Theo dõi các sự cố bạn đã báo cho khách sạn."
      >
        <Button as={Link} to="/operations/report-issue">
          Báo sự cố
        </Button>
        <Button
          variant="outline-primary"
          disabled={state.loading}
          onClick={() => {
            setState({ loading: true, items: [], error: false });
            setAttempt((value) => value + 1);
          }}
        >
          Tải lại
        </Button>
      </OperationsPageHeader>
      {state.loading ? (
        <p role="status">Đang tải yêu cầu…</p>
      ) : state.error ? (
        <Alert variant="danger">Chưa tải được yêu cầu. Vui lòng thử lại.</Alert>
      ) : !state.items.length ? (
        <Alert variant="info">Không có yêu cầu trong trang này.</Alert>
      ) : (
        state.items.map((item) => (
          <Card className="mb-3" key={item.id}>
            <Card.Body>
              <div className="d-flex justify-content-between gap-3">
                <h2 className="h5 text-break">{item.title}</h2>
                <IssueStatusBadge status={item.status} />
              </div>
              <p className="text-muted">
                Yêu cầu #{item.id} · Phòng {item.roomNumber} ·{' '}
                {new Date(item.createdAt).toLocaleString('vi-VN')}
              </p>
              <p className="text-break" style={{ whiteSpace: 'pre-wrap' }}>
                {item.description}
              </p>
              {item.status === 'RESOLVED' && item.resolutionNote && (
                <div className="border-start ps-3">
                  <strong>Kết quả xử lý</strong>
                  <p className="text-break" style={{ whiteSpace: 'pre-wrap' }}>
                    {item.resolutionNote}
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        ))
      )}
      <Pagination>
        <Pagination.Prev disabled={page === 0 || state.loading} onClick={() => move(page - 1)} />
        <Pagination.Item active>{page + 1}</Pagination.Item>
        <Pagination.Next
          disabled={state.loading || state.error || state.items.length < 5}
          onClick={() => move(page + 1)}
        />
      </Pagination>
    </div>
  );
}
