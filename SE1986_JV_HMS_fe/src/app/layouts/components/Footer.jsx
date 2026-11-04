import { Facebook, Linkedin, TwitterX } from 'react-bootstrap-icons';
import { Link } from 'react-router';
import { useAuth } from '../../provider/AuthsContext.jsx';
import logoMark from '../../../assets/images/logo-mark.svg';

const columns = [
  {
    title: 'Đặt phòng',
    items: [
      { label: 'Tìm phòng', to: '/rooms' },
      { label: 'Tạo đặt phòng', to: '/bookings/new', permission: 'UC-C1' },
      { label: 'Đặt phòng của tôi', to: '/bookings', permission: 'UC-C3' },
      {
        label: 'Thanh toán tiền cọc',
        to: '/bookings/deposit',
        permission: 'UC-C2',
      },
    ],
  },
  {
    title: 'Dịch vụ',
    items: [
      { label: 'Dịch vụ khách sạn', to: '/services' },
      { label: 'Báo cáo sự cố', to: '/operations/report-issue', permission: 'UC-E4' },
      {
        label: 'Đánh giá & phản hồi',
        to: '/operations/feedbacks',
        permission: 'UC-E6',
      },
    ],
  },
  {
    title: 'Khác',
    items: [
      { label: 'Hồ sơ cá nhân', to: '/profile' },
      { label: 'Liên hệ', to: '/contact' },
      { label: 'Quản lý đặt phòng', to: '/admin/bookings', permission: 'UC-C5' },
      { label: 'Quản lý người dùng', to: '/users', permission: 'UC-A5' },
    ],
  },
];

const socialLinks = [
  { label: 'Facebook', href: 'https://www.facebook.com/', icon: Facebook },
  { label: 'X (Twitter)', href: 'https://x.com/', icon: TwitterX },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/', icon: Linkedin },
];

const badges = ['SWD392-G3', 'FPT University', 'HMS 2026'];

export default function Footer() {
  const { isAuthenticated, hasPermission } = useAuth();

  // Link chỉ hiện khi tài khoản có quyền tương ứng, tránh đưa người dùng tới
  // trang 403 ngay từ footer.
  const canSee = (item) =>
    !item.permission || (isAuthenticated && hasPermission(item.permission));

  return (
    <footer className="hms-footer">
      <div className="hms-footer__main">
        <div className="hms-footer__brand">
          <Link to="/" className="hms-footer__logo">
            <img src={logoMark} alt="" />
            <span>Hotel Management System</span>
          </Link>
          <p className="hms-footer__tagline">
            Nền tảng quản lý đặt phòng, buồng phòng và dịch vụ khách sạn cho
            khách lưu trú và đội ngũ vận hành.
          </p>

          <div className="hms-footer__badges">
            {badges.map((badge) => (
              <span key={badge} className="hms-footer__badge">
                {badge}
              </span>
            ))}
          </div>

          <div className="hms-footer__social">
            {socialLinks.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                title={label}
              >
                <Icon aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        <nav className="hms-footer__columns" aria-label="Liên kết chân trang">
          {columns.map((column) => {
            const items = column.items.filter(canSee);
            if (items.length === 0) return null;

            return (
              <div key={column.title} className="hms-footer__col">
                <h2 className="hms-footer__col-title">{column.title}</h2>
                <ul>
                  {items.map((item) => (
                    <li key={item.to}>
                      <Link to={item.to}>{item.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>

      <div className="hms-footer__bottom">
        <div className="hms-footer__bottom-inner">
          <span>
            &copy; {new Date().getFullYear()} Hotel Management System. All
            rights reserved.
          </span>
          <span>SWD392-G3 · FPT University</span>
        </div>
      </div>
    </footer>
  );
}
