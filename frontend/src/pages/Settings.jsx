import { useState, useEffect } from 'react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { AVAILABLE_COLORS, COLOR_PALETTE } from '../utils/colorPalette';

function Settings() {
  const { refreshSettings } = useSettings();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/app-settings/all');
      setSettings(response.data);
      // Initialize edit values
      const values = {};
      response.data.forEach(s => {
        values[s.name] = s.value;
      });
      setEditValues(values);
    } catch (err) {
      setError('Failed to load settings');
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (name) => {
    try {
      setSaving(prev => ({ ...prev, [name]: true }));
      setError('');
      setSuccess('');

      await api.put(`/app-settings/${name}`, { value: editValues[name] });

      // Update local state
      setSettings(prev =>
        prev.map(s => s.name === name ? { ...s, value: editValues[name] } : s)
      );

      // Refresh global settings context
      await refreshSettings();

      setSuccess(`Setting "${name}" updated successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.error || `Failed to update ${name}`);
    } finally {
      setSaving(prev => ({ ...prev, [name]: false }));
    }
  };

  const handleChange = (name, value) => {
    setEditValues(prev => ({ ...prev, [name]: value }));
  };

  const isModified = (name) => {
    const original = settings.find(s => s.name === name);
    return original && original.value !== editValues[name];
  };

  const getSettingLabel = (name) => {
    const labels = {
      'app_version': 'Application Version',
      'db_version': 'Database Version',
      'webapp_main_color': 'Theme Color',
      'index_page': 'Landing Page HTML',
      'client_name': 'Client Name'
    };
    return labels[name] || name;
  };

  const getSettingDescription = (name) => {
    const descriptions = {
      'app_version': 'Current version of the application',
      'db_version': 'Current version of the database schema',
      'webapp_main_color': 'Primary color theme for the application',
      'index_page': 'HTML content displayed on the public landing page',
      'client_name': 'Organization name displayed in the header'
    };
    return descriptions[name] || '';
  };

  const renderInput = (setting) => {
    const { name } = setting;
    const value = editValues[name] || '';

    if (name === 'webapp_main_color') {
      return (
        <div className="space-y-2">
          <select
            value={value}
            onChange={(e) => handleChange(name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {AVAILABLE_COLORS.map(color => (
              <option key={color} value={color}>
                {color.charAt(0).toUpperCase() + color.slice(1)}
              </option>
            ))}
          </select>
          {/* Color preview swatches */}
          <div className="flex flex-wrap gap-1 mt-2">
            {AVAILABLE_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => handleChange(name, color)}
                className={`w-8 h-8 rounded-md border-2 transition-all ${
                  value === color ? 'border-gray-900 ring-2 ring-offset-1 ring-gray-400' : 'border-transparent hover:border-gray-400'
                }`}
                style={{ backgroundColor: COLOR_PALETTE[color]?.[500] || '#888' }}
                title={color}
              />
            ))}
          </div>
        </div>
      );
    }

    if (name === 'index_page') {
      return (
        <div className="space-y-2">
          <textarea
            value={value}
            onChange={(e) => handleChange(name, e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="<h1>Welcome</h1>"
          />
          {/* HTML Preview */}
          <div className="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50">
            <div className="text-xs text-gray-500 mb-1">Preview:</div>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: value }}
            />
          </div>
        </div>
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(name, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">App Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage application-wide settings and customization options.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
          {success}
        </div>
      )}

      <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
        {settings.map((setting) => (
          <div key={setting.name} className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-900">
                  {getSettingLabel(setting.name)}
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  {getSettingDescription(setting.name)}
                </p>
                <div className="mt-3">
                  {renderInput(setting)}
                </div>
              </div>
              <div className="flex-shrink-0 md:ml-4 md:mt-6">
                <button
                  onClick={() => handleSave(setting.name)}
                  disabled={!isModified(setting.name) || saving[setting.name]}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isModified(setting.name)
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {saving[setting.name] ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info section */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="text-sm font-medium text-blue-800">About Settings</h3>
        <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
          <li><strong>Theme Color:</strong> Changes the primary color throughout the app</li>
          <li><strong>Client Name:</strong> Displayed in the header to identify the organization</li>
          <li><strong>Version Info:</strong> Shown in the sidebar footer for reference</li>
          <li><strong>Landing Page:</strong> Custom HTML for the public welcome page</li>
        </ul>
      </div>
    </div>
  );
}

export default Settings;
