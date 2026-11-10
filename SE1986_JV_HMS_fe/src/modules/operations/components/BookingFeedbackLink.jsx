import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getFeedback } from '../api/feedbackApi';

export default function BookingFeedbackLink({ bookingCode }) {
  const [state, setState] = useState({ loading: true, reviewed: false, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    getFeedback({ bookingCode, page: 0, size: 1 }, true, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted)
          setState({ loading: false, reviewed: items.length > 0, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ loading: false, reviewed: false, error: true });
      });
    return () => controller.abort();
  }, [bookingCode, attempt]);
  if (state.error)
    return (
      <button
        className="btn btn-sm btn-outline-secondary"
        onClick={() => {
          setState({ loading: true, reviewed: false, error: false });
          setAttempt((value) => value + 1);
        }}
      >
        Tải lại trạng thái đánh giá
      </button>
    );
  if (state.loading) return <span role="status">Đang kiểm tra đánh giá…</span>;
  return (
    <Link
      className="btn btn-sm btn-outline-primary"
      to={'/operations/feedbacks?bookingCode=' + encodeURIComponent(bookingCode)}
    >
      {state.reviewed ? 'Xem đánh giá' : 'Viết đánh giá'}
    </Link>
  );
}
