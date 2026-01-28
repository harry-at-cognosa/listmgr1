const express = require('express');
const db = require('../db');
const router = express.Router();

const getDateTime = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

// Get all product lines with category info
// Admin users see all product lines; regular users only see enabled product lines
// from enabled categories
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.session.user && req.session.user.role === 'admin';

    let query = `
      SELECT pl.*, pc.product_cat_abbr, pc.product_cat_name, pc.product_cat_enabled
      FROM product_line pl
      LEFT JOIN product_cat pc ON pl.product_cat_id = pc.product_cat_id
    `;

    if (!isAdmin) {
      // Non-admin users only see enabled product lines from enabled categories
      query += ' WHERE pl.product_line_enabled = 1 AND (pc.product_cat_enabled = 1 OR pc.product_cat_enabled IS NULL)';
    }

    query += ' ORDER BY pl.product_line_name';

    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching product lines:', error);
    res.status(500).json({ error: 'Failed to fetch product lines' });
  }
});

// Get single product line
router.get('/:id', async (req, res) => {
  try {
    const isAdmin = req.session.user && req.session.user.role === 'admin';

    let query = `
      SELECT pl.*, pc.product_cat_abbr, pc.product_cat_name, pc.product_cat_enabled
      FROM product_line pl
      LEFT JOIN product_cat pc ON pl.product_cat_id = pc.product_cat_id
      WHERE pl.product_line_id = $1
    `;

    // Non-admin users cannot view disabled product lines or lines from disabled categories
    if (!isAdmin) {
      query = `
        SELECT pl.*, pc.product_cat_abbr, pc.product_cat_name, pc.product_cat_enabled
        FROM product_line pl
        LEFT JOIN product_cat pc ON pl.product_cat_id = pc.product_cat_id
        WHERE pl.product_line_id = $1
          AND pl.product_line_enabled = 1
          AND (pc.product_cat_enabled = 1 OR pc.product_cat_enabled IS NULL)
      `;
    }

    const result = await db.query(query, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product line not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product line:', error);
    res.status(500).json({ error: 'Failed to fetch product line' });
  }
});

// Create product line
router.post('/', async (req, res) => {
  try {
    const { product_cat_id, product_line_abbr, product_line_name, product_line_enabled } = req.body;

    if (!product_cat_id) {
      return res.status(400).json({ error: 'Product category is required' });
    }

    const isAdmin = req.session.user && req.session.user.role === 'admin';

    // Non-admin users cannot create product lines under disabled categories
    if (!isAdmin) {
      const catResult = await db.query(
        'SELECT product_cat_enabled FROM product_cat WHERE product_cat_id = $1',
        [product_cat_id]
      );
      if (catResult.rows.length > 0 && catResult.rows[0].product_cat_enabled !== 1) {
        return res.status(403).json({ error: 'Cannot create product line under disabled category' });
      }
    }

    // Only admin can create disabled product lines
    const enabled = isAdmin && product_line_enabled !== undefined ? (product_line_enabled ? 1 : 0) : 1;

    const now = getDateTime();
    const result = await db.query(
      `INSERT INTO product_line (product_cat_id, product_line_abbr, product_line_name, product_line_enabled, last_update_datetime, last_update_user)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [product_cat_id, product_line_abbr, product_line_name, enabled, now, req.session.user.username]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating product line:', error);
    res.status(500).json({ error: 'Failed to create product line' });
  }
});

// Update product line
router.put('/:id', async (req, res) => {
  try {
    const { product_cat_id, product_line_abbr, product_line_name, product_line_enabled } = req.body;
    const now = getDateTime();
    const isAdmin = req.session.user && req.session.user.role === 'admin';

    // Non-admin users cannot update disabled product lines
    if (!isAdmin) {
      const existing = await db.query(
        `SELECT pl.product_line_enabled, pc.product_cat_enabled
         FROM product_line pl
         LEFT JOIN product_cat pc ON pl.product_cat_id = pc.product_cat_id
         WHERE pl.product_line_id = $1`,
        [req.params.id]
      );
      if (existing.rows.length > 0) {
        if (existing.rows[0].product_line_enabled !== 1) {
          return res.status(403).json({ error: 'Cannot update disabled product line' });
        }
        if (existing.rows[0].product_cat_enabled !== 1 && existing.rows[0].product_cat_enabled !== null) {
          return res.status(403).json({ error: 'Cannot update product line in disabled category' });
        }
      }
    }

    // Build update query - only admin can change enabled status
    let query, params;
    if (isAdmin && product_line_enabled !== undefined) {
      const enabled = product_line_enabled ? 1 : 0;
      query = `UPDATE product_line
               SET product_cat_id = $1, product_line_abbr = $2, product_line_name = $3, product_line_enabled = $4, last_update_datetime = $5, last_update_user = $6
               WHERE product_line_id = $7
               RETURNING *`;
      params = [product_cat_id, product_line_abbr, product_line_name, enabled, now, req.session.user.username, req.params.id];
    } else {
      query = `UPDATE product_line
               SET product_cat_id = $1, product_line_abbr = $2, product_line_name = $3, last_update_datetime = $4, last_update_user = $5
               WHERE product_line_id = $6
               RETURNING *`;
      params = [product_cat_id, product_line_abbr, product_line_name, now, req.session.user.username, req.params.id];
    }

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product line not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product line:', error);
    res.status(500).json({ error: 'Failed to update product line' });
  }
});

// Delete product line (admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(
      'DELETE FROM product_line WHERE product_line_id = $1 RETURNING product_line_id',
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product line not found' });
    }
    res.json({ message: 'Product line deleted successfully' });
  } catch (error) {
    // Handle foreign key constraint errors (PostgreSQL code 23503 or SQLite FOREIGN KEY message)
    // better-sqlite3 may also use SQLITE_CONSTRAINT or SQLITE_CONSTRAINT_FOREIGNKEY codes
    if (error.code === '23503' ||
        error.code === 'SQLITE_CONSTRAINT' ||
        error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' ||
        (error.message && (error.message.includes('FOREIGN KEY constraint failed') ||
                          error.message.includes('FOREIGN KEY') ||
                          error.message.includes('constraint')))) {
      return res.status(400).json({ error: 'Cannot delete product line: it is referenced by other records' });
    }
    console.error('Error deleting product line:', error);
    res.status(500).json({ error: 'Failed to delete product line' });
  }
});

module.exports = router;
