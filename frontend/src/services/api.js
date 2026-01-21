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

// Helper to parse error response
const parseErrorResponse = async (response) => {
  // For proxy/server errors (500, 502, 503, 504), return user-friendly message
  if (response.status >= 500) {
    return { error: NETWORK_ERROR_MESSAGE, isNetworkError: true };
  }

  // Try to parse JSON error response
  try {
    return await response.json();
  } catch {
    // If response is not JSON (e.g., HTML error page from proxy), return generic message
    return { error: 'Request failed' };
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
      const error = await parseErrorResponse(response);
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
      const error = await parseErrorResponse(response);
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
      const error = await parseErrorResponse(response);
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
      const error = await parseErrorResponse(response);
      throw { status: response.status, ...error };
    }

    return { data: await response.json() };
  }
};

export default api;
