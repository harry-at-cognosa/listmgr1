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

// Character limits for section TEXT fields (enforced in UI only)
const SECTION_CHAR_LIMITS = {
  plsqts_alt_name: 200,
  plsqts_comment: 2000,
  plsqts_version: 200,
  plsqts_extrn_file_ref: 1000,
  plsqts_content: 10000
};

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
  const [showResequence, setShowResequence] = useState(false);

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
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 flex-wrap">
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
          <div className="flex flex-col items-end gap-2">
            {(isAdmin || template.plsqt_enabled === 1 || template.plsqt_status === 'cloned' || template.plsqt_status === 'not started') && (
              <Link
                to={`/templates/${id}/edit`}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
              >
                Edit Template
              </Link>
            )}
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${template.plsqt_enabled === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              Enabled: {template.plsqt_enabled === 1 ? 'Yes' : 'No'}
            </span>
          </div>
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

        {template.plsqt_content && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <span className="text-sm text-gray-500">Content:</span>
            <p className="mt-1 text-gray-700 whitespace-pre-wrap">{template.plsqt_content}</p>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-400">
          Last updated: {template.last_update_datetime} by {template.last_update_user}
        </div>
      </div>

      {/* Document Section */}
      <DocumentSection
        templateId={id}
        template={template}
        isAdmin={isAdmin}
        onUpdate={loadData}
        setError={setError}
        setSuccess={setSuccess}
      />

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
              onClick={() => setShowResequence(true)}
              className="px-3 py-1 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded-md transition-colors"
            >
              Resequence
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
            {sections.map(section => {
              const isSectionTypeDisabled = section.section_type_active === false;
              const isTemplateDisabled = template.plsqt_enabled !== 1;
              // Non-admin users cannot edit if template is disabled OR section_type is disabled
              const canEditSection = isAdmin || (!isTemplateDisabled && !isSectionTypeDisabled);

              return (
                <div key={section.plsqts_id} className={`border rounded-lg ${isSectionTypeDisabled ? 'bg-red-50' : ''}`}>
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleSection(section.plsqts_id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 w-6">{section.plsqts_seqn}</span>
                      <span className="font-medium">
                        {section.plsqts_use_alt_name && section.plsqts_alt_name
                          ? section.plsqts_alt_name
                          : section.section_type_name}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[section.plsqts_status]}`}>
                        {section.plsqts_status}
                      </span>
                      {isSectionTypeDisabled && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          (disabled)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {canEditSection && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingSection(section); setShowSectionForm(true); }}
                          className="text-sm text-green-600 hover:text-green-800"
                        >
                          Edit
                        </button>
                      )}
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
                        {section.plsqts_comment && <div className="md:col-span-2"><span className="text-gray-500">Comment:</span> {section.plsqts_comment}</div>}
                      </div>
                      {section.plsqts_extrn_file_ref && (
                        <div className="mt-3 text-sm">
                          <span className="text-gray-500">External File Reference:</span>
                          <p className="text-gray-700">{section.plsqts_extrn_file_ref}</p>
                        </div>
                      )}
                      {section.plsqts_content && (
                        <div className="mt-3 p-2 bg-white rounded border">
                          <span className="text-xs text-gray-500">Content:</span>
                          <p className="text-gray-700 whitespace-pre-wrap">{section.plsqts_content}</p>
                        </div>
                      )}
                      <div className="mt-2 text-xs text-gray-400">
                        Last updated: {section.last_update_datetime} by {section.last_update_user}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
              {sections.map(section => {
                const isSectionTypeDisabled = section.section_type_active === false;
                return (
                  <button
                    key={section.plsqts_id}
                    onClick={() => setActiveTabId(activeTabId === section.plsqts_id ? null : section.plsqts_id)}
                    className={`
                      px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                      ${activeTabId === section.plsqts_id
                        ? 'border-primary-500 text-primary-600 bg-primary-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                      ${isSectionTypeDisabled ? 'bg-red-50' : ''}
                    `}
                  >
                    <span className="mr-2 text-gray-400">{section.plsqts_seqn}.</span>
                    {section.plsqts_use_alt_name && section.plsqts_alt_name
                      ? section.plsqts_alt_name
                      : section.section_type_name}
                    {isSectionTypeDisabled && <span className="ml-1 text-red-600">(disabled)</span>}
                  </button>
                );
              })}
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
                isAdmin={isAdmin}
                templateEnabled={template.plsqt_enabled === 1}
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

      {/* Resequence Sections Modal */}
      {showResequence && (
        <ResequenceSectionsModal
          templateId={id}
          sections={sections}
          onClose={() => setShowResequence(false)}
          onSave={() => { setShowResequence(false); loadData(); setSuccess('Sections resequenced successfully'); setTimeout(() => setSuccess(''), 3000); }}
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

function ResequenceSectionsModal({ templateId, sections, onClose, onSave }) {
  // Sort sections by current seqn, then by id for deterministic order
  const sortedSections = [...sections].sort((a, b) => {
    if (a.plsqts_seqn !== b.plsqts_seqn) return a.plsqts_seqn - b.plsqts_seqn;
    return a.plsqts_id - b.plsqts_id;
  });

  const [seqnValues, setSeqnValues] = useState(() => {
    const values = {};
    sortedSections.forEach(s => {
      values[s.plsqts_id] = s.plsqts_seqn;
    });
    return values;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSeqnChange = (sectionId, value) => {
    setSeqnValues(prev => ({
      ...prev,
      [sectionId]: value === '' ? '' : Number(value)
    }));
  };

  const handleSave = async () => {
    // Validate all values are >= 0
    for (const [id, val] of Object.entries(seqnValues)) {
      if (val === '' || val < 0) {
        setError('All sequence numbers must be 0 or greater');
        return;
      }
    }

    // Build updates array - only include changed values
    const updates = [];
    sortedSections.forEach(s => {
      if (seqnValues[s.plsqts_id] !== s.plsqts_seqn) {
        updates.push({
          plsqts_id: s.plsqts_id,
          plsqts_seqn: seqnValues[s.plsqts_id]
        });
      }
    });

    if (updates.length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api.put(`/sections/template/${templateId}/resequence`, { updates });
      onSave();
    } catch (err) {
      setError(err.error || 'Failed to resequence sections');
    } finally {
      setSaving(false);
    }
  };

  // Get section display name
  const getSectionName = (section) => {
    if (section.plsqts_use_alt_name && section.plsqts_alt_name) {
      return section.plsqts_alt_name;
    }
    return section.section_type_name;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-2">Resequence Sections</h3>
          <p className="text-sm text-gray-500 mb-4">
            Edit sequence numbers to reorder sections. Duplicates are allowed for alternative sections.
          </p>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>}

          <div className="space-y-2">
            {/* Header row */}
            <div className="grid grid-cols-[80px_1fr] gap-3 px-2 py-1 text-sm font-medium text-gray-500 border-b">
              <div>Seq #</div>
              <div>Section Name</div>
            </div>

            {/* Section rows */}
            {sortedSections.map(section => (
              <div
                key={section.plsqts_id}
                className="grid grid-cols-[80px_1fr] gap-3 items-center px-2 py-1"
              >
                <input
                  type="number"
                  min="0"
                  value={seqnValues[section.plsqts_id] ?? ''}
                  onChange={(e) => handleSeqnChange(section.plsqts_id, e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <div className="text-sm text-gray-700 truncate" title={getSectionName(section)}>
                  {getSectionName(section)}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
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
    plsqts_seqn: section?.plsqts_seqn ?? '',
    plsqts_alt_name: section?.plsqts_alt_name || '',
    plsqts_comment: section?.plsqts_comment || '',
    plsqts_use_alt_name: section?.plsqts_use_alt_name || false,
    plsqts_active: section?.plsqts_active !== false,
    plsqts_version: section?.plsqts_version || '',
    plsqts_extrn_file_ref: section?.plsqts_extrn_file_ref || '',
    plsqts_content: section?.plsqts_content || '',
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
                  name="plsqts_seqn"
                  value={formData.plsqts_seqn}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Name</label>
                <input
                  type="text"
                  name="plsqts_alt_name"
                  value={formData.plsqts_alt_name}
                  onChange={handleChange}
                  maxLength={SECTION_CHAR_LIMITS.plsqts_alt_name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-gray-500">{formData.plsqts_alt_name.length}/{SECTION_CHAR_LIMITS.plsqts_alt_name}</p>
              </div>
              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="plsqts_use_alt_name"
                    checked={formData.plsqts_use_alt_name}
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
                  {STATUS_OPTIONS.map(s => (
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
                  maxLength={SECTION_CHAR_LIMITS.plsqts_version}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-gray-500">{formData.plsqts_version.length}/{SECTION_CHAR_LIMITS.plsqts_version}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
              <textarea
                name="plsqts_comment"
                value={formData.plsqts_comment}
                onChange={handleChange}
                rows={3}
                maxLength={SECTION_CHAR_LIMITS.plsqts_comment}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
              />
              <p className="mt-1 text-sm text-gray-500">{formData.plsqts_comment.length}/{SECTION_CHAR_LIMITS.plsqts_comment}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">External File Reference</label>
              <textarea
                name="plsqts_extrn_file_ref"
                value={formData.plsqts_extrn_file_ref}
                onChange={handleChange}
                rows={2}
                maxLength={SECTION_CHAR_LIMITS.plsqts_extrn_file_ref}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
              />
              <p className="mt-1 text-sm text-gray-500">{formData.plsqts_extrn_file_ref.length}/{SECTION_CHAR_LIMITS.plsqts_extrn_file_ref}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                name="plsqts_content"
                value={formData.plsqts_content}
                onChange={handleChange}
                rows={6}
                maxLength={SECTION_CHAR_LIMITS.plsqts_content}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
              />
              <p className="mt-1 text-sm text-gray-500">{formData.plsqts_content.length}/{SECTION_CHAR_LIMITS.plsqts_content}</p>
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
function SectionTabForm({ templateId, section, sectionTypes, onSave, isAdmin, templateEnabled }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');

  // Check if editing is allowed for this section
  const isSectionTypeDisabled = section?.section_type_active === false;
  const canEdit = isAdmin || (templateEnabled && !isSectionTypeDisabled);
  const isSubmittingRef = useRef(false);
  const [formData, setFormData] = useState({
    section_type_id: section?.section_type_id || '',
    plsqts_seqn: section?.plsqts_seqn ?? '',
    plsqts_alt_name: section?.plsqts_alt_name || '',
    plsqts_comment: section?.plsqts_comment || '',
    plsqts_use_alt_name: section?.plsqts_use_alt_name || false,
    plsqts_active: section?.plsqts_active !== false,
    plsqts_version: section?.plsqts_version || '',
    plsqts_extrn_file_ref: section?.plsqts_extrn_file_ref || '',
    plsqts_content: section?.plsqts_content || '',
    plsqts_status: section?.plsqts_status || 'not started'
  });

  // Reset form when section changes (user clicks different tab)
  useEffect(() => {
    if (section) {
      setFormData({
        section_type_id: section.section_type_id || '',
        plsqts_seqn: section.plsqts_seqn ?? '',
        plsqts_alt_name: section.plsqts_alt_name || '',
        plsqts_comment: section.plsqts_comment || '',
        plsqts_use_alt_name: section.plsqts_use_alt_name || false,
        plsqts_active: section.plsqts_active !== false,
        plsqts_version: section.plsqts_version || '',
        plsqts_extrn_file_ref: section.plsqts_extrn_file_ref || '',
        plsqts_content: section.plsqts_content || '',
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

  // Show a message if the user can't edit this section
  if (!canEdit) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium text-red-800">
            {!templateEnabled
              ? 'This template is disabled. Only administrators can edit its sections.'
              : 'This section type is disabled. Only administrators can edit this section.'}
          </span>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><span className="text-gray-500">Type:</span> {section.section_type_name}</div>
            <div><span className="text-gray-500">Sequence:</span> {section.plsqts_seqn}</div>
            <div><span className="text-gray-500">Status:</span> {section.plsqts_status}</div>
            <div><span className="text-gray-500">Active:</span> {section.plsqts_active ? 'Yes' : 'No'}</div>
          </div>
          {section.plsqts_content && (
            <div className="mt-3 p-2 bg-white rounded border">
              <span className="text-xs text-gray-500">Content:</span>
              <p className="text-gray-700 whitespace-pre-wrap">{section.plsqts_content}</p>
            </div>
          )}
          <div className="mt-2 text-xs text-gray-400">
            Last updated: {section.last_update_datetime} by {section.last_update_user}
          </div>
        </div>
      </div>
    );
  }

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
              name="plsqts_seqn"
              value={formData.plsqts_seqn}
              onChange={handleChange}
              min="0"
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
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Name</label>
            <input
              type="text"
              name="plsqts_alt_name"
              value={formData.plsqts_alt_name}
              onChange={handleChange}
              maxLength={SECTION_CHAR_LIMITS.plsqts_alt_name}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="mt-1 text-xs text-gray-500">{formData.plsqts_alt_name.length}/{SECTION_CHAR_LIMITS.plsqts_alt_name}</p>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="plsqts_use_alt_name"
                checked={formData.plsqts_use_alt_name}
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
              maxLength={SECTION_CHAR_LIMITS.plsqts_version}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="mt-1 text-xs text-gray-500">{formData.plsqts_version.length}/{SECTION_CHAR_LIMITS.plsqts_version}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
          <textarea
            name="plsqts_comment"
            value={formData.plsqts_comment}
            onChange={handleChange}
            rows={3}
            maxLength={SECTION_CHAR_LIMITS.plsqts_comment}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
          />
          <p className="mt-1 text-sm text-gray-500">{formData.plsqts_comment.length}/{SECTION_CHAR_LIMITS.plsqts_comment}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">External File Reference</label>
          <textarea
            name="plsqts_extrn_file_ref"
            value={formData.plsqts_extrn_file_ref}
            onChange={handleChange}
            rows={2}
            maxLength={SECTION_CHAR_LIMITS.plsqts_extrn_file_ref}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
          />
          <p className="mt-1 text-sm text-gray-500">{formData.plsqts_extrn_file_ref.length}/{SECTION_CHAR_LIMITS.plsqts_extrn_file_ref}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <textarea
            name="plsqts_content"
            value={formData.plsqts_content}
            onChange={handleChange}
            rows={6}
            maxLength={SECTION_CHAR_LIMITS.plsqts_content}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
          />
          <p className="mt-1 text-sm text-gray-500">{formData.plsqts_content.length}/{SECTION_CHAR_LIMITS.plsqts_content}</p>
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

// Document upload/download section for template detail page
function DocumentSection({ templateId, template, isAdmin, onUpdate, setError, setSuccess }) {
  const [docInfo, setDocInfo] = useState(null);
  const [docLoading, setDocLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

  useEffect(() => {
    loadDocInfo();
  }, [templateId]);

  const loadDocInfo = async () => {
    try {
      setDocLoading(true);
      const res = await api.get(`/templates/${templateId}/document/info`);
      setDocInfo(res.data);
    } catch (err) {
      // If template just has no doc info endpoint, treat as no document
      setDocInfo({ has_document: false });
    } finally {
      setDocLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset file input so same file can be selected again
    e.target.value = '';

    // Client-side validation: file type
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setUploadError('Only .docx files are allowed.');
      setTimeout(() => setUploadError(''), 5000);
      return;
    }

    // Client-side validation: file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File size exceeds 4MB limit. Please choose a smaller file.');
      setTimeout(() => setUploadError(''), 5000);
      return;
    }

    // Upload the file
    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('document', file);

      await api.upload(`/templates/${templateId}/document`, formData);
      setSuccess('Document uploaded successfully');
      setTimeout(() => setSuccess(''), 3000);
      loadDocInfo();
      onUpdate(); // Refresh template data
    } catch (err) {
      setUploadError(err.error || 'Failed to upload document');
      setTimeout(() => setUploadError(''), 5000);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = () => {
    // Open download URL in new window - the browser will handle the download
    const downloadUrl = api.getDownloadUrl(`/templates/${templateId}/document`);
    window.open(downloadUrl, '_blank');
  };

  const handleRemoveDocument = async () => {
    if (!window.confirm('Are you sure you want to remove this document? The document will be archived in version history.')) {
      return;
    }

    try {
      await api.delete(`/templates/${templateId}/document`);
      setSuccess('Document removed successfully');
      setTimeout(() => setSuccess(''), 3000);
      loadDocInfo();
      onUpdate();
    } catch (err) {
      setError(err.error || 'Failed to remove document');
      setTimeout(() => setError(''), 5000);
    }
  };

  if (docLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Document</h3>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">Document</h3>
        <span className="text-xs text-gray-400">(optional)</span>
      </div>

      {uploadError && (
        <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-md text-sm">{uploadError}</div>
      )}

      {docInfo && docInfo.has_document ? (
        // Document exists - show info + download/replace/remove options
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Document icon */}
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-800">{docInfo.original_filename || 'Document'}</p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(docInfo.size_bytes)}
                  {docInfo.created_at && (' \u00B7 Uploaded ' + formatDate(docInfo.created_at))}
                </p>
                {docInfo.blob_id && (
                  <p className="text-xs text-gray-400 mt-0.5">Blob ID: {docInfo.blob_id}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 py-1.5 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded-md transition-colors disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Replace'}
              </button>
              {isAdmin && (
                <button
                  onClick={handleRemoveDocument}
                  className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                  title="Remove document (admin only)"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        // No document - show upload area
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors cursor-pointer"
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="mt-2 text-sm text-gray-600">No document attached</p>
          <button
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            disabled={uploading}
            className="mt-3 px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Uploading...
              </span>
            ) : (
              'Upload Document'
            )}
          </button>
          <p className="mt-2 text-xs text-gray-400">.docx files only, max 4MB</p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

export default TemplateDetail;
