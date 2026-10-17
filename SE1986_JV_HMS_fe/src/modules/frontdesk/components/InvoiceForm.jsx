import { useEffect } from 'react';
import { Button, Card, Col, Form, Row, Table } from 'react-bootstrap';
import { PlusLg, Trash } from 'react-bootstrap-icons';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import InvoiceSummary from './InvoiceSummary';
import { INVOICE_STATUS, PAYMENT_METHODS, calcTotals } from '../utils/frontdeskUtils';

const num = (msg, min = 0) => z.number({ error: msg }).min(min, msg);

const invoiceSchema = z.object({
  bookingId: z.string().optional(),
  guestName: z.string().trim().min(1, 'Vui lòng nhập tên khách'),
  roomNumber: z.string().trim().min(1, 'Vui lòng nhập số phòng'),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1, 'Nhập nội dung'),
        type: z.enum(['ROOM', 'SERVICE']),
        quantity: num('Số lượng ≥ 1', 1),
        unitPrice: num('Đơn giá ≥ 0'),
      }),
    )
    .min(1, 'Hóa đơn cần ít nhất 1 dòng'),
  discount: num('Giảm giá ≥ 0'),
  taxRate: num('VAT từ 0 - 100').max(100, 'VAT từ 0 - 100'),
  deposit: num('Tiền cọc ≥ 0'),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']),
  status: z.enum(['UNPAID', 'PAID']),
  note: z.string().optional(),
});

const emptyValues = {
  bookingId: '', guestName: '', roomNumber: '',
  items: [{ description: '', type: 'ROOM', quantity: 1, unitPrice: 0 }],
  discount: 0, taxRate: 10, deposit: 0, paymentMethod: 'CASH', status: 'UNPAID', note: '',
};

// Shared by UC-D3 (create) and UC-D5 (update)
export default function InvoiceForm({ defaultValues, onSubmit, submitLabel, onCancel, hideStatus = false }) {
  const {
    register, control, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { ...emptyValues, ...defaultValues },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watched = useWatch({ control });

  useEffect(() => {
    if (defaultValues) reset({ ...emptyValues, ...defaultValues });
  }, [defaultValues, reset]);

  const totals = calcTotals(watched);

  return (
    <Form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Row className="g-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-3">Thông tin khách hàng</h5>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Label className="small fw-semibold">Mã booking</Form.Label>
                  <Form.Control {...register('bookingId')} placeholder="VD: BK-1003" />
                </Col>
                <Col md={5}>
                  <Form.Label className="small fw-semibold">Tên khách *</Form.Label>
                  <Form.Control {...register('guestName')} isInvalid={!!errors.guestName} />
                  <Form.Control.Feedback type="invalid">{errors.guestName?.message}</Form.Control.Feedback>
                </Col>
                <Col md={3}>
                  <Form.Label className="small fw-semibold">Số phòng *</Form.Label>
                  <Form.Control {...register('roomNumber')} isInvalid={!!errors.roomNumber} />
                  <Form.Control.Feedback type="invalid">{errors.roomNumber?.message}</Form.Control.Feedback>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Chi tiết hóa đơn</h5>
                <Button
                  type="button" size="sm" variant="outline-primary"
                  onClick={() => append({ description: '', type: 'SERVICE', quantity: 1, unitPrice: 0 })}
                >
                  <PlusLg /> Thêm dòng
                </Button>
              </div>
              {errors.items?.message && <div className="text-danger small mb-2">{errors.items.message}</div>}
              <Table bordered responsive className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ minWidth: 200 }}>Nội dung</th>
                    <th style={{ width: 130 }}>Loại</th>
                    <th style={{ width: 90 }}>SL</th>
                    <th style={{ width: 160 }}>Đơn giá</th>
                    <th style={{ width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((f, idx) => (
                    <tr key={f.id}>
                      <td>
                        <Form.Control size="sm" {...register(`items.${idx}.description`)} isInvalid={!!errors.items?.[idx]?.description} />
                      </td>
                      <td>
                        <Form.Select size="sm" {...register(`items.${idx}.type`)}>
                          <option value="ROOM">Phòng</option>
                          <option value="SERVICE">Dịch vụ</option>
                        </Form.Select>
                      </td>
                      <td>
                        <Form.Control size="sm" type="number" {...register(`items.${idx}.quantity`, { valueAsNumber: true })} isInvalid={!!errors.items?.[idx]?.quantity} />
                      </td>
                      <td>
                        <Form.Control size="sm" type="number" {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })} isInvalid={!!errors.items?.[idx]?.unitPrice} />
                      </td>
                      <td className="text-center">
                        <Button type="button" size="sm" variant="outline-danger" disabled={fields.length === 1} onClick={() => remove(idx)}>
                          <Trash />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-3">Thanh toán</h5>
              <Row className="g-3">
                <Col xs={6}>
                  <Form.Label className="small fw-semibold">Giảm giá (VND)</Form.Label>
                  <Form.Control type="number" {...register('discount', { valueAsNumber: true })} isInvalid={!!errors.discount} />
                  <Form.Control.Feedback type="invalid">{errors.discount?.message}</Form.Control.Feedback>
                </Col>
                <Col xs={6}>
                  <Form.Label className="small fw-semibold">VAT (%)</Form.Label>
                  <Form.Control type="number" {...register('taxRate', { valueAsNumber: true })} isInvalid={!!errors.taxRate} />
                  <Form.Control.Feedback type="invalid">{errors.taxRate?.message}</Form.Control.Feedback>
                </Col>
                <Col xs={12}>
                  <Form.Label className="small fw-semibold">Tiền đã cọc (VND)</Form.Label>
                  <Form.Control type="number" {...register('deposit', { valueAsNumber: true })} isInvalid={!!errors.deposit} />
                  <Form.Control.Feedback type="invalid">{errors.deposit?.message}</Form.Control.Feedback>
                </Col>
                <Col xs={6}>
                  <Form.Label className="small fw-semibold">Phương thức</Form.Label>
                  <Form.Select {...register('paymentMethod')}>
                    {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Form.Select>
                </Col>
                {!hideStatus && (
                  <Col xs={6}>
                    <Form.Label className="small fw-semibold">Trạng thái</Form.Label>
                    <Form.Select {...register('status')}>
                      {Object.entries(INVOICE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </Form.Select>
                  </Col>
                )}
                <Col xs={12}>
                  <Form.Label className="small fw-semibold">Ghi chú</Form.Label>
                  <Form.Control as="textarea" rows={2} {...register('note')} />
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <InvoiceSummary totals={totals} />

          <div className="d-flex gap-2 mt-3">
            {onCancel && (
              <Button type="button" variant="outline-secondary" className="w-100" onClick={onCancel}>Hủy</Button>
            )}
            <Button type="submit" variant="primary" className="w-100 fw-semibold" disabled={isSubmitting}>
              {submitLabel}
            </Button>
          </div>
        </Col>
      </Row>
    </Form>
  );
}
