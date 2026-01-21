const express = require('express');
const db = require('../db');
const router = express.Router();

const getDateTime = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

// Get all currencies
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM currency ORDER BY currency_symbol'
    );
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

// Create currency
router.post('/', async (req, res) => {
  try {
    const { currency_symbol, currency_name } = req.body;

    if (!currency_symbol) {
      return res.status(400).json({ error: 'Currency symbol is required' });
    }

    const now = getDateTime();
    const result = await db.query(
      `INSERT INTO currency (currency_symbol, currency_name, last_update_datetime, last_update_user)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [currency_symbol, currency_name, now, req.session.user.username]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating currency:', error);
    res.status(500).json({ error: 'Failed to create currency' });
  }
});

// Update currency
router.put('/:id', async (req, res) => {
  try {
    const { currency_symbol, currency_name } = req.body;
    const now = getDateTime();

    const result = await db.query(
      `UPDATE currency
       SET currency_symbol = $1, currency_name = $2, last_update_datetime = $3, last_update_user = $4
       WHERE currency_id = $5
       RETURNING *`,
      [currency_symbol, currency_name, now, req.session.user.username, req.params.id]
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

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Currency not found' });
    }
    res.json({ message: 'Currency deleted successfully' });
  } catch (error) {
    // Handle foreign key constraint errors (PostgreSQL code 23503 or SQLite FOREIGN KEY message)
    if (error.code === '23503' || (error.message && error.message.includes('FOREIGN KEY constraint failed'))) {
      return res.status(400).json({ error: 'Cannot delete currency: it is referenced by other records' });
    }
    console.error('Error deleting currency:', error);
    res.status(500).json({ error: 'Failed to delete currency' });
  }
});

module.exports = router;
