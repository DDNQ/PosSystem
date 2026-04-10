function Topbar({
  title = "Welcome back",
  subtitle = "Manage your POS operations easily",
  searchPlaceholder = "Search products, sales, or users...",
  userName = "Michael",
  userRole = "Administrator",
  userInitials = "MY",
  action,
}) {
  return (
    <header className="topbar">
      <div>
        <h1 className="topbar-title">{title}</h1>
        <p className="topbar-subtitle">{subtitle}</p>
      </div>

      <div className="topbar-actions">
        <label className="topbar-search-wrap">
          <span className="topbar-search-icon" aria-hidden="true">
            S
          </span>
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="topbar-search"
          />
        </label>

        {action ? (
          <button type="button" className="topbar-action-btn" onClick={action.onClick}>
            {action.label}
          </button>
        ) : null}

        <div className="topbar-user">
          <div className="user-avatar">{userInitials}</div>
          <div>
            <h4>{userName}</h4>
            <p>{userRole}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
