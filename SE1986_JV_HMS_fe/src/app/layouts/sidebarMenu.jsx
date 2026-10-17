export const sidebarMenu = [
  {
    groupLabel: "DASHBOARD", 
    items: [
      // { label: "Overview", to: "/dashboard" }, 
    ]
  },
  {
    groupLabel: "HOUSEKEEPING",
    items: [
      { label: "Operations Dashboard", to: "/operations/dashboard" },
      { label: "Task Board", to: "/operations/tasks" },
      { label: "My Tasks", to: "/operations/my-tasks" },
    ]
  },
  {
    groupLabel: "SERVICES & FEEDBACK",
    items: [
      { label: "Issue Reports", to: "/operations/issues" },
      { label: "Guest Feedback", to: "/operations/feedbacks" },
    ]
  },
  // --- DÀNH CHO CÁC BẠN KHÁC ---
  {
    groupLabel: "FRONT DESK",
    items: [
       // { label: "Check-in / Check-out", to: "/frontdesk" },
    ]
  },
  {
    groupLabel: "BOOKINGS",
    items: [
       // { label: "Reservations", to: "/bookings" },
    ]
  },
  {
    groupLabel: "ROOM CATALOG",
    items: [
       // { label: "Manage Rooms", to: "/rooms" },
    ]
  },
  {
    groupLabel: "SYSTEM",
    items: [
       // { label: "User Management", to: "/admin/users" },
    ]
  }
];