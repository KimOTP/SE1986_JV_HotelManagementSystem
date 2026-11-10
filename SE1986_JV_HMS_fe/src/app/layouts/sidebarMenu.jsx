import {
  BoxArrowInRight,
  BoxArrowRight,
  Calendar3,
  CalendarCheck,
  CalendarPlus,
  DoorClosed,
  DoorOpen,
  ExclamationTriangle,
  Grid3x3Gap,
  Kanban,
  Layers,
  People,
  PersonCheck,
  Receipt,
  ShieldLock,
  Speedometer2,
  Star,
  Wallet2,
  Wifi,
} from 'react-bootstrap-icons';

// Menu sidebar: mỗi nhóm là một block có divider phía trên (trừ nhóm đầu).
// `requiredPermission` là mã UC dùng cho phân quyền; `icon` là component
// react-bootstrap-icons để sidebar render thống nhất.
export const sidebarMenu = [
  {
    groupLabel: 'Dịch vụ & phản hồi',
    items: [
      {
        label: 'Yêu cầu hỗ trợ của tôi',
        to: '/operations/my-reports',
        icon: Headset,
        requiredPermission: 'UC-E4',
      },
      {
        label: 'Báo cáo sự cố',
        to: '/operations/report-issue',
        icon: ExclamationTriangle,
        requiredPermission: 'UC-E4',
      },
      {
        label: 'Đánh giá của khách',
        customerLabel: 'Đánh giá của tôi',
        to: '/operations/feedbacks',
        icon: Star,
        requiredPermission: 'UC-E6',
      },
    ],
  },
  {
    groupLabel: 'Đặt phòng',
    // Tiêu đề nhóm, không phải liên kết: chỉ hiển thị để phân khu chức năng.
    heading: { label: 'Đặt phòng', icon: DoorOpen },
    items: [
      {
        label: 'Tạo đặt phòng',
        to: '/bookings/new',
        icon: CalendarPlus,
        requiredPermission: 'UC-C1',
      },
      {
        label: 'Đặt phòng của tôi',
        to: '/bookings',
        icon: CalendarCheck,
        requiredPermission: 'UC-C3',
      },
      {
        label: 'Thanh toán tiền cọc',
        to: '/bookings/deposit',
        icon: Wallet2,
        requiredPermission: 'UC-C2',
      },
      {
        label: 'Quản lý đặt phòng',
        to: '/admin/bookings',
        icon: Calendar3,
        requiredPermission: 'UC-C5',
      },
    ],
  },
  {
    groupLabel: 'Buồng phòng',
    items: [
      {
        label: 'Tổng quan vận hành',
        to: '/operations/dashboard',
        icon: Speedometer2,
        requiredPermission: 'UC-E3',
      },
      {
        label: 'Bảng công việc',
        to: '/operations/tasks',
        icon: Kanban,
        requiredPermission: 'UC-E1',
      },
      {
        label: 'Công việc của tôi',
        to: '/operations/my-tasks',
        icon: PersonCheck,
        requiredPermission: 'UC-E2',
        requiredRoles: ['HOUSEKEEPER'],
      },
    ],
  },
  {
    groupLabel: 'Lễ tân',
    items: [
      {
        label: 'Check-in',
        to: '/frontdesk/check-in',
        icon: BoxArrowInRight,
        requiredPermission: 'UC-D1',
      },
      {
        label: 'Check-out',
        to: '/frontdesk/check-out',
        icon: BoxArrowRight,
        requiredPermission: 'UC-D2',
      },
      {
        label: 'Hóa đơn',
        to: '/frontdesk/invoices',
        icon: Receipt,
        requiredPermission: 'UC-D4',
      },
    ],
  },
  {
    groupLabel: 'Danh mục phòng',
    items: [
      {
        label: 'Loại phòng',
        to: '/admin/room-types',
        icon: Layers,
        requiredPermission: 'UC-B1',
      },
      {
        label: 'Phòng',
        to: '/admin/rooms',
        icon: DoorClosed,
        requiredPermission: 'UC-B2',
      },
      {
        label: 'Tiện nghi',
        to: '/admin/amenities',
        icon: Wifi,
        requiredPermission: 'UC-B3',
      },
      {
        label: 'Sơ đồ phòng',
        to: '/admin/room-map',
        icon: Grid3x3Gap,
        requiredPermission: 'UC-B6',
      },
    ],
  },
  {
    groupLabel: 'Hệ thống',
    items: [
      {
        label: 'Quản lý người dùng',
        to: '/users',
        icon: People,
        requiredPermission: 'UC-A5',
      },
      {
        label: 'Quản lý vai trò & quyền',
        to: '/admin/roles',
        icon: ShieldLock,
        requiredPermission: 'UC-A6',
      },
    ],
  },
];
