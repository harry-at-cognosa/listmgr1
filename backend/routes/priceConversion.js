const express = require('express');
const db = require('../db');
const router = express.Router();

// ================================================================
// PRICE CONV FACTORS (Tab 1)
// ================================================================

// Get all price conversion factors
router.get('/factors', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM price_conv_factors ORDER BY pc_factor_code'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching price conversion factors:', error);
    res.status(500).json({ error: 'Failed to fetch price conversion factors' });
  }
});

// Get single factor
router.get('/factors/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM price_conv_factors WHERE pcf_id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Factor not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching factor:', error);
    res.status(500).json({ error: 'Failed to fetch factor' });
  }
});

// Create factor
router.post('/factors', async (req, res) => {
  try {
    const { pc_factor_code, pc_factor_description } = req.body;

    if (!pc_factor_code) {
      return res.status(400).json({ error: 'Factor code is required' });
    }

    if (pc_factor_code.length > 3) {
      return res.status(400).json({ error: 'Factor code must be 3 characters or less' });
    }

    // Check for duplicate code
    const existing = await db.query(
      'SELECT pcf_id FROM price_conv_factors WHERE UPPER(pc_factor_code) = UPPER($1)',
      [pc_factor_code]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A factor with this code already exists' });
    }

    const result = await db.query(
      `INSERT INTO price_conv_factors (pc_factor_code, pc_factor_description)
       VALUES ($1, $2)
       RETURNING *`,
      [pc_factor_code.toUpperCase(), pc_factor_description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating factor:', error);
    res.status(500).json({ error: 'Failed to create factor' });
  }
});

// Update factor
router.put('/factors/:id', async (req, res) => {
  try {
    const { pc_factor_code, pc_factor_description } = req.body;

    if (!pc_factor_code) {
      return res.status(400).json({ error: 'Factor code is required' });
    }

    if (pc_factor_code.length > 3) {
      return res.status(400).json({ error: 'Factor code must be 3 characters or less' });
    }

    // Check for duplicate code (excluding current record)
    const existing = await db.query(
      'SELECT pcf_id FROM price_conv_factors WHERE UPPER(pc_factor_code) = UPPER($1) AND pcf_id != $2',
      [pc_factor_code, req.params.id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A factor with this code already exists' });
    }

    const result = await db.query(
      `UPDATE price_conv_factors
       SET pc_factor_code = $1, pc_factor_description = $2
       WHERE pcf_id = $3
       RETURNING *`,
      [pc_factor_code.toUpperCase(), pc_factor_description || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Factor not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating factor:', error);
    res.status(500).json({ error: 'Failed to update factor' });
  }
});

// Delete factor
router.delete('/factors/:id', async (req, res) => {
  try {
    // Check if factor is referenced by any values
    const inUse = await db.query(
      'SELECT pfv_id FROM pconv_factor_values WHERE pcf_id = $1 LIMIT 1',
      [req.params.id]
    );
    if (inUse.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete: factor is referenced by existing factor values' });
    }

    const result = await db.query(
      'DELETE FROM price_conv_factors WHERE pcf_id = $1 RETURNING pcf_id',
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Factor not found' });
    }
    res.json({ message: 'Factor deleted successfully' });
  } catch (error) {
    console.error('Error deleting factor:', error);
    res.status(500).json({ error: 'Failed to delete factor' });
  }
});

// ================================================================
// COUNTRY CONVERSION PAIRS (Tab 2)
// ================================================================

// Get all country conversion pairs (with country names)
router.get('/pairs', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        ccp.ccp_id,
        ccp.ccp_from_country_id,
        ccp.ccp_to_country_id,
        fc.country_abbr AS from_country_abbr,
        fc.country_name AS from_country_name,
        tc.country_abbr AS to_country_abbr,
        tc.country_name AS to_country_name
      FROM country_conversion_pairs ccp
      JOIN country fc ON ccp.ccp_from_country_id = fc.country_id
      JOIN country tc ON ccp.ccp_to_country_id = tc.country_id
      ORDER BY fc.country_abbr, tc.country_abbr
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching country conversion pairs:', error);
    res.status(500).json({ error: 'Failed to fetch country conversion pairs' });
  }
});

// Get single pair
router.get('/pairs/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        ccp.ccp_id,
        ccp.ccp_from_country_id,
        ccp.ccp_to_country_id,
        fc.country_abbr AS from_country_abbr,
        fc.country_name AS from_country_name,
        tc.country_abbr AS to_country_abbr,
        tc.country_name AS to_country_name
      FROM country_conversion_pairs ccp
      JOIN country fc ON ccp.ccp_from_country_id = fc.country_id
      JOIN country tc ON ccp.ccp_to_country_id = tc.country_id
      WHERE ccp.ccp_id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pair not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching pair:', error);
    res.status(500).json({ error: 'Failed to fetch pair' });
  }
});

// Create pair
router.post('/pairs', async (req, res) => {
  try {
    const { ccp_from_country_id, ccp_to_country_id } = req.body;

    if (!ccp_from_country_id || !ccp_to_country_id) {
      return res.status(400).json({ error: 'Both from and to countries are required' });
    }

    if (ccp_from_country_id === ccp_to_country_id) {
      return res.status(400).json({ error: 'From and to countries must be different' });
    }

    // Check for duplicate pair
    const existing = await db.query(
      'SELECT ccp_id FROM country_conversion_pairs WHERE ccp_from_country_id = $1 AND ccp_to_country_id = $2',
      [ccp_from_country_id, ccp_to_country_id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'This country pair already exists' });
    }

    const result = await db.query(
      `INSERT INTO country_conversion_pairs (ccp_from_country_id, ccp_to_country_id)
       VALUES ($1, $2)
       RETURNING *`,
      [ccp_from_country_id, ccp_to_country_id]
    );

    // Fetch the full pair with country names
    const fullResult = await db.query(`
      SELECT
        ccp.ccp_id,
        ccp.ccp_from_country_id,
        ccp.ccp_to_country_id,
        fc.country_abbr AS from_country_abbr,
        fc.country_name AS from_country_name,
        tc.country_abbr AS to_country_abbr,
        tc.country_name AS to_country_name
      FROM country_conversion_pairs ccp
      JOIN country fc ON ccp.ccp_from_country_id = fc.country_id
      JOIN country tc ON ccp.ccp_to_country_id = tc.country_id
      WHERE ccp.ccp_id = $1
    `, [result.rows[0].ccp_id]);

    res.status(201).json(fullResult.rows[0]);
  } catch (error) {
    console.error('Error creating pair:', error);
    res.status(500).json({ error: 'Failed to create pair' });
  }
});

