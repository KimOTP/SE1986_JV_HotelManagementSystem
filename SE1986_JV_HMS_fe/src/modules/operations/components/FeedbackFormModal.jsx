import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFeedbackSchema, replyFeedbackSchema } from '../schemas/feedbackSchemas';
import { createFeedback, getFeedbackBookings, replyFeedback } from '../api/feedbackApi';
export default function FeedbackFormModal({ feedback, onClose, onSaved }) {
  const replying = !!feedback;
  const [bookings, setBookings] = useState({ items: [], loading: !replying, error: null });
  const [attempt, setAttempt] = useState(0);
  const [saveError, setSaveError] = useState(null);
  const busy = useRef(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(replying ? replyFeedbackSchema : createFeedbackSchema),
    defaultValues: replying ? { reply: '' } : { bookingId: '', rating: '5', comment: '' },
  });
  useEffect(() => {
    if (replying) return;
    const controller = new AbortController();
    getFeedbackBookings(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setBookings({ items, loading: false, error: null });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setBookings({
            items: [],
            loading: false,
            error: 'Không tải được booking đủ điều kiện. Kiểm tra backend và khách hàng đang đăng nhập.',
          });
      });
    return () => controller.abort();
  }, [replying, attempt]);
  const submit = async (values) => {
    if (busy.current) return;
    setSaveError(null);
    if (!replying && !bookings.items.some((booking) => booking.id === values.bookingId)) {
      setSaveError('Booking không còn hợp lệ. Vui lòng tải lại.');
      return;
    }
    busy.current = true;
    try {
      const response = replying
        ? await replyFeedback(feedback.id, values.reply)
        : await createFeedback(values);
      onSaved(response);
    } catch (error) {
      const status = error.response?.status;
      setSaveError(
        status === 409
          ? 'Booking đã được đánh giá hoặc feedback đã được phản hồi. Đóng hộp thoại và tải lại.'
          : status === 403
            ? 'Tài khoản đang đăng nhập không có quyền thao tác với booking/khách sạn này.'
            : status === 400
              ? 'Nội dung phải có 5–2000 ký tự, số sao từ 1 đến 5.'
              : status === 503
                ? 'Tài khoản hiện tại không có quyền thực hiện thao tác này.'
                : 'Chưa xác nhận được kết quả lưu. Kiểm tra danh sách trước khi gửi lại.',
      );
    } finally {
      busy.current = false;
    }
  };
  return (
    <Modal
      show
      centered
      backdrop={isSubmitting ? 'static' : true}
      keyboard={!isSubmitting}
      onHide={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <Modal.Header closeButton={!isSubmitting}>
        <Modal.Title>{replying ? 'Phản hồi khách hàng' : 'Gửi đánh giá'}</Modal.Title>
      </Modal.Header>
      <Form noValidate onSubmit={(event) => handleSubmit(submit)(event)}>
        <Modal.Body>
          {saveError && <Alert variant="danger">{saveError}</Alert>}
          {replying ? (
            <>
              <p className="text-break">
                {feedback.bookingCode} · {feedback.guestName}: {feedback.comment}
              </p>
              <Form.Group controlId="feedback-reply">
                <Form.Label>Phản hồi</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  maxLength={2000}
                  {...register('reply')}
                  isInvalid={!!errors.reply}
                  disabled={isSubmitting}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.reply?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </>
          ) : (
            <>
              {bookings.loading && <p role="status">Đang tải booking...</p>}
              {bookings.error && <Alert variant="danger">{bookings.error}</Alert>}
              {!bookings.loading && !bookings.error && !bookings.items.length && (
                <Alert variant="info">
                  Chỉ booking đã trả phòng và chưa được đánh giá mới xuất hiện. Hiện không có
                  booking đủ điều kiện của khách hàng đang đăng nhập.
                </Alert>
              )}
              <fieldset
                disabled={
                  isSubmitting || bookings.loading || !!bookings.error || !bookings.items.length
                }
              >
                <Form.Group controlId="feedback-booking" className="mb-3">
                  <Form.Label>Booking đã trả phòng</Form.Label>
                  <Form.Select {...register('bookingId')} isInvalid={!!errors.bookingId}>
                    <option value="">-- Chọn booking --</option>
                    {bookings.items.map((booking) => (
                      <option key={booking.id} value={booking.id}>
                        {booking.bookingCode} — {booking.hotelName} — {booking.checkOutDate}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.bookingId?.message}
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group controlId="feedback-rating" className="mb-3">
                  <Form.Label>Số sao</Form.Label>
                  <Form.Select {...register('rating')} isInvalid={!!errors.rating}>
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} sao
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.rating?.message}
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group controlId="feedback-comment">
                  <Form.Label>Nội dung đánh giá</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    maxLength={2000}
                    {...register('comment')}
                    isInvalid={!!errors.comment}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.comment?.message}
                  </Form.Control.Feedback>
                </Form.Group>
              </fieldset>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {!replying && (
            <Button
              variant="outline-secondary"
              disabled={isSubmitting || bookings.loading}
              onClick={() => {
                setBookings({ items: [], loading: true, error: null });
                setAttempt((value) => value + 1);
              }}
            >
              Tải lại booking
            </Button>
          )}
          <Button variant="secondary" disabled={isSubmitting} onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              (!replying && (bookings.loading || !!bookings.error || !bookings.items.length))
            }
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
