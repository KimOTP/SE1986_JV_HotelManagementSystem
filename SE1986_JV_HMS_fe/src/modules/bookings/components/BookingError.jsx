import { Alert } from 'react-bootstrap';

export default function BookingError({ error }) {
  return error ? <Alert variant="danger">{error}</Alert> : null;
}