// Update pair
router.put('/pairs/:id', async (req, res) => {
  try {
    const { ccp_from_country_id, ccp_to_country_id } = req.body;

    if (!ccp_from_country_id || !ccp_to_country_id) {
      return res.status(400).json({ error: 'Both from and to countries are required' });
    }

    if (ccp_from_country_id === ccp_to_country_id) {
      return res.status(400).json({ error: 'From and to countries must be different' });
    }

    // Check for duplicate pair (excluding current record)
    const existing = await db.query(
      'SELECT ccp_id FROM country_conversion_pairs WHERE ccp_from_country_id = $1 AND ccp_to_country_id = $2 AND ccp_id != $3',
      [ccp_from_country_id, ccp_to_country_id, req.params.id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'This country pair already exists' });
    }

    const result = await db.query(
      `UPDATE country_conversion_pairs
       SET ccp_from_country_id = $1, ccp_to_country_id = $2
       WHERE ccp_id = $3
       RETURNING *`,
      [ccp_from_country_id, ccp_to_country_id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pair not found' });
    }

    // Fetch the full pair with country names
    const fullResult = await db.query(`
      SELECT
        ccp.ccp_id,
        ccp.ccp_from_country_id,
        ccp.ccp_to_country_id,
        fc.country_abbr AS from_country_abbr,
        fc.country_name AS from_country_name,
        tc.country_abbr AS to_country_abbr,
        tc.country_name AS to_country_name
      FROM country_conversion_pairs ccp
      JOIN country fc ON ccp.ccp_from_country_id = fc.country_id
      JOIN country tc ON ccp.ccp_to_country_id = tc.country_id
      WHERE ccp.ccp_id = $1
    `, [result.rows[0].ccp_id]);

    res.json(fullResult.rows[0]);
  } catch (error) {
    console.error('Error updating pair:', error);
    res.status(500).json({ error: 'Failed to update pair' });
  }
});

