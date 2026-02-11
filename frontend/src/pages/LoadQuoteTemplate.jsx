import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function LoadQuoteTemplate() {
  const { isAdmin } = useAuth();
  const fileInputRef = useRef(null);
  const isSubmittingRef = useRef(false);

  // Service health state
  const [serviceAvailable, setServiceAvailable] = useState(null); // null = checking, true/false
  const [healthChecking, setHealthChecking] = useState(true);

  // Reference data
  const [countries, setCountries] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [productLines, setProductLines] = useState([]);

  // Form state
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedCurrencyDisplay, setSelectedCurrencyDisplay] = useState('');
  const [selectedProductCatId, setSelectedProductCatId] = useState('');
  const [selectedProductLineId, setSelectedProductLineId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkServiceHealth();
    loadReferenceData();
  }, []);

  const checkServiceHealth = async () => {
    setHealthChecking(true);
    try {
      const response = await api.get('/load-template/health');
      const data = response.data;
      setServiceAvailable(data.status === 'healthy');
    } catch (err) {
      // Any error means service is unavailable
      setServiceAvailable(false);
    } finally {
      setHealthChecking(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      setLoading(true);
      const [countriesRes, categoriesRes, linesRes] = await Promise.all([
        api.get('/countries'),
        api.get('/product-categories'),
        api.get('/product-lines')
      ]);

      // Sort countries: enabled first, then alphabetical by name
      const sortedCountries = countriesRes.data.sort((a, b) => {
        if (a.country_enabled !== b.country_enabled) {
          return b.country_enabled - a.country_enabled;
        }
        return (a.country_name || '').localeCompare(b.country_name || '');
      });

      // Sort product categories: enabled first, then alphabetical
      const sortedCategories = categoriesRes.data.sort((a, b) => {
        if (a.product_cat_enabled !== b.product_cat_enabled) {
          return b.product_cat_enabled - a.product_cat_enabled;
        }
        return (a.product_cat_name || '').localeCompare(b.product_cat_name || '');
      });

      // Sort product lines: enabled first, then alphabetical
      const sortedLines = linesRes.data.sort((a, b) => {
        if (a.product_line_enabled !== b.product_line_enabled) {
          return b.product_line_enabled - a.product_line_enabled;
        }
        return (a.product_line_name || '').localeCompare(b.product_line_name || '');
      });

      setCountries(sortedCountries);
      setProductCategories(sortedCategories);
      setProductLines(sortedLines);
    } catch (err) {
      setError(err.error || 'Failed to load reference data');
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = (e) => {
    const countryId = e.target.value;
    setSelectedCountryId(countryId);

    if (countryId) {
      const country = countries.find(c => String(c.country_id) === String(countryId));
      if (country && country.currency_name) {
        setSelectedCurrencyDisplay(`${country.currency_symbol} - ${country.currency_name}`);
      } else if (country && country.currency_symbol) {
        setSelectedCurrencyDisplay(country.currency_symbol);
      } else {
        setSelectedCurrencyDisplay('No currency assigned');
      }
    } else {
      setSelectedCurrencyDisplay('');
    }
  };

  const handleProductCatChange = (e) => {
    const catId = e.target.value;
    setSelectedProductCatId(catId);
    // Reset product line when category changes
    setSelectedProductLineId('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.docx')) {
        setError('Only .docx files are accepted');
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setTimeout(() => setError(''), 5000);
        return;
      }
      setSelectedFile(file);
      setError('');
    } else {
      setSelectedFile(null);
    }
  };

  // Get filtered product lines based on selected category
  const filteredProductLines = selectedProductCatId
    ? productLines.filter(pl => String(pl.product_cat_id) === String(selectedProductCatId))
    : [];

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent double-submit
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!selectedCountryId) {
        throw { error: 'Please select a country' };
      }
      if (!selectedProductCatId) {
        throw { error: 'Please select a product category' };
      }
      if (!selectedProductLineId) {
        throw { error: 'Please select a product line' };
      }
      if (!selectedFile) {
        throw { error: 'Please select a .docx file to upload' };
      }

      // Get the country and product line data for the submission
      const country = countries.find(c => String(c.country_id) === String(selectedCountryId));
      const productLine = productLines.find(pl => String(pl.product_line_id) === String(selectedProductLineId));

      if (!country) {
        throw { error: 'Selected country not found' };
      }
      if (!productLine) {
        throw { error: 'Selected product line not found' };
      }

      // Build multipart form data
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('country', country.country_abbr);
      formData.append('currency', country.currency_symbol || '');
      formData.append('product_line', productLine.product_line_abbr);

      // Use direct fetch instead of api.upload to preserve FastAPI error messages
      // (api.upload converts all 500+ errors to a generic network message)
      const response = await fetch('/api/load-template', {
        method: 'POST',
        credentials: 'include',
        body: formData
        // Note: Do NOT set Content-Type header - browser sets it with boundary for multipart
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch {
        responseData = {};
      }

      if (!response.ok) {
        // Extract error message from the response - handle all FastAPI error formats
        let errorMessage = 'Failed to load template';

        if (responseData.error) {
          errorMessage = responseData.error;
        } else if (responseData.detail) {
          // FastAPI validation errors often use 'detail'
          if (Array.isArray(responseData.detail)) {
            errorMessage = responseData.detail.map(d => d.msg || d.message || JSON.stringify(d)).join('; ');
          } else if (typeof responseData.detail === 'string') {
            errorMessage = responseData.detail;
          } else {
            errorMessage = JSON.stringify(responseData.detail);
          }
        } else if (responseData.message) {
          errorMessage = responseData.message;
        }

        throw { error: errorMessage };
      }

      setSuccess('Template loaded successfully! ' + (responseData.message || ''));

      // Reset form
      setSelectedCountryId('');
      setSelectedCurrencyDisplay('');
      setSelectedProductCatId('');
      setSelectedProductLineId('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      // Handle all error conditions
      let errorMessage = 'Failed to load template';

      if (err.error) {
        errorMessage = err.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setUploading(false);
      isSubmittingRef.current = false;
    }
  };

  const isFormDisabled = serviceAvailable === false || healthChecking || loading;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Load Quote Template</h2>
        <button
          onClick={checkServiceHealth}
          disabled={healthChecking}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50"
          title="Re-check service availability"
        >
          {healthChecking ? (
            <span className="flex items-center gap-1">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Checking...
            </span>
          ) : (
            'Re-check Service'
          )}
        </button>
      </div>

      {/* Service unavailable warning banner */}
      {serviceAvailable === false && !healthChecking && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-3">
          <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="font-semibold text-amber-800">Template Loading Service Unavailable</h3>
            <p className="text-sm text-amber-700 mt-1">
              The template loading service is not reachable. Please contact an administrator.
              You can click "Re-check Service" to try again.
            </p>
          </div>
        </div>
      )}

      {/* Health check in progress */}
      {healthChecking && serviceAvailable === null && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm text-blue-700">Checking template loading service availability...</p>
        </div>
      )}

      {/* Service available indicator */}
      {serviceAvailable === true && !healthChecking && (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-green-700">Template loading service is available</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md border border-green-200">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{success}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading reference data...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-6">
            Upload a .docx sales quote template file to parse and load it into the system.
            Select the country, product category, and product line, then choose your file.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Country dropdown with currency display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="load_country" className="block text-sm font-medium text-gray-700 mb-1">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  id="load_country"
                  value={selectedCountryId}
                  onChange={handleCountryChange}
                  disabled={isFormDisabled}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Country</option>
                  {countries.map(c => (
                    <option key={c.country_id} value={c.country_id}>
                      {c.country_abbr} - {c.country_name}
                      {isAdmin && c.country_enabled === 0 ? ' (Disabled)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700 min-h-[38px]">
                  {selectedCurrencyDisplay || (
                    <span className="text-gray-400">Select a country to see currency</span>
                  )}
                </div>
              </div>
            </div>

            {/* Product Category dropdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="load_product_cat" className="block text-sm font-medium text-gray-700 mb-1">
                  Product Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="load_product_cat"
                  value={selectedProductCatId}
                  onChange={handleProductCatChange}
                  disabled={isFormDisabled}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select Product Category</option>
                  {productCategories.map(pc => (
                    <option key={pc.product_cat_id} value={pc.product_cat_id}>
                      {pc.product_cat_abbr.trim()} - {pc.product_cat_name}
                      {isAdmin && pc.product_cat_enabled === 0 ? ' (Disabled)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Line dropdown - filtered by category */}
              <div>
                <label htmlFor="load_product_line" className="block text-sm font-medium text-gray-700 mb-1">
                  Product Line <span className="text-red-500">*</span>
                </label>
                <select
                  id="load_product_line"
                  value={selectedProductLineId}
                  onChange={(e) => setSelectedProductLineId(e.target.value)}
                  disabled={isFormDisabled || !selectedProductCatId}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!selectedProductCatId ? 'Select a Product Category first' : 'Select Product Line'}
                  </option>
                  {filteredProductLines.map(pl => (
                    <option key={pl.product_line_id} value={pl.product_line_id}>
                      {pl.product_line_abbr.trim()} - {pl.product_line_name}
                      {isAdmin && pl.product_line_enabled === 0 ? ' (Disabled)' : ''}
                    </option>
                  ))}
                </select>
                {selectedProductCatId && filteredProductLines.length === 0 && (
                  <p className="mt-1 text-sm text-gray-500">No product lines found for selected category</p>
                )}
              </div>
            </div>

            {/* File picker */}
            <div>
              <label htmlFor="load_file" className="block text-sm font-medium text-gray-700 mb-1">
                Template File (.docx) <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                id="load_file"
                ref={fileInputRef}
                accept=".docx"
                onChange={handleFileChange}
                disabled={isFormDisabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
              {selectedFile && (
                <p className="mt-1 text-sm text-gray-500">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* Submit button */}
            <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={isFormDisabled || uploading}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload & Load Template
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default LoadQuoteTemplate;
