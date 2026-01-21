const express = require('express');
const db = require('../db');
const router = express.Router();

const getDateTime = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

// Get all product categories
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM product_cat ORDER BY product_cat_name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching product categories:', error);
    res.status(500).json({ error: 'Failed to fetch product categories' });
  }
});

// Get single product category
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM product_cat WHERE product_cat_id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product category not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product category:', error);
    res.status(500).json({ error: 'Failed to fetch product category' });
  }
});

// Create product category
router.post('/', async (req, res) => {
  try {
    const { product_cat_abbr, product_cat_name } = req.body;

    if (!product_cat_name) {
      return res.status(400).json({ error: 'Product category name is required' });
    }

    const now = getDateTime();
    const result = await db.query(
      `INSERT INTO product_cat (product_cat_abbr, product_cat_name, last_update_datetime, last_update_user)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [product_cat_abbr, product_cat_name, now, req.session.user.username]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating product category:', error);
    res.status(500).json({ error: 'Failed to create product category' });
  }
});

// Update product category
router.put('/:id', async (req, res) => {
  try {
    const { product_cat_abbr, product_cat_name } = req.body;
    const now = getDateTime();

    const result = await db.query(
      `UPDATE product_cat
       SET product_cat_abbr = $1, product_cat_name = $2, last_update_datetime = $3, last_update_user = $4
       WHERE product_cat_id = $5
       RETURNING *`,
      [product_cat_abbr, product_cat_name, now, req.session.user.username, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product category not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product category:', error);
    res.status(500).json({ error: 'Failed to update product category' });
  }
});

// Delete product category (admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(
      'DELETE FROM product_cat WHERE product_cat_id = $1 RETURNING product_cat_id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product category not found' });
    }
    res.json({ message: 'Product category deleted successfully' });
  } catch (error) {
    // Handle foreign key constraint errors (PostgreSQL code 23503 or SQLite FOREIGN KEY message)
    // better-sqlite3 may also use SQLITE_CONSTRAINT or SQLITE_CONSTRAINT_FOREIGNKEY codes
    if (error.code === '23503' ||
        error.code === 'SQLITE_CONSTRAINT' ||
        error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' ||
        (error.message && (error.message.includes('FOREIGN KEY constraint failed') ||
                          error.message.includes('FOREIGN KEY') ||
                          error.message.includes('constraint')))) {
      return res.status(400).json({ error: 'Cannot delete product category: it is referenced by other records' });
    }
    console.error('Error deleting product category:', error);
    res.status(500).json({ error: 'Failed to delete product category' });
  }
});

module.exports = router;
