const express = require('express');
const db = require('../db');
const router = express.Router();

const getDateTime = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

// Get all customer contacts
// All authenticated users see all records (no enable/disable filtering)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM customer_contact ORDER BY cc_customer_name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching customer contacts:', error);
    res.status(500).json({ error: 'Failed to fetch customer contacts' });
  }
});

// Get single customer contact
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM customer_contact WHERE cc_id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer contact not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching customer contact:', error);
    res.status(500).json({ error: 'Failed to fetch customer contact' });
  }
});

// Create customer contact
router.post('/', async (req, res) => {
  try {
    const {
      cc_customer_name,
      cc_company_name,
      cc_phone_number,
      cc_email_address,
      cc_addr_line_1,
      cc_addr_line_2,
      cc_city,
      cc_state,
      cc_zip,
      cc_comment
    } = req.body;

    if (!cc_customer_name) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    const now = getDateTime();
    const result = await db.query(
      `INSERT INTO customer_contact (
        cc_customer_name, cc_company_name, cc_phone_number, cc_email_address,
        cc_addr_line_1, cc_addr_line_2, cc_city, cc_state, cc_zip, cc_comment,
        last_update_datetime, last_update_user
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        cc_customer_name,
        cc_company_name || null,
        cc_phone_number || null,
        cc_email_address || null,
        cc_addr_line_1 || null,
        cc_addr_line_2 || null,
        cc_city || null,
        cc_state || null,
        cc_zip || null,
        cc_comment || null,
        now,
        req.session.user.username
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating customer contact:', error);
    res.status(500).json({ error: 'Failed to create customer contact' });
  }
});

// Update customer contact
router.put('/:id', async (req, res) => {
  try {
    const {
      cc_customer_name,
      cc_company_name,
      cc_phone_number,
      cc_email_address,
      cc_addr_line_1,
      cc_addr_line_2,
      cc_city,
      cc_state,
      cc_zip,
      cc_comment
    } = req.body;

    if (!cc_customer_name) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    const now = getDateTime();
    const result = await db.query(
      `UPDATE customer_contact
       SET cc_customer_name = $1, cc_company_name = $2, cc_phone_number = $3,
           cc_email_address = $4, cc_addr_line_1 = $5, cc_addr_line_2 = $6,
           cc_city = $7, cc_state = $8, cc_zip = $9, cc_comment = $10,
           last_update_datetime = $11, last_update_user = $12
       WHERE cc_id = $13
       RETURNING *`,
      [
        cc_customer_name,
        cc_company_name || null,
        cc_phone_number || null,
        cc_email_address || null,
        cc_addr_line_1 || null,
        cc_addr_line_2 || null,
        cc_city || null,
        cc_state || null,
        cc_zip || null,
        cc_comment || null,
        now,
        req.session.user.username,
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer contact not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating customer contact:', error);
    res.status(500).json({ error: 'Failed to update customer contact' });
  }
});

// Delete customer contact (admin only)
router.delete('/:id', async (req, res) => {
  try {
    // Check if user is admin
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(
      'DELETE FROM customer_contact WHERE cc_id = $1 RETURNING cc_id',
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Customer contact not found' });
    }
    res.json({ message: 'Customer contact deleted successfully' });
  } catch (error) {
    // Handle foreign key constraint errors (customer_quotes may reference this record)
    if (error.code === '23503' ||
        (error.message && (error.message.includes('FOREIGN KEY') ||
                          error.message.includes('constraint')))) {
      return res.status(400).json({ error: 'Cannot delete customer contact: it is referenced by customer quotes' });
    }
    console.error('Error deleting customer contact:', error);
    res.status(500).json({ error: 'Failed to delete customer contact' });
  }
});

module.exports = router;
