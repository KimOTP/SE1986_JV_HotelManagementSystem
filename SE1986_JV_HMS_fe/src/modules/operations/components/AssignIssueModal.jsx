import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { assignIssue, getAssignmentContext, getIssueAssignees } from '../api/issueAssignmentsApi';

const schema = z.object({
  staffId: z
    .string()
    .regex(/^[1-9]\d*$/, 'Vui lòng chọn nhân viên')
    .transform(Number)
    .refine(Number.isSafeInteger, 'ID không hợp lệ'),
});
const requestError = (error) => {
  switch (error.response?.status) {
    case 400:
      return 'Nhân viên không còn hợp lệ. Vui lòng tải lại danh sách.';
    case 403:
      return 'Manager cấu hình không quản lý khách sạn của sự cố này.';
    case 404:
      return 'Không tìm thấy sự cố hoặc phòng/khách sạn đã ngừng hoạt động.';
    case 409:
      return 'Sự cố đã được phân công hoặc đã đổi trạng thái. Đóng hộp thoại và tải lại bảng.';
    case 503:
      return 'Chưa bật local-demo hoặc manager cấu hình không hợp lệ.';
    default:
      return 'Chưa xác nhận được kết quả. Kiểm tra lại bảng trước khi thử phân công lại.';
  }
};

export default function AssignIssueModal({ issue, onClose, onAssigned }) {
  const [data, setData] = useState({ loading: true, items: [], context: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const [saveError, setSaveError] = useState(null);
  const saving = useRef(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { staffId: '' },
  });
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const context = await getAssignmentContext(controller.signal);
        const items = context.enabled ? await getIssueAssignees(issue.id, controller.signal) : [];
        if (!controller.signal.aborted) setData({ loading: false, context, items, error: null });
      } catch (error) {
        if (!controller.signal.aborted)
          setData({ loading: false, context: null, items: [], error: requestError(error) });
      }
    };
    load();
    return () => controller.abort();
  }, [issue.id, attempt]);

  const submit = async ({ staffId }) => {
    if (saving.current || !data.context?.enabled || data.loading) return;
    setSaveError(null);
    if (!data.items.some((staff) => staff.id === staffId)) {
      setSaveError('Vui lòng chọn nhân viên trong danh sách.');
      return;
    }
    saving.current = true;
    try {
      const response = await assignIssue(issue.id, staffId);
      onAssigned(response);
    } catch (error) {
      setSaveError(requestError(error));
    } finally {
      saving.current = false;
    }
  };
  const retry = () => {
    reset({ staffId: '' });
    setSaveError(null);
    setData({ loading: true, items: [], context: null, error: null });
    setAttempt((value) => value + 1);
  };
  return (
    <Modal
      show
      onHide={() => {
        if (!isSubmitting) onClose();
      }}
      backdrop={isSubmitting ? 'static' : true}
      keyboard={!isSubmitting}
      centered
    >
      <Modal.Header closeButton={!isSubmitting}>
        <Modal.Title>
          Phân công sự cố #{issue.id} — Phòng {issue.roomNumber}
        </Modal.Title>
      </Modal.Header>
      <Form noValidate onSubmit={(event) => handleSubmit(submit)(event)}>
        <Modal.Body>
          <p className="text-break">{issue.title}</p>
          {data.loading && (
            <Alert variant="info" role="status">
              Đang tải nhân viên...
            </Alert>
          )}
          {data.context && (
            <Alert variant={data.context.enabled ? 'info' : 'warning'}>
              {data.context.message}
              {data.context.enabled && (
                <div>
                  Người phân công local: <strong>{data.context.managerName}</strong>. Danh tính này
                  do backend cấu hình, chưa phải tài khoản React.
                </div>
              )}
            </Alert>
          )}
          {data.error && <Alert variant="danger">{data.error}</Alert>}
          {saveError && <Alert variant="danger">{saveError}</Alert>}
          {!data.loading && data.context?.enabled && !data.items.length && (
            <Alert variant="warning">Chưa có nhân viên STAFF hoạt động thuộc khách sạn này.</Alert>
          )}
          <Form.Group controlId="issue-assignee">
            <Form.Label>Nhân viên xử lý</Form.Label>
            <Form.Select
              {...register('staffId')}
              isInvalid={!!errors.staffId}
              disabled={
                isSubmitting || data.loading || !data.context?.enabled || !data.items.length
              }
            >
              <option value="">-- Chọn nhân viên --</option>
              {data.items.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.employeeCode} — {staff.fullName}
                </option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">{errors.staffId?.message}</Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={retry}
            disabled={isSubmitting || data.loading}
          >
            Tải lại nhân viên
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || data.loading || !data.context?.enabled || !data.items.length}
          >
            {isSubmitting ? 'Đang lưu...' : 'Xác nhận phân công'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
