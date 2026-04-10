function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  leading,
  trailing,
  className = "",
  type = "button",
  ...props
}) {
  const classes = [
    "ui-button",
    `ui-button-${variant}`,
    `ui-button-${size}`,
    fullWidth ? "ui-button-block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...props}>
      {leading ? <span className="ui-button-icon">{leading}</span> : null}
      <span>{children}</span>
      {trailing ? <span className="ui-button-icon">{trailing}</span> : null}
    </button>
  );
}

export default Button;
