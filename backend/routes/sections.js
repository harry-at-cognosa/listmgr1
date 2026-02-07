const express = require('express');
const db = require('../db');
const router = express.Router();

const getDateTime = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

// Get all sections for a template
router.get('/template/:templateId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, st.plsqtst_name as section_type_name, st.plsqtst_active as section_type_active
       FROM plsqt_sections s
       LEFT JOIN plsqts_type st ON s.section_type_id = st.plsqtst_id
       WHERE s.plsqt_id = $1
       ORDER BY s.plsqts_seqn`,
      [req.params.templateId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

// Get single section
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, st.plsqtst_name as section_type_name, st.plsqtst_active as section_type_active
       FROM plsqt_sections s
       LEFT JOIN plsqts_type st ON s.section_type_id = st.plsqtst_id
       WHERE s.plsqts_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching section:', error);
    res.status(500).json({ error: 'Failed to fetch section' });
  }
});

// Create section
router.post('/template/:templateId', async (req, res) => {
  try {
    const {
      section_type_id, plsqts_seqn, plsqts_alt_name, plsqts_comment,
      plsqts_use_alt_name, plsqts_subsection_count, plsqts_active,
      plsqts_version, plsqts_extrn_file_ref, plsqts_content, plsqts_status
    } = req.body;

    if (!section_type_id) {
      return res.status(400).json({ error: 'Section type is required' });
    }

    // Validate seqn >= 0 if provided
    if (plsqts_seqn != null && plsqts_seqn !== '' && Number(plsqts_seqn) < 0) {
      return res.status(400).json({ error: 'Sequence number must be 0 or greater' });
    }

    const now = getDateTime();

    // Get max sequence number
    const maxSeq = await db.query(
      'SELECT COALESCE(MAX(plsqts_seqn), 0) as max_seqn FROM plsqt_sections WHERE plsqt_id = $1',
      [req.params.templateId]
    );
    const nextSeqn = (plsqts_seqn != null && plsqts_seqn !== '') ? Number(plsqts_seqn) : (maxSeq.rows[0].max_seqn + 1);

    const result = await db.query(
      `INSERT INTO plsqt_sections
        (plsqt_id, section_type_id, plsqts_seqn, plsqts_alt_name, plsqts_comment,
         plsqts_use_alt_name, plsqts_subsection_count, plsqts_active, plsqts_version,
         plsqts_extrn_file_ref, plsqts_content, plsqts_status, status_datetime,
         last_update_datetime, last_update_user)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        req.params.templateId, section_type_id, nextSeqn, plsqts_alt_name || null, plsqts_comment || null,
        plsqts_use_alt_name || false, plsqts_subsection_count || 0, plsqts_active !== false, plsqts_version || null,
        plsqts_extrn_file_ref || null, plsqts_content || null, plsqts_status || 'not started', now,
        now, req.session.user.username
      ]
    );

    // Update template section count
    await db.query(
      `UPDATE plsq_templates SET
        plsqt_section_count = (SELECT COUNT(*) FROM plsqt_sections WHERE plsqt_id = $1),
        last_update_datetime = $2, last_update_user = $3
       WHERE plsqt_id = $1`,
      [req.params.templateId, now, req.session.user.username]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating section:', error);
    res.status(500).json({ error: 'Failed to create section' });
  }
});

