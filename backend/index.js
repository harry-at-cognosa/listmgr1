require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Auth middleware
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const currenciesRoutes = require('./routes/currencies');
const countriesRoutes = require('./routes/countries');
const productCategoriesRoutes = require('./routes/productCategories');
const productLinesRoutes = require('./routes/productLines');
const sectionTypesRoutes = require('./routes/sectionTypes');
const templatesRoutes = require('./routes/templates');
const sectionsRoutes = require('./routes/sections');
const appSettingsRoutes = require('./routes/appSettings');

// Public settings endpoint (unauthenticated) - for login page
app.get('/api/public-settings', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT name, value FROM app_settings
       WHERE name IN ('client_name', 'app_version', 'db_version')
       ORDER BY name`
    );

    const settings = {};
    result.rows.forEach(row => {
      settings[row.name] = row.value;
    });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching public settings:', error);
    res.status(500).json({ error: 'Failed to fetch public settings' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', requireAdmin, usersRoutes);
app.use('/api/currencies', requireAuth, currenciesRoutes);
app.use('/api/countries', requireAuth, countriesRoutes);
app.use('/api/product-categories', requireAuth, productCategoriesRoutes);
app.use('/api/product-lines', requireAuth, productLinesRoutes);
app.use('/api/section-types', requireAuth, sectionTypesRoutes);
app.use('/api/templates', requireAuth, templatesRoutes);
app.use('/api/sections', requireAuth, sectionsRoutes);
app.use('/api/app-settings', requireAuth, appSettingsRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = { app, requireAuth, requireAdmin };
