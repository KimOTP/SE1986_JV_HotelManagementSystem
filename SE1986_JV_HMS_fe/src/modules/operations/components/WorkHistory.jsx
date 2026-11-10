import { useEffect, useState } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { getWorkManagement } from '../api/followUpApi';
export default function WorkHistory({ kind, id }) {
  const [state, setState] = useState({ loading: true, items: [], error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getWorkManagement(kind, id, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ loading: false, items: data.history, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ loading: false, items: [], error: true });
      });
    return () => controller.abort();
  }, [kind, id, attempt]);
  return (
    <section className="mt-3 border-top pt-3">
      <h3 className="h6">Lịch sử thay đổi</h3>
      {state.loading ? (
        <p role="status">Đang tải lịch sử…</p>
      ) : state.error ? (
        <Alert variant="warning">
          Chưa tải được lịch sử.{' '}
          <Button
            variant="link"
            onClick={() => {
              setState({ loading: true, items: [], error: false });
              setAttempt((value) => value + 1);
            }}
          >
            Thử lại
          </Button>
        </Alert>
      ) : !state.items.length ? (
        <p className="text-muted small">
          {kind === 'issues' ? 'Chưa có lần giao lại.' : 'Chưa có lần giao lại hoặc hủy.'}
        </p>
      ) : (
        state.items.map((entry, index) => (
          <div key={index} className="border-top py-2 small">
            <strong>{entry.action === 'CANCEL' ? 'Hủy công việc' : 'Giao lại'}</strong> ·{' '}
            {entry.actor} · {new Date(entry.createdAt).toLocaleString('vi-VN')}
            {entry.action !== 'CANCEL' && (
              <div>
                {entry.previousStaff || 'Chưa phân công'} → {entry.newStaff || 'Không có'}
              </div>
            )}
            <div className="text-break">Lý do: {entry.reason}</div>
          </div>
        ))
      )}
    </section>
  );
}
