import { roomsHttpRepository } from './roomsHttpRepository';

export const roomsDataSource = (import.meta.env.VITE_ROOMS_DATA_SOURCE || 'mock').toLowerCase();
// API mode never imports mock fixtures or initializes their localStorage.
let mock;
const mockCall =
  (method) =>
  async (...args) => {
    mock ??= import('../mocks/roomsMockRepository').then((module) => module.roomsMockRepository);
    const repository = await mock;
    return repository[method](...args);
  };
const repository =
  roomsDataSource === 'api'
    ? roomsHttpRepository
    : Object.fromEntries(
        ['getAll', 'list', 'getRoomType', 'save', 'remove', 'search', 'availability', 'reset'].map(
          (method) => [method, mockCall(method)],
        ),
      );
export const roomsApi = {
  ...repository,
  getCatalog: repository.getCatalog || (() => repository.getAll()),
  getMap: repository.getMap || (() => repository.getAll()),
};
