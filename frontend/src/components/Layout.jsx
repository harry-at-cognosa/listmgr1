import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [referenceOpen, setReferenceOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
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
        <div className="flex items-center justify-between px-6 py-3">
          <h1 className="text-xl font-semibold text-primary-700">
            ListMgr - Sales Quote Templates
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Logged in as <strong className="text-gray-900">{user?.username}</strong>
              {isAdmin && <span className="ml-1 text-xs text-primary-600">(Admin)</span>}
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-57px)] bg-white border-r border-gray-200 p-4">
          <nav className="space-y-1">
            <NavLink to="/templates" className={navLinkClass}>
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
                  <NavLink to="/reference/currencies" className={subNavLinkClass}>
                    Currencies
                  </NavLink>
                  <NavLink to="/reference/countries" className={subNavLinkClass}>
                    Countries
                  </NavLink>
                  <NavLink to="/reference/product-categories" className={subNavLinkClass}>
                    Product Categories
                  </NavLink>
                  <NavLink to="/reference/product-lines" className={subNavLinkClass}>
                    Product Lines
                  </NavLink>
                  <NavLink to="/reference/section-types" className={subNavLinkClass}>
                    Section Types
                  </NavLink>
                </div>
              )}
            </div>

            {isAdmin && (
              <NavLink to="/admin/users" className={navLinkClass}>
                User Management
              </NavLink>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
