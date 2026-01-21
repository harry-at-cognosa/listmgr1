const express = require('express');
const db = require('../db');
const router = express.Router();

const getDateTime = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

// Get all countries with currency info
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, cur.currency_symbol, cur.currency_name
      FROM country c
      LEFT JOIN currency cur ON c.currency_id = cur.currency_id
      ORDER BY c.country_name
    `);
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

// Create country
router.post('/', async (req, res) => {
  try {
    const { country_abbr, country_name, currency_id } = req.body;

    if (!country_abbr || !country_name) {
      return res.status(400).json({ error: 'Country abbreviation and name are required' });
    }

    const now = getDateTime();
    const result = await db.query(
      `INSERT INTO country (country_abbr, country_name, currency_id, last_update_datetime, last_update_user)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [country_abbr, country_name, currency_id || null, now, req.session.user.username]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating country:', error);
    res.status(500).json({ error: 'Failed to create country' });
  }
});

// Update country
router.put('/:id', async (req, res) => {
  try {
    const { country_abbr, country_name, currency_id } = req.body;
    const now = getDateTime();

    const result = await db.query(
      `UPDATE country
       SET country_abbr = $1, country_name = $2, currency_id = $3, last_update_datetime = $4, last_update_user = $5
       WHERE country_id = $6
       RETURNING *`,
      [country_abbr, country_name, currency_id || null, now, req.session.user.username, req.params.id]
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
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Cannot delete country: it is referenced by other records' });
    }
    console.error('Error deleting country:', error);
    res.status(500).json({ error: 'Failed to delete country' });
  }
});

module.exports = router;
