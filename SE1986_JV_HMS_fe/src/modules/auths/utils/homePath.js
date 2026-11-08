// Trang mặc định sau khi đăng nhập: màn hình đầu tiên mà tài khoản có quyền mở.
// Chọn theo quyền UC (không theo role) để không đưa người dùng vào trang 403.
const HOME_DESTINATIONS = [
  ['/users', 'UC-A5'],
  ['/bookings', 'UC-C3'],
  ['/operations/dashboard', 'UC-E3'],
  ['/operations/my-tasks', 'UC-E2'],
  ['/frontdesk/check-in', 'UC-D1'],
  ['/rooms', 'UC-B4'],
];

export function getHomePath(permissions = []) {
  const destination = HOME_DESTINATIONS.find(([, permission]) => permissions.includes(permission));
  return destination ? destination[0] : '/profile';
}
