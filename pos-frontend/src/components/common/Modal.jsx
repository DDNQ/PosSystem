import Button from "./Button";

function Modal({
  open,
  title,
  subtitle,
  actions,
  onClose,
  children,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="ui-modal-backdrop" role="presentation">
      <section className="ui-modal" role="dialog" aria-modal="true">
        <header className="ui-modal-header">
          <div>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {onClose ? (
            <Button variant="ghost" size="sm" onClick={onClose}>
              x
            </Button>
          ) : null}
        </header>

        <div className="ui-modal-body">{children}</div>

        {actions?.length ? (
          <footer className="ui-modal-footer">
            {actions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant || "secondary"}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </footer>
        ) : null}
      </section>
    </div>
  );
}

export default Modal;
