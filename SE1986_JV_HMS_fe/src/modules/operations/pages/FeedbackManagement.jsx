import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Alert, Badge, Button, Card, Col, Form, Pagination, Row } from 'react-bootstrap';
import { getAssignmentContext } from '../api/issueAssignmentsApi';
import { getCustomerFeedbackContext, getFeedback, getFeedbackBookings } from '../api/feedbackApi';
import FeedbackFormModal from '../components/FeedbackFormModal';
import OperationsPageHeader from '../components/OperationsPageHeader';
import { useAuth } from '../../../app/provider/AuthsContext.jsx';
import { ROLES } from '../../auths/constants/authConstants';
const empty = { rating: '0', status: '' };
const size = 5;
const date = (value) =>
  new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`).toLocaleString('vi-VN');
export default function FeedbackManagement() {
  const { hasRole, hasPermission } = useAuth();
  const [params, setParams] = useSearchParams();
  const requestedBooking = params.get('bookingCode');
  const [eligible, setEligible] = useState([]);
  const customer = hasRole(ROLES.CUSTOMER);
  const allowed =
    hasPermission('UC-E6') && (customer || hasRole(ROLES.ADMIN) || hasRole(ROLES.MANAGER));
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
        const available =
          customer && context.enabled ? await getFeedbackBookings(controller.signal) : [];
        const items = context.enabled
          ? await getFeedback(
              {
                page: customer && requestedBooking ? 0 : page,
                ...(customer && requestedBooking ? { bookingCode: requestedBooking } : {}),
                size,
                ...(customer ? {} : { rating: Number(filters.rating), status: filters.status }),
              },
              customer,
              controller.signal,
            )
          : [];
        if (!controller.signal.aborted) {
          setEligible(available);
          setState({ loading: false, context, items, error: null });
        }
      } catch {
        if (!controller.signal.aborted)
          setState({
            loading: false,
            context: null,
            items: [],
            error:
              'Không tải được đánh giá. Kiểm tra backend và tài khoản đang đăng nhập rồi thử lại.',
          });
      }
    };
    load();
    return () => controller.abort();
  }, [allowed, customer, page, filters, attempt, requestedBooking]);
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
      <OperationsPageHeader title={customer ? 'Đánh giá của tôi' : 'Đánh giá của khách'}>
        <Button variant="outline-primary" onClick={refresh} disabled={state.loading}>
          Tải lại
        </Button>
        {customer && (
          <Button
            disabled={state.loading || !state.context?.enabled || !eligible.length}
            onClick={() => {
              setSuccess(null);
              setModal({
                creating: true,
                bookingId: eligible.find((booking) => booking.bookingCode === requestedBooking)?.id,
              });
            }}
          >
            Gửi đánh giá
          </Button>
        )}
      </OperationsPageHeader>
      <Alert variant="info">
        Mỗi booking đã trả phòng được đánh giá một lần. Bạn có thể xem đánh giá và phản hồi tại đây.
      </Alert>
      {customer && !state.loading && !state.error && state.context?.enabled && (
        <section className="mb-4" aria-label="Các kỳ nghỉ chờ đánh giá">
          <h2 className="h5">Kỳ nghỉ chờ đánh giá</h2>
          {requestedBooking &&
            !eligible.some((booking) => booking.bookingCode === requestedBooking) &&
            !state.items.length && (
              <Alert variant="info">
                Chưa có đánh giá cho đặt phòng {requestedBooking} hoặc đặt phòng không thuộc tài
                khoản này. Chỉ có thể viết đánh giá sau khi hoàn tất trả phòng.
              </Alert>
            )}
          {!eligible.length ? (
            <Alert variant="secondary">
              Bạn không có kỳ nghỉ nào chờ đánh giá. Đánh giá sẽ mở sau khi lễ tân hoàn tất trả
              phòng. <Link to="/bookings">Xem đặt phòng của tôi</Link>
            </Alert>
          ) : (
            eligible.map((booking) => (
              <Card
                key={booking.id}
                className="mb-2"
                border={booking.bookingCode === requestedBooking ? 'primary' : undefined}
              >
                <Card.Body className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                  <div>
                    <strong>{booking.bookingCode}</strong>
                    <div>
                      {booking.hotelName} · Trả phòng{' '}
                      {new Date(booking.checkOutDate + 'T00:00:00').toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setSuccess(null);
                      setModal({ creating: true, bookingId: booking.id });
                    }}
                  >
                    Viết đánh giá
                  </Button>
                </Card.Body>
              </Card>
            ))
          )}
          <h2 className="h5 mt-4">Đánh giá đã gửi</h2>
          {requestedBooking && (
            <Button
              variant="link"
              onClick={() => {
                setPage(0);
                setParams({}, { replace: true });
              }}
            >
              Xem tất cả đánh giá của tôi
            </Button>
          )}
        </section>
      )}
      {state.context && (!customer || !state.context.enabled) && (
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
          {customer
            ? 'Đã gửi đánh giá. Cảm ơn bạn đã chia sẻ trải nghiệm!'
            : 'Đã gửi phản hồi cho khách hàng.'}
        </Alert>
      )}
      {!customer && (
        <Form
          className="operations-filter-panel"
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
          <Alert variant="secondary">
            {customer
              ? 'Bạn chưa có đánh giá trong trang này.'
              : 'Không có đánh giá phù hợp bộ lọc.'}
          </Alert>
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
          <Pagination.Prev
            disabled={page === 0 || state.loading || (customer && !!requestedBooking)}
            onClick={() => move(page - 1)}
          />
          <Pagination.Next
            disabled={
              state.loading ||
              !!state.error ||
              !state.context?.enabled ||
              (customer && !!requestedBooking) ||
              state.items.length < size
            }
            onClick={() => move(page + 1)}
          />
        </Pagination>
      </div>
      {modal && (
        <FeedbackFormModal
          feedback={modal.feedback}
          bookingId={modal.bookingId}
          onClose={() => setModal(null)}
          onSaved={(response) => {
            setModal(null);
            setSuccess(response);
            setParams({}, { replace: true });
            setDraft(empty);
            apply(empty);
          }}
        />
      )}
    </div>
  );
}
