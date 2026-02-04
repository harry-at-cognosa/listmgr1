import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

function PriceConversion() {
  const [activeTab, setActiveTab] = useState('factors');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Clear messages when changing tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Price Conversion Manager</h2>
        <p className="text-sm text-gray-500 mt-1">Manage conversion factors, country pairs, and factor values</p>
      </div>

      {/* Global Messages */}
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">{success}</div>}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          <button
            onClick={() => handleTabChange('factors')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'factors'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Factor Types
          </button>
          <button
            onClick={() => handleTabChange('pairs')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'pairs'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Country Pairs
          </button>
          <button
            onClick={() => handleTabChange('values')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'values'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Factor Values
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === 'factors' && (
        <FactorsPanel
          onError={setError}
          onSuccess={(msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }}
        />
      )}
      {activeTab === 'pairs' && (
        <PairsPanel
          onError={setError}
          onSuccess={(msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }}
        />
      )}
      {activeTab === 'values' && (
        <ValuesPanel
          onError={setError}
          onSuccess={(msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }}
        />
      )}
    </div>
  );
}

// ================================================================
// FACTORS PANEL (Tab 1)
// ================================================================

function FactorsPanel({ onError, onSuccess }) {
  const [factors, setFactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/price-conversion/factors');
      setFactors(response.data);
    } catch (err) {
      onError(err.error || 'Failed to load factors');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this factor type?')) return;
    try {
      await api.delete(`/price-conversion/factors/${id}`);
      onSuccess('Factor deleted successfully');
      loadData();
    } catch (err) {
      onError(err.error || 'Failed to delete factor');
      setTimeout(() => onError(''), 3000);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Conversion Factor Types</h3>
        <button
          onClick={() => { setShowForm(true); setEditingItem(null); }}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-md transition-colors"
        >
          + Add Factor
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : factors.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No factor types defined</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {factors.map(item => (
                <tr key={item.pcf_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{item.pcf_id}</td>
                  <td className="px-4 py-3 font-mono text-sm font-medium">{item.pc_factor_code}</td>
                  <td className="px-4 py-3 text-sm">{item.pc_factor_description || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setEditingItem(item); setShowForm(true); }}
                      className="text-sm text-green-600 hover:text-green-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.pcf_id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <FactorFormModal
          item={editingItem}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
          onSave={() => {
            setShowForm(false);
            setEditingItem(null);
            loadData();
            onSuccess(editingItem ? 'Factor updated successfully' : 'Factor created successfully');
          }}
          onError={onError}
        />
      )}
    </div>
  );
}

function FactorFormModal({ item, onClose, onSave, onError }) {
  const isEditing = !!item;
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isSubmittingRef = useRef(false);
  const [formData, setFormData] = useState({
    pc_factor_code: item?.pc_factor_code || '',
    pc_factor_description: item?.pc_factor_description || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSaving(true);
    setFormError('');

    try {
      if (isEditing) {
        await api.put(`/price-conversion/factors/${item.pcf_id}`, formData);
      } else {
        await api.post('/price-conversion/factors', formData);
      }
      onSave();
    } catch (err) {
      setFormError(err.error || 'Failed to save factor');
      isSubmittingRef.current = false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Factor Type' : 'Add Factor Type'}</h3>
          {formError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{formError}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="pc_factor_code" className="block text-sm font-medium text-gray-700 mb-1">Code (max 3 chars) *</label>
              <input
                type="text"
                id="pc_factor_code"
                value={formData.pc_factor_code}
                onChange={(e) => setFormData(prev => ({ ...prev, pc_factor_code: e.target.value.toUpperCase() }))}
                required
                maxLength={3}
                placeholder="e.g. FX"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="pc_factor_description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                id="pc_factor_description"
                value={formData.pc_factor_description}
                onChange={(e) => setFormData(prev => ({ ...prev, pc_factor_description: e.target.value }))}
                maxLength={40}
                placeholder="e.g. currency conversion etc"
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

// ================================================================
// PAIRS PANEL (Tab 2)
// ================================================================

function PairsPanel({ onError, onSuccess }) {
  const [pairs, setPairs] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    loadData();
    loadCountries();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/price-conversion/pairs');
      setPairs(response.data);
    } catch (err) {
      onError(err.error || 'Failed to load pairs');
    } finally {
      setLoading(false);
    }
  };

  const loadCountries = async () => {
    try {
      const response = await api.get('/price-conversion/countries');
      setCountries(response.data);
    } catch (err) {
      console.error('Failed to load countries:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this country pair?')) return;
    try {
      await api.delete(`/price-conversion/pairs/${id}`);
      onSuccess('Pair deleted successfully');
      loadData();
    } catch (err) {
      onError(err.error || 'Failed to delete pair');
      setTimeout(() => onError(''), 3000);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Country Conversion Pairs</h3>
        <button
          onClick={() => { setShowForm(true); setEditingItem(null); }}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-md transition-colors"
        >
          + Add Pair
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : pairs.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No country pairs defined</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From Country</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To Country</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pairs.map(item => (
                <tr key={item.ccp_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{item.ccp_id}</td>
                  <td className="px-4 py-3 text-sm">{item.from_country_abbr} - {item.from_country_name}</td>
                  <td className="px-4 py-3 text-sm">{item.to_country_abbr} - {item.to_country_name}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setEditingItem(item); setShowForm(true); }}
                      className="text-sm text-green-600 hover:text-green-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.ccp_id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <PairFormModal
          item={editingItem}
          countries={countries}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
          onSave={() => {
            setShowForm(false);
            setEditingItem(null);
            loadData();
            onSuccess(editingItem ? 'Pair updated successfully' : 'Pair created successfully');
          }}
          onError={onError}
        />
      )}
    </div>
  );
}

function PairFormModal({ item, countries, onClose, onSave, onError }) {
  const isEditing = !!item;
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isSubmittingRef = useRef(false);
  const [formData, setFormData] = useState({
    ccp_from_country_id: item?.ccp_from_country_id || '',
    ccp_to_country_id: item?.ccp_to_country_id || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSaving(true);
    setFormError('');

    try {
      if (isEditing) {
        await api.put(`/price-conversion/pairs/${item.ccp_id}`, formData);
      } else {
        await api.post('/price-conversion/pairs', formData);
      }
      onSave();
    } catch (err) {
      setFormError(err.error || 'Failed to save pair');
      isSubmittingRef.current = false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Country Pair' : 'Add Country Pair'}</h3>
          {formError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{formError}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="ccp_from_country_id" className="block text-sm font-medium text-gray-700 mb-1">From Country *</label>
              <select
                id="ccp_from_country_id"
                value={formData.ccp_from_country_id}
                onChange={(e) => setFormData(prev => ({ ...prev, ccp_from_country_id: e.target.value ? parseInt(e.target.value) : '' }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">- Select -</option>
                {countries.map(c => (
                  <option key={c.country_id} value={c.country_id}>
                    {c.country_abbr} - {c.country_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ccp_to_country_id" className="block text-sm font-medium text-gray-700 mb-1">To Country *</label>
              <select
                id="ccp_to_country_id"
                value={formData.ccp_to_country_id}
                onChange={(e) => setFormData(prev => ({ ...prev, ccp_to_country_id: e.target.value ? parseInt(e.target.value) : '' }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">- Select -</option>
                {countries.map(c => (
                  <option key={c.country_id} value={c.country_id}>
                    {c.country_abbr} - {c.country_name}
                  </option>
                ))}
              </select>
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

// ================================================================
// VALUES PANEL (Tab 3)
// ================================================================

function ValuesPanel({ onError, onSuccess }) {
  const [values, setValues] = useState([]);
  const [factors, setFactors] = useState([]);
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    loadData();
    loadFactors();
    loadPairs();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/price-conversion/values');
      setValues(response.data);
    } catch (err) {
      onError(err.error || 'Failed to load values');
    } finally {
      setLoading(false);
    }
  };

  const loadFactors = async () => {
    try {
      const response = await api.get('/price-conversion/factors');
      setFactors(response.data);
    } catch (err) {
      console.error('Failed to load factors:', err);
    }
  };

  const loadPairs = async () => {
    try {
      const response = await api.get('/price-conversion/pairs');
      setPairs(response.data);
    } catch (err) {
      console.error('Failed to load pairs:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this factor value?')) return;
    try {
      await api.delete(`/price-conversion/values/${id}`);
      onSuccess('Factor value deleted successfully');
      loadData();
    } catch (err) {
      onError(err.error || 'Failed to delete factor value');
      setTimeout(() => onError(''), 3000);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return dateStr.split('T')[0];
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '-';
    return Number(num).toFixed(4);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Factor Values</h3>
        <button
          onClick={() => { setShowForm(true); setEditingItem(null); }}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-md transition-colors"
        >
          + Add Value
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : values.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No factor values defined</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country Pair</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Mult 1</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Mult 2</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {values.map(item => (
                <tr key={item.pfv_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{item.pfv_id}</td>
                  <td className="px-4 py-3 font-mono text-sm">{item.pc_factor_code}</td>
                  <td className="px-4 py-3 text-sm">{item.from_country_abbr} &rarr; {item.to_country_abbr}</td>
                  <td className="px-4 py-3 font-mono text-sm">{formatDate(item.pfc_from_date)}</td>
                  <td className="px-4 py-3 font-mono text-sm">{formatDate(item.pfc_to_date)}</td>
                  <td className="px-4 py-3 font-mono text-sm text-right">{formatNumber(item.pfc_multiplier_1)}</td>
                  <td className="px-4 py-3 font-mono text-sm text-right">{formatNumber(item.pfc_multiplier_2)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setEditingItem(item); setShowForm(true); }}
                      className="text-sm text-green-600 hover:text-green-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.pfv_id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ValueFormModal
          item={editingItem}
          factors={factors}
          pairs={pairs}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
          onSave={() => {
            setShowForm(false);
            setEditingItem(null);
            loadData();
            onSuccess(editingItem ? 'Factor value updated successfully' : 'Factor value created successfully');
          }}
          onError={onError}
        />
      )}
    </div>
  );
}

function ValueFormModal({ item, factors, pairs, onClose, onSave, onError }) {
  const isEditing = !!item;
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isSubmittingRef = useRef(false);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    pcf_id: item?.pcf_id || '',
    ccp_id: item?.ccp_id || '',
    pfc_from_date: item?.pfc_from_date ? item.pfc_from_date.split('T')[0] : today,
    pfc_to_date: item?.pfc_to_date ? item.pfc_to_date.split('T')[0] : '2040-12-31',
    pfc_multiplier_1: item?.pfc_multiplier_1 !== undefined ? item.pfc_multiplier_1 : '1.0000',
    pfc_multiplier_2: item?.pfc_multiplier_2 !== undefined ? item.pfc_multiplier_2 : '1.0000'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSaving(true);
    setFormError('');

    try {
      const payload = {
        pcf_id: parseInt(formData.pcf_id),
        ccp_id: parseInt(formData.ccp_id),
        pfc_from_date: formData.pfc_from_date,
        pfc_to_date: formData.pfc_to_date,
        pfc_multiplier_1: parseFloat(formData.pfc_multiplier_1),
        pfc_multiplier_2: parseFloat(formData.pfc_multiplier_2)
      };

      if (isEditing) {
        await api.put(`/price-conversion/values/${item.pfv_id}`, payload);
      } else {
        await api.post('/price-conversion/values', payload);
      }
      onSave();
    } catch (err) {
      setFormError(err.error || 'Failed to save factor value');
      isSubmittingRef.current = false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full m-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Factor Value' : 'Add Factor Value'}</h3>
          {formError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{formError}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="pcf_id" className="block text-sm font-medium text-gray-700 mb-1">Factor Type *</label>
                <select
                  id="pcf_id"
                  value={formData.pcf_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, pcf_id: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">- Select -</option>
                  {factors.map(f => (
                    <option key={f.pcf_id} value={f.pcf_id}>
                      {f.pc_factor_code} - {f.pc_factor_description || '(no desc)'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ccp_id" className="block text-sm font-medium text-gray-700 mb-1">Country Pair *</label>
                <select
                  id="ccp_id"
                  value={formData.ccp_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, ccp_id: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">- Select -</option>
                  {pairs.map(p => (
                    <option key={p.ccp_id} value={p.ccp_id}>
                      {p.from_country_abbr} &rarr; {p.to_country_abbr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="pfc_from_date" className="block text-sm font-medium text-gray-700 mb-1">From Date *</label>
                <input
                  type="date"
                  id="pfc_from_date"
                  value={formData.pfc_from_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, pfc_from_date: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="pfc_to_date" className="block text-sm font-medium text-gray-700 mb-1">To Date *</label>
                <input
                  type="date"
                  id="pfc_to_date"
                  value={formData.pfc_to_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, pfc_to_date: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="pfc_multiplier_1" className="block text-sm font-medium text-gray-700 mb-1">Multiplier 1 *</label>
                <input
                  type="number"
                  id="pfc_multiplier_1"
                  value={formData.pfc_multiplier_1}
                  onChange={(e) => setFormData(prev => ({ ...prev, pfc_multiplier_1: e.target.value }))}
                  required
                  step="0.0001"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="pfc_multiplier_2" className="block text-sm font-medium text-gray-700 mb-1">Multiplier 2 *</label>
                <input
                  type="number"
                  id="pfc_multiplier_2"
                  value={formData.pfc_multiplier_2}
                  onChange={(e) => setFormData(prev => ({ ...prev, pfc_multiplier_2: e.target.value }))}
                  required
                  step="0.0001"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
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

export default PriceConversion;
