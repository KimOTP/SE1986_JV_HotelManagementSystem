import '../styles/operations.css';

export default function OperationsPageHeader({ title, description, children }) {
  return (
    <header className="operations-page-heading">
      <div className="operations-page-heading__row">
        <h2 className="mb-0">{title}</h2>
        {children && <div className="operations-page-heading__actions">{children}</div>}
      </div>
      {description && <p className="text-muted mb-0">{description}</p>}
    </header>
  );
}
