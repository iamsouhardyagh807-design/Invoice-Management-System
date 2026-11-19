import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  X,
  Plus,
  ChevronRight,
  TrendingUp,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Invoices', path: '/invoices', icon: FileText },
  { name: 'Customers', path: '/customers', icon: Users },
  { name: 'Products & Services', path: '/products', icon: Package },
  { name: 'Payments', path: '/payments', icon: CreditCard },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, settings, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel - Finly Style */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white dark:bg-finly-sidebar-dark border-r border-finly-border-light dark:border-finly-border-dark transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo Header (Finly style) */}
        <div className="flex h-20 items-center justify-between px-6 pt-2">
          <div className="flex items-center gap-2.5">
            {/* Finly wave bars icon */}
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-3.5 bg-finly-purple rounded-full"></span>
              <span className="w-1.5 h-6 bg-finly-purple rounded-full"></span>
              <span className="w-1.5 h-4.5 bg-finly-purple rounded-full"></span>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Finly
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-finly-purple/10 text-finly-purple dark:bg-finly-purple/20">
              PRO
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Buttons: + Add invoice / + Add customer (matching Finly buttons in Image 1) */}
        <div className="px-5 py-2 space-y-2">
          <button
            onClick={() => {
              navigate('/invoices/create');
              if (onClose) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-white dark:bg-[#282A33] border border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:border-finly-purple hover:text-finly-purple dark:hover:border-finly-purple transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-finly-purple" />
            <span>Add invoice</span>
          </button>

          <button
            onClick={() => {
              navigate('/customers');
              if (onClose) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-white dark:bg-[#282A33] border border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:border-finly-purple hover:text-finly-purple dark:hover:border-finly-purple transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-finly-amber" />
            <span>Add customer</span>
          </button>
        </div>

        {/* Navigation Items (Finly style) */}
        <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-finly-purple text-white shadow-md shadow-finly-purple/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.name}</span>
                    </div>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-90" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Business Badge */}
        <div className="mx-4 mb-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#282A33] border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="w-8 h-8 rounded-xl object-contain bg-white p-0.5" />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-finly-purple/10 text-finly-purple flex items-center justify-center font-bold text-xs">
              {(settings?.business_name || user?.business_name || 'B')[0]}
            </div>
          )}
          <div className="truncate">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {settings?.business_name || user?.business_name || 'My Business'}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {settings?.gstin ? `GST: ${settings.gstin}` : 'Commercial Edition'}
            </p>
          </div>
        </div>

        {/* Bottom Logout */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-2 rounded-2xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
              <LogOut className="h-3.5 w-3.5" />
            </div>
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
