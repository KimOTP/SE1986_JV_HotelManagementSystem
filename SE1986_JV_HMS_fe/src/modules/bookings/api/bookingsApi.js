import { bookingsHttpRepository } from './bookingsHttpRepository';

// mock (mặc định, dữ liệu localStorage) hoặc api (Spring Boot).
// Đặt VITE_BOOKING_DATA_SOURCE=api để dùng backend thật.
export const bookingsDataSource = (
  import.meta.env.VITE_BOOKING_DATA_SOURCE || 'mock'
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
        ['listMine', 'listAll', 'getByCode', 'create', 'cancel', 'payDeposit'].map(
          (method) => [method, mockCall(method)],
        ),
      );

export const bookingsApi = repository;
export default bookingsApi;
