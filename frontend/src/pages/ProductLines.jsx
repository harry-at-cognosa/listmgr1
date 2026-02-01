import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function ProductLines() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [linesRes, catsRes] = await Promise.all([
        api.get('/product-lines'),
        api.get('/product-categories')
      ]);
      // Sort: First by product category enabled (enabled categories first),
      // then by product line enabled (enabled first within each category group),
      // then alphabetically by abbreviation
      const sortedLines = linesRes.data.sort((a, b) => {
        // First sort by product category enabled status (enabled = 1 comes first)
        if (a.product_cat_enabled !== b.product_cat_enabled) {
          return b.product_cat_enabled - a.product_cat_enabled; // 1 comes before 0
        }
        // Then sort by product line enabled status (enabled = 1 comes first)
        if (a.product_line_enabled !== b.product_line_enabled) {
          return b.product_line_enabled - a.product_line_enabled; // 1 comes before 0
        }
        // Finally sort alphabetically by abbreviation
        return (a.product_line_abbr || '').localeCompare(b.product_line_abbr || '');
      });
      setItems(sortedLines);
      setCategories(catsRes.data);
    } catch (err) {
      setError(err.error || 'Failed to load product lines');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product line?')) return;
    try {
      await api.delete(`/product-lines/${id}`);
      setSuccess('Product line deleted successfully');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.error || 'Failed to delete product line');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Product Lines</h2>
        <button
          onClick={() => { setShowForm(true); setEditingItem(null); }}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
        >
          + Add Product Line
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">{success}</div>}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No product lines found. Add your first product line!</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Abbr</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Category</th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.product_line_id} className={`hover:bg-gray-50 ${item.product_line_enabled === 0 || item.product_cat_enabled === 0 ? 'bg-red-50' : ''}`}>
                  <td className="px-6 py-4 font-medium">{item.product_line_abbr}</td>
                  <td className="px-6 py-4">{item.product_line_name}</td>
                  <td className="px-6 py-4">
                    {item.product_cat_name || '-'}
                    {isAdmin && item.product_cat_enabled === 0 && (
                      <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Cat Disabled
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.product_line_enabled === 1
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.product_line_enabled === 1 ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.last_update_datetime} by {item.last_update_user}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => { setEditingItem(item); setShowForm(true); }}
                      className="text-sm text-green-600 hover:text-green-800 mr-3"
                    >
                      Edit
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(item.product_line_id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <ProductLineFormModal
          item={editingItem}
          categories={categories}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
          onSave={() => { setShowForm(false); setEditingItem(null); loadData(); setSuccess('Product line saved successfully'); setTimeout(() => setSuccess(''), 3000); }}
        />
      )}
    </div>
  );
}

function ProductLineFormModal({ item, categories, onClose, onSave }) {
  const { isAdmin } = useAuth();
  const isEditing = !!item;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isSubmittingRef = useRef(false);
  const [formData, setFormData] = useState({
    product_cat_id: item?.product_cat_id || '',
    product_line_abbr: item?.product_line_abbr || '',
    product_line_name: item?.product_line_name || '',
    product_line_enabled: item?.product_line_enabled !== undefined ? item.product_line_enabled === 1 : true
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Prevent double-submit using ref (synchronous check)
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSaving(true);
    setError('');

    try {
      if (isEditing) {
        await api.put(`/product-lines/${item.product_line_id}`, formData);
      } else {
        await api.post('/product-lines', formData);
      }
      onSave();
    } catch (err) {
      setError(err.error || 'Failed to save product line');
      isSubmittingRef.current = false; // Reset on error so user can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Product Line' : 'Add Product Line'}</h3>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="product_cat_id" className="block text-sm font-medium text-gray-700 mb-1">Product Category *</label>
              <select
                id="product_cat_id"
                value={formData.product_cat_id}
                onChange={(e) => setFormData(prev => ({ ...prev, product_cat_id: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.product_cat_id} value={cat.product_cat_id}>
                    {cat.product_cat_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="product_line_abbr" className="block text-sm font-medium text-gray-700 mb-1">Abbreviation</label>
              <input
                type="text"
                id="product_line_abbr"
                value={formData.product_line_abbr}
                onChange={(e) => setFormData(prev => ({ ...prev, product_line_abbr: e.target.value }))}
                maxLength={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="product_line_name" className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                id="product_line_name"
                value={formData.product_line_name}
                onChange={(e) => setFormData(prev => ({ ...prev, product_line_name: e.target.value }))}
                required
                maxLength={50}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {isAdmin && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="product_line_enabled"
                  checked={formData.product_line_enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, product_line_enabled: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="product_line_enabled" className="ml-2 block text-sm text-gray-700">
                  Enabled
                </label>
                <span className="ml-2 text-xs text-gray-500">(Admin only - disabled product lines are hidden from regular users)</span>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProductLines;