// Delete pair
router.delete('/pairs/:id', async (req, res) => {
  try {
    // Check if pair is referenced by any values
    const inUse = await db.query(
      'SELECT pfv_id FROM pconv_factor_values WHERE ccp_id = $1 LIMIT 1',
      [req.params.id]
    );
    if (inUse.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete: pair is referenced by existing factor values' });
    }

    const result = await db.query(
      'DELETE FROM country_conversion_pairs WHERE ccp_id = $1 RETURNING ccp_id',
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Pair not found' });
    }
    res.json({ message: 'Pair deleted successfully' });
  } catch (error) {
    console.error('Error deleting pair:', error);
    res.status(500).json({ error: 'Failed to delete pair' });
  }
});

// ================================================================
// FACTOR VALUES (Tab 3)
// ================================================================

// Get all factor values (with factor codes and country pair info)
router.get('/values', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        pfv.pfv_id,
        pfv.pcf_id,
        pfv.ccp_id,
        pfv.pfc_from_date,
        pfv.pfc_to_date,
        pfv.pfc_multiplier_1,
        pfv.pfc_multiplier_2,
        pcf.pc_factor_code,
        pcf.pc_factor_description,
        fc.country_abbr AS from_country_abbr,
        tc.country_abbr AS to_country_abbr
      FROM pconv_factor_values pfv
      JOIN price_conv_factors pcf ON pfv.pcf_id = pcf.pcf_id
      JOIN country_conversion_pairs ccp ON pfv.ccp_id = ccp.ccp_id
      JOIN country fc ON ccp.ccp_from_country_id = fc.country_id
      JOIN country tc ON ccp.ccp_to_country_id = tc.country_id
      ORDER BY pcf.pc_factor_code, fc.country_abbr, tc.country_abbr, pfv.pfc_from_date
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching factor values:', error);
    res.status(500).json({ error: 'Failed to fetch factor values' });
  }
});

// Get single value
router.get('/values/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        pfv.pfv_id,
        pfv.pcf_id,
        pfv.ccp_id,
        pfv.pfc_from_date,
        pfv.pfc_to_date,
        pfv.pfc_multiplier_1,
        pfv.pfc_multiplier_2,
        pcf.pc_factor_code,
        pcf.pc_factor_description,
        fc.country_abbr AS from_country_abbr,
        tc.country_abbr AS to_country_abbr
      FROM pconv_factor_values pfv
      JOIN price_conv_factors pcf ON pfv.pcf_id = pcf.pcf_id
      JOIN country_conversion_pairs ccp ON pfv.ccp_id = ccp.ccp_id
      JOIN country fc ON ccp.ccp_from_country_id = fc.country_id
      JOIN country tc ON ccp.ccp_to_country_id = tc.country_id
      WHERE pfv.pfv_id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Factor value not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching factor value:', error);
    res.status(500).json({ error: 'Failed to fetch factor value' });
  }
});

