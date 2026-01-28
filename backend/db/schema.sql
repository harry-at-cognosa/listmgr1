-- ListMgr1 Database Schema
-- PostgreSQL

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    last_update_datetime VARCHAR(15),
    last_update_user VARCHAR(50)
);

-- Currency table
CREATE TABLE IF NOT EXISTS currency (
    currency_id SERIAL PRIMARY KEY,
    currency_symbol VARCHAR(3) NOT NULL,
    currency_name VARCHAR(20),
    last_update_datetime VARCHAR(15),
    last_update_user VARCHAR(50)
);

-- Country table
CREATE TABLE IF NOT EXISTS country (
    country_id SERIAL PRIMARY KEY,
    country_abbr CHAR(3) NOT NULL,
    country_name VARCHAR(50) NOT NULL,
    currency_id INTEGER REFERENCES currency(currency_id),
    last_update_datetime VARCHAR(15),
    last_update_user VARCHAR(50)
);

-- Product Category table
CREATE TABLE IF NOT EXISTS product_cat (
    product_cat_id SERIAL PRIMARY KEY,
    product_cat_abbr CHAR(3),
    product_cat_name VARCHAR(50),
    product_cat_enabled INTEGER DEFAULT 1 NOT NULL,
    last_update_datetime VARCHAR(15),
    last_update_user VARCHAR(50)
);

-- Product Line table
CREATE TABLE IF NOT EXISTS product_line (
    product_line_id SERIAL PRIMARY KEY,
    product_cat_id INTEGER NOT NULL REFERENCES product_cat(product_cat_id),
    product_line_abbr CHAR(3),
    product_line_name VARCHAR(20),
    product_line_enabled INTEGER DEFAULT 1 NOT NULL,
    last_update_datetime VARCHAR(15),
    last_update_user VARCHAR(50)
);

-- Section Type (plsqts_type) table
CREATE TABLE IF NOT EXISTS plsqts_type (
    plsqtst_id SERIAL PRIMARY KEY,
    plsqtst_name VARCHAR(50),
    plsqtst_has_total_price BOOLEAN DEFAULT false,
    plsqtst_has_lineitem_prices BOOLEAN DEFAULT false,
    plsqtst_comment VARCHAR(100),
    extrn_file_ref VARCHAR(500),
    plsqtst_active BOOLEAN DEFAULT true,
    plsqtst_version VARCHAR(25),
    last_update_datetime VARCHAR(15),
    last_update_user VARCHAR(50)
);

-- Templates (plsq_templates) table
CREATE TABLE IF NOT EXISTS plsq_templates (
    plsqt_id SERIAL PRIMARY KEY,
    country_id INTEGER REFERENCES country(country_id),
    currency_id INTEGER REFERENCES currency(currency_id),
    product_cat_id INTEGER REFERENCES product_cat(product_cat_id),
    product_line_id INTEGER REFERENCES product_line(product_line_id),
    plsqt_name VARCHAR(100),
    plsqt_order_codes VARCHAR(200),
    plsqt_desc VARCHAR(800),
    plsqt_comment VARCHAR(100),
    plsqt_section_count INTEGER NOT NULL DEFAULT 0,
    plsqt_fbo_location VARCHAR(50),
    plsqs_as_of_date DATE,
    extrn_file_ref VARCHAR(500),
    plsqt_active BOOLEAN DEFAULT true,
    plsqt_version VARCHAR(25),
    content VARCHAR(500),
    plsqt_status VARCHAR(20) DEFAULT 'not started',
    status_datetime VARCHAR(15),
    last_update_datetime VARCHAR(15),
    last_update_user VARCHAR(50)
);

-- Sections (plsqt_sections) table
CREATE TABLE IF NOT EXISTS plsqt_sections (
    plsqts_id SERIAL PRIMARY KEY,
    plsqt_id INTEGER NOT NULL REFERENCES plsq_templates(plsqt_id) ON DELETE CASCADE,
    section_type_id INTEGER NOT NULL REFERENCES plsqts_type(plsqtst_id),
    plsqt_seqn INTEGER NOT NULL,
    plsqt_alt_name VARCHAR(50),
    plsqt_comment VARCHAR(100),
    plsqt_use_alt_name BOOLEAN DEFAULT false,
    plsqts_subsection_count INTEGER NOT NULL DEFAULT 0,
    plsqts_active BOOLEAN DEFAULT true,
    plsqts_version VARCHAR(25),
    extrn_file_ref VARCHAR(500),
    content VARCHAR(500),
    plsqts_status VARCHAR(20) DEFAULT 'not started',
    status_datetime VARCHAR(15),
    last_update_datetime VARCHAR(15),
    last_update_user VARCHAR(50)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_country_currency ON country(currency_id);
CREATE INDEX IF NOT EXISTS idx_product_line_cat ON product_line(product_cat_id);
CREATE INDEX IF NOT EXISTS idx_templates_country ON plsq_templates(country_id);
CREATE INDEX IF NOT EXISTS idx_templates_product_cat ON plsq_templates(product_cat_id);
CREATE INDEX IF NOT EXISTS idx_templates_product_line ON plsq_templates(product_line_id);
CREATE INDEX IF NOT EXISTS idx_sections_template ON plsqt_sections(plsqt_id);
CREATE INDEX IF NOT EXISTS idx_sections_type ON plsqt_sections(section_type_id);
