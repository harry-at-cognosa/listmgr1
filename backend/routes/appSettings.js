const express = require('express');
const db = require('../db');
const router = express.Router();

// Allowed setting names (for validation)
const APP_SETTINGS_NAMES = [
  'app_version',
  'db_version',
  'webapp_main_color',
  'index_page',
  'client_name'
];

// Available colors for webapp_main_color (22 Tailwind-style color names)
const AVAILABLE_COLORS = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',  // neutrals
  'red', 'orange', 'amber', 'yellow',            // warm
  'lime', 'green', 'emerald', 'teal',            // greens
  'cyan', 'sky', 'blue',                         // cool blues
  'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'  // purples/pinks
];

// GET /api/app-settings - Get settings for authenticated users
// Returns: webapp_main_color, app_version, db_version, client_name
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT name, value FROM app_settings
       WHERE name IN ('webapp_main_color', 'app_version', 'db_version', 'client_name')
       ORDER BY name`
    );

    // Convert array to object
    const settings = {};
    result.rows.forEach(row => {
      settings[row.name] = row.value;
    });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching app settings:', error);
    res.status(500).json({ error: 'Failed to fetch app settings' });
  }
});

// GET /api/app-settings/all - Get all settings (admin only)
router.get('/all', async (req, res) => {
  try {
    // Check if user is admin
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(
      'SELECT name, value FROM app_settings ORDER BY name'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all app settings:', error);
    res.status(500).json({ error: 'Failed to fetch app settings' });
  }
});

// GET /api/app-settings/colors - Get available colors list
router.get('/colors', async (req, res) => {
  res.json(AVAILABLE_COLORS);
});

// PUT /api/app-settings/:name - Update a setting (admin only)
router.put('/:name', async (req, res) => {
  try {
    // Check if user is admin
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name } = req.params;
    const { value } = req.body;

    // Validate setting name
    if (!APP_SETTINGS_NAMES.includes(name)) {
      return res.status(400).json({
        error: `Invalid setting name. Allowed names: ${APP_SETTINGS_NAMES.join(', ')}`
      });
    }

    // Validate value
    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'Value is required' });
    }

    // Additional validation for webapp_main_color
    if (name === 'webapp_main_color' && !AVAILABLE_COLORS.includes(value)) {
      return res.status(400).json({
        error: `Invalid color. Allowed colors: ${AVAILABLE_COLORS.join(', ')}`
      });
    }

    // Update the setting
    const result = await db.query(
      `UPDATE app_settings SET value = $1 WHERE name = $2 RETURNING *`,
      [value, name]
    );

    if (result.rows.length === 0) {
      // Setting doesn't exist, try to insert it
      const insertResult = await db.query(
        `INSERT INTO app_settings (name, value) VALUES ($1, $2) RETURNING *`,
        [name, value]
      );
      return res.json(insertResult.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating app setting:', error);
    res.status(500).json({ error: 'Failed to update app setting' });
  }
});

module.exports = router;
