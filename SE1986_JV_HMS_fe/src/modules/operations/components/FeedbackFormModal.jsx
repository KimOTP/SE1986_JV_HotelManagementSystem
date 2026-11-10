import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFeedbackSchema, replyFeedbackSchema } from '../schemas/feedbackSchemas';
import { createFeedback, getFeedbackBookings, replyFeedback } from '../api/feedbackApi';
const ratingLabels = {
  5: 'Rất hài lòng',
  4: 'Hài lòng',
  3: 'Bình thường',
  2: 'Chưa hài lòng',
  1: 'Rất không hài lòng',
};
const stayDate = (value) => new Date(value + 'T00:00:00').toLocaleDateString('vi-VN');

export default function FeedbackFormModal({ feedback, bookingId, onClose, onSaved }) {
  const replying = !!feedback;
  const [bookings, setBookings] = useState({ items: [], loading: !replying, error: null });
  const [attempt, setAttempt] = useState(0);
  const [saveError, setSaveError] = useState(null);
  const busy = useRef(false);
  const {
    register,
    control,
    getValues,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(replying ? replyFeedbackSchema : createFeedbackSchema),
    defaultValues: replying
      ? { reply: '' }
      : { bookingId: bookingId ? String(bookingId) : '', rating: '', comment: '' },
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
            error: 'Chưa tải được danh sách kỳ nghỉ. Vui lòng thử lại.',
          });
      });
    return () => controller.abort();
  }, [replying, attempt]);
  useEffect(() => {
    if (replying || bookings.loading || !bookings.items.length) return;
    const current = getValues('bookingId');
    if (bookings.items.some((item) => String(item.id) === current)) {
      setValue('bookingId', current);
      return;
    }
    const preferred = bookings.items.find((item) => item.id === bookingId);
    setValue(
      'bookingId',
      preferred
        ? String(preferred.id)
        : bookings.items.length === 1
          ? String(bookings.items[0].id)
          : '',
    );
  }, [replying, bookings.loading, bookings.items, bookingId, getValues, setValue]);
  const selectedId = useWatch({ control, name: 'bookingId' });
  const selectedStay = bookings.items.find((item) => String(item.id) === selectedId);
  const fixedStay = selectedStay && (bookings.items.length === 1 || selectedStay.id === bookingId);
  const comment = useWatch({ control, name: replying ? 'reply' : 'comment' }) || '';
  const submit = async (values) => {
    if (busy.current) return;
    setSaveError(null);
    if (!replying && !bookings.items.some((booking) => booking.id === values.bookingId)) {
      setSaveError(
        'Kỳ nghỉ này không còn trong danh sách chờ đánh giá. Vui lòng tải lại danh sách.',
      );
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
          ? replying
            ? 'Đánh giá này đã được phản hồi. Vui lòng đóng và tải lại danh sách.'
            : 'Kỳ nghỉ này đã được đánh giá hoặc chưa hoàn tất trả phòng. Vui lòng đóng và tải lại danh sách.'
          : status === 403
            ? 'Bạn không có quyền gửi nội dung cho kỳ nghỉ này. Vui lòng kiểm tra tài khoản đang đăng nhập.'
            : status === 400
              ? 'Nội dung phải có 5–2000 ký tự, số sao từ 1 đến 5.'
              : status === 503
                ? 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.'
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
        <Modal.Title>{replying ? 'Phản hồi khách hàng' : 'Đánh giá kỳ nghỉ của bạn'}</Modal.Title>
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
              {bookings.loading && <p role="status">Đang tải các kỳ nghỉ của bạn…</p>}
              {bookings.error && <Alert variant="danger">{bookings.error}</Alert>}
              {!bookings.loading && !bookings.error && !bookings.items.length && (
                <Alert variant="info">
                  Bạn chưa có kỳ nghỉ nào chờ đánh giá. Bạn có thể viết đánh giá sau khi hoàn tất
                  trả phòng, nếu chưa gửi đánh giá cho kỳ nghỉ đó.
                </Alert>
              )}
              <fieldset
                disabled={
                  isSubmitting || bookings.loading || !!bookings.error || !bookings.items.length
                }
              >
                <Form.Group controlId="feedback-booking" className="mb-3">
                  {fixedStay ? (
                    <>
                      <input type="hidden" {...register('bookingId')} />
                      <div
                        className="bg-light border rounded p-3"
                        aria-label="Kỳ nghỉ được đánh giá"
                      >
                        <strong>{selectedStay.hotelName}</strong>
                        <div>Trả phòng ngày {stayDate(selectedStay.checkOutDate)}</div>
                        <small className="text-muted text-break">
                          Mã đặt phòng: {selectedStay.bookingCode}
                        </small>
                      </div>
                      {errors.bookingId && (
                        <div className="text-danger" role="alert">
                          {errors.bookingId.message}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <Form.Label>Chọn kỳ nghỉ</Form.Label>
                      <Form.Select {...register('bookingId')} isInvalid={!!errors.bookingId}>
                        <option value="">-- Chọn kỳ nghỉ --</option>
                        {bookings.items.map((booking) => (
                          <option key={booking.id} value={booking.id}>
                            Trả phòng {stayDate(booking.checkOutDate)} · {booking.bookingCode}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.bookingId?.message}
                      </Form.Control.Feedback>
                    </>
                  )}
                </Form.Group>
                <Form.Group controlId="feedback-rating" className="mb-3">
                  <Form.Label>Mức độ hài lòng</Form.Label>
                  <Form.Select {...register('rating')} isInvalid={!!errors.rating}>
                    <option value="">-- Chọn mức độ hài lòng --</option>
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} sao — {ratingLabels[rating]}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.rating?.message}
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group controlId="feedback-comment">
                  <Form.Label>Nhận xét của bạn</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    maxLength={2000}
                    placeholder="Điều gì khiến bạn hài lòng hoặc cần cải thiện?"
                    aria-describedby="feedback-comment-help"
                    {...register('comment')}
                    isInvalid={!!errors.comment}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.comment?.message}
                  </Form.Control.Feedback>
                  <Form.Text id="feedback-comment-help">{comment.length}/2.000 ký tự</Form.Text>
                </Form.Group>
              </fieldset>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {!replying && (bookings.error || saveError) && (
            <Button
              variant="outline-secondary"
              disabled={isSubmitting || bookings.loading}
              onClick={() => {
                setBookings({ items: [], loading: true, error: null });
                setAttempt((value) => value + 1);
              }}
            >
              Tải lại danh sách kỳ nghỉ
            </Button>
          )}
          <Button variant="secondary" disabled={isSubmitting} onClick={onClose}>
            Để sau
          </Button>
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              (!replying && (bookings.loading || !!bookings.error || !bookings.items.length))
            }
          >
            {isSubmitting ? 'Đang gửi…' : replying ? 'Gửi phản hồi' : 'Gửi đánh giá'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
