import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .email('Email không hợp lệ.');

// Backend băm bằng BCrypt, chỉ dùng được tối đa 72 byte.
const passwordSchema = z
  .string()
  .min(6, 'Mật khẩu phải có ít nhất 6 ký tự.')
  .max(72, 'Mật khẩu không được vượt quá 72 ký tự.');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Họ và tên phải có ít nhất 2 ký tự.')
      .max(100, 'Họ và tên không được vượt quá 100 ký tự.'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, 'Vui lòng xác nhận mật khẩu.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp.',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetWithOtpSchema = z
  .object({
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Mã xác nhận gồm 6 chữ số.'),
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, 'Vui lòng xác nhận mật khẩu mới.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp.',
    path: ['confirmPassword'],
  });

// Validate thông tin cá nhân
export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự.')
    .max(100, 'Họ và tên không được vượt quá 100 ký tự.'),
  // Không bắt buộc; khớp kiểm tra ở backend.
  phone: z
    .string()
    .trim()
    .refine((value) => value === '' || /^[0-9+() -]{8,20}$/.test(value), {
      message: 'Số điện thoại không hợp lệ.',
    }),
});

// Validate đổi mật khẩu
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Vui lòng nhập mật khẩu hiện tại.'),

    newPassword: z
      .string()
      .min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự.')
      .max(72, 'Mật khẩu mới không được vượt quá 72 ký tự.'),

    confirmPassword: z
      .string()
      .min(1, 'Vui lòng xác nhận mật khẩu mới.'),
  })
  .refine(
    (data) => data.newPassword === data.confirmPassword,
    {
      message: 'Mật khẩu xác nhận không khớp.',
      path: ['confirmPassword'],
    },
  )
  .refine(
    (data) => data.currentPassword !== data.newPassword,
    {
      message: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
      path: ['newPassword'],
    },
  );
  export const internalUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự.')
    .max(100, 'Họ và tên không được vượt quá 100 ký tự.'),

  email: z
    .string()
    .trim()
    .email('Email không hợp lệ.')
    .max(254, 'Email quá dài.'),

  role: z.enum(
    ['MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER'],
    {
      errorMap: () => ({
        message: 'Vui lòng chọn vai trò hợp lệ.',
      }),
    },
  ),

  jobTitle: z
    .string()
    .trim()
    .max(100, 'Chức danh không được vượt quá 100 ký tự.')
    .optional(),

  password: z.string().optional(),
});