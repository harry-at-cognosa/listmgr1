import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function SectionTypes() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
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
      const response = await api.get('/section-types');
      setItems(response.data);
    } catch (err) {
      setError('Failed to load section types');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this section type?')) return;
    try {
      await api.delete(`/section-types/${id}`);
      setSuccess('Section type deleted successfully');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.error || 'Failed to delete section type');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Section Types</h2>
        <button
          onClick={() => { setShowForm(true); setEditingItem(null); }}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
        >
          + Add Section Type
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
          <div className="p-8 text-center text-gray-500">No section types found. Add your first section type!</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Line Prices</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.plsqtst_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{item.plsqtst_name}</td>
                  <td className="px-6 py-4">
                    {item.plsqtst_has_total_price ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {item.plsqtst_has_lineitem_prices ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {item.plsqtst_active ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">Inactive</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.plsqtst_version || '-'}</td>
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
                        onClick={() => handleDelete(item.plsqtst_id)}
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
        <SectionTypeFormModal
          item={editingItem}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
          onSave={() => { setShowForm(false); setEditingItem(null); loadData(); setSuccess('Section type saved successfully'); setTimeout(() => setSuccess(''), 3000); }}
        />
      )}
    </div>
  );
}

function SectionTypeFormModal({ item, onClose, onSave }) {
  const isEditing = !!item;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isSubmittingRef = useRef(false);
  const [formData, setFormData] = useState({
    plsqtst_name: item?.plsqtst_name || '',
    plsqtst_has_total_price: item?.plsqtst_has_total_price || false,
    plsqtst_has_lineitem_prices: item?.plsqtst_has_lineitem_prices || false,
    plsqtst_comment: item?.plsqtst_comment || '',
    extrn_file_ref: item?.extrn_file_ref || '',
    plsqtst_active: item?.plsqtst_active !== false,
    plsqtst_version: item?.plsqtst_version || ''
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
        await api.put(`/section-types/${item.plsqtst_id}`, formData);
      } else {
        await api.post('/section-types', formData);
      }
      onSave();
    } catch (err) {
      setError(err.error || 'Failed to save section type');
      isSubmittingRef.current = false; // Reset on error so user can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Section Type' : 'Add Section Type'}</h3>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="plsqtst_name" className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                id="plsqtst_name"
                value={formData.plsqtst_name}
                onChange={(e) => setFormData(prev => ({ ...prev, plsqtst_name: e.target.value }))}
                required
                maxLength={50}
                placeholder="e.g. Standard Quote Section"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="has_total_price"
                  checked={formData.plsqtst_has_total_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, plsqtst_has_total_price: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="has_total_price" className="ml-2 block text-sm text-gray-700">
                  Has Total Price
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="has_lineitem_prices"
                  checked={formData.plsqtst_has_lineitem_prices}
                  onChange={(e) => setFormData(prev => ({ ...prev, plsqtst_has_lineitem_prices: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="has_lineitem_prices" className="ml-2 block text-sm text-gray-700">
                  Has Line Item Prices
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="plsqtst_comment" className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
              <textarea
                id="plsqtst_comment"
                value={formData.plsqtst_comment}
                onChange={(e) => setFormData(prev => ({ ...prev, plsqtst_comment: e.target.value }))}
                maxLength={100}
                rows={2}
                placeholder="Optional comment about this section type"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label htmlFor="extrn_file_ref_section" className="block text-sm font-medium text-gray-700 mb-1">External File Reference</label>
              <input
                type="text"
                id="extrn_file_ref_section"
                value={formData.extrn_file_ref}
                onChange={(e) => setFormData(prev => ({ ...prev, extrn_file_ref: e.target.value }))}
                maxLength={500}
                placeholder="Optional file path or URL"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="active"
                checked={formData.plsqtst_active}
                onChange={(e) => setFormData(prev => ({ ...prev, plsqtst_active: e.target.checked }))}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
                Active
              </label>
            </div>

            <div>
              <label htmlFor="plsqtst_version" className="block text-sm font-medium text-gray-700 mb-1">Version</label>
              <input
                type="text"
                id="plsqtst_version"
                value={formData.plsqtst_version}
                onChange={(e) => setFormData(prev => ({ ...prev, plsqtst_version: e.target.value }))}
                maxLength={25}
                placeholder="e.g. 1.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

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

export default SectionTypes;
