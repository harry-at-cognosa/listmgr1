import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const STATUS_COLORS = {
  'not started': 'bg-gray-100 text-gray-800',
  'in process': 'bg-blue-100 text-blue-800',
  'in review': 'bg-yellow-100 text-yellow-800',
  'approved': 'bg-green-100 text-green-800',
  'cloned': 'bg-purple-100 text-purple-800'
};

const STATUS_OPTIONS = ['not started', 'in process', 'in review', 'approved', 'cloned'];

function TemplateDetail() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const location = useLocation();

  // Get preserved search params from location state (passed when clicking from Templates list)
  // This allows breadcrumb navigation back to preserve filters
  const preservedSearchParams = location.state?.searchParams || '';
  const templatesUrl = preservedSearchParams ? `/templates?${preservedSearchParams}` : '/templates';

  const [template, setTemplate] = useState(null);
  const [sections, setSections] = useState([]);
  const [sectionTypes, setSectionTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedSections, setExpandedSections] = useState({});
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [activeTabId, setActiveTabId] = useState(null); // For tabbed section editor
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [cascadeToSections, setCascadeToSections] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templateRes, sectionsRes, typesRes] = await Promise.all([
        api.get(`/templates/${id}`),
        api.get(`/sections/template/${id}`),
        api.get('/section-types')
      ]);
      setTemplate(templateRes.data);
      setSections(sectionsRes.data);
      setSectionTypes(typesRes.data);
    } catch (err) {
      setError(err.error || 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const expandAll = () => {
    const expanded = {};
    sections.forEach(s => { expanded[s.plsqts_id] = true; });
    setExpandedSections(expanded);
  };

  const collapseAll = () => {
    setExpandedSections({});
  };

  const handleCloneSection = async (sectionId) => {
    try {
      await api.post(`/sections/${sectionId}/clone`);
      setSuccess('Section cloned successfully');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to clone section');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!window.confirm('Are you sure you want to delete this section?')) return;
    try {
      await api.delete(`/sections/${sectionId}`);
      setSuccess('Section deleted successfully');
      // If the deleted section was the active tab, reset
      if (activeTabId === sectionId) {
        setActiveTabId(null);
      }
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.error || 'Failed to delete section');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Handle tab-based section save
  const handleTabSectionSave = () => {
    loadData();
    setSuccess('Section saved successfully');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Handle status change with optional cascade to sections
  const handleStatusChange = async (e) => {
    e.preventDefault();
    if (!newStatus || newStatus === template.plsqt_status) {
      setShowStatusChange(false);
      return;
    }

    setStatusChanging(true);
    setError('');

    try {
      await api.put(`/templates/${id}/status`, {
        plsqt_status: newStatus,
        cascade: cascadeToSections
      });
      const message = cascadeToSections
        ? 'Template and all section statuses updated successfully'
        : 'Template status updated successfully';
      setSuccess(message);
      setShowStatusChange(false);
      setCascadeToSections(false);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.error || 'Failed to update status');
      setTimeout(() => setError(''), 3000);
    } finally {
      setStatusChanging(false);
    }
  };

  const openStatusChangeForm = () => {
    setNewStatus(template.plsqt_status);
    setCascadeToSections(false);
    setShowStatusChange(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!template) {
    return <div className="p-8 text-center text-gray-500">Template not found</div>;
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm">
        <Link to={templatesUrl} className="text-primary-600 hover:text-primary-800">Home</Link>
        <span className="mx-2 text-gray-400">&gt;</span>
        <Link to={templatesUrl} className="text-primary-600 hover:text-primary-800">Templates</Link>
        <span className="mx-2 text-gray-400">&gt;</span>
        <span className="text-gray-600">{template.plsqt_name}</span>
      </nav>

      {/* Messages */}
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">{success}</div>}

      {/* Template Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{template.plsqt_name}</h2>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[template.plsqt_status]}`}>
                {template.plsqt_status}
              </span>
              <button
                onClick={openStatusChangeForm}
                className="text-xs text-primary-600 hover:text-primary-800 underline"
              >
                Change Status
              </button>
              {template.country_name && <span>Country: {template.country_name}</span>}
              {template.product_line_name && <span>Product Line: {template.product_line_name}</span>}
              <span>Sections: {template.plsqt_section_count}</span>
            </div>
          </div>
          <Link
            to={`/templates/${id}/edit`}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
          >
            Edit Template
          </Link>
        </div>

        {template.plsqt_desc && (
          <p className="mt-4 text-gray-600">{template.plsqt_desc}</p>
        )}

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {template.currency_symbol && (
            <div><span className="text-gray-500">Currency:</span> {template.currency_symbol}</div>
          )}
          {template.product_cat_name && (
            <div><span className="text-gray-500">Category:</span> {template.product_cat_name}</div>
          )}
          {template.plsqt_version && (
            <div><span className="text-gray-500">Version:</span> {template.plsqt_version}</div>
          )}
          <div><span className="text-gray-500">Active:</span> {template.plsqt_active ? 'Yes' : 'No'}</div>
        </div>

        {template.content && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <span className="text-sm text-gray-500">Content:</span>
            <p className="mt-1 text-gray-700">{template.content}</p>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-400">
          Last updated: {template.last_update_datetime} by {template.last_update_user}
        </div>
      </div>

      {/* Sections */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Sections ({sections.length})</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Collapse All
            </button>
            <button
              onClick={() => { setShowSectionForm(true); setEditingSection(null); }}
              className="px-3 py-1 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
            >
              + Add Section
            </button>
          </div>
        </div>

        {sections.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No sections yet. Add your first section!
          </div>
        ) : (
          <div className="space-y-2">
            {sections.map(section => (
              <div key={section.plsqts_id} className="border rounded-lg">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection(section.plsqts_id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 w-6">{section.plsqt_seqn}</span>
                    <span className="font-medium">
                      {section.plsqt_use_alt_name && section.plsqt_alt_name
                        ? section.plsqt_alt_name
                        : section.section_type_name}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[section.plsqts_status]}`}>
                      {section.plsqts_status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingSection(section); setShowSectionForm(true); }}
                      className="text-sm text-green-600 hover:text-green-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCloneSection(section.plsqts_id); }}
                      className="text-sm text-purple-600 hover:text-purple-800"
                    >
                      Clone
                    </button>
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteSection(section.plsqts_id); }}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    )}
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections[section.plsqts_id] ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {expandedSections[section.plsqts_id] && (
                  <div className="p-4 border-t bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><span className="text-gray-500">Type:</span> {section.section_type_name}</div>
                      <div><span className="text-gray-500">Active:</span> {section.plsqts_active ? 'Yes' : 'No'}</div>
                      {section.plsqts_version && <div><span className="text-gray-500">Version:</span> {section.plsqts_version}</div>}
                      {section.plsqt_comment && <div><span className="text-gray-500">Comment:</span> {section.plsqt_comment}</div>}
                    </div>
                    {section.content && (
                      <div className="mt-3 p-2 bg-white rounded border">
                        <span className="text-xs text-gray-500">Content:</span>
                        <p className="text-gray-700">{section.content}</p>
                      </div>
                    )}
                    <div className="mt-2 text-xs text-gray-400">
                      Last updated: {section.last_update_datetime} by {section.last_update_user}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabbed Section Editor */}
      {sections.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Section Editor (Tabs)</h3>

          {/* Tab Bar */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px space-x-1 overflow-x-auto" aria-label="Section tabs">
              {sections.map(section => (
                <button
                  key={section.plsqts_id}
                  onClick={() => setActiveTabId(activeTabId === section.plsqts_id ? null : section.plsqts_id)}
                  className={`
                    px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                    ${activeTabId === section.plsqts_id
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <span className="mr-2 text-gray-400">{section.plsqt_seqn}.</span>
                  {section.plsqt_use_alt_name && section.plsqt_alt_name
                    ? section.plsqt_alt_name
                    : section.section_type_name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content - Section Form */}
          {activeTabId ? (
            <div className="pt-4">
              <SectionTabForm
                templateId={id}
                section={sections.find(s => s.plsqts_id === activeTabId)}
                sectionTypes={sectionTypes}
                onSave={handleTabSectionSave}
              />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Click a tab above to edit that section
            </div>
          )}
        </div>
      )}

      {/* Section Form Modal */}
      {showSectionForm && (
        <SectionFormModal
          templateId={id}
          section={editingSection}
          sectionTypes={sectionTypes}
          onClose={() => { setShowSectionForm(false); setEditingSection(null); }}
          onSave={() => { setShowSectionForm(false); setEditingSection(null); loadData(); setSuccess('Section saved successfully'); setTimeout(() => setSuccess(''), 3000); }}
        />
      )}

      {/* Status Change Modal */}
      {showStatusChange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Change Template Status</h3>

              <form onSubmit={handleStatusChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {sections.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-md">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={cascadeToSections}
                        onChange={(e) => setCascadeToSections(e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Apply status to all {sections.length} section{sections.length !== 1 ? 's' : ''}
                      </span>
                    </label>
                    <p className="mt-1 ml-6 text-xs text-gray-500">
                      When checked, all sections will also be updated to "{newStatus}"
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowStatusChange(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={statusChanging || newStatus === template.plsqt_status}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50"
                  >
                    {statusChanging ? 'Updating...' : 'Update Status'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionFormModal({ templateId, section, sectionTypes, onClose, onSave }) {
  const isEditing = !!section;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isSubmittingRef = useRef(false);
  const [formData, setFormData] = useState({
    section_type_id: section?.section_type_id || '',
    plsqt_seqn: section?.plsqt_seqn || '',
    plsqt_alt_name: section?.plsqt_alt_name || '',
    plsqt_comment: section?.plsqt_comment || '',
    plsqt_use_alt_name: section?.plsqt_use_alt_name || false,
    plsqts_active: section?.plsqts_active !== false,
    plsqts_version: section?.plsqts_version || '',
    content: section?.content || '',
    plsqts_status: section?.plsqts_status || 'not started'
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Prevent double-submit using ref (synchronous check)
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSaving(true);
    setError('');

    try {
      if (isEditing) {
        await api.put(`/sections/${section.plsqts_id}`, formData);
      } else {
        await api.post(`/sections/template/${templateId}`, formData);
      }
      onSave();
    } catch (err) {
      setError(err.error || 'Failed to save section');
      isSubmittingRef.current = false; // Reset on error so user can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Section' : 'Add New Section'}</h3>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section Type *</label>
                <select
                  name="section_type_id"
                  value={formData.section_type_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Type</option>
                  {sectionTypes.map(t => (
                    <option key={t.plsqtst_id} value={t.plsqtst_id}>{t.plsqtst_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sequence</label>
                <input
                  type="number"
                  name="plsqt_seqn"
                  value={formData.plsqt_seqn}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Name</label>
                <input
                  type="text"
                  name="plsqt_alt_name"
                  value={formData.plsqt_alt_name}
                  onChange={handleChange}
                  maxLength={50}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="plsqt_use_alt_name"
                    checked={formData.plsqt_use_alt_name}
                    onChange={handleChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Use Alternate Name</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="plsqts_status"
                  value={formData.plsqts_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {['not started', 'in process', 'in review', 'approved', 'cloned'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                <input
                  type="text"
                  name="plsqts_version"
                  value={formData.plsqts_version}
                  onChange={handleChange}
                  maxLength={25}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="mt-1 text-sm text-gray-500">{formData.content.length}/500</p>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="plsqts_active"
                  checked={formData.plsqts_active}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Inline section form for tabbed editor (not a modal)
function SectionTabForm({ templateId, section, sectionTypes, onSave }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');
  const isSubmittingRef = useRef(false);
  const [formData, setFormData] = useState({
    section_type_id: section?.section_type_id || '',
    plsqt_seqn: section?.plsqt_seqn || '',
    plsqt_alt_name: section?.plsqt_alt_name || '',
    plsqt_comment: section?.plsqt_comment || '',
    plsqt_use_alt_name: section?.plsqt_use_alt_name || false,
    plsqts_active: section?.plsqts_active !== false,
    plsqts_version: section?.plsqts_version || '',
    content: section?.content || '',
    plsqts_status: section?.plsqts_status || 'not started'
  });

  // Reset form when section changes (user clicks different tab)
  useEffect(() => {
    if (section) {
      setFormData({
        section_type_id: section.section_type_id || '',
        plsqt_seqn: section.plsqt_seqn || '',
        plsqt_alt_name: section.plsqt_alt_name || '',
        plsqt_comment: section.plsqt_comment || '',
        plsqt_use_alt_name: section.plsqt_use_alt_name || false,
        plsqts_active: section.plsqts_active !== false,
        plsqts_version: section.plsqts_version || '',
        content: section.content || '',
        plsqts_status: section.plsqts_status || 'not started'
      });
      setError('');
      setLocalSuccess('');
    }
  }, [section?.plsqts_id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Prevent double-submit using ref (synchronous check)
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSaving(true);
    setError('');
    setLocalSuccess('');

    try {
      await api.put(`/sections/${section.plsqts_id}`, formData);
      setLocalSuccess('Section updated successfully!');
      onSave();
      setTimeout(() => setLocalSuccess(''), 3000);
    } catch (err) {
      setError(err.error || 'Failed to save section');
    } finally {
      setSaving(false);
      isSubmittingRef.current = false; // Reset for tab form since it stays open
    }
  };

  if (!section) return null;

  return (
    <div>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>}
      {localSuccess && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">{localSuccess}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section Type *</label>
            <select
              name="section_type_id"
              value={formData.section_type_id}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select Type</option>
              {sectionTypes.map(t => (
                <option key={t.plsqtst_id} value={t.plsqtst_id}>{t.plsqtst_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sequence</label>
            <input
              type="number"
              name="plsqt_seqn"
              value={formData.plsqt_seqn}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="plsqts_status"
              value={formData.plsqts_status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {['not started', 'in process', 'in review', 'approved', 'cloned'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Name</label>
            <input
              type="text"
              name="plsqt_alt_name"
              value={formData.plsqt_alt_name}
              onChange={handleChange}
              maxLength={50}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="plsqt_use_alt_name"
                checked={formData.plsqt_use_alt_name}
                onChange={handleChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Use Alternate Name</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
            <input
              type="text"
              name="plsqts_version"
              value={formData.plsqts_version}
              onChange={handleChange}
              maxLength={25}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows={4}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p className="mt-1 text-sm text-gray-500">{formData.content.length}/500</p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="plsqts_active"
              checked={formData.plsqts_active}
              onChange={handleChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Active</span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <div className="mt-4 text-xs text-gray-400">
        Last updated: {section.last_update_datetime} by {section.last_update_user}
      </div>
    </div>
  );
}

export default TemplateDetail;
