import Navbar from '../components/Navbar';

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main>{children}</main>
      <footer className="mt-16 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        ColorSight &copy; {new Date().getFullYear()} — Preliminary screening tool, not a medical device.
      </footer>
    </div>
  );
}
