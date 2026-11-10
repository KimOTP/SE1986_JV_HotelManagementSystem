import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import { changeWork, getWorkManagement } from '../api/followUpApi';
export default function ManageWorkModal({ kind, item, onClose, onSaved }) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [action, setAction] = useState('REASSIGN');
  const [staffId, setStaffId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    getWorkManagement(kind, item.id, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ loading: false, data, error: '' });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({
            loading: false,
            data: null,
            error: 'Không tải được thông tin. Hãy đóng và mở lại.',
          });
      });
    return () => controller.abort();
  }, [kind, item.id]);
  const replacements =
    state.data?.staff.filter((staff) => staff.id !== state.data.work.staffId) || [];
  const submit = async (event) => {
    event.preventDefault();
    if (saving.current || !state.data?.canChange) return;
    if (reason.trim().length < 5) {
      setState((old) => ({ ...old, error: 'Vui lòng nhập lý do từ 5 đến 1.000 ký tự.' }));
      return;
    }
    if (action === 'REASSIGN' && !replacements.some((staff) => staff.id === Number(staffId))) {
      setState((old) => ({ ...old, error: 'Hãy chọn nhân viên mới.' }));
      return;
    }
    saving.current = true;
    setBusy(true);
    setState((old) => ({ ...old, error: '' }));
    try {
      await changeWork(kind, item.id, {
        version: state.data.work.version,
        action,
        staffId: action === 'REASSIGN' ? Number(staffId) : null,
        reason: reason.trim(),
      });
      onSaved();
    } catch (error) {
      setState((old) => ({
        ...old,
        error:
          [400, 403, 409].includes(error.response?.status) && error.response?.data?.message
            ? error.response.data.message
            : 'Chưa xác nhận được kết quả lưu. Đóng và kiểm tra lại danh sách trước khi thử lại.',
      }));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return (
    <Modal
      show
      centered
      onHide={() => {
        if (!busy) onClose();
      }}
      backdrop={busy ? 'static' : true}
      keyboard={!busy}
    >
      <Modal.Header closeButton={!busy}>
        <Modal.Title>
          {state.data && !state.data.canChange
            ? 'Không thể điều chỉnh'
            : kind === 'tasks'
              ? 'Điều chỉnh công việc'
              : 'Giao lại sự cố'}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={submit}>
        <Modal.Body>
          <p className="text-break">{item.title}</p>
          {state.error && <Alert variant="danger">{state.error}</Alert>}
          {state.loading && <p role="status">Đang tải…</p>}
          {state.data && (
            <>
              {!state.data.canChange && (
                <Alert variant="info">
                  Công việc đã bắt đầu hoặc đã kết thúc. Không thể giao lại hay hủy; bạn có thể xem
                  lịch sử trong Chi tiết.
                </Alert>
              )}
              {state.data.canChange && (
                <fieldset disabled={busy}>
                  <Form.Group className="mb-3">
                    <Form.Label>Thao tác</Form.Label>
                    <Form.Select value={action} onChange={(e) => setAction(e.target.value)}>
                      <option value="REASSIGN">Giao cho nhân viên khác</option>
                      {kind === 'tasks' && state.data.canCancel && (
                        <option value="CANCEL">Hủy công việc</option>
                      )}
                    </Form.Select>
                  </Form.Group>
                  {action === 'REASSIGN' && (
                    <Form.Group className="mb-3">
                      <Form.Label>Nhân viên mới</Form.Label>
                      <Form.Select
                        required
                        disabled={!replacements.length}
                        value={staffId}
                        onChange={(e) => setStaffId(e.target.value)}
                      >
                        <option value="">Chọn nhân viên</option>
                        {replacements.map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.fullName}
                          </option>
                        ))}
                      </Form.Select>
                      {!replacements.length && (
                        <Form.Text>
                          Hiện không có nhân viên khác để giao lại. Bạn có thể đóng và thử lại khi
                          có người phù hợp.
                        </Form.Text>
                      )}
                    </Form.Group>
                  )}

                  {kind === 'tasks' && state.data.canChange && !state.data.canCancel && (
                    <Form.Text className="d-block mb-3">
                      Công việc này gắn với sự cố. Giao lại sẽ chuyển cả công việc và sự cố cho nhân
                      viên mới.
                    </Form.Text>
                  )}
                  {action === 'CANCEL' && (
                    <Alert variant="warning">
                      Công việc sẽ chuyển sang Đã hủy. Thao tác này không thay đổi trạng thái phòng.
                    </Alert>
                  )}
                  <Form.Group>
                    <Form.Label>Lý do {action === 'CANCEL' ? 'hủy' : 'giao lại'}</Form.Label>
                    <Form.Control
                      required
                      as="textarea"
                      rows={3}
                      minLength={5}
                      maxLength={1000}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </Form.Group>
                </fieldset>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Đóng
          </Button>
          <Button
            type="submit"
            disabled={
              busy || !state.data?.canChange || (action === 'REASSIGN' && !replacements.length)
            }
          >
            {busy ? 'Đang lưu…' : 'Xác nhận'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
