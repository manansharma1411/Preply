import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  BookOpen,
  Upload,
  LayoutDashboard,
  User,
  Sparkles,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

export const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Upload Material', path: '/upload', icon: Upload },
    { name: 'Study Session', path: '/study', icon: BookOpen },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  const handleLogout = async () => {
    await logout();
    addToast('Signed out successfully', 'info');
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'ST';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-50">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-surface-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo Branding */}
          <Link to="/" className="flex items-center gap-2.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 p-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-surface-900">Preply</span>
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200">
              Workspace
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-semibold shadow-2xs'
                      : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* User Auth Action Bar */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 pl-3 border-l border-surface-200">
                <Link
                  to="/profile"
                  className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-surface-100/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {getInitials(user.name)}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-surface-900 leading-tight">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-surface-500 leading-tight">
                      {user.email}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-surface-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-surface-600 hover:text-surface-900 px-3.5 py-2 rounded-xl hover:bg-surface-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white px-4 py-2 rounded-xl shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
            className="md:hidden p-2 rounded-xl text-surface-600 hover:bg-surface-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-surface-200 bg-white px-4 pt-2 pb-4 space-y-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-xl text-sm font-medium ${
                    isActive ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-surface-700 hover:bg-surface-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    {link.name}
                  </div>
                  <ChevronRight className="w-4 h-4 text-surface-400" />
                </Link>
              );
            })}

            <div className="pt-3 border-t border-surface-200 flex flex-col gap-2">
              {user ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-2 p-3 text-rose-600 font-semibold text-sm rounded-xl hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out ({user.name})
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-sm font-semibold text-surface-700 border border-surface-300 rounded-xl"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-sm font-semibold bg-brand-600 text-white rounded-xl"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-surface-200 py-6 text-center text-xs text-surface-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 Preply AI Student Workspace. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-surface-800 transition-colors">
              Platform Features
            </Link>
            <Link to="/upload" className="hover:text-surface-800 transition-colors">
              Upload Material
            </Link>
            <Link to="/dashboard" className="hover:text-surface-800 transition-colors">
              Student Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
