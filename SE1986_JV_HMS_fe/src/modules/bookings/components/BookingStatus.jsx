import { BOOKING_STATUS } from '../utils/bookingUtils';

export default function BookingStatus({ status }) {
  const item = BOOKING_STATUS[status] || { label: status, className: 'is-neutral' };
  return <span className={`booking-status ${item.className}`}>{item.label}</span>;
}
