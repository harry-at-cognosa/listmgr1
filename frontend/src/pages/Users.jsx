import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function Users() {
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (id === currentUser?.user_id) {
      setError('You cannot delete your own account');
      setTimeout(() => setError(''), 3000);
      return;
    }
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      setSuccess('User deleted successfully');
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.error || 'Failed to delete user');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
        <p className="text-gray-600">You must be an administrator to access this page.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
        <button
          onClick={() => { setShowForm(true); setEditingUser(null); }}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
        >
          + Add User
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">{success}</div>}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">
                    {user.username}
                    {user.user_id === currentUser?.id && (
                      <span className="ml-2 text-xs text-primary-600">(you)</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.last_update_datetime} by {user.last_update_user}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => { setEditingUser(user); setShowForm(true); }}
                      className="text-sm text-green-600 hover:text-green-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user.user_id)}
                      className="text-sm text-red-600 hover:text-red-800"
                      disabled={user.user_id === currentUser?.id}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <UserFormModal
          user={editingUser}
          onClose={() => { setShowForm(false); setEditingUser(null); }}
          onSave={() => { setShowForm(false); setEditingUser(null); loadUsers(); setSuccess('User saved successfully'); setTimeout(() => setSuccess(''), 3000); }}
        />
      )}
    </div>
  );
}

function UserFormModal({ user, onClose, onSave }) {
  const isEditing = !!user;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    username: user?.username || '',
    password: '',
    role: user?.role || 'user'
  });

  // Validate form and return errors object
  const validateForm = () => {
    const errors = {};

    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (formData.username.trim().length > 50) {
      errors.username = 'Username must be 50 characters or less';
    }

    // Password validation (required for new users)
    if (!isEditing) {
      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (formData.password.length < 3) {
        errors.password = 'Password must be at least 3 characters';
      }
    } else if (formData.password && formData.password.length < 3) {
      // For editing, only validate if password is provided
      errors.password = 'Password must be at least 3 characters';
    }

    return errors;
  };

  // Clear field error when user starts typing
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear the specific field error when user types
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSaving(true);

    try {
      const data = { ...formData };
      if (isEditing && !data.password) {
        delete data.password; // Don't update password if not provided
      }
      if (isEditing) {
        await api.put(`/users/${user.user_id}`, data);
      } else {
        await api.post('/users', data);
      }
      onSave();
    } catch (err) {
      // Handle server-side errors (like duplicate username)
      if (err.error && err.error.toLowerCase().includes('username')) {
        setFieldErrors({ username: err.error });
      } else {
        setError(err.error || 'Failed to save user');
      }
    } finally {
      setSaving(false);
    }
  };

  // Helper to get input class based on error state
  const getInputClass = (fieldName) => {
    const baseClass = "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2";
    if (fieldErrors[fieldName]) {
      return `${baseClass} border-red-500 focus:ring-red-500 focus:border-red-500`;
    }
    return `${baseClass} border-gray-300 focus:ring-primary-500 focus:border-primary-500`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">{isEditing ? 'Edit User' : 'Add User'}</h3>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleFieldChange('username', e.target.value)}
                maxLength={50}
                className={getInputClass('username')}
              />
              {fieldErrors.username && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.username}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password {isEditing ? '(leave blank to keep current)' : '*'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                className={getInputClass('password')}
              />
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => handleFieldChange('role', e.target.value)}
                className={getInputClass('role')}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              {fieldErrors.role && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.role}</p>
              )}
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

export default Users;
