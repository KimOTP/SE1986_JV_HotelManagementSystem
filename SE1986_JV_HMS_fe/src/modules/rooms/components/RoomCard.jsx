import { Badge, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router';
import { People, Rulers } from 'react-bootstrap-icons';
import { currency, imageOrFallback } from '../utils/roomUtils';
import AmenityIcon from './AmenityIcon';
export default function RoomCard({ roomType, amenities, query }) {
  const am = roomType.amenityIds.map((id) => amenities.find((a) => a.id === id)).filter(Boolean);
  return (
    <Card className="h-100 shadow-sm">
      <Card.Img
        variant="top"
        className="room-card-image"
        src={imageOrFallback(roomType.images)}
        onError={(e) => {
          e.currentTarget.style.visibility = 'hidden';
        }}
      />
      <Card.Body className="d-flex flex-column">
        <Card.Title>{roomType.name}</Card.Title>
        <Card.Text className="text-muted room-clamp">{roomType.description}</Card.Text>
        <div className="small mb-2">
          <People className="me-1" /> {roomType.capacity} khách <Rulers className="ms-3 me-1" />{' '}
          {roomType.area || '—'} m²
        </div>
        <div className="d-flex flex-wrap gap-1 mb-3">
          {am.slice(0, 4).map((a) => (
            <Badge bg="light" text="dark" key={a.id}>
              <AmenityIcon iconKey={a.iconKey} /> {a.name}
            </Badge>
          ))}
        </div>
        <div className="mt-auto d-flex justify-content-between align-items-end">
          <div>
            <strong className="text-primary fs-5">{currency(roomType.basePrice)}</strong>
            <small className="d-block text-muted">
              / đêm · còn {roomType.availableRooms} phòng
            </small>
          </div>
          <Button as={Link} to={`/rooms/${roomType.id}?${query}`}>
            Chi tiết
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
