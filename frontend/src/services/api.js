const API_BASE = '/api';

// User-friendly error message for network failures
const NETWORK_ERROR_MESSAGE = 'Unable to connect to the server. Please check your connection and try again.';

// Helper to handle fetch with network error handling
const safeFetch = async (url, options) => {
  try {
    return await fetch(url, options);
  } catch (err) {
    // Network error (server unreachable, no internet, etc.)
    if (err instanceof TypeError) {
      throw { status: 0, error: NETWORK_ERROR_MESSAGE, isNetworkError: true };
    }
    throw err;
  }
};

const api = {
  async get(url) {
    const response = await safeFetch(`${API_BASE}${url}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw { status: response.status, ...error };
    }

    return { data: await response.json() };
  },

  async post(url, data) {
    const response = await safeFetch(`${API_BASE}${url}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw { status: response.status, ...error };
    }

    return { data: await response.json() };
  },

  async put(url, data) {
    const response = await safeFetch(`${API_BASE}${url}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw { status: response.status, ...error };
    }

    return { data: await response.json() };
  },

  async delete(url) {
    const response = await safeFetch(`${API_BASE}${url}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw { status: response.status, ...error };
    }

    return { data: await response.json() };
  }
};

export default api;
