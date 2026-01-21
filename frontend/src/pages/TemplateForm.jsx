import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const STATUS_OPTIONS = ['not started', 'in process', 'in review', 'approved', 'cloned'];

function TemplateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reference data
  const [countries, setCountries] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [productLines, setProductLines] = useState([]);

  // Form data
  const [formData, setFormData] = useState({
    plsqt_name: '',
    country_id: '',
    currency_id: '',
    product_cat_id: '',
    product_line_id: '',
    plsqt_order_codes: '',
    plsqt_desc: '',
    plsqt_comment: '',
    plsqt_fbo_location: '',
    plsqs_as_of_date: '',
    extrn_file_ref: '',
    plsqt_active: true,
    plsqt_version: '',
    content: '',
    plsqt_status: 'not started'
  });

  useEffect(() => {
    loadReferenceData();
    if (isEditing) {
      loadTemplate();
    }
  }, [id]);

  const loadReferenceData = async () => {
    try {
      const [countriesRes, currenciesRes, categoriesRes, linesRes] = await Promise.all([
        api.get('/countries'),
        api.get('/currencies'),
        api.get('/product-categories'),
        api.get('/product-lines')
      ]);
      setCountries(countriesRes.data);
      setCurrencies(currenciesRes.data);
      setProductCategories(categoriesRes.data);
      setProductLines(linesRes.data);
    } catch (err) {
      setError('Failed to load reference data');
    }
  };

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/templates/${id}`);
      const template = response.data;
      setFormData({
        plsqt_name: template.plsqt_name || '',
        country_id: template.country_id || '',
        currency_id: template.currency_id || '',
        product_cat_id: template.product_cat_id || '',
        product_line_id: template.product_line_id || '',
        plsqt_order_codes: template.plsqt_order_codes || '',
        plsqt_desc: template.plsqt_desc || '',
        plsqt_comment: template.plsqt_comment || '',
        plsqt_fbo_location: template.plsqt_fbo_location || '',
        plsqs_as_of_date: template.plsqs_as_of_date ? template.plsqs_as_of_date.split('T')[0] : '',
        extrn_file_ref: template.extrn_file_ref || '',
        plsqt_active: template.plsqt_active !== false,
        plsqt_version: template.plsqt_version || '',
        content: template.content || '',
        plsqt_status: template.plsqt_status || 'not started'
      });
    } catch (err) {
      setError('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const dataToSubmit = {
        ...formData,
        country_id: formData.country_id || null,
        currency_id: formData.currency_id || null,
        product_cat_id: formData.product_cat_id || null,
        product_line_id: formData.product_line_id || null,
        plsqs_as_of_date: formData.plsqs_as_of_date || null
      };

      if (isEditing) {
        await api.put(`/templates/${id}`, dataToSubmit);
        navigate('/templates', { state: { success: 'Template updated successfully' } });
      } else {
        await api.post('/templates', dataToSubmit);
        navigate('/templates', { state: { success: 'Template created successfully' } });
      }
    } catch (err) {
      setError(err.error || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm">
        <Link to="/templates" className="text-primary-600 hover:text-primary-800">Home</Link>
        <span className="mx-2 text-gray-400">&gt;</span>
        <Link to="/templates" className="text-primary-600 hover:text-primary-800">Templates</Link>
        <span className="mx-2 text-gray-400">&gt;</span>
        <span className="text-gray-600">{isEditing ? 'Edit Template' : 'New Template'}</span>
      </nav>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {isEditing ? 'Edit Template' : 'Create New Template'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="plsqt_name"
                value={formData.plsqt_name}
                onChange={handleChange}
                required
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select
                name="country_id"
                value={formData.country_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Country</option>
                {countries.map(c => (
                  <option key={c.country_id} value={c.country_id}>{c.country_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                name="currency_id"
                value={formData.currency_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Currency</option>
                {currencies.map(c => (
                  <option key={c.currency_id} value={c.currency_id}>{c.currency_symbol} - {c.currency_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Category</label>
              <select
                name="product_cat_id"
                value={formData.product_cat_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Category</option>
                {productCategories.map(c => (
                  <option key={c.product_cat_id} value={c.product_cat_id}>{c.product_cat_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Line</label>
              <select
                name="product_line_id"
                value={formData.product_line_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Product Line</option>
                {productLines.map(l => (
                  <option key={l.product_line_id} value={l.product_line_id}>{l.product_line_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="plsqt_status"
                value={formData.plsqt_status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Codes</label>
              <input
                type="text"
                name="plsqt_order_codes"
                value={formData.plsqt_order_codes}
                onChange={handleChange}
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">FBO Location</label>
              <input
                type="text"
                name="plsqt_fbo_location"
                value={formData.plsqt_fbo_location}
                onChange={handleChange}
                maxLength={50}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">As Of Date</label>
              <input
                type="date"
                name="plsqs_as_of_date"
                value={formData.plsqs_as_of_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
              <input
                type="text"
                name="plsqt_version"
                value={formData.plsqt_version}
                onChange={handleChange}
                maxLength={25}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="plsqt_desc"
                value={formData.plsqt_desc}
                onChange={handleChange}
                rows={3}
                maxLength={800}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="mt-1 text-sm text-gray-500">{formData.content.length}/500 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
              <input
                type="text"
                name="plsqt_comment"
                value={formData.plsqt_comment}
                onChange={handleChange}
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">External File Reference</label>
              <input
                type="text"
                name="extrn_file_ref"
                value={formData.extrn_file_ref}
                onChange={handleChange}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="plsqt_active"
                id="plsqt_active"
                checked={formData.plsqt_active}
                onChange={handleChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="plsqt_active" className="ml-2 text-sm text-gray-700">Active</label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : (isEditing ? 'Update Template' : 'Create Template')}
            </button>
            <Link
              to="/templates"
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TemplateForm;
