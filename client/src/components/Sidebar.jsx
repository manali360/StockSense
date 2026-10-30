import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  History,
  BarChart3,
  Users,
  PlusCircle,
  AlertTriangle,
  PackageCheck,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, isAdmin, isOperator } = useAuth();
  const { unreadCount } = useNotifications();

  const adminLinks = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Inventory Catalog', path: '/inventory', icon: Boxes },
    { name: 'Orders & Sales', path: '/orders', icon: ShoppingCart },
    { name: 'Stock Movement Audit', path: '/history', icon: History },
    { name: 'Analytics & Reports', path: '/analytics', icon: BarChart3 },
    { name: 'User Management', path: '/users', icon: Users },
  ];

  const operatorLinks = [
    { name: 'Operator Dashboard', path: '/operator', icon: LayoutDashboard },
    { name: 'Inventory Catalog', path: '/inventory', icon: Boxes },
    { name: 'Create New Order', path: '/orders/new', icon: PlusCircle },
    { name: 'Orders List', path: '/orders', icon: ShoppingCart },
    { name: 'Stock History', path: '/history', icon: History },
  ];

  const links = isAdmin ? adminLinks : operatorLinks;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                StockSense
              </span>
              <span className="block text-[10px] text-blue-400 font-mono tracking-wider uppercase">
                Warehouse WMS
              </span>
            </div>
          </div>
        </div>

        {/* User Role Card */}
        <div className="px-4 py-4 mx-3 my-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 text-blue-400 font-bold flex items-center justify-center shrink-0 border border-slate-600">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <ShieldCheck className="w-3 h-3" />
                    Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <UserCheck className="w-3 h-3" />
                    Operator
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Main Menu
          </div>
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{link.name}</span>
              </NavLink>
            );
          })}

          {/* Quick alert badge link */}
          {unreadCount > 0 && (
            <div className="pt-4">
              <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Active Alerts
              </div>
              <NavLink
                to="/inventory?status=LOW_STOCK"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Low Stock Warnings</span>
                </div>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                  {unreadCount}
                </span>
              </NavLink>
            </div>
          )}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>WMS Node v2.4</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Online
          </span>
        </div>
      </aside>
    </>
  );
};
