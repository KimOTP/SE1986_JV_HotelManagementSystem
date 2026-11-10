// Module D API. All front desk pages load and write data through this client.
import axiosClient from '../../../shared/api/axiosClient';

const base = '/frontdesk';
const data = (request) => request.then((response) => response.data);

export const frontdeskApi = {
    getCheckInCandidates: ({ todayOnly = true, keyword = '' } = {}) =>
        data(axiosClient.get(`${base}/check-ins`, { params: { todayOnly, keyword } })),
    getCheckOutCandidates: (keyword = '') =>
        data(axiosClient.get(`${base}/check-outs`, { params: { keyword } })),
    getReservation: (bookingCode) =>
        data(axiosClient.get(`${base}/bookings/${encodeURIComponent(bookingCode)}`)),
    checkInReservation: (bookingCode, payload) =>
        data(axiosClient.post(`${base}/bookings/${encodeURIComponent(bookingCode)}/check-in`, payload)),
    checkOutReservation: (bookingCode) =>
        data(axiosClient.post(`${base}/bookings/${encodeURIComponent(bookingCode)}/check-out`)),
    getInvoiceDraft: (bookingCode) =>
        data(axiosClient.get(`${base}/bookings/${encodeURIComponent(bookingCode)}/invoice-draft`)),
    getInvoices: () => data(axiosClient.get(`${base}/invoices`)),
    getInvoice: (invoiceNumber) =>
        data(axiosClient.get(`${base}/invoices/${encodeURIComponent(invoiceNumber)}`)),
    createInvoice: (payload) => data(axiosClient.post(`${base}/invoices`, payload)),
    updateInvoice: (invoiceNumber, payload) =>
        data(axiosClient.put(`${base}/invoices/${encodeURIComponent(invoiceNumber)}`, payload)),
    deleteInvoice: (invoiceNumber) =>
        data(axiosClient.delete(`${base}/invoices/${encodeURIComponent(invoiceNumber)}`)),
    restoreInvoice: (invoiceNumber) =>
        data(axiosClient.post(`${base}/invoices/${encodeURIComponent(invoiceNumber)}/restore`)),
    payInvoice: (invoiceNumber, method = 'CASH') =>
        data(axiosClient.post(`${base}/invoices/${encodeURIComponent(invoiceNumber)}/pay`, { method })),
};

export default frontdeskApi;
