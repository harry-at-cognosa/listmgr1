import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Settings from './pages/Settings'
import Templates from './pages/Templates'
import TemplateDetail from './pages/TemplateDetail'
import TemplateForm from './pages/TemplateForm'
import Currencies from './pages/Currencies'
import Countries from './pages/Countries'
import ProductCategories from './pages/ProductCategories'
import ProductLines from './pages/ProductLines'
import SectionTypes from './pages/SectionTypes'
import Users from './pages/Users'
import PriceConversion from './pages/PriceConversion'
import CustomerContacts from './pages/CustomerContacts'
import NotFound from './pages/NotFound'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // If not authenticated, redirect to login with the current location as state
  // so we can redirect back after login
  return user ? children : <Navigate to="/login" state={{ from: location }} replace />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (user.role !== 'admin') return <Navigate to="/templates" />

  return children
}

function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/templates" replace />} />
            <Route path="templates" element={<Templates />} />
            <Route path="templates/new" element={<TemplateForm />} />
            <Route path="templates/:id" element={<TemplateDetail />} />
            <Route path="templates/:id/edit" element={<TemplateForm />} />
            <Route path="reference/currencies" element={<Currencies />} />
            <Route path="reference/countries" element={<Countries />} />
            <Route path="reference/product-categories" element={<ProductCategories />} />
            <Route path="reference/product-lines" element={<ProductLines />} />
            <Route path="reference/section-types" element={<SectionTypes />} />
            <Route path="customers/contacts" element={<CustomerContacts />} />
            <Route path="admin/users" element={<AdminRoute><Users /></AdminRoute>} />
            <Route path="admin/settings" element={<AdminRoute><Settings /></AdminRoute>} />
            <Route path="admin/price-conversion" element={<AdminRoute><PriceConversion /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </SettingsProvider>
  )
}

export default App
