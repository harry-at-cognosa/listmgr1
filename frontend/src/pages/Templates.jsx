import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const STATUS_COLORS = {
  'not started': 'bg-gray-100 text-gray-800',
  'in process': 'bg-blue-100 text-blue-800',
  'in review': 'bg-yellow-100 text-yellow-800',
  'approved': 'bg-green-100 text-green-800',
  'cloned': 'bg-purple-100 text-purple-800'
};

// Helper to get filter values from URL search params
const getFiltersFromParams = (searchParams) => ({
  country_id: searchParams.get('country_id') || '',
  product_cat_id: searchParams.get('product_cat_id') || '',
  product_line_id: searchParams.get('product_line_id') || '',
  active: searchParams.get('active') || '',
  search: searchParams.get('search') || ''
});

function Templates() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check for success message from navigation state (e.g., after template create/edit)
  useEffect(() => {
    if (location.state?.success) {
      setSuccess(location.state.success);
      setTimeout(() => setSuccess(''), 3000);
      // Clear the state so message doesn't show again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Reference data states
  const [countries, setCountries] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [productLines, setProductLines] = useState([]);

  // Get filters from URL search params (persists across navigation)
  const filters = getFiltersFromParams(searchParams);

  // Load reference data once on mount
  useEffect(() => {
    loadReferenceData();
  }, []);

  // Load templates whenever URL search params change (filters from URL)
  useEffect(() => {
    loadTemplates();
  }, [searchParams]);

  const loadReferenceData = async () => {
    try {
      const [countriesRes, categoriesRes, linesRes] = await Promise.all([
        api.get('/countries'),
        api.get('/product-categories'),
        api.get('/product-lines')
      ]);
      setCountries(countriesRes.data);
      setProductCategories(categoriesRes.data);
      setProductLines(linesRes.data);
    } catch (err) {
      console.error('Error loading reference data:', err);
    }
  };

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      // Build API params from URL search params
      const currentFilters = getFiltersFromParams(searchParams);
      const params = new URLSearchParams();
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await api.get(`/templates?${params.toString()}`);
      setTemplates(response.data);
    } catch (err) {
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // Update URL search params when filter changes (this persists filters in URL)
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(name, value);
    } else {
      newParams.delete(name);
    }
    setSearchParams(newParams, { replace: true });
  };

  // Clear all filters by resetting URL search params
  const clearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const handleClone = async (id) => {
    try {
      await api.post(`/templates/${id}/clone`);
      setSuccess('Template cloned successfully');
      loadTemplates();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to clone template');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template? This will also delete all its sections.')) {
      return;
    }
    try {
      await api.delete(`/templates/${id}`);
      setSuccess('Template deleted successfully');
      loadTemplates();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.error || 'Failed to delete template');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Templates</h2>
        <Link
          to="/templates/new"
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
        >
          + New Template
        </Link>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">{success}</div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <select
              name="country_id"
              value={filters.country_id}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Countries</option>
              {countries.map(c => (
                <option key={c.country_id} value={c.country_id}>{c.country_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Category</label>
            <select
              name="product_cat_id"
              value={filters.product_cat_id}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Categories</option>
              {productCategories.map(c => (
                <option key={c.product_cat_id} value={c.product_cat_id}>{c.product_cat_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Line</label>
            <select
              name="product_line_id"
              value={filters.product_line_id}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Lines</option>
              {productLines.map(l => (
                <option key={l.product_line_id} value={l.product_line_id}>{l.product_line_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="active"
              value={filters.active}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Templates Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No templates found. {filters.search || filters.country_id || filters.product_cat_id || filters.product_line_id || filters.active ? 'Try adjusting your filters.' : 'Create your first template!'}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Line</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sections</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templates.map(template => (
                <tr key={template.plsqt_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link to={`/templates/${template.plsqt_id}`} className="text-primary-600 hover:text-primary-800 font-medium">
                      {template.plsqt_name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{template.country_name || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{template.product_line_name || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{template.plsqt_section_count}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[template.plsqt_status] || 'bg-gray-100'}`}>
                      {template.plsqt_status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/templates/${template.plsqt_id}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View
                      </Link>
                      <Link
                        to={`/templates/${template.plsqt_id}/edit`}
                        className="text-sm text-green-600 hover:text-green-800"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleClone(template.plsqt_id)}
                        className="text-sm text-purple-600 hover:text-purple-800"
                      >
                        Clone
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(template.plsqt_id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Templates;
