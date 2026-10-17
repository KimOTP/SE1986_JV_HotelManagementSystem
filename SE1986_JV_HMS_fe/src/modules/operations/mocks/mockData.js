// Dữ liệu giả cho Module E - sẽ thay bằng API sau
export const mockTasks = [
  // --- CỘT TO DO ---
  { id: 1, roomNumber: '101', type: 'Daily Clean', priority: 'High', status: 'TODO', assignedTo: 'Nguyễn Văn A', note: 'Khách trả phòng lúc 10h' },
  { id: 2, roomNumber: '102', type: 'Maintenance', priority: 'High', status: 'TODO', assignedTo: 'Nguyễn Văn A', note: 'Hỏng điều hòa' },
  { id: 3, roomNumber: '511', type: 'Deep Clean', priority: 'High', status: 'TODO', assignedTo: 'Nguyễn Văn A', note: 'Phòng VIP' },
  { id: 4, roomNumber: '402', type: 'Daily Clean', priority: 'Low', status: 'TODO', assignedTo: null, note: '' },
  { id: 5, roomNumber: '108', type: 'Daily Clean', priority: 'Medium', status: 'TODO', assignedTo: 'Trần Thị B', note: 'Khách vừa đi' },
  { id: 6, roomNumber: '210', type: 'Deep Clean', priority: 'High', status: 'TODO', assignedTo: null, note: '' },
  { id: 7, roomNumber: '315', type: 'Maintenance', priority: 'Low', status: 'TODO', assignedTo: 'Lê Văn C', note: 'Sửa vòi nước' },

  // --- CỘT IN PROGRESS ---
  { id: 8, roomNumber: '205', type: 'Deep Clean', priority: 'Medium', status: 'IN_PROGRESS', assignedTo: 'Nguyễn Văn A', note: '' },
  { id: 9, roomNumber: '405', type: 'Daily Clean', priority: 'Medium', status: 'IN_PROGRESS', assignedTo: 'Nguyễn Văn A', note: '' },
  { id: 10, roomNumber: '304', type: 'Maintenance', priority: 'Medium', status: 'IN_PROGRESS', assignedTo: 'Lê Văn C', note: '' },
  { id: 11, roomNumber: '201', type: 'Daily Clean', priority: 'Low', status: 'IN_PROGRESS', assignedTo: 'Trần Thị B', note: '' },
  { id: 12, roomNumber: '408', type: 'Deep Clean', priority: 'High', status: 'IN_PROGRESS', assignedTo: 'Nguyễn Văn A', note: 'Cần kiểm tra kỹ' },

  // --- CỘT DONE ---
  { id: 13, roomNumber: '310', type: 'Daily Clean', priority: 'Low', status: 'DONE', assignedTo: 'Nguyễn Văn A', note: 'Đã hoàn tất' },
  { id: 14, roomNumber: '203', type: 'Daily Clean', priority: 'Low', status: 'DONE', assignedTo: 'Trần Thị B', note: '' },
  { id: 15, roomNumber: '105', type: 'Deep Clean', priority: 'High', status: 'DONE', assignedTo: 'Nguyễn Văn A', note: '' },
  { id: 16, roomNumber: '401', type: 'Maintenance', priority: 'Medium', status: 'DONE', assignedTo: 'Lê Văn C', note: 'Đã thay bóng đèn' },
  { id: 17, roomNumber: '509', type: 'Daily Clean', priority: 'Medium', status: 'DONE', assignedTo: 'Nguyễn Văn A', note: '' },
  { id: 18, roomNumber: '112', type: 'Deep Clean', priority: 'High', status: 'DONE', assignedTo: 'Trần Thị B', note: '' },
];

export const mockIssues = [
  { id: 1, roomNumber: '102', category: 'Plumbing', description: 'Vòi nước bị rò rỉ', status: 'OPEN', reportedBy: 'Khách hàng', assignedTo: null, createdAt: '2026-10-15' },
  { id: 2, roomNumber: '204', category: 'Electrical', description: 'Đèn phòng tắm không sáng', status: 'RESOLVED', reportedBy: 'Nhân viên dọn phòng', assignedTo: 'Nguyễn Văn A', createdAt: '2026-10-14' },
  { id: 3, roomNumber: '305', category: 'Furniture', description: 'Hỏng tay nắm cửa', status: 'OPEN', reportedBy: 'Khách hàng', assignedTo: null, createdAt: '2026-10-16' },
  { id: 4, roomNumber: '108', category: 'Plumbing', description: 'Bồn cầu bị tắc', status: 'IN_PROGRESS', reportedBy: 'Khách hàng', assignedTo: 'Lê Văn C', createdAt: '2026-10-16' },
  { id: 5, roomNumber: '401', category: 'Electrical', description: 'Điều hòa kêu to', status: 'OPEN', reportedBy: 'Nhân viên dọn phòng', assignedTo: null, createdAt: '2026-10-17' },
  { id: 6, roomNumber: '512', category: 'Other', description: 'Cửa sổ không đóng được', status: 'RESOLVED', reportedBy: 'Khách hàng', assignedTo: 'Trần Thị B', createdAt: '2026-10-12' },
];

export const mockFeedbacks = [
  { id: 1, guestName: 'Nguyễn Văn Khách', rating: 5, comment: 'Phòng rất sạch sẽ, nhân viên thân thiện!', reply: 'Cảm ơn quý khách đã ủng hộ!', createdAt: '2026-10-10', status: 'REPLIED' },
  { id: 2, guestName: 'Trần Thị Khách', rating: 3, comment: 'Phòng hơi ồn vào buổi tối.', reply: null, createdAt: '2026-10-12', status: 'PENDING' },
  { id: 3, guestName: 'Lê Văn Khách', rating: 4, comment: 'Đồ ăn sáng ngon, nhưng wifi hơi yếu.', reply: null, createdAt: '2026-10-14', status: 'PENDING' },
  { id: 4, guestName: 'Phạm Thị Khách', rating: 1, comment: 'Thái độ nhân viên lễ tân không tốt.', reply: 'Chúng tôi thành thật xin lỗi và đã nhắc nhở.', createdAt: '2026-10-15', status: 'REPLIED' },
  { id: 5, guestName: 'Hoàng Văn Khách', rating: 5, comment: 'Tuyệt vời, sẽ quay lại!', reply: null, createdAt: '2026-10-16', status: 'PENDING' },
  { id: 6, guestName: 'Vũ Thị Khách', rating: 2, comment: 'Phòng có mùi ẩm mốc.', reply: null, createdAt: '2026-10-17', status: 'PENDING' },
];