const express = require('express');
const db = require('../db');
const router = express.Router();

const getDateTime = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

// Get all currencies
// Admin users see all currencies; regular users only see enabled currencies
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.session.user && req.session.user.role === 'admin';
    let query = 'SELECT * FROM currency';

    // Non-admin users only see enabled currencies
    if (!isAdmin) {
      query += ' WHERE currency_enabled = 1';
    }

    query += ' ORDER BY currency_symbol';

    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching currencies:', error);
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
});

// Get single currency
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM currency WHERE currency_id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Currency not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching currency:', error);
    res.status(500).json({ error: 'Failed to fetch currency' });
  }
});

// Create currency (admin only)
router.post('/', async (req, res) => {
  try {
    // Only admin users can create currencies
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required to create currencies' });
    }

    const { currency_symbol, currency_name, currency_enabled } = req.body;

    if (!currency_symbol) {
      return res.status(400).json({ error: 'Currency symbol is required' });
    }

    // Check for duplicate symbol
    const existing = await db.query(
      'SELECT currency_id FROM currency WHERE UPPER(currency_symbol) = UPPER($1)',
      [currency_symbol]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A currency with this symbol already exists' });
    }

    const now = getDateTime();
    const enabledValue = currency_enabled === false || currency_enabled === 0 ? 0 : 1;
    const result = await db.query(
      `INSERT INTO currency (currency_symbol, currency_name, currency_enabled, last_update_datetime, last_update_user)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [currency_symbol, currency_name, enabledValue, now, req.session.user.username]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating currency:', error);
    res.status(500).json({ error: 'Failed to create currency' });
  }
});

// Update currency (admin only)
router.put('/:id', async (req, res) => {
  try {
    // Only admin users can edit currencies
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required to edit currencies' });
    }

    const { currency_symbol, currency_name, currency_enabled } = req.body;
    const now = getDateTime();
    const enabledValue = currency_enabled === false || currency_enabled === 0 ? 0 : 1;

    const result = await db.query(
      `UPDATE currency
       SET currency_symbol = $1, currency_name = $2, currency_enabled = $3, last_update_datetime = $4, last_update_user = $5
       WHERE currency_id = $6
       RETURNING *`,
      [currency_symbol, currency_name, enabledValue, now, req.session.user.username, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Currency not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating currency:', error);
    res.status(500).json({ error: 'Failed to update currency' });
  }
});

// Delete currency (admin only - checked via middleware in index.js for specific routes)
router.delete('/:id', async (req, res) => {
  try {
    // Check if user is admin
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(
      'DELETE FROM currency WHERE currency_id = $1 RETURNING currency_id',
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Currency not found' });
    }
    res.json({ message: 'Currency deleted successfully' });
  } catch (error) {
    // Handle foreign key constraint errors (PostgreSQL code 23503 or SQLite FOREIGN KEY message)
    // better-sqlite3 may also use SQLITE_CONSTRAINT or SQLITE_CONSTRAINT_FOREIGNKEY codes
    if (error.code === '23503' ||
        error.code === 'SQLITE_CONSTRAINT' ||
        error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' ||
        (error.message && (error.message.includes('FOREIGN KEY constraint failed') ||
                          error.message.includes('FOREIGN KEY') ||
                          error.message.includes('constraint')))) {
      return res.status(400).json({ error: 'Cannot delete currency: it is referenced by other records' });
    }
    console.error('Error deleting currency:', error);
    res.status(500).json({ error: 'Failed to delete currency' });
  }
});

module.exports = router;