// Create factor value
router.post('/values', async (req, res) => {
  try {
    const { pcf_id, ccp_id, pfc_from_date, pfc_to_date, pfc_multiplier_1, pfc_multiplier_2 } = req.body;

    if (!pcf_id || !ccp_id) {
      return res.status(400).json({ error: 'Factor type and country pair are required' });
    }

    if (!pfc_from_date || !pfc_to_date) {
      return res.status(400).json({ error: 'Both from and to dates are required' });
    }

    if (pfc_from_date > pfc_to_date) {
      return res.status(400).json({ error: 'From date must be before or equal to to date' });
    }

    const result = await db.query(
      `INSERT INTO pconv_factor_values
       (pcf_id, ccp_id, pfc_from_date, pfc_to_date, pfc_multiplier_1, pfc_multiplier_2)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [pcf_id, ccp_id, pfc_from_date, pfc_to_date,
       pfc_multiplier_1 !== undefined ? pfc_multiplier_1 : 1.0,
       pfc_multiplier_2 !== undefined ? pfc_multiplier_2 : 1.0]
    );

    // Fetch the full value with related data
    const fullResult = await db.query(`
      SELECT
        pfv.pfv_id,
        pfv.pcf_id,
        pfv.ccp_id,
        pfv.pfc_from_date,
        pfv.pfc_to_date,
        pfv.pfc_multiplier_1,
        pfv.pfc_multiplier_2,
        pcf.pc_factor_code,
        pcf.pc_factor_description,
        fc.country_abbr AS from_country_abbr,
        tc.country_abbr AS to_country_abbr
      FROM pconv_factor_values pfv
      JOIN price_conv_factors pcf ON pfv.pcf_id = pcf.pcf_id
      JOIN country_conversion_pairs ccp ON pfv.ccp_id = ccp.ccp_id
      JOIN country fc ON ccp.ccp_from_country_id = fc.country_id
      JOIN country tc ON ccp.ccp_to_country_id = tc.country_id
      WHERE pfv.pfv_id = $1
    `, [result.rows[0].pfv_id]);

    res.status(201).json(fullResult.rows[0]);
  } catch (error) {
    // Handle date overlap constraint violation
    if (error.code === '23P01' || error.message?.includes('pconv_no_overlap')) {
      return res.status(400).json({ error: 'Date range overlaps with an existing row for this factor + country pair' });
    }
    console.error('Error creating factor value:', error);
    res.status(500).json({ error: 'Failed to create factor value' });
  }
});

// Update factor value
router.put('/values/:id', async (req, res) => {
  try {
    const { pcf_id, ccp_id, pfc_from_date, pfc_to_date, pfc_multiplier_1, pfc_multiplier_2 } = req.body;

    if (!pcf_id || !ccp_id) {
      return res.status(400).json({ error: 'Factor type and country pair are required' });
    }

    if (!pfc_from_date || !pfc_to_date) {
      return res.status(400).json({ error: 'Both from and to dates are required' });
    }

    if (pfc_from_date > pfc_to_date) {
      return res.status(400).json({ error: 'From date must be before or equal to to date' });
    }

    const result = await db.query(
      `UPDATE pconv_factor_values
       SET pcf_id = $1, ccp_id = $2, pfc_from_date = $3, pfc_to_date = $4,
           pfc_multiplier_1 = $5, pfc_multiplier_2 = $6
       WHERE pfv_id = $7
       RETURNING *`,
      [pcf_id, ccp_id, pfc_from_date, pfc_to_date,
       pfc_multiplier_1 !== undefined ? pfc_multiplier_1 : 1.0,
       pfc_multiplier_2 !== undefined ? pfc_multiplier_2 : 1.0,
       req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Factor value not found' });
    }

    // Fetch the full value with related data
    const fullResult = await db.query(`
      SELECT
        pfv.pfv_id,
        pfv.pcf_id,
        pfv.ccp_id,
        pfv.pfc_from_date,
        pfv.pfc_to_date,
        pfv.pfc_multiplier_1,
        pfv.pfc_multiplier_2,
        pcf.pc_factor_code,
        pcf.pc_factor_description,
        fc.country_abbr AS from_country_abbr,
        tc.country_abbr AS to_country_abbr
      FROM pconv_factor_values pfv
      JOIN price_conv_factors pcf ON pfv.pcf_id = pcf.pcf_id
      JOIN country_conversion_pairs ccp ON pfv.ccp_id = ccp.ccp_id
      JOIN country fc ON ccp.ccp_from_country_id = fc.country_id
      JOIN country tc ON ccp.ccp_to_country_id = tc.country_id
      WHERE pfv.pfv_id = $1
    `, [result.rows[0].pfv_id]);

    res.json(fullResult.rows[0]);
  } catch (error) {
    // Handle date overlap constraint violation
    if (error.code === '23P01' || error.message?.includes('pconv_no_overlap')) {
      return res.status(400).json({ error: 'Date range overlaps with an existing row for this factor + country pair' });
    }
    console.error('Error updating factor value:', error);
    res.status(500).json({ error: 'Failed to update factor value' });
  }
});

// Delete factor value
router.delete('/values/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM pconv_factor_values WHERE pfv_id = $1 RETURNING pfv_id',
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Factor value not found' });
    }
    res.json({ message: 'Factor value deleted successfully' });
  } catch (error) {
    console.error('Error deleting factor value:', error);
    res.status(500).json({ error: 'Failed to delete factor value' });
  }
});

// ================================================================
// HELPER ENDPOINTS
// ================================================================

// Get all countries (for dropdowns in pairs form)
router.get('/countries', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT country_id, country_abbr, country_name FROM country WHERE country_enabled = 1 ORDER BY country_abbr'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

module.exports = router;
