const express = require('express');
const db = require('../db');
const router = express.Router();

const getDateTime = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

// Get all countries with currency info
// Admin users see all countries; regular users only see enabled countries
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.session.user && req.session.user.role === 'admin';
    let query = `
      SELECT c.*, cur.currency_symbol, cur.currency_name, cur.currency_enabled
      FROM country c
      LEFT JOIN currency cur ON c.currency_id = cur.currency_id
    `;

    // Non-admin users only see enabled countries
    if (!isAdmin) {
      query += ' WHERE c.country_enabled = 1';
    }

    query += ' ORDER BY c.country_name';

    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

// Get single country
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, cur.currency_symbol, cur.currency_name
      FROM country c
      LEFT JOIN currency cur ON c.currency_id = cur.currency_id
      WHERE c.country_id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Country not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching country:', error);
    res.status(500).json({ error: 'Failed to fetch country' });
  }
});

// Create country (admin only)
router.post('/', async (req, res) => {
  try {
    // Only admin users can create countries
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required to create countries' });
    }

    const { country_abbr, country_name, currency_id, country_enabled } = req.body;

    if (!country_abbr || !country_name) {
      return res.status(400).json({ error: 'Country abbreviation and name are required' });
    }

    const now = getDateTime();
    const enabledValue = country_enabled === false || country_enabled === 0 ? 0 : 1;
    const result = await db.query(
      `INSERT INTO country (country_abbr, country_name, currency_id, country_enabled, last_update_datetime, last_update_user)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [country_abbr, country_name, currency_id || null, enabledValue, now, req.session.user.username]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating country:', error);
    res.status(500).json({ error: 'Failed to create country' });
  }
});

// Update country (admin only)
router.put('/:id', async (req, res) => {
  try {
    // Only admin users can edit countries
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required to edit countries' });
    }

    const { country_abbr, country_name, currency_id, country_enabled } = req.body;
    const now = getDateTime();
    const enabledValue = country_enabled === false || country_enabled === 0 ? 0 : 1;

    const result = await db.query(
      `UPDATE country
       SET country_abbr = $1, country_name = $2, currency_id = $3, country_enabled = $4, last_update_datetime = $5, last_update_user = $6
       WHERE country_id = $7
       RETURNING *`,
      [country_abbr, country_name, currency_id || null, enabledValue, now, req.session.user.username, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Country not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating country:', error);
    res.status(500).json({ error: 'Failed to update country' });
  }
});

// Delete country (admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(
      'DELETE FROM country WHERE country_id = $1 RETURNING country_id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Country not found' });
    }
    res.json({ message: 'Country deleted successfully' });
  } catch (error) {
    // Handle foreign key constraint errors (PostgreSQL code 23503 or SQLite FOREIGN KEY message)
    // better-sqlite3 may also use SQLITE_CONSTRAINT or SQLITE_CONSTRAINT_FOREIGNKEY codes
    if (error.code === '23503' ||
        error.code === 'SQLITE_CONSTRAINT' ||
        error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' ||
        (error.message && (error.message.includes('FOREIGN KEY constraint failed') ||
                          error.message.includes('FOREIGN KEY') ||
                          error.message.includes('constraint')))) {
      return res.status(400).json({ error: 'Cannot delete country: it is referenced by other records' });
    }
    console.error('Error deleting country:', error);
    res.status(500).json({ error: 'Failed to delete country' });
  }
});

module.exports = router;
