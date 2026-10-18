# Module C – Bookings

## Use cases and routes

| UC                                     | Screen                | Route                             |
| -------------------------------------- | --------------------- | --------------------------------- |
| UC-C1 Create Booking (PENDING)         | Booking Form          | `/bookings/new`                   |
| UC-C2 Make Deposit Payment             | Deposit Page          | `/bookings/deposit?bookingId=...` |
| UC-C3 View Booking History             | My Bookings           | `/bookings`                       |
| UC-C4 Cancel Booking                   | Cancel Confirm        | `/bookings/:id/cancel`            |
| UC-C5 Manage Bookings (Admin/Manager)  | Booking List + Filter | `/admin/bookings`                 |
| UC-C6 Booking Detail & Status Timeline | Booking Detail        | `/bookings/:id`                   |

Room search hands the selected room type, dates and guest count to `/rooms/booking-handoff`. The handoff now leads to the booking form; the form loads active room types through `roomsApi`, checks availability again before creating a booking, and returns to the booking detail.

## Demo behavior and boundaries

- Booking records use the separate `se1986.moduleC.bookings.v1` localStorage key and do not write to the Room Catalog or other module stores.
- The demo deposit is 30% of the estimated room total. Selecting a payment method only changes the local demo status from `PENDING` to `CONFIRMED`; no payment provider, charge or refund is involved.
- New demo bookings hold their requested room count for overlapping dates while `PENDING` or `CONFIRMED`. Cancelling releases that demo hold.
- The customer details are editable demo data. Authentication, customer ownership, backend persistence, authoritative inventory holds, cancellation policy and deposit percentage still require agreed API/business contracts. Demo role checks are UI navigation guards, not security controls.
- The management route is restricted to Admin/Manager in the existing development role selector. In API mode, do not treat this frontend-only check as authorization.

## Validation

The form validates stay dates, guest count, room capacity and requested room count; it rechecks inventory before creating the pending booking. Payment and cancellation reject invalid status transitions. The detail page shows the recorded status timeline. All booking operations remain in the booking demo store.

Run from `SE1986_JV_HMS_fe`:

```bash
npm run lint
npm run build
```
