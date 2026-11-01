import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .email('Email không hợp lệ.');

const passwordSchema = z
  .string()
  .min(6, 'Mật khẩu phải có ít nhất 6 ký tự.')
  .max(100, 'Mật khẩu không được vượt quá 100 ký tự.');

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

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
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
      .max(100, 'Mật khẩu mới không được vượt quá 100 ký tự.'),

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
    ['MANAGER', 'STAFF'],
    {
      errorMap: () => ({
        message: 'Vui lòng chọn vai trò hợp lệ.',
      }),
    },
  ),

  password: z.string().optional(),
});