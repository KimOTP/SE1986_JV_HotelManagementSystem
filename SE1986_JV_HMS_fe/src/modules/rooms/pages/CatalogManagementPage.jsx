/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { Eye, Pencil, PlusLg, Trash } from 'react-bootstrap-icons';
import { roomsApi } from '../api/roomsApi';
import { PAGE_SIZE } from '../constants/roomConstants';
import { currency, imageOrFallback, normalize } from '../utils/roomUtils';
import { ActiveBadge, ErrorState, LoadingState, Pager, StatusBadge } from '../components/Common';
import RoomTypeForm from '../components/RoomTypeForm';
import RoomForm from '../components/RoomForm';
import AmenityForm from '../components/AmenityForm';
import AmenityIcon from '../components/AmenityIcon';
import CatalogDetailView from '../components/CatalogDetailView';

const settings = {
  roomTypes: { title: 'Loại phòng', singular: 'loại phòng' },
  rooms: { title: 'Phòng', singular: 'phòng' },
  amenities: { title: 'Tiện nghi', singular: 'tiện nghi' },
};
export default function CatalogManagementPage({ kind }) {
  const meta = settings[kind];
  const [all, setAll] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(''),
    [active, setActive] = useState('ALL'),
    [floor, setFloor] = useState('ALL'),
    [roomTypeFilter, setRoomTypeFilter] = useState('ALL'),
    [status, setStatus] = useState('ALL'),
    [page, setPage] = useState(1),
    [modal, setModal] = useState(null),
    [selected, setSelected] = useState(null),
    [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState(''),
    [notice, setNotice] = useState(null);
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setAll(await roomsApi.getAll());
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };
  // Load/reload is intentionally imperative because the repository may be mock or HTTP.
  useEffect(() => {
    load();
  }, [kind]);
  const values = useMemo(() => {
    if (!all) return [];
    return all[kind].filter((x) => {
      const label = kind === 'rooms' ? x.roomNumber : x.name;
      return (
        (!query || normalize(label).includes(normalize(query))) &&
        (active === 'ALL' || String(x.isActive) === active) &&
        (kind !== 'rooms' || floor === 'ALL' || String(x.floor) === floor) &&
        (kind !== 'rooms' || roomTypeFilter === 'ALL' || x.roomTypeId === roomTypeFilter) &&
        (kind !== 'rooms' || status === 'ALL' || x.operationalStatus === status)
      );
    });
  }, [all, kind, query, active, floor, roomTypeFilter, status]);
  const pages = Math.max(1, Math.ceil(values.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = values.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const roomType = (id) => all.roomTypes.find((t) => t.id === id)?.name || 'Không xác định';
  const filter = (setter, value) => {
    setter(value);
    setPage(1);
  };
  const open = (type, item = null) => {
    setSelected(item);
    setSaveError('');
    setModal(type);
  };
  const save = async (value) => {
    setSaving(true);
    setSaveError('');
    try {
      if (kind === 'rooms' && value.id && !value.isActive && value.operationalStatus === 'OCCUPIED')
        throw new Error('Phòng đang có khách không thể ngừng sử dụng.');
      await roomsApi.save(kind, value);
      setModal(null);
      setNotice({ type: 'success', text: `Đã lưu ${meta.singular}.` });
      await load();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await roomsApi.remove(kind, selected.id);
      setModal(null);
      setNotice({ type: 'success', text: `Đã xóa ${meta.singular}.` });
      await load();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const resetFilters = () => {
    setQuery('');
    setActive('ALL');
    setFloor('ALL');
    setRoomTypeFilter('ALL');
    setStatus('ALL');
    setPage(1);
  };
  const headers =
    kind === 'roomTypes'
      ? ['Ảnh', 'Tên', 'Giá/đêm', 'Sức chứa', 'Trạng thái', 'Thao tác']
      : kind === 'rooms'
        ? ['Số phòng', 'Tầng', 'Loại phòng', 'Sử dụng', 'Vận hành', 'Thao tác']
        : ['Icon', 'Tên', 'Mô tả', 'Trạng thái', 'Thao tác'];
  const actions = (x) => (
    <td className="text-nowrap">
      <Button
        size="sm"
        variant="outline-secondary"
        className="me-1"
        aria-label="Xem"
        onClick={() => open('view', x)}
      >
        <Eye />
      </Button>
      <Button
        size="sm"
        variant="outline-primary"
        className="me-1"
        aria-label="Sửa"
        onClick={() => open('edit', x)}
      >
        <Pencil />
      </Button>
      <Button size="sm" variant="outline-danger" aria-label="Xóa" onClick={() => open('delete', x)}>
        <Trash />
      </Button>
    </td>
  );
  const row = (x) => {
    if (kind === 'roomTypes')
      return (
        <tr key={x.id}>
          <td>
            <img src={imageOrFallback(x.images)} className="catalog-thumb" alt="" />
          </td>
          <td className="fw-semibold">{x.name}</td>
          <td>{currency(x.basePrice)}</td>
          <td>{x.capacity} khách</td>
          <td>
            <ActiveBadge active={x.isActive} />
          </td>
          {actions(x)}
        </tr>
      );
    if (kind === 'rooms')
      return (
        <tr key={x.id}>
          <td className="fw-semibold">{x.roomNumber}</td>
          <td>{x.floor}</td>
          <td>{roomType(x.roomTypeId)}</td>
          <td>
            <ActiveBadge active={x.isActive} />
          </td>
          <td>
            <StatusBadge status={x.operationalStatus} />
          </td>
          {actions(x)}
        </tr>
      );
    return (
      <tr key={x.id}>
        <td>
          <AmenityIcon iconKey={x.iconKey} />
        </td>
        <td className="fw-semibold">{x.name}</td>
        <td>{x.description}</td>
        <td>
          <ActiveBadge active={x.isActive} />
        </td>
        {actions(x)}
      </tr>
    );
  };
  if (loading && !all) return <LoadingState />;
  if (error && !all) return <ErrorState message={error} onRetry={load} />;
  return (
    <div className="rooms-module">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="mb-1">Quản lý {meta.title.toLowerCase()}</h2>
          <div className="text-muted">Danh mục Room Catalog</div>
        </div>
        <Button onClick={() => open('edit')}>
          <PlusLg className="me-2" />
          Thêm {meta.singular}
        </Button>
      </div>
      {notice && (
        <Alert variant={notice.type} dismissible onClose={() => setNotice(null)}>
          {notice.text}
        </Alert>
      )}
      {error && <ErrorState message={error} onRetry={load} />}
      <Card className="mb-3">
        <Card.Body>
          <Row className="g-2">
            <Col md={kind === 'rooms' ? 3 : 8}>
              <Form.Label>Tìm kiếm</Form.Label>
              <Form.Control
                value={query}
                onChange={(e) => filter(setQuery, e.target.value)}
                placeholder={kind === 'rooms' ? 'Nhập số phòng' : 'Nhập tên'}
              />
            </Col>
            <Col md={kind === 'rooms' ? 2 : 4}>
              <Form.Label>Hoạt động</Form.Label>
              <Form.Select value={active} onChange={(e) => filter(setActive, e.target.value)}>
                <option value="ALL">Tất cả</option>
                <option value="true">Hoạt động</option>
                <option value="false">Ngừng hoạt động</option>
              </Form.Select>
            </Col>
            {kind === 'rooms' && (
              <>
                <Col md={2}>
                  <Form.Label>Tầng</Form.Label>
                  <Form.Select value={floor} onChange={(e) => filter(setFloor, e.target.value)}>
                    <option value="ALL">Tất cả</option>
                    {[...new Set(all.rooms.map((r) => r.floor))]
                      .sort((a, b) => a - b)
                      .map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label>Loại phòng</Form.Label>
                  <Form.Select
                    value={roomTypeFilter}
                    onChange={(e) => filter(setRoomTypeFilter, e.target.value)}
                  >
                    <option value="ALL">Tất cả</option>
                    {all.roomTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={2}>
                  <Form.Label>Vận hành</Form.Label>
                  <Form.Select value={status} onChange={(e) => filter(setStatus, e.target.value)}>
                    <option value="ALL">Tất cả</option>
                    {['READY', 'OCCUPIED', 'DIRTY', 'MAINTENANCE'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              </>
            )}
          </Row>
          <Button variant="link" className="px-0 mt-2" onClick={resetFilters}>
            Đặt lại bộ lọc
          </Button>
        </Card.Body>
      </Card>
      <div className="table-responsive">
        <Table hover bordered className="align-middle bg-white">
          <thead className="table-light">
            <tr>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length ? (
              shown.map(row)
            ) : (
              <tr>
                <td colSpan={headers.length} className="text-center text-muted py-4">
                  0 kết quả phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
      <Pager
        page={current}
        total={pages}
        onChange={setPage}
        count={values.length}
        start={values.length ? (current - 1) * PAGE_SIZE + 1 : 0}
        end={Math.min(current * PAGE_SIZE, values.length)}
      />
      <Modal
        show={!!modal}
        onHide={() => !saving && setModal(null)}
        size={kind === 'roomTypes' ? 'lg' : undefined}
        centered
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {modal === 'edit'
              ? selected
                ? 'Sửa'
                : 'Thêm'
              : modal === 'view'
                ? 'Chi tiết'
                : 'Xác nhận xóa'}{' '}
            {meta.singular}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modal === 'edit' && kind === 'roomTypes' && (
            <RoomTypeForm
              item={selected}
              amenities={all.amenities}
              onSave={save}
              onCancel={() => setModal(null)}
              saving={saving}
              saveError={saveError}
            />
          )}{' '}
          {modal === 'edit' && kind === 'rooms' && (
            <RoomForm
              item={selected}
              roomTypes={all.roomTypes}
              onSave={save}
              onCancel={() => setModal(null)}
              saving={saving}
              saveError={saveError}
            />
          )}{' '}
          {modal === 'edit' && kind === 'amenities' && (
            <AmenityForm
              item={selected}
              onSave={save}
              onCancel={() => setModal(null)}
              saving={saving}
              saveError={saveError}
            />
          )}{' '}
          {modal === 'view' && selected && (
            <CatalogDetailView
              kind={kind}
              item={selected}
              roomTypes={all.roomTypes}
              amenities={all.amenities}
            />
          )}{' '}
          {modal === 'delete' && selected && (
            <>
              <p>
                Bạn muốn xóa <strong>{selected.name || selected.roomNumber}</strong>?
              </p>
              <p className="text-muted">
                Nếu đang được tham chiếu, hệ thống sẽ chặn xóa. Bạn có thể sửa và chuyển sang ngừng
                hoạt động.
              </p>
              {saveError && <Alert variant="danger">{saveError}</Alert>}
              <div className="d-flex justify-content-end gap-2">
                <Button variant="secondary" onClick={() => setModal(null)}>
                  Hủy
                </Button>
                <Button variant="danger" onClick={remove} disabled={saving}>
                  {saving ? 'Đang xử lý…' : 'Xóa'}
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
