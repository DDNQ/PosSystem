function Input({
  label,
  hint,
  icon,
  trailing,
  className = "",
  inputClassName = "",
  ...props
}) {
  return (
    <label className={`ui-field ${className}`.trim()}>
      {label ? <span className="ui-field-label">{label}</span> : null}
      <span className="ui-input-shell">
        {icon ? <span className="ui-input-icon">{icon}</span> : null}
        <input className={`ui-input ${inputClassName}`.trim()} {...props} />
        {trailing ? <span className="ui-input-trailing">{trailing}</span> : null}
      </span>
      {hint ? <span className="ui-field-hint">{hint}</span> : null}
    </label>
  );
}

export default Input;
