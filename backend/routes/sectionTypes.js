const express = require('express');
const db = require('../db');
const router = express.Router();

const getDateTime = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

// Get all section types
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM plsqts_type ORDER BY plsqtst_name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching section types:', error);
    res.status(500).json({ error: 'Failed to fetch section types' });
  }
});

// Get single section type
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM plsqts_type WHERE plsqtst_id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section type not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching section type:', error);
    res.status(500).json({ error: 'Failed to fetch section type' });
  }
});

// Create section type
router.post('/', async (req, res) => {
  try {
    const {
      plsqtst_name,
      plsqtst_has_total_price,
      plsqtst_has_lineitem_prices,
      plsqtst_comment,
      extrn_file_ref,
      plsqtst_active,
      plsqtst_version
    } = req.body;

    if (!plsqtst_name) {
      return res.status(400).json({ error: 'Section type name is required' });
    }

    const now = getDateTime();
    const result = await db.query(
      `INSERT INTO plsqts_type (plsqtst_name, plsqtst_has_total_price, plsqtst_has_lineitem_prices,
       plsqtst_comment, extrn_file_ref, plsqtst_active, plsqtst_version, last_update_datetime, last_update_user)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        plsqtst_name,
        plsqtst_has_total_price || false,
        plsqtst_has_lineitem_prices || false,
        plsqtst_comment,
        extrn_file_ref,
        plsqtst_active !== false,
        plsqtst_version,
        now,
        req.session.user.username
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating section type:', error);
    res.status(500).json({ error: 'Failed to create section type' });
  }
});

// Update section type
router.put('/:id', async (req, res) => {
  try {
    const {
      plsqtst_name,
      plsqtst_has_total_price,
      plsqtst_has_lineitem_prices,
      plsqtst_comment,
      extrn_file_ref,
      plsqtst_active,
      plsqtst_version
    } = req.body;
    const now = getDateTime();

    const result = await db.query(
      `UPDATE plsqts_type
       SET plsqtst_name = $1, plsqtst_has_total_price = $2, plsqtst_has_lineitem_prices = $3,
           plsqtst_comment = $4, extrn_file_ref = $5, plsqtst_active = $6, plsqtst_version = $7,
           last_update_datetime = $8, last_update_user = $9
       WHERE plsqtst_id = $10
       RETURNING *`,
      [
        plsqtst_name,
        plsqtst_has_total_price || false,
        plsqtst_has_lineitem_prices || false,
        plsqtst_comment,
        extrn_file_ref,
        plsqtst_active !== false,
        plsqtst_version,
        now,
        req.session.user.username,
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section type not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating section type:', error);
    res.status(500).json({ error: 'Failed to update section type' });
  }
});

// Delete section type (admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(
      'DELETE FROM plsqts_type WHERE plsqtst_id = $1 RETURNING plsqtst_id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section type not found' });
    }
    res.json({ message: 'Section type deleted successfully' });
  } catch (error) {
    // Handle foreign key constraint errors (PostgreSQL code 23503 or SQLite FOREIGN KEY message)
    // better-sqlite3 may also use SQLITE_CONSTRAINT or SQLITE_CONSTRAINT_FOREIGNKEY codes
    if (error.code === '23503' ||
        error.code === 'SQLITE_CONSTRAINT' ||
        error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' ||
        (error.message && (error.message.includes('FOREIGN KEY constraint failed') ||
                          error.message.includes('FOREIGN KEY') ||
                          error.message.includes('constraint')))) {
      return res.status(400).json({ error: 'Cannot delete section type: it is referenced by other records' });
    }
    console.error('Error deleting section type:', error);
    res.status(500).json({ error: 'Failed to delete section type' });
  }
});

module.exports = router;
