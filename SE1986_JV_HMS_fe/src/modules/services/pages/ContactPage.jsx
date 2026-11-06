import { useState } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';
import {
  ChatDots,
  ClockHistory,
  Envelope,
  GeoAlt,
  Telephone,
} from 'react-bootstrap-icons';
import '../styles/services.css';

const contactInfo = [
  {
    icon: GeoAlt,
    label: 'Địa chỉ',
    value: 'Số 1 Đại lộ Hòa Bình, Q. Ninh Kiều, TP. Cần Thơ',
  },
  { icon: Telephone, label: 'Hotline', value: '1900 6789' },
  { icon: Envelope, label: 'Email', value: 'support@hotel-hms.vn' },
  { icon: ClockHistory, label: 'Lễ tân', value: 'Trực 24/7, nhận phòng từ 14:00' },
];

const emptyForm = { name: '', email: '', message: '' };

export default function ContactPage() {
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    setForm(emptyForm);
  };

  return (
    <div className="services-module">
      <header className="hms-page-head">
        <div className="hms-page-head__main">
          <span className="hms-page-head__icon">
            <ChatDots aria-hidden="true" />
          </span>
          <div>
            <h1 className="hms-page-head__title">Liên hệ</h1>
            <p className="hms-page-head__desc">
              Bộ phận lễ tân hỗ trợ 24/7. Gửi yêu cầu và chúng tôi phản hồi qua
              email trong vòng 2 giờ.
            </p>
          </div>
        </div>
      </header>

      <div className="hms-contact-grid">
        <section className="hms-panel hms-panel__body">
          <h2 className="hms-feedback-cta__title mb-3">Thông tin khách sạn</h2>
          <ul className="hms-info-list">
            {contactInfo.map(({ icon: Icon, label, value }) => (
              <li key={label}>
                <span className="hms-info-list__icon">
                  <Icon aria-hidden="true" />
                </span>
                <span>
                  <span className="hms-info-list__label">{label}</span>
                  <span className="hms-info-list__value">{value}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="hms-panel hms-panel__body">
          <h2 className="hms-feedback-cta__title mb-3">Gửi yêu cầu</h2>

          {submitted && (
            <Alert variant="success" role="status">
              Đã ghi nhận yêu cầu. Đây là biểu mẫu demo nên nội dung chưa được
              gửi tới backend.
            </Alert>
          )}

          <Form className="hms-contact-form" onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="contact-name">
              <Form.Label>Họ và tên</Form.Label>
              <Form.Control
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="contact-email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="ban@example.com"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="contact-message">
              <Form.Label>Nội dung</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Mô tả yêu cầu của bạn (đặt dịch vụ, hỗ trợ lưu trú, ...)"
                required
              />
            </Form.Group>

            <Button type="submit">Gửi yêu cầu</Button>
          </Form>
        </section>
      </div>
    </div>
  );
}
