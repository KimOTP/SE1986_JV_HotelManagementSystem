import { bookingsHttpRepository } from './bookingsHttpRepository';

// api (mặc định, Spring Boot) hoặc mock (dữ liệu localStorage).
// Đặt VITE_BOOKING_DATA_SOURCE=api để dùng backend thật.
export const bookingsDataSource = (
  import.meta.env.VITE_BOOKING_DATA_SOURCE || 'api'
).toLowerCase();

let mock;
const mockCall =
  (method) =>
  async (...args) => {
    mock ??= import('./bookingsMockRepository').then(
      (module) => module.bookingsMockRepository,
    );
    const repository = await mock;
    return repository[method](...args);
  };

const repository =
  bookingsDataSource === 'api'
    ? bookingsHttpRepository
    : Object.fromEntries(
        ['listMine', 'listPendingDeposits', 'listAll', 'getByCode', 'create', 'cancel', 'payDeposit'].map(
          (method) => [method, mockCall(method)],
        ),
      );

export const bookingsApi = repository;

export async function collectBookingPages(listPage) {
  const size = 100;
  const items = [];
  for (let page = 0; ; page += 1) {
    const batch = await listPage({ page, size });
    items.push(...batch);
    if (batch.length < size) return items;
  }
}
export default bookingsApi;
