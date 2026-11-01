export default function PageHeading({ title, description, actions }) {
  return (
    <header className="booking-page-header">
      <div>
        <h2 className="booking-page-title">{title}</h2>
        {description && <p className="booking-page-subtitle">{description}</p>}
      </div>
      {actions && <div className="booking-page-actions">{actions}</div>}
    </header>
  );
}
