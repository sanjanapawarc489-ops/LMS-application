import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";

export default function ShellLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/courses" className="brand">
          LMS Pro
        </Link>
        <nav className="topnav">
          <NavLink to="/courses">Catalog</NavLink>
          <NavLink to="/enrollments">My Learning</NavLink>
        </nav>
        <div className="user-actions" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ textAlign: 'right', display: 'none', md: 'block' }}>
            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{user?.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Student</div>
          </div>
          <button className="btn btn-outline" onClick={logout} style={{ padding: '0.5rem 1rem' }}>
            Sign Out
          </button>
        </div>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

