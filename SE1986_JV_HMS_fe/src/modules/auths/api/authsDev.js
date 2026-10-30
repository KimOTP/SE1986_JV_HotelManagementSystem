import { authsApi } from './authsApi';

export async function loginAsAdmin() {
  return authsApi.login({
    email: 'admin@hotel.com',
    password: '123456',
  });
}

export async function loginAsManager() {
  return authsApi.login({
    email: 'manager@hotel.com',
    password: '123456',
  });
}

export async function loginAsReceptionist() {
  return authsApi.login({
    email: 'receptionist@hotel.com',
    password: '123456',
  });
}

export async function loginAsStaff() {
  return loginAsReceptionist();
}

export async function loginAsHousekeeper() {
  return authsApi.login({
    email: 'housekeeper@hotel.com',
    password: '123456',
  });
}

export async function loginAsCustomer() {
  return authsApi.login({
    email: 'customer@hotel.com',
    password: '123456',
  });
}