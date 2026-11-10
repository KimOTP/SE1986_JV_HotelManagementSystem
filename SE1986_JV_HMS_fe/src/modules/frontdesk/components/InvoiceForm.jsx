import { useEffect } from 'react';
import { Alert, Button, Card, Col, Form, Row, Table } from 'react-bootstrap';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { calcTotals, currency } from '../utils/frontdeskUtils';
import InvoiceSummary from './InvoiceSummary';

export default function InvoiceForm({ defaultValues, onSubmit, onCancel, submitLabel = 'Lưu hóa đơn' }) {
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const values = useWatch({ control });
  useEffect(() => { reset(defaultValues); }, [defaultValues, reset]);
  const preview = calcTotals(values || {});
  const submit = async (data) => {
    const items = data.items.map((item) => ({
      type: item.type, bookingRoomId: item.bookingRoomId || null,
      serviceOrderId: item.serviceOrderId || null, description: item.description?.trim(),
      quantity: Number(item.quantity), unitPrice: Number(item.unitPrice),
    }));
    await onSubmit({ bookingId: data.bookingId, items, discount: Number(data.discount), taxRate: Number(data.taxRate), note: data.note || '', rowVersion: data.rowVersion });
  };
  return <Form onSubmit={handleSubmit(submit)}>
    <Card className="mb-3"><Card.Body>
      <h5>Thông tin hóa đơn</h5>
      <p className="mb-1">Booking: <strong>{defaultValues.bookingId}</strong> · Khách: <strong>{defaultValues.guestName}</strong></p>
      <p className="mb-0">Phòng: <strong>{defaultValues.roomNumber}</strong> · Cọc đã nhận: <strong>{currency(defaultValues.deposit)}</strong></p>
    </Card.Body></Card>
    <Card className="mb-3"><Card.Body>
      <div className="d-flex justify-content-between align-items-center mb-3"><h5 className="mb-0">Phòng và dịch vụ</h5>
        <Button type="button" size="sm" variant="outline-primary" onClick={() => append({ type: 'OTHER', description: '', quantity: 1, unitPrice: 0 })}>Thêm khoản khác</Button>
      </div>
      <Alert variant="info">Tiền phòng và dịch vụ đã cung cấp được lấy từ database, không thể thay giá hoặc số lượng tại hóa đơn.</Alert>
      <Table responsive bordered size="sm"><thead><tr><th>Loại</th><th>Nội dung</th><th>Số lượng</th><th>Đơn giá</th><th></th></tr></thead><tbody>
        {fields.map((item, index) => <tr key={item.id}>
          <td>{item.type === 'ROOM' ? 'Phòng' : item.type === 'SERVICE' ? 'Dịch vụ' : 'Khác'}</td>
          <td>{item.type === 'OTHER' ? <Form.Control {...register(`items.${index}.description`, { required: 'Nhập nội dung', maxLength: 500 })} isInvalid={!!errors.items?.[index]?.description} /> : item.description}</td>
          <td>{item.type === 'OTHER' ? <Form.Control type="number" min="0.01" step="0.01" {...register(`items.${index}.quantity`, { required: true, min: 0.01, valueAsNumber: true })} isInvalid={!!errors.items?.[index]?.quantity} /> : item.quantity}</td>
          <td>{item.type === 'OTHER' ? <Form.Control type="number" min="0" step="0.01" {...register(`items.${index}.unitPrice`, { required: true, min: 0, valueAsNumber: true })} isInvalid={!!errors.items?.[index]?.unitPrice} /> : currency(item.unitPrice)}</td>
          <td>{item.type === 'OTHER' && <Button type="button" size="sm" variant="outline-danger" onClick={() => remove(index)}>Xóa</Button>}</td>
        </tr>)}
      </tbody></Table>
    </Card.Body></Card>
    <Row className="g-3"><Col md={7}><Card><Card.Body><Row className="g-3">
      <Col sm={6}><Form.Label>Giảm giá (VND)</Form.Label><Form.Control type="number" min="0" max={preview.subtotal} step="0.01" {...register('discount', { valueAsNumber: true, min: 0, max: preview.subtotal })} isInvalid={!!errors.discount} /></Col>
      <Col sm={6}><Form.Label>VAT (%)</Form.Label><Form.Control type="number" min="0" max="100" step="0.01" {...register('taxRate', { valueAsNumber: true, min: 0, max: 100 })} isInvalid={!!errors.taxRate} /></Col>
      <Col xs={12}><Form.Label>Ghi chú</Form.Label><Form.Control as="textarea" rows={2} {...register('note', { maxLength: 1000 })} isInvalid={!!errors.note} /></Col>
    </Row></Card.Body></Card></Col><Col md={5}><InvoiceSummary totals={preview} /></Col></Row>
    <div className="d-flex gap-2 justify-content-end mt-3"><Button type="button" variant="outline-secondary" onClick={onCancel}>Hủy</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Đang lưu…' : submitLabel}</Button></div>
  </Form>;
}
