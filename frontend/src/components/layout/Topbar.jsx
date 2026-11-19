import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Menu,
  Search,
  Calendar,
  Sun,
  Moon,
  User,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function Topbar({ onOpenSidebar }) {
  const { user, settings, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Time-based greeting (e.g. "Good Morning, Eva!")
  const currentHour = dayjs().hour();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.name ? user.name.split(' ')[0] : 'Eva';
  const formattedDate = dayjs().format('ddd, MMM D');

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/invoices?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'E';
    return name.slice(0, 1).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between px-6 sm:px-8 bg-transparent">
      {/* Left: Mobile hamburger & Finly Greeting ("Good Morning, Eva!") */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenSidebar}
          className="rounded-xl p-2 text-slate-500 hover:bg-white/80 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {greeting}, {firstName}!
          </h1>
        </div>
      </div>

      {/* Center: Finly Pill Search Bar */}
      <div className="hidden md:flex flex-1 max-w-xs mx-6">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-full border border-slate-200/80 dark:border-slate-700/60 bg-white/80 dark:bg-[#24262E] pl-10 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#282A33] focus:border-finly-purple focus:outline-none shadow-sm transition-all"
          />
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        </form>
      </div>

      {/* Right: Date Pill, Dark/Light Mode Pill Switch, User Avatar */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Date Pill (Finly style) */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#24262E] border border-slate-200/80 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm">
          <Calendar className="h-3.5 w-3.5 text-finly-purple" />
          <span>{formattedDate}</span>
        </div>

        {/* Dark / Light Mode Toggle Pill Switch (Exact design in Image 1) */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle dark/light mode"
          className="relative flex items-center h-8 w-15 rounded-full bg-slate-200 dark:bg-[#2C2E38] p-1 transition-colors duration-300 cursor-pointer shadow-inner"
        >
          {/* Sliding indicator */}
          <div
            className={`absolute top-1 h-6 w-6 rounded-full bg-white dark:bg-finly-purple shadow-md transform transition-transform duration-300 flex items-center justify-center ${
              isDark ? 'translate-x-7' : 'translate-x-0'
            }`}
          >
            {isDark ? (
              <Moon className="w-3.5 h-3.5 text-white" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            )}
          </div>
          <div className="flex justify-between w-full px-1.5 text-slate-400">
            <Sun className="w-3 h-3 opacity-60" />
            <Moon className="w-3 h-3 opacity-60" />
          </div>
        </button>

        {/* User Profile Avatar (Finly style) */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-finly-purple/50 transition-all"
          >
            {user?.avatar_url || settings?.logo_url ? (
              <img
                src={user?.avatar_url || settings?.logo_url}
                alt={user?.name || 'User'}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-white dark:ring-slate-700"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                {getInitials(user?.name)}
              </div>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-56 rounded-3xl bg-white dark:bg-[#24262E] py-2.5 shadow-2xl border border-slate-100 dark:border-slate-700/80 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700/60">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.name}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>

              <div className="py-1">
                <Link
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  <span>Profile & Security</span>
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  <span>Business Settings</span>
                </Link>
              </div>

              <div className="pt-1 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                    navigate('/login');
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                >
                  <LogOut className="h-4 w-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
