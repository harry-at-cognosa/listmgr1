import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function Currencies() {
  const { isAdmin } = useAuth();
  const [currencies, setCurrencies] = useState([]);
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
      const response = await api.get('/currencies');
      setCurrencies(response.data);
    } catch (err) {
      setError(err.error || 'Failed to load currencies');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this currency?')) return;
    try {
      await api.delete(`/currencies/${id}`);
      setSuccess('Currency deleted successfully');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.error || 'Failed to delete currency');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Currencies</h2>
        {isAdmin && (
          <button
            onClick={() => { setShowForm(true); setEditingItem(null); }}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
          >
            + Add Currency
          </button>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">{success}</div>}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : currencies.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No currencies found. Add your first currency!</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currencies.map(item => (
                <tr key={item.currency_id} className={`hover:bg-gray-50 ${item.currency_enabled === 0 ? 'bg-red-50' : ''}`}>
                  <td className="px-6 py-4 font-medium">{item.currency_symbol}</td>
                  <td className="px-6 py-4">{item.currency_name}</td>
                  {isAdmin && (
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.currency_enabled === 1
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.currency_enabled === 1 ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.last_update_datetime} by {item.last_update_user}
                  </td>
                  <td className="px-6 py-4">
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => { setEditingItem(item); setShowForm(true); }}
                          className="text-sm text-green-600 hover:text-green-800 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.currency_id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {!isAdmin && <span className="text-sm text-gray-400">View only</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <CurrencyFormModal
          item={editingItem}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
          onSave={() => { setShowForm(false); setEditingItem(null); loadData(); setSuccess('Currency saved successfully'); setTimeout(() => setSuccess(''), 3000); }}
        />
      )}
    </div>
  );
}

function CurrencyFormModal({ item, onClose, onSave }) {
  const isEditing = !!item;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isSubmittingRef = useRef(false);
  const [formData, setFormData] = useState({
    currency_symbol: item?.currency_symbol || '',
    currency_name: item?.currency_name || '',
    currency_enabled: item?.currency_enabled !== 0
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
        await api.put(`/currencies/${item.currency_id}`, formData);
      } else {
        await api.post('/currencies', formData);
      }
      onSave();
    } catch (err) {
      setError(err.error || 'Failed to save currency');
      isSubmittingRef.current = false; // Reset on error so user can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Currency' : 'Add Currency'}</h3>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="currency_symbol" className="block text-sm font-medium text-gray-700 mb-1">Symbol *</label>
              <input
                type="text"
                id="currency_symbol"
                value={formData.currency_symbol}
                onChange={(e) => setFormData(prev => ({ ...prev, currency_symbol: e.target.value }))}
                required
                maxLength={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="currency_name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                id="currency_name"
                value={formData.currency_name}
                onChange={(e) => setFormData(prev => ({ ...prev, currency_name: e.target.value }))}
                maxLength={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="currency_enabled"
                checked={formData.currency_enabled}
                onChange={(e) => setFormData(prev => ({ ...prev, currency_enabled: e.target.checked }))}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="currency_enabled" className="ml-2 text-sm text-gray-700">
                Enabled
                <span className="ml-2 text-xs text-gray-500">(Disabled currencies are hidden from regular users)</span>
              </label>
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

export default Currencies;
