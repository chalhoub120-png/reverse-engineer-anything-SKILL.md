import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home, ShoppingCart, User, LogOut, LayoutDashboard, Truck, Shield, Store, Search, Menu, X
} from 'lucide-react';

const IconMap = {
  Home, ShoppingCart, User, LogOut, LayoutDashboard, Truck, Shield, Store, Search, Menu, X,
};

const NavItem = ({ icon, label, to, active }) => {
  const Icon = IconMap[icon] || Home;
  return (
    <Link to={to} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${active ? 'bg-toters-100 text-toters-700' : 'text-gray-600 hover:bg-gray-100'}`}>
      <Icon size={18} />
      {label}
    </Link>
  );
};

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (to) => location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  const customerLinks = [
    { icon: 'Home', label: 'الرئيسية', to: '/' },
    { icon: 'ShoppingCart', label: 'السلة', to: '/cart' },
  ];
  const vendorLinks = [
    { icon: 'Store', label: 'لوحة المتجر', to: '/vendor' },
  ];
  const driverLinks = [
    { icon: 'Truck', label: 'توصيلاتي', to: '/driver' },
  ];
  const adminLinks = [
    { icon: 'Shield', label: 'لوحة الإدارة', to: '/admin' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1.5 bg-toters-50 p-1.5 rounded-xl text-toters-700">
            <Store size={20} />
            <span className="font-bold text-sm tracking-tight">توتيرز</span>
          </div>
          <span className="text-xs text-gray-500">تطبيق توصيل الطلبات</span>
        </div>

        <div className="flex items-center gap-1 w-full md:w-auto justify-end">
          {menuOpen && (
            <div className="flex-1 md:flex-none">
              <div className="space-y-1 py-2">
                {customerLinks.map((i) => (
                  <NavItem key={i.to} {...i} active={isActive(i.to)} />
                ))}
                {isAuthenticated && user.role === 'vendor' && vendorLinks.map((i) => (
                  <NavItem key={i.to} {...i} active={isActive(i.to)} />
                ))}
                {isAuthenticated && user.role === 'driver' && driverLinks.map((i) => (
                  <NavItem key={i.to} {...i} active={isActive(i.to)} />
                ))}
                {isAuthenticated && user.role === 'admin' && adminLinks.map((i) => (
                  <NavItem key={i.to} {...i} active={isActive(i.to)} />
                ))}
                {!isAuthenticated && (
                  <>
                    <NavItem icon="User" label="تسجيل الدخول" to="/login" />
                    <NavItem icon="User" label="إنشاء حساب" to="/register" />
                  </>
                )}
                {isAuthenticated && (
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
                  >
                    <LogOut size={18} /> تسجيل الخروج
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mr-auto">
            {isAuthenticated && user.role === 'customer' && (
              <Link to="/cart" className="relative p-2 text-gray-600 hover:text-toters-600 transition">
                <ShoppingCart size={22} />
              </Link>
            )}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-gray-600 hover:text-gray-900 transition md:hidden"
              aria-label="القائمة"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
