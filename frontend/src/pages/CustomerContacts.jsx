import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function CustomerContacts() {
  const { isAdmin } = useAuth();
  const [contacts, setContacts] = useState([]);
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
      const response = await api.get('/customer-contacts');
      // Sort by customer name alphabetically
      const sortedData = response.data.sort((a, b) => {
        return (a.cc_customer_name || '').localeCompare(b.cc_customer_name || '');
      });
      setContacts(sortedData);
    } catch (err) {
      setError(err.error || 'Failed to load customer contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer contact?')) return;
    try {
      await api.delete(`/customer-contacts/${id}`);
      setSuccess('Customer contact deleted successfully');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.error || 'Failed to delete customer contact');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Customer Contacts</h2>
        <button
          onClick={() => { setShowForm(true); setEditingItem(null); }}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
        >
          + Add Contact
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">{success}</div>}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No customer contacts found. Add your first contact!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">State</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contacts.map(item => (
                  <tr key={item.cc_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{item.cc_customer_name}</td>
                    <td className="px-6 py-4">{item.cc_company_name || ''}</td>
                    <td className="px-6 py-4">{item.cc_phone_number || ''}</td>
                    <td className="px-6 py-4">{item.cc_email_address || ''}</td>
                    <td className="px-6 py-4">{item.cc_city || ''}</td>
                    <td className="px-6 py-4">{item.cc_state || ''}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.last_update_datetime ? new Date(item.last_update_datetime).toLocaleString() : ''} by {item.last_update_user}
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
                          onClick={() => handleDelete(item.cc_id)}
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
          </div>
        )}
      </div>

      {showForm && (
        <CustomerContactFormModal
          item={editingItem}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
          onSave={() => { setShowForm(false); setEditingItem(null); loadData(); setSuccess('Customer contact saved successfully'); setTimeout(() => setSuccess(''), 3000); }}
        />
      )}
    </div>
  );
}

function CustomerContactFormModal({ item, onClose, onSave }) {
  const isEditing = !!item;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isSubmittingRef = useRef(false);
  const [formData, setFormData] = useState({
    cc_customer_name: item?.cc_customer_name || '',
    cc_company_name: item?.cc_company_name || '',
    cc_phone_number: item?.cc_phone_number || '',
    cc_email_address: item?.cc_email_address || '',
    cc_addr_line_1: item?.cc_addr_line_1 || '',
    cc_addr_line_2: item?.cc_addr_line_2 || '',
    cc_city: item?.cc_city || '',
    cc_state: item?.cc_state || '',
    cc_zip: item?.cc_zip || '',
    cc_comment: item?.cc_comment || ''
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
        await api.put(`/customer-contacts/${item.cc_id}`, formData);
      } else {
        await api.post('/customer-contacts', formData);
      }
      onSave();
    } catch (err) {
      setError(err.error || 'Failed to save customer contact');
      isSubmittingRef.current = false; // Reset on error so user can retry
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Contact' : 'Add Contact'}</h3>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="cc_customer_name" className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
              <input
                type="text"
                id="cc_customer_name"
                name="cc_customer_name"
                value={formData.cc_customer_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="cc_company_name" className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                id="cc_company_name"
                name="cc_company_name"
                value={formData.cc_company_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cc_phone_number" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  id="cc_phone_number"
                  name="cc_phone_number"
                  value={formData.cc_phone_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="cc_email_address" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  id="cc_email_address"
                  name="cc_email_address"
                  value={formData.cc_email_address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="cc_addr_line_1" className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
              <input
                type="text"
                id="cc_addr_line_1"
                name="cc_addr_line_1"
                value={formData.cc_addr_line_1}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="cc_addr_line_2" className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
              <input
                type="text"
                id="cc_addr_line_2"
                name="cc_addr_line_2"
                value={formData.cc_addr_line_2}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="cc_city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  id="cc_city"
                  name="cc_city"
                  value={formData.cc_city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="cc_state" className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  id="cc_state"
                  name="cc_state"
                  value={formData.cc_state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="cc_zip" className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                <input
                  type="text"
                  id="cc_zip"
                  name="cc_zip"
                  value={formData.cc_zip}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="cc_comment" className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
              <textarea
                id="cc_comment"
                name="cc_comment"
                value={formData.cc_comment}
                onChange={handleChange}
                rows={3}
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

export default CustomerContacts;