// Update section
router.put('/:id', async (req, res) => {
  try {
    const {
      section_type_id, plsqts_seqn, plsqts_alt_name, plsqts_comment,
      plsqts_use_alt_name, plsqts_subsection_count, plsqts_active,
      plsqts_version, plsqts_extrn_file_ref, plsqts_content, plsqts_status
    } = req.body;

    // Validate seqn >= 0 if provided
    if (plsqts_seqn != null && plsqts_seqn !== '' && Number(plsqts_seqn) < 0) {
      return res.status(400).json({ error: 'Sequence number must be 0 or greater' });
    }

    const now = getDateTime();

    // Get current status to check if it changed
    const current = await db.query('SELECT plsqts_status, status_datetime FROM plsqt_sections WHERE plsqts_id = $1', [req.params.id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const statusChanged = current.rows[0].plsqts_status !== plsqts_status;
    const statusDatetime = statusChanged ? now : current.rows[0].status_datetime;

    const result = await db.query(
      `UPDATE plsqt_sections SET
        section_type_id = $1, plsqts_seqn = $2, plsqts_alt_name = $3, plsqts_comment = $4,
        plsqts_use_alt_name = $5, plsqts_subsection_count = $6, plsqts_active = $7,
        plsqts_version = $8, plsqts_extrn_file_ref = $9, plsqts_content = $10, plsqts_status = $11,
        status_datetime = $12, last_update_datetime = $13, last_update_user = $14
       WHERE plsqts_id = $15
       RETURNING *`,
      [
        section_type_id, plsqts_seqn, plsqts_alt_name || null, plsqts_comment || null,
        plsqts_use_alt_name || false, plsqts_subsection_count || 0, plsqts_active,
        plsqts_version || null, plsqts_extrn_file_ref || null, plsqts_content || null, plsqts_status,
        statusDatetime || null, now, req.session.user.username,
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// Clone section within same template
router.post('/:id/clone', async (req, res) => {
  try {
    const now = getDateTime();

    // Get original section
    const original = await db.query('SELECT * FROM plsqt_sections WHERE plsqts_id = $1', [req.params.id]);
    if (original.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const s = original.rows[0];

    // Get max sequence number
    const maxSeq = await db.query(
      'SELECT COALESCE(MAX(plsqts_seqn), 0) as max_seqn FROM plsqt_sections WHERE plsqt_id = $1',
      [s.plsqt_id]
    );
    const nextSeqn = maxSeq.rows[0].max_seqn + 1;

    // Create cloned section
    const cloned = await db.query(
      `INSERT INTO plsqt_sections
        (plsqt_id, section_type_id, plsqts_seqn, plsqts_alt_name, plsqts_comment,
         plsqts_use_alt_name, plsqts_subsection_count, plsqts_active, plsqts_version,
         plsqts_extrn_file_ref, plsqts_content, plsqts_status, status_datetime,
         last_update_datetime, last_update_user)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'cloned', $12, $13, $14)
       RETURNING *`,
      [
        s.plsqt_id, s.section_type_id, nextSeqn, s.plsqts_alt_name, s.plsqts_comment,
        s.plsqts_use_alt_name, s.plsqts_subsection_count, s.plsqts_active, s.plsqts_version,
        s.plsqts_extrn_file_ref, s.plsqts_content, now,
        now, req.session.user.username
      ]
    );

    // Update template section count
    await db.query(
      `UPDATE plsq_templates SET
        plsqt_section_count = (SELECT COUNT(*) FROM plsqt_sections WHERE plsqt_id = $1),
        last_update_datetime = $2, last_update_user = $3
       WHERE plsqt_id = $1`,
      [s.plsqt_id, now, req.session.user.username]
    );

    res.status(201).json(cloned.rows[0]);
  } catch (error) {
    console.error('Error cloning section:', error);
    res.status(500).json({ error: 'Failed to clone section' });
  }
});

// Delete section (admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get template ID before deleting
    const section = await db.query('SELECT plsqt_id FROM plsqt_sections WHERE plsqts_id = $1', [req.params.id]);
    if (section.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const templateId = section.rows[0].plsqt_id;
    const now = getDateTime();

    const result = await db.query(
      'DELETE FROM plsqt_sections WHERE plsqts_id = $1 RETURNING plsqts_id',
      [req.params.id]
    );

    // Update template section count
    await db.query(
      `UPDATE plsq_templates SET
        plsqt_section_count = (SELECT COUNT(*) FROM plsqt_sections WHERE plsqt_id = $1),
        last_update_datetime = $2, last_update_user = $3
       WHERE plsqt_id = $1`,
      [templateId, now, req.session.user.username]
    );

    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

module.exports = router;
