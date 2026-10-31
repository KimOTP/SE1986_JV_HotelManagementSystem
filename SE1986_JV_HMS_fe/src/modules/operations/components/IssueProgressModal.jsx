import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getIssueWorkContext, resolveIssue, startIssue } from '../api/issueProgressApi';
import { resolveIssueSchema } from '../schemas/resolveIssueSchema';

const errorMessage = (error) => {
  switch (error.response?.status) {
    case 400:
      return 'Ghi chú phải có 5–2000 ký tự sau khi bỏ khoảng trắng đầu/cuối.';
    case 403:
      return 'Nhân viên cấu hình tại backend không phải người được giao sự cố này hoặc không cùng khách sạn.';
    case 404:
      return 'Không tìm thấy sự cố hoặc phòng/khách sạn đã ngừng hoạt động.';
    case 409:
      return 'Sự cố đã đổi trạng thái hoặc phân công. Đóng hộp thoại và tải lại bảng trước khi tiếp tục.';
    case 503:
      return 'Chưa bật local-demo hoặc nhân viên cấu hình không có vai trò STAFF đang hoạt động.';
    default:
      return 'Chưa xác nhận được kết quả. Kiểm tra lại bảng trước khi gửi lại.';
  }
};

export default function IssueProgressModal({ issue, onClose, onUpdated }) {
  const completing = issue.status === 'IN_PROGRESS';
  const [context, setContext] = useState({ loading: true, value: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const [saveError, setSaveError] = useState(null);
  const saving = useRef(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: completing ? zodResolver(resolveIssueSchema) : undefined,
    defaultValues: { resolutionNote: '' },
  });
  useEffect(() => {
    const controller = new AbortController();
    getIssueWorkContext(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setContext({ loading: false, value, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setContext({ loading: false, value: null, error: errorMessage(error) });
      });
    return () => controller.abort();
  }, [attempt]);
  const isAssignee = context.value?.enabled && context.value.staffId === issue.assignedStaffId;
  const submit = async ({ resolutionNote }) => {
    if (saving.current || !isAssignee || context.loading) return;
    saving.current = true;
    setSaveError(null);
    try {
      const response = completing
        ? await resolveIssue(issue.id, resolutionNote)
        : await startIssue(issue.id);
      onUpdated(response);
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      saving.current = false;
    }
  };
  const retry = () => {
    setSaveError(null);
    setContext({ loading: true, value: null, error: null });
    setAttempt((value) => value + 1);
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
        <Modal.Title>
          {completing ? 'Hoàn tất' : 'Nhận xử lý'} sự cố #{issue.id}
        </Modal.Title>
      </Modal.Header>
      <Form noValidate onSubmit={(event) => handleSubmit(submit)(event)}>
        <Modal.Body>
          <p className="text-break">
            Phòng {issue.roomNumber}: {issue.title}
          </p>
          {context.loading && (
            <Alert variant="info" role="status">
              Đang kiểm tra nhân viên xử lý...
            </Alert>
          )}
          {context.error && <Alert variant="danger">{context.error}</Alert>}
          {context.value && (
            <Alert variant={context.value.enabled ? 'info' : 'warning'}>
              {context.value.message}
              {context.value.enabled && (
                <div>
                  Nhân viên local: <strong>{context.value.staffName}</strong>. Chưa phải tài khoản
                  React đang đăng nhập.
                </div>
              )}
            </Alert>
          )}
          {context.value?.enabled && !isAssignee && (
            <Alert variant="warning">
              Sự cố này không được giao cho nhân viên local đang cấu hình.
            </Alert>
          )}
          {saveError && <Alert variant="danger">{saveError}</Alert>}
          {completing ? (
            <Form.Group controlId="issue-resolution-note">
              <Form.Label>Ghi chú xử lý</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                maxLength={2000}
                {...register('resolutionNote')}
                isInvalid={!!errors.resolutionNote}
                disabled={isSubmitting || !isAssignee}
                placeholder="Mô tả công việc đã thực hiện để khắc phục sự cố..."
              />
              <Form.Control.Feedback type="invalid">
                {errors.resolutionNote?.message}
              </Form.Control.Feedback>
            </Form.Group>
          ) : (
            <p>Xác nhận nhận việc để chuyển sự cố từ Đã phân công sang Đang xử lý.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            disabled={isSubmitting || context.loading}
            onClick={retry}
          >
            Kiểm tra lại
          </Button>
          <Button variant="secondary" disabled={isSubmitting} onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" disabled={isSubmitting || context.loading || !isAssignee}>
            {isSubmitting ? 'Đang lưu...' : completing ? 'Xác nhận hoàn tất' : 'Xác nhận nhận việc'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
