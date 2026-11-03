import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Pagination, Row } from 'react-bootstrap';
import { getAssignmentContext } from '../api/issueAssignmentsApi';
import { getCustomerFeedbackContext, getFeedback } from '../api/feedbackApi';
import FeedbackFormModal from '../components/FeedbackFormModal';
import { useAuth } from '../../../app/provider/AuthsContext.jsx';
import { ROLES } from '../../auths/constants/authConstants';
const empty = { rating: '0', status: '' };
const size = 5;
const date = (value) =>
  new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`).toLocaleString('vi-VN');
export default function FeedbackManagement() {
  const { hasRole, hasPermission } = useAuth();
  const customer = hasRole(ROLES.CUSTOMER);
  const allowed =
    hasPermission('UC-E6') && (customer || (hasRole(ROLES.ADMIN) || hasRole(ROLES.MANAGER)));
  const [draft, setDraft] = useState(empty);
  const [filters, setFilters] = useState(empty);
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true, context: null, items: [], error: null });
  const [modal, setModal] = useState(null);
  const [success, setSuccess] = useState(null);
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const context = customer
          ? await getCustomerFeedbackContext(controller.signal)
          : await getAssignmentContext(controller.signal);
        const items = context.enabled
          ? await getFeedback(
              {
                page,
                size,
                ...(customer ? {} : { rating: Number(filters.rating), status: filters.status }),
              },
              customer,
              controller.signal,
            )
          : [];
        if (!controller.signal.aborted) setState({ loading: false, context, items, error: null });
      } catch {
        if (!controller.signal.aborted)
          setState({
            loading: false,
            context: null,
            items: [],
            error: 'Không tải được đánh giá. Kiểm tra backend và tài khoản đang đăng nhập rồi thử lại.',
          });
      }
    };
    load();
    return () => controller.abort();
  }, [allowed, customer, page, filters, attempt]);
  const loading = () => setState({ loading: true, context: null, items: [], error: null });
  const refresh = () => {
    loading();
    setAttempt((value) => value + 1);
  };
  const apply = (values) => {
    loading();
    setFilters({ ...values });
    setPage(0);
  };
  const move = (next) => {
    loading();
    setPage(next);
  };
  if (!allowed)
    return (
      <Alert variant="warning">
        Chức năng dành cho Customer hoặc Manager/Admin có quyền UC-E6.
      </Alert>
    );
  return (
    <div>
      <div className="d-flex justify-content-between gap-2 mb-3">
        <h2>{customer ? 'Đánh giá của tôi' : 'Đánh giá của khách'}</h2>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" onClick={refresh} disabled={state.loading}>
            Tải lại
          </Button>
          {customer && (
            <Button
              disabled={state.loading || !state.context?.enabled}
              onClick={() => {
                setSuccess(null);
                setModal({ creating: true });
              }}
            >
              Gửi đánh giá
            </Button>
          )}
        </div>
      </div>
      <Alert variant="info">
        Mỗi booking đã trả phòng được đánh giá một lần. Bạn có thể xem đánh giá và phản hồi tại đây.
      </Alert>
      {state.context && (
        <Alert variant={state.context.enabled ? 'info' : 'warning'}>
          {state.context.enabled ? (
            <>
              Người thao tác:{' '}
              <strong>{customer ? state.context.customerName : state.context.managerName}</strong>,
              <Badge bg="secondary">Phiên đăng nhập hiện tại</Badge>
            </>
          ) : (
            state.context.message
          )}
        </Alert>
      )}
      {state.error && <Alert variant="danger">{state.error}</Alert>}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          Đã lưu {customer ? 'đánh giá' : 'phản hồi'} #{success.id}. Danh sách đã tải lại.
        </Alert>
      )}
      {!customer && (
        <Form
          className="p-3 border bg-light rounded mb-3"
          onSubmit={(event) => {
            event.preventDefault();
            apply(draft);
          }}
        >
          <Row className="g-2 align-items-end">
            <Col md={4}>
              <Form.Group controlId="feedback-filter-rating">
                <Form.Label>Số sao</Form.Label>
                <Form.Select
                  value={draft.rating}
                  onChange={(event) => setDraft((old) => ({ ...old, rating: event.target.value }))}
                >
                  <option value="0">Tất cả</option>
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {value} sao
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="feedback-filter-status">
                <Form.Label>Phản hồi</Form.Label>
                <Form.Select
                  value={draft.status}
                  onChange={(event) => setDraft((old) => ({ ...old, status: event.target.value }))}
                >
                  <option value="">Tất cả</option>
                  <option value="PENDING">Chưa phản hồi</option>
                  <option value="REPLIED">Đã phản hồi</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4} className="d-flex gap-2">
              <Button type="submit" disabled={state.loading}>
                Tìm kiếm
              </Button>
              <Button
                variant="outline-secondary"
                disabled={state.loading}
                onClick={() => {
                  setDraft(empty);
                  apply(empty);
                }}
              >
                Đặt lại
              </Button>
            </Col>
          </Row>
        </Form>
      )}
      {state.loading ? (
        <p role="status">Đang tải đánh giá...</p>
      ) : (
        !state.error &&
        state.context?.enabled &&
        (!state.items.length ? (
          <Alert variant="secondary">Không có đánh giá trong trang này hoặc phù hợp bộ lọc.</Alert>
        ) : (
          state.items.map((feedback) => (
            <Card key={feedback.id} className="mb-3">
              <Card.Body>
                <div className="d-flex justify-content-between">
                  <div>
                    <h5>
                      {feedback.guestName} — {feedback.rating}/5 sao
                    </h5>
                    <small>
                      {feedback.bookingCode} · {feedback.hotelName} · {date(feedback.createdAt)}
                    </small>
                  </div>
                  <Badge
                    bg={feedback.reply !== null ? 'success' : 'warning'}
                    text={feedback.reply !== null ? 'white' : 'dark'}
                  >
                    {feedback.reply !== null ? 'Đã phản hồi' : 'Chưa phản hồi'}
                  </Badge>
                </div>
                <p className="text-break mt-3" style={{ whiteSpace: 'pre-wrap' }}>
                  {feedback.comment}
                </p>
                {feedback.reply !== null ? (
                  <div className="border-start ps-3">
                    <strong>{feedback.repliedBy || 'Quản lý'}</strong>
                    {feedback.repliedAt && <small> · {date(feedback.repliedAt)}</small>}
                    <p className="text-break" style={{ whiteSpace: 'pre-wrap' }}>
                      {feedback.reply}
                    </p>
                  </div>
                ) : (
                  !customer && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSuccess(null);
                        setModal({ feedback });
                      }}
                    >
                      Phản hồi
                    </Button>
                  )
                )}
              </Card.Body>
            </Card>
          ))
        ))
      )}
      <div className="d-flex justify-content-between">
        <span>Trang {page + 1}</span>
        <Pagination>
          <Pagination.Prev disabled={page === 0 || state.loading} onClick={() => move(page - 1)} />
          <Pagination.Next
            disabled={state.loading || !!state.error || state.items.length < size}
            onClick={() => move(page + 1)}
          />
        </Pagination>
      </div>
      {modal && (
        <FeedbackFormModal
          feedback={modal.feedback}
          onClose={() => setModal(null)}
          onSaved={(response) => {
            setModal(null);
            setSuccess(response);
            setDraft(empty);
            apply(empty);
          }}
        />
      )}
    </div>
  );
}
