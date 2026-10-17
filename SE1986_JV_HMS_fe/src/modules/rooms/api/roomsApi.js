import { roomsMockRepository } from '../mocks/roomsMockRepository';
import { roomsHttpRepository } from './roomsHttpRepository';

export const roomsDataSource = (import.meta.env.VITE_ROOMS_DATA_SOURCE || 'mock').toLowerCase();
export const roomsApi = roomsDataSource === 'api' ? roomsHttpRepository : roomsMockRepository;
