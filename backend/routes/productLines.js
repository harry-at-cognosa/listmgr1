const express = require('express');
const db = require('../db');
const router = express.Router();

const getDateTime = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

// Get all product lines with category info
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT pl.*, pc.product_cat_abbr, pc.product_cat_name
      FROM product_line pl
      LEFT JOIN product_cat pc ON pl.product_cat_id = pc.product_cat_id
      ORDER BY pl.product_line_name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching product lines:', error);
    res.status(500).json({ error: 'Failed to fetch product lines' });
  }
});

// Get single product line
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT pl.*, pc.product_cat_abbr, pc.product_cat_name
      FROM product_line pl
      LEFT JOIN product_cat pc ON pl.product_cat_id = pc.product_cat_id
      WHERE pl.product_line_id = $1
    `, [req.params.id]);

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
    const { product_cat_id, product_line_abbr, product_line_name } = req.body;

    if (!product_cat_id) {
      return res.status(400).json({ error: 'Product category is required' });
    }

    const now = getDateTime();
    const result = await db.query(
      `INSERT INTO product_line (product_cat_id, product_line_abbr, product_line_name, last_update_datetime, last_update_user)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [product_cat_id, product_line_abbr, product_line_name, now, req.session.user.username]
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
    const { product_cat_id, product_line_abbr, product_line_name } = req.body;
    const now = getDateTime();

    const result = await db.query(
      `UPDATE product_line
       SET product_cat_id = $1, product_line_abbr = $2, product_line_name = $3, last_update_datetime = $4, last_update_user = $5
       WHERE product_line_id = $6
       RETURNING *`,
      [product_cat_id, product_line_abbr, product_line_name, now, req.session.user.username, req.params.id]
    );

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

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product line not found' });
    }
    res.json({ message: 'Product line deleted successfully' });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Cannot delete product line: it is referenced by other records' });
    }
    console.error('Error deleting product line:', error);
    res.status(500).json({ error: 'Failed to delete product line' });
  }
});

module.exports = router;
