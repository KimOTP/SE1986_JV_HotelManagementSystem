import { Badge, Col, ListGroup, Row } from 'react-bootstrap';
import { Building, People, Rulers } from 'react-bootstrap-icons';
import { ActiveBadge, StatusBadge } from './Common';
import AmenityIcon from './AmenityIcon';
import RoomGallery from './RoomGallery';
import { currency } from '../utils/roomUtils';

function DetailRow({ label, children }) {
  return (
    <ListGroup.Item className="d-flex justify-content-between gap-3 px-0">
      <span className="text-muted">{label}</span>
      <span className="text-end fw-medium">{children}</span>
    </ListGroup.Item>
  );
}

function AmenityDetail({ item }) {
  return (
    <div className="text-center">
      <div className="catalog-detail-icon mx-auto mb-3">
        <AmenityIcon iconKey={item.iconKey} size={36} />
      </div>
      <h4 className="mb-1">{item.name}</h4>
      <div className="mb-4">
        <ActiveBadge active={item.isActive} />
      </div>
      <div className="text-start rounded border bg-light p-3">
        <div className="text-muted small mb-1">Mô tả</div>
        <p className="mb-0">{item.description || 'Chưa có mô tả.'}</p>
      </div>
    </div>
  );
}

function RoomDetail({ item, roomTypes }) {
  const type = roomTypes.find((roomType) => roomType.id === item.roomTypeId);

  return (
    <div>
      <div className="d-flex align-items-center gap-3 mb-3">
        <div className="catalog-detail-icon">
          <Building size={34} />
        </div>
        <div>
          <div className="text-muted small">Phòng</div>
          <h4 className="mb-0">{item.roomNumber}</h4>
        </div>
      </div>
      <ListGroup variant="flush">
        <DetailRow label="Tầng">{item.floor}</DetailRow>
        <DetailRow label="Loại phòng">{type?.name || 'Không xác định'}</DetailRow>
        <DetailRow label="Trạng thái sử dụng">
          <ActiveBadge active={item.isActive} />
        </DetailRow>
        <DetailRow label="Trạng thái vận hành">
          <StatusBadge status={item.operationalStatus} />
        </DetailRow>
        <DetailRow label="Ghi chú">{item.notes || 'Không có'}</DetailRow>
      </ListGroup>
    </div>
  );
}

function RoomTypeDetail({ item, amenities }) {
  const assignedAmenities = item.amenityIds
    .map((id) => amenities.find((amenity) => amenity.id === id))
    .filter(Boolean);

  return (
    <Row className="g-4">
      <Col md={6}>
        <RoomGallery images={item.images} />
      </Col>
      <Col md={6}>
        <div className="d-flex justify-content-between align-items-start gap-2">
          <h4>{item.name}</h4>
          <ActiveBadge active={item.isActive} />
        </div>
        <p className="text-muted">{item.description || 'Chưa có mô tả.'}</p>
        <ListGroup variant="flush" className="mb-3">
          <DetailRow label="Giá mỗi đêm">{currency(item.basePrice)}</DetailRow>
          <DetailRow label="Sức chứa">
            <People className="me-1" /> {item.capacity} khách
          </DetailRow>
          <DetailRow label="Diện tích">
            <Rulers className="me-1" /> {item.area ? `${item.area} m²` : 'Chưa cập nhật'}
          </DetailRow>
          <DetailRow label="Loại giường">{item.bedType}</DetailRow>
        </ListGroup>
        <div className="text-muted small mb-2">Tiện nghi</div>
        <div className="d-flex flex-wrap gap-2">
          {assignedAmenities.length ? (
            assignedAmenities.map((amenity) => (
              <Badge bg="light" text="dark" className="border py-2" key={amenity.id}>
                <AmenityIcon iconKey={amenity.iconKey} /> {amenity.name}
              </Badge>
            ))
          ) : (
            <span className="text-muted">Chưa gán tiện nghi.</span>
          )}
        </div>
      </Col>
    </Row>
  );
}

export default function CatalogDetailView({ kind, item, roomTypes, amenities }) {
  if (kind === 'amenities') return <AmenityDetail item={item} />;
  if (kind === 'rooms') return <RoomDetail item={item} roomTypes={roomTypes} />;
  return <RoomTypeDetail item={item} amenities={amenities} />;
}
