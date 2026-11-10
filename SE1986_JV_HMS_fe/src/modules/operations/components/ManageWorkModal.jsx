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
  const submit = async (event) => {
    event.preventDefault();
    if (saving.current || !state.data) return;
    if (reason.trim().length < 5) {
      setState((old) => ({ ...old, error: 'Vui lòng nhập lý do từ 5 đến 1.000 ký tự.' }));
      return;
    }
    if (action === 'REASSIGN' && !staffId) {
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
          error.response?.status === 409
            ? 'Dữ liệu đã thay đổi. Hãy đóng và mở lại trước khi tiếp tục.'
            : 'Không lưu được thay đổi. Kiểm tra quyền và nhân viên rồi thử lại.',
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
            ? 'Lịch sử điều chỉnh'
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
              <fieldset disabled={busy || !state.data.canChange}>
                <Form.Group className="mb-3">
                  <Form.Label>Thao tác</Form.Label>
                  <Form.Select value={action} onChange={(e) => setAction(e.target.value)}>
                    <option value="REASSIGN">Giao cho nhân viên khác</option>
                    {kind === 'tasks' && <option value="CANCEL">Hủy công việc</option>}
                  </Form.Select>
                </Form.Group>
                {action === 'REASSIGN' && (
                  <Form.Group className="mb-3">
                    <Form.Label>Nhân viên mới</Form.Label>
                    <Form.Select
                      required
                      value={staffId}
                      onChange={(e) => setStaffId(e.target.value)}
                    >
                      <option value="">Chọn nhân viên</option>
                      {state.data.staff
                        .filter((staff) => staff.id !== state.data.work.staffId)
                        .map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.fullName}
                          </option>
                        ))}
                    </Form.Select>
                    <Form.Text>Chỉ hiển thị nhân viên buồng phòng đang hoạt động.</Form.Text>
                  </Form.Group>
                )}
                {state.data.work.status === 'IN_PROGRESS' && action === 'REASSIGN' && (
                  <Alert variant="info">
                    Giữ trạng thái đang thực hiện và thời điểm bắt đầu. Nhân viên mới tiếp tục công
                    việc đã được bàn giao.
                  </Alert>
                )}
                {action === 'CANCEL' && (
                  <Alert variant="warning">
                    Công việc sẽ chuyển sang Đã hủy. Thao tác này không thay đổi trạng thái phòng.
                  </Alert>
                )}
                <Form.Group>
                  <Form.Label>Lý do {action === 'CANCEL' ? 'hủy' : 'bàn giao'}</Form.Label>
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
              {!!state.data.history.length && (
                <section className="mt-3">
                  <h3 className="h6">Lịch sử điều chỉnh</h3>
                  {state.data.history.map((entry, index) => (
                    <div key={index} className="border-top py-2 small">
                      <strong>{entry.action === 'CANCEL' ? 'Hủy công việc' : 'Giao lại'}</strong> ·{' '}
                      {entry.actor} · {new Date(entry.createdAt).toLocaleString('vi-VN')}
                      <div>
                        {entry.previousStaff || 'Chưa phân công'} → {entry.newStaff || 'Không có'}
                      </div>
                      <div className="text-break">{entry.reason}</div>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Đóng
          </Button>
          <Button type="submit" disabled={busy || !state.data?.canChange}>
            {busy ? 'Đang lưu…' : 'Xác nhận'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
