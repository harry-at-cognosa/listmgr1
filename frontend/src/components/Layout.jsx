import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const { appVersion, dbVersion, clientName } = useSettings();
  const navigate = useNavigate();
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const navLinkClass = ({ isActive }) =>
    `block px-4 py-2 rounded-md transition-colors ${
      isActive
        ? 'bg-primary-600 text-white'
        : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'
    }`;

  const subNavLinkClass = ({ isActive }) =>
    `block px-4 py-2 pl-8 rounded-md transition-colors ${
      isActive
        ? 'bg-primary-100 text-primary-700'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 md:px-6 py-3">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-semibold text-theme-700 truncate">
              <span className="hidden sm:inline">SalesQuoteMgr</span>
              <span className="sm:hidden">SalesQuoteMgr</span>
            </h1>
            {clientName && (
              <span className="text-xs text-gray-500 hidden sm:inline">{clientName}</span>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className="hidden sm:inline text-sm text-gray-600">
              Logged in as <strong className="text-gray-900">{user?.username}</strong>
              {isAdmin && <span className="ml-1 text-xs text-primary-600">(Admin)</span>}
            </span>
            <span className="sm:hidden text-xs text-gray-600">
              <strong>{user?.username}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="px-2 md:px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={closeMobileMenu}
          />
        )}

        {/* Sidebar - Hidden on mobile by default, shown when mobileMenuOpen */}
        <aside className={`
          fixed md:static inset-y-0 left-0 z-30
          w-64 min-h-[calc(100vh-57px)] bg-white border-r border-gray-200 p-4
          transform transition-transform duration-200 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:block
        `}>
          <nav className="space-y-1 mt-14 md:mt-0">
            <NavLink to="/templates" className={navLinkClass} onClick={closeMobileMenu}>
              Templates
            </NavLink>

            {/* Reference Data Submenu */}
            <div>
              <button
                onClick={() => setReferenceOpen(!referenceOpen)}
                className="w-full flex items-center justify-between px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <span>Reference Data</span>
                <svg
                  className={`w-4 h-4 transition-transform ${referenceOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {referenceOpen && (
                <div className="mt-1 space-y-1">
                  <NavLink to="/reference/currencies" className={subNavLinkClass} onClick={closeMobileMenu}>
                    Currencies
                  </NavLink>
                  <NavLink to="/reference/countries" className={subNavLinkClass} onClick={closeMobileMenu}>
                    Countries
                  </NavLink>
                  <NavLink to="/reference/product-categories" className={subNavLinkClass} onClick={closeMobileMenu}>
                    Product Categories
                  </NavLink>
                  <NavLink to="/reference/product-lines" className={subNavLinkClass} onClick={closeMobileMenu}>
                    Product Lines
                  </NavLink>
                  <NavLink to="/reference/section-types" className={subNavLinkClass} onClick={closeMobileMenu}>
                    Section Types
                  </NavLink>
                </div>
              )}
            </div>

            {isAdmin && (
              <>
                <NavLink to="/admin/users" className={navLinkClass} onClick={closeMobileMenu}>
                  User Management
                </NavLink>
                <NavLink to="/admin/settings" className={navLinkClass} onClick={closeMobileMenu}>
                  App Settings
                </NavLink>
                <NavLink to="/admin/price-conversion" className={navLinkClass} onClick={closeMobileMenu}>
                  Price Conversion
                </NavLink>
              </>
            )}
          </nav>

          {/* Version info at bottom of sidebar */}
          <div className="absolute bottom-4 left-4 right-4 text-xs text-gray-400">
            <div>App: {appVersion || '...'} | DB: {dbVersion || '...'}</div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 w-full min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
