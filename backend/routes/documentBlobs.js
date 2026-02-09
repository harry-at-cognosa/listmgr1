const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const db = require('../db');
const router = express.Router();

// Configure multer for memory storage with 4MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024 // 4MB
  },
  fileFilter: function(req, file, cb) {
    // Only allow .docx files
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream' // Some browsers send this for .docx
    ];
    const isDocx = file.originalname.toLowerCase().endsWith('.docx');

    if (isDocx || allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only .docx files are allowed'), false);
    }
  }
});

// POST /api/templates/:id/document - Upload document for a template
router.post('/:id/document', upload.single('document'), async function(req, res) {
  var client;
  try {
    var templateId = req.params.id;

    // Verify template exists
    var templateResult = await db.query(
      'SELECT plsqt_id, current_blob_id FROM plsq_templates WHERE plsqt_id = $1',
      [templateId]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please upload a .docx file.' });
    }

    var fileBytes = req.file.buffer;
    var originalFilename = req.file.originalname;
    var sizeBytes = fileBytes.length;
    var contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // Compute SHA-256 hash
    var sha256Hash = crypto.createHash('sha256').update(fileBytes).digest();

    var oldBlobId = templateResult.rows[0].current_blob_id;
    var username = req.session.user.username;

    // Start transaction
    client = await db.pool.connect();
    await client.query('BEGIN');

    try {
      // Step 1: Check if blob with same SHA-256 already exists (deduplication)
      var existingBlob = await client.query(
        'SELECT blob_id FROM document_blob WHERE sha256 = $1',
        [sha256Hash]
      );

      var newBlobId;
      if (existingBlob.rows.length > 0) {
        // Reuse existing blob
        newBlobId = existingBlob.rows[0].blob_id;
      } else {
        // Insert new blob
        var insertResult = await client.query(
          'INSERT INTO document_blob (bytes, sha256, size_bytes, content_type, original_filename) VALUES ($1, $2, $3, $4, $5) RETURNING blob_id',
          [fileBytes, sha256Hash, sizeBytes, contentType, originalFilename]
        );
        newBlobId = insertResult.rows[0].blob_id;
      }

      // Step 2: Archive old blob if different
      if (oldBlobId && oldBlobId !== newBlobId) {
        await client.query(
          'INSERT INTO document_blob_history (entity_type, entity_id, blob_id, replaced_by) VALUES ($1, $2, $3, $4)',
          ['template', templateId, oldBlobId, username]
        );
      }

      // Step 3: Update template's current_blob_id and sync plsqt_extrn_file_ref with uploaded filename
      var now = new Date().toISOString().slice(0, 16).replace('T', ' ');
      await client.query(
        'UPDATE plsq_templates SET current_blob_id = $1, plsqt_extrn_file_ref = $2, last_update_datetime = $3, last_update_user = $4 WHERE plsqt_id = $5',
        [newBlobId, originalFilename, now, username, templateId]
      );

      await client.query('COMMIT');

      res.status(200).json({
        message: 'Document uploaded successfully',
        blob_id: newBlobId,
        original_filename: originalFilename,
        size_bytes: sizeBytes,
        deduplicated: existingBlob.rows.length > 0
      });

    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    }

  } catch (error) {
    if (error.message === 'Only .docx files are allowed') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// GET /api/templates/:id/document - Download current document
router.get('/:id/document', async function(req, res) {
  try {
    var templateId = req.params.id;

    var result = await db.query(
      'SELECT b.blob_id, b.bytes, b.content_type, b.original_filename, b.size_bytes FROM plsq_templates t JOIN document_blob b ON b.blob_id = t.current_blob_id WHERE t.plsqt_id = $1',
      [templateId]
    );

    if (result.rows.length === 0) {
      // Check if template exists but has no document
      var templateCheck = await db.query(
        'SELECT plsqt_id, current_blob_id FROM plsq_templates WHERE plsqt_id = $1',
        [templateId]
      );

      if (templateCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }

      return res.status(404).json({ error: 'Template has no document attached' });
    }

    var blob = result.rows[0];
    var filename = blob.original_filename || ('template-' + templateId + '.docx');

    res.setHeader('Content-Type', blob.content_type);
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Content-Length', blob.size_bytes);
    res.send(blob.bytes);

  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// DELETE /api/templates/:id/document - Remove document (admin only)
router.delete('/:id/document', async function(req, res) {
  var client;
  try {
    // Check admin role
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required to delete documents' });
    }

    var templateId = req.params.id;
    var username = req.session.user.username;

    // Get current blob
    var templateResult = await db.query(
      'SELECT plsqt_id, current_blob_id FROM plsq_templates WHERE plsqt_id = $1',
      [templateId]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    var currentBlobId = templateResult.rows[0].current_blob_id;

    if (!currentBlobId) {
      return res.status(404).json({ error: 'Template has no document to remove' });
    }

    // Start transaction
    client = await db.pool.connect();
    await client.query('BEGIN');

    try {
      // Archive the current blob to history
      await client.query(
        'INSERT INTO document_blob_history (entity_type, entity_id, blob_id, replaced_by) VALUES ($1, $2, $3, $4)',
        ['template', templateId, currentBlobId, username]
      );

      // Set current_blob_id to NULL
      var now = new Date().toISOString().slice(0, 16).replace('T', ' ');
      await client.query(
        'UPDATE plsq_templates SET current_blob_id = NULL, last_update_datetime = $1, last_update_user = $2 WHERE plsqt_id = $3',
        [now, username, templateId]
      );

      await client.query('COMMIT');

      res.json({ message: 'Document removed successfully' });

    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    }

  } catch (error) {
    console.error('Error removing document:', error);
    res.status(500).json({ error: 'Failed to remove document' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// GET /api/templates/:id/document/info - Get document info without downloading bytes
router.get('/:id/document/info', async function(req, res) {
  try {
    var templateId = req.params.id;

    // Get current document info
    var result = await db.query(
      'SELECT b.blob_id, b.original_filename, b.size_bytes, b.content_type, b.created_at FROM plsq_templates t JOIN document_blob b ON b.blob_id = t.current_blob_id WHERE t.plsqt_id = $1',
      [templateId]
    );

    if (result.rows.length === 0) {
      var templateCheck = await db.query(
        'SELECT plsqt_id FROM plsq_templates WHERE plsqt_id = $1',
        [templateId]
      );

      if (templateCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Template not found' });
      }

      return res.json({ has_document: false });
    }

    var blob = result.rows[0];
    res.json({
      has_document: true,
      blob_id: blob.blob_id,
      original_filename: blob.original_filename,
      size_bytes: blob.size_bytes,
      content_type: blob.content_type,
      created_at: blob.created_at
    });

  } catch (error) {
    console.error('Error fetching document info:', error);
    res.status(500).json({ error: 'Failed to fetch document info' });
  }
});

// GET /api/templates/:id/document/history - Get version history
router.get('/:id/document/history', async function(req, res) {
  try {
    var templateId = req.params.id;

    // Verify template exists
    var templateCheck = await db.query(
      'SELECT plsqt_id FROM plsq_templates WHERE plsqt_id = $1',
      [templateId]
    );

    if (templateCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Get version history
    var result = await db.query(
      "SELECT h.history_id, h.blob_id, h.replaced_at, h.replaced_by, b.original_filename, b.size_bytes, b.created_at AS blob_created_at FROM document_blob_history h JOIN document_blob b ON b.blob_id = h.blob_id WHERE h.entity_type = 'template' AND h.entity_id = $1 ORDER BY h.replaced_at DESC",
      [templateId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching document history:', error);
    res.status(500).json({ error: 'Failed to fetch document history' });
  }
});

// Handle multer errors (file size exceeded, etc.)
router.use(function(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 4MB limit' });
    }
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }
  if (err.message === 'Only .docx files are allowed') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
