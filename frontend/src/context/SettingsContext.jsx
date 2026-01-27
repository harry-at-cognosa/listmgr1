import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { applyThemeColor } from '../utils/colorPalette';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    app_version: '',
    db_version: '',
    client_name: '',
    webapp_main_color: 'blue'
  });
  const [loading, setLoading] = useState(true);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // Apply theme color when it changes
  useEffect(() => {
    if (settings.webapp_main_color) {
      applyThemeColor(settings.webapp_main_color);
    }
  }, [settings.webapp_main_color]);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/app-settings');
      setSettings(response.data);
    } catch (error) {
      // If not authenticated, try public settings
      if (error.status === 401) {
        try {
          const publicResponse = await fetch('/api/public-settings', {
            credentials: 'include'
          });
          if (publicResponse.ok) {
            const publicData = await publicResponse.json();
            setSettings(prev => ({ ...prev, ...publicData }));
          }
        } catch (publicError) {
          console.error('Error fetching public settings:', publicError);
        }
      } else {
        console.error('Error fetching app settings:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Refetch settings (useful after login or settings update)
  const refreshSettings = async () => {
    try {
      const response = await api.get('/app-settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Error refreshing app settings:', error);
    }
  };

  // Update a single setting (admin only)
  const updateSetting = async (name, value) => {
    try {
      await api.put(`/app-settings/${name}`, { value });
      setSettings(prev => ({ ...prev, [name]: value }));
      return { success: true };
    } catch (error) {
      console.error('Error updating setting:', error);
      return { success: false, error: error.error || 'Failed to update setting' };
    }
  };

  const value = {
    settings,
    loading,
    refreshSettings,
    updateSetting,
    appVersion: settings.app_version,
    dbVersion: settings.db_version,
    clientName: settings.client_name,
    themeColor: settings.webapp_main_color
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
