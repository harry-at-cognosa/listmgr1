const express = require('express');
const http = require('http');
const router = express.Router();

// FastAPI template loader service URL (configurable via environment variable)
const TEMPLATE_LOADER_URL = process.env.TEMPLATE_LOADER_URL || 'http://127.0.0.1:8000';

/**
 * Parse the TEMPLATE_LOADER_URL into host and port components.
 */
function getServiceConfig() {
  try {
    const url = new URL(TEMPLATE_LOADER_URL);
    return {
      hostname: url.hostname,
      port: parseInt(url.port, 10) || 80,
      protocol: url.protocol
    };
  } catch (err) {
    console.error('Invalid TEMPLATE_LOADER_URL:', TEMPLATE_LOADER_URL);
    return { hostname: '127.0.0.1', port: 8000, protocol: 'http:' };
  }
}

/**
 * GET /api/load-template/health
 *
 * Proxies to FastAPI GET /health.
 * Returns { status: 'healthy' } if the service is reachable,
 * or an appropriate error if the service is unavailable.
 */
router.get('/health', function(req, res) {
  var config = getServiceConfig();

  var proxyReq = http.request(
    {
      hostname: config.hostname,
      port: config.port,
      path: '/health',
      method: 'GET',
      timeout: 5000
    },
    function(proxyRes) {
      var body = '';
      proxyRes.on('data', function(chunk) {
        body += chunk;
      });
      proxyRes.on('end', function() {
        // Any response from the service means it is reachable.
        // The /health endpoint may not exist on the FastAPI service,
        // so a 404 still indicates the service is up and accepting connections.
        try {
          var parsed = JSON.parse(body);
          if (parsed.status === 'healthy' || (proxyRes.statusCode >= 200 && proxyRes.statusCode < 500)) {
            // Service is reachable (even 404 means the server is running)
            res.json({ status: 'healthy', service_url: TEMPLATE_LOADER_URL });
          } else {
            // 5xx from the service itself means unhealthy
            res.status(proxyRes.statusCode).json({
              status: 'unhealthy',
              error: parsed.error || parsed.detail || 'Service reported unhealthy',
              statusCode: proxyRes.statusCode
            });
          }
        } catch (e) {
          // If FastAPI returns non-JSON (e.g. HTML docs page), still report healthy
          // since the service responded
          if (proxyRes.statusCode < 500) {
            res.json({ status: 'healthy', service_url: TEMPLATE_LOADER_URL });
          } else {
            res.status(proxyRes.statusCode).json({
              status: 'unhealthy',
              error: 'Unexpected response from template loader service',
              statusCode: proxyRes.statusCode
            });
          }
        }
      });
    }
  );

  proxyReq.on('error', function(err) {
    console.error('Template loader health check failed:', err.message);
    res.status(503).json({
      status: 'unavailable',
      error: 'Template loader service is not reachable',
      detail: err.message,
      service_url: TEMPLATE_LOADER_URL
    });
  });

  proxyReq.on('timeout', function() {
    proxyReq.destroy();
    res.status(504).json({
      status: 'timeout',
      error: 'Template loader service health check timed out',
      service_url: TEMPLATE_LOADER_URL
    });
  });

  proxyReq.end();
});

/**
 * POST /api/load-template
 *
 * Proxies multipart form data (file, country, currency, product_line)
 * to FastAPI POST /api/v1/templates/load.
 *
 * Forwards the raw request body with its Content-Type (including multipart boundary)
 * directly to the FastAPI service, preserving all form fields and file data.
 *
 * All HTTP status codes and error messages from the FastAPI service
 * (400, 422, 500, etc.) are forwarded back to the frontend unchanged.
 */
router.post('/', function(req, res) {
  var config = getServiceConfig();

  // Read the content-type header from the incoming request (includes multipart boundary)
  var contentType = req.headers['content-type'];

  if (!contentType || !contentType.includes('multipart/form-data')) {
    return res.status(400).json({
      error: 'Content-Type must be multipart/form-data'
    });
  }

  // Collect the raw request body
  var bodyChunks = [];
  req.on('data', function(chunk) {
    bodyChunks.push(chunk);
  });

  req.on('end', function() {
    var bodyBuffer = Buffer.concat(bodyChunks);

    var proxyReq = http.request(
      {
        hostname: config.hostname,
        port: config.port,
        path: '/api/v1/templates/load',
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          'Content-Length': bodyBuffer.length
        },
        timeout: 60000 // 60 seconds for file uploads
      },
      function(proxyRes) {
        var responseChunks = [];
        proxyRes.on('data', function(chunk) {
          responseChunks.push(chunk);
        });
        proxyRes.on('end', function() {
          var responseBody = Buffer.concat(responseChunks).toString('utf-8');
          try {
            var parsed = JSON.parse(responseBody);
            res.status(proxyRes.statusCode).json(parsed);
          } catch (e) {
            // Non-JSON response - forward as-is
            res.status(proxyRes.statusCode).send(responseBody);
          }
        });
      }
    );

    proxyReq.on('error', function(err) {
      console.error('Template loader proxy error:', err.message);
      res.status(503).json({
        error: 'Template loader service is not reachable',
        detail: err.message
      });
    });

    proxyReq.on('timeout', function() {
      proxyReq.destroy();
      res.status(504).json({
        error: 'Template loader service request timed out'
      });
    });

    proxyReq.write(bodyBuffer);
    proxyReq.end();
  });

  req.on('error', function(err) {
    console.error('Error reading request body:', err.message);
    res.status(500).json({ error: 'Failed to read request body' });
  });
});

module.exports = router;
