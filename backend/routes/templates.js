const express = require('express');
const db = require('../db');
const router = express.Router();

const getDateTime = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

// Get all templates with optional filters
router.get('/', async (req, res) => {
  try {
    const { country_id, product_cat_id, product_line_id, active, search } = req.query;

    let query = `
      SELECT t.*,
        c.country_name, c.country_abbr,
        cur.currency_symbol, cur.currency_name,
        pc.product_cat_name, pc.product_cat_abbr,
        pl.product_line_name, pl.product_line_abbr
      FROM plsq_templates t
      LEFT JOIN country c ON t.country_id = c.country_id
      LEFT JOIN currency cur ON t.currency_id = cur.currency_id
      LEFT JOIN product_cat pc ON t.product_cat_id = pc.product_cat_id
      LEFT JOIN product_line pl ON t.product_line_id = pl.product_line_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (country_id) {
      paramCount++;
      query += ` AND t.country_id = $${paramCount}`;
      params.push(country_id);
    }

    if (product_cat_id) {
      paramCount++;
      query += ` AND t.product_cat_id = $${paramCount}`;
      params.push(product_cat_id);
    }

    if (product_line_id) {
      paramCount++;
      query += ` AND t.product_line_id = $${paramCount}`;
      params.push(product_line_id);
    }

    if (active !== undefined && active !== '') {
      paramCount++;
      query += ` AND t.plsqt_active = $${paramCount}`;
      params.push(active === 'true');
    }

    if (search) {
      paramCount++;
      query += ` AND t.plsqt_name LIKE $${paramCount}`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY t.plsqt_name';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get single template
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT t.*,
        c.country_name, c.country_abbr,
        cur.currency_symbol, cur.currency_name,
        pc.product_cat_name, pc.product_cat_abbr,
        pl.product_line_name, pl.product_line_abbr
       FROM plsq_templates t
       LEFT JOIN country c ON t.country_id = c.country_id
       LEFT JOIN currency cur ON t.currency_id = cur.currency_id
       LEFT JOIN product_cat pc ON t.product_cat_id = pc.product_cat_id
       LEFT JOIN product_line pl ON t.product_line_id = pl.product_line_id
       WHERE t.plsqt_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create template
router.post('/', async (req, res) => {
  try {
    const {
      country_id, currency_id, product_cat_id, product_line_id,
      plsqt_name, plsqt_order_codes, plsqt_desc, plsqt_comment,
      plsqt_fbo_location, plsqs_as_of_date, extrn_file_ref,
      plsqt_active, plsqt_version, content, plsqt_status
    } = req.body;

    if (!plsqt_name) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    const now = getDateTime();
    const result = await db.query(
      `INSERT INTO plsq_templates
        (country_id, currency_id, product_cat_id, product_line_id,
         plsqt_name, plsqt_order_codes, plsqt_desc, plsqt_comment,
         plsqt_section_count, plsqt_fbo_location, plsqs_as_of_date, extrn_file_ref,
         plsqt_active, plsqt_version, content, plsqt_status, status_datetime,
         last_update_datetime, last_update_user)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        country_id || null, currency_id || null, product_cat_id || null, product_line_id || null,
        plsqt_name, plsqt_order_codes, plsqt_desc, plsqt_comment,
        plsqt_fbo_location, plsqs_as_of_date || null, extrn_file_ref,
        plsqt_active !== false, plsqt_version, content, plsqt_status || 'not started', now,
        now, req.session.user.username
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/:id', async (req, res) => {
  try {
    const {
      country_id, currency_id, product_cat_id, product_line_id,
      plsqt_name, plsqt_order_codes, plsqt_desc, plsqt_comment,
      plsqt_fbo_location, plsqs_as_of_date, extrn_file_ref,
      plsqt_active, plsqt_version, content, plsqt_status
    } = req.body;

    const now = getDateTime();

    // Get current status to check if it changed
    const current = await db.query('SELECT plsqt_status, status_datetime FROM plsq_templates WHERE plsqt_id = $1', [req.params.id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const statusChanged = current.rows[0].plsqt_status !== plsqt_status;
    const statusDatetime = statusChanged ? now : current.rows[0].status_datetime;

    await db.query(
      `UPDATE plsq_templates SET
        country_id = $1, currency_id = $2, product_cat_id = $3, product_line_id = $4,
        plsqt_name = $5, plsqt_order_codes = $6, plsqt_desc = $7, plsqt_comment = $8,
        plsqt_fbo_location = $9, plsqs_as_of_date = $10, extrn_file_ref = $11,
        plsqt_active = $12, plsqt_version = $13, content = $14, plsqt_status = $15,
        status_datetime = $16, last_update_datetime = $17, last_update_user = $18
       WHERE plsqt_id = $19`,
      [
        country_id || null, currency_id || null, product_cat_id || null, product_line_id || null,
        plsqt_name, plsqt_order_codes, plsqt_desc, plsqt_comment,
        plsqt_fbo_location, plsqs_as_of_date || null, extrn_file_ref,
        plsqt_active === true || plsqt_active === 'true', plsqt_version, content, plsqt_status,
        statusDatetime, now, req.session.user.username,
        req.params.id
      ]
    );

    // Get the updated row
    const result = await db.query('SELECT * FROM plsq_templates WHERE plsqt_id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Update template status (with optional cascade to sections)
router.put('/:id/status', async (req, res) => {
  try {
    const { plsqt_status, cascade } = req.body;
    const now = getDateTime();

    const updateResult = await db.query(
      `UPDATE plsq_templates SET
        plsqt_status = $1, status_datetime = $2,
        last_update_datetime = $2, last_update_user = $3
       WHERE plsqt_id = $4`,
      [plsqt_status, now, req.session.user.username, req.params.id]
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Cascade to sections if requested
    if (cascade) {
      await db.query(
        `UPDATE plsqt_sections SET
          plsqts_status = $1, status_datetime = $2,
          last_update_datetime = $2, last_update_user = $3
         WHERE plsqt_id = $4`,
        [plsqt_status, now, req.session.user.username, req.params.id]
      );
    }

    // Get the updated row
    const result = await db.query('SELECT * FROM plsq_templates WHERE plsqt_id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating template status:', error);
    res.status(500).json({ error: 'Failed to update template status' });
  }
});

// Clone template (deep copy)
router.post('/:id/clone', async (req, res) => {
  try {
    const now = getDateTime();

    // Get original template
    const original = await db.query('SELECT * FROM plsq_templates WHERE plsqt_id = $1', [req.params.id]);
    if (original.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const t = original.rows[0];

    // Create cloned template
    const insertResult = await db.query(
      `INSERT INTO plsq_templates
        (country_id, currency_id, product_cat_id, product_line_id,
         plsqt_name, plsqt_order_codes, plsqt_desc, plsqt_comment,
         plsqt_section_count, plsqt_fbo_location, plsqs_as_of_date, extrn_file_ref,
         plsqt_active, plsqt_version, content, plsqt_status, status_datetime,
         last_update_datetime, last_update_user)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'cloned', $16, $17, $18)
       RETURNING plsqt_id`,
      [
        t.country_id, t.currency_id, t.product_cat_id, t.product_line_id,
        t.plsqt_name + ' (Clone)', t.plsqt_order_codes, t.plsqt_desc, t.plsqt_comment,
        t.plsqt_section_count, t.plsqt_fbo_location, t.plsqs_as_of_date, t.extrn_file_ref,
        t.plsqt_active, t.plsqt_version, t.content, now,
        now, req.session.user.username
      ]
    );

    const newTemplateId = insertResult.rows[0].plsqt_id;

    // Clone all sections
    const sections = await db.query('SELECT * FROM plsqt_sections WHERE plsqt_id = $1', [req.params.id]);
    for (const s of sections.rows) {
      await db.query(
        `INSERT INTO plsqt_sections
          (plsqt_id, section_type_id, plsqt_seqn, plsqt_alt_name, plsqt_comment,
           plsqt_use_alt_name, plsqts_subsection_count, plsqts_active, plsqts_version,
           extrn_file_ref, content, plsqts_status, status_datetime,
           last_update_datetime, last_update_user)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'cloned', $12, $13, $14)`,
        [
          newTemplateId, s.section_type_id, s.plsqt_seqn, s.plsqt_alt_name, s.plsqt_comment,
          s.plsqt_use_alt_name, s.plsqts_subsection_count, s.plsqts_active, s.plsqts_version,
          s.extrn_file_ref, s.content, now,
          now, req.session.user.username
        ]
      );
    }

    // Get the cloned template
    const cloned = await db.query('SELECT * FROM plsq_templates WHERE plsqt_id = $1', [newTemplateId]);
    res.status(201).json(cloned.rows[0]);
  } catch (error) {
    console.error('Error cloning template:', error);
    res.status(500).json({ error: 'Failed to clone template' });
  }
});

// Delete template (admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if template exists
    const existing = await db.query('SELECT plsqt_id FROM plsq_templates WHERE plsqt_id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await db.query('DELETE FROM plsq_templates WHERE plsqt_id = $1', [req.params.id]);

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

module.exports = router;
