import { z } from 'zod';
import axiosClient from '../../../shared/api/axiosClient';
const baseURL = import.meta.env.VITE_OPERATIONS_API_BASE_URL || axiosClient.defaults.baseURL;
const id = z.number().int().positive();
const feedbackSchema = z.object({
  id,
  bookingId: id,
  bookingCode: z.string(),
  hotelName: z.string(),
  guestName: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  reply: z.string().nullable(),
  repliedBy: z.string().nullable(),
  repliedAt: z.string().nullable(),
  createdAt: z.string(),
  rooms: z.array(z.string()).default([]),
});
export async function getCustomerFeedbackContext(signal) {
  const response = await axiosClient.get('/operations/feedback-customer-context', {
    baseURL,
    signal,
  });
  return z
    .object({ enabled: z.boolean(), customerName: z.string().nullable(), message: z.string() })
    .parse(response.data);
}
export async function getFeedbackBookings(signal) {
  const response = await axiosClient.get('/operations/feedback-bookings', { baseURL, signal });
  return z
    .array(
      z.object({
        id,
        bookingCode: z.string(),
        hotelName: z.string(),
        checkOutDate: z.string(),
        rooms: z.array(z.string()).default([]),
      }),
    )
    .parse(response.data);
}
export async function getFeedback(params, customer, signal) {
  const response = await axiosClient.get(
    customer ? '/operations/my-feedback' : '/operations/feedback',
    { baseURL, params, signal },
  );
  return z.array(feedbackSchema).parse(response.data);
}
export async function createFeedback(data) {
  const response = await axiosClient.post('/operations/feedback', data, { baseURL });
  return z.object({ id }).parse(response.data);
}
export async function replyFeedback(feedbackId, reply) {
  const response = await axiosClient.patch(
    `/operations/feedback/${feedbackId}/reply`,
    { reply },
    { baseURL },
  );
  return z.object({ id }).parse(response.data);
}
