import { Link, useNavigate } from 'react-router-dom';
import { Eye, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold text-brand-700">
          <Eye size={22} />
          <span>ColorSight</span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              {isAdmin ? (
                <Link to="/admin" className="flex items-center gap-1 text-slate-600 hover:text-brand-600">
                  <ShieldCheck size={16} /> Admin
                </Link>
              ) : (
                <Link to="/dashboard" className="flex items-center gap-1 text-slate-600 hover:text-brand-600">
                  <LayoutDashboard size={16} /> Dashboard
                </Link>
              )}
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="flex items-center gap-1 text-slate-600 hover:text-red-600"
              >
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-slate-600 hover:text-brand-600">
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
