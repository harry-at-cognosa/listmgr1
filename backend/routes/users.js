const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const router = express.Router();

// Helper to get current datetime
const getDateTime = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

// Get all users
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT user_id, username, role, user_enabled, last_update_datetime, last_update_user FROM users ORDER BY username'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT user_id, username, role, user_enabled, last_update_datetime, last_update_user FROM users WHERE user_id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user
router.post('/', async (req, res) => {
  try {
    const { username, password, role, user_enabled } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = getDateTime();
    const enabledValue = user_enabled === false || user_enabled === 0 ? 0 : 1;

    const result = await db.query(
      `INSERT INTO users (username, password, role, user_enabled, last_update_datetime, last_update_user)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, username, role, user_enabled, last_update_datetime, last_update_user`,
      [username, hashedPassword, role || 'user', enabledValue, now, req.session.user.username]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    // Handle unique constraint errors (PostgreSQL code 23505 or SQLite UNIQUE constraint message)
    if (error.code === '23505' || (error.message && error.message.includes('UNIQUE constraint failed'))) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { username, password, role, user_enabled } = req.body;
    const now = getDateTime();
    const enabledValue = user_enabled === false || user_enabled === 0 ? 0 : 1;

    let query, params;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = `UPDATE users SET username = $1, password = $2, role = $3, user_enabled = $4, last_update_datetime = $5, last_update_user = $6
               WHERE user_id = $7
               RETURNING user_id, username, role, user_enabled, last_update_datetime, last_update_user`;
      params = [username, hashedPassword, role, enabledValue, now, req.session.user.username, req.params.id];
    } else {
      query = `UPDATE users SET username = $1, role = $2, user_enabled = $3, last_update_datetime = $4, last_update_user = $5
               WHERE user_id = $6
               RETURNING user_id, username, role, user_enabled, last_update_datetime, last_update_user`;
      params = [username, role, enabledValue, now, req.session.user.username, req.params.id];
    }

    const result = await db.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    // Handle unique constraint errors (PostgreSQL code 23505 or SQLite UNIQUE constraint message)
    if (error.code === '23505' || (error.message && error.message.includes('UNIQUE constraint failed'))) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM users WHERE user_id = $1 RETURNING user_id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
