import {
  Airplane,
  Basket2,
  Compass,
  CupHot,
  Gem,
  Headset,
  Star,
  Water,
} from 'react-bootstrap-icons';
import { Link } from 'react-router';
import '../styles/services.css';

const services = [
  {
    icon: Airplane,
    title: 'Đưa đón sân bay',
    desc: 'Xe riêng 4–7 chỗ, tài xế đón tại sảnh đến và theo dõi giờ bay thực tế.',
    price: 'Từ 350.000đ / lượt',
  },
  {
    icon: Gem,
    title: 'Spa & massage',
    desc: 'Liệu trình thư giãn 60–90 phút tại tầng 3, vui lòng đặt trước 2 giờ.',
    price: 'Từ 450.000đ / suất',
  },
  {
    icon: CupHot,
    title: 'Ẩm thực tại phòng',
    desc: 'Thực đơn Á – Âu phục vụ 6:00–23:00, phụ thu 10% phí phục vụ tại phòng.',
    price: 'Từ 120.000đ / món',
  },
  {
    icon: Basket2,
    title: 'Giặt ủi trong ngày',
    desc: 'Nhận đồ trước 10:00 và trả trong ngày; gói nhanh hoàn tất sau 3 giờ.',
    price: 'Từ 60.000đ / kg',
  },
  {
    icon: Water,
    title: 'Hồ bơi & phòng gym',
    desc: 'Miễn phí cho khách đang lưu trú, mở cửa 6:00–22:00 tại tầng 4.',
    price: 'Miễn phí',
  },
  {
    icon: Compass,
    title: 'Tour thành phố',
    desc: 'Lịch trình nửa ngày cùng hướng dẫn viên, khởi hành lúc 8:30 và 14:00.',
    price: '500.000đ / khách',
  },
];

export default function ServicesPage() {
  return (
    <div className="services-module">
      <header className="hms-page-head">
        <div className="hms-page-head__main">
          <span className="hms-page-head__icon">
            <Headset aria-hidden="true" />
          </span>
          <div>
            <h1 className="hms-page-head__title">Dịch vụ &amp; phản hồi</h1>
            <p className="hms-page-head__desc">
              Đặt dịch vụ bổ sung, gửi phản hồi hoặc báo cáo sự cố trong thời
              gian lưu trú.
            </p>
          </div>
        </div>
      </header>

      <div className="hms-service-grid">
        {services.map(({ icon: Icon, title, desc, price }) => (
          <article key={title} className="hms-service-card">
            <span className="hms-service-card__icon">
              <Icon aria-hidden="true" />
            </span>
            <h2 className="hms-service-card__title">{title}</h2>
            <p className="hms-service-card__desc">{desc}</p>
            <div className="hms-service-card__footer">
              <span className="hms-service-card__price">{price}</span>
              <Link to="/contact" className="hms-service-card__link">
                Liên hệ đặt
              </Link>
            </div>
          </article>
        ))}
      </div>

      <section className="hms-feedback-cta">
        <div>
          <h2 className="hms-feedback-cta__title">
            <Star aria-hidden="true" className="me-2" />
            Chất lượng phục vụ của bạn là ưu tiên của chúng tôi
          </h2>
          <p className="hms-feedback-cta__desc">
            Giá trên là giá tham khảo cho khách đang lưu trú. Phản hồi được
            chuyển tới bộ phận buồng phòng và lễ tân trong ca làm việc.
          </p>
        </div>
        <div className="hms-feedback-cta__actions">
          <Link to="/operations/report-issue" className="btn btn-primary btn-sm">
            Báo cáo sự cố
          </Link>
          <Link to="/operations/feedbacks" className="btn btn-outline-primary btn-sm">
            Đánh giá &amp; phản hồi
          </Link>
        </div>
      </section>
    </div>
  );
}
