-- ListMgr1 Database Schema
-- PostgreSQL

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    user_enabled INTEGER DEFAULT 1 NOT NULL,
    last_update_datetime VARCHAR(15),
    last_update_user VARCHAR(50)
);

-- Currency table
CREATE TABLE IF NOT EXISTS currency (
    currency_id SERIAL PRIMARY KEY,
    currency_symbol VARCHAR(3) NOT NULL,
    currency_name VARCHAR(20),
    currency_enabled INTEGER DEFAULT 1 NOT NULL,
    last_update_datetime VARCHAR(15),
    last_update_user VARCHAR(50)
);

-- Country table
CREATE TABLE IF NOT EXISTS country (
    country_id SERIAL PRIMARY KEY,
    country_abbr CHAR(3) NOT NULL,
    country_name VARCHAR(50) NOT NULL,
    currency_id INTEGER REFERENCES currency(currency_id),
    country_enabled INTEGER DEFAULT 1 NOT NULL,
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

-- Price Conversion Tables (Migration 115)

-- Enable btree_gist extension for overlap prevention constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Price Conversion Factors - lookup table defining types of price conversion factors
CREATE TABLE IF NOT EXISTS price_conv_factors (
    pcf_id                SERIAL PRIMARY KEY,
    pc_factor_code        VARCHAR(3) NOT NULL,
    pc_factor_description VARCHAR(40)
);

-- Country Conversion Pairs - directional country pairs for conversion factors
CREATE TABLE IF NOT EXISTS country_conversion_pairs (
    ccp_id                SERIAL PRIMARY KEY,
    ccp_from_country_id   INTEGER NOT NULL REFERENCES country(country_id),
    ccp_to_country_id     INTEGER NOT NULL REFERENCES country(country_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ccp_pair_unique
    ON country_conversion_pairs (ccp_from_country_id, ccp_to_country_id);

CREATE INDEX IF NOT EXISTS idx_ccp_from_country
    ON country_conversion_pairs (ccp_from_country_id);

CREATE INDEX IF NOT EXISTS idx_ccp_to_country
    ON country_conversion_pairs (ccp_to_country_id);

-- Price Conversion Factor Values - time-bounded multiplier values
CREATE TABLE IF NOT EXISTS pconv_factor_values (
    pfv_id            SERIAL PRIMARY KEY,
    pcf_id            INTEGER NOT NULL REFERENCES price_conv_factors(pcf_id),
    ccp_id            INTEGER NOT NULL REFERENCES country_conversion_pairs(ccp_id),
    pfc_from_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    pfc_to_date       DATE NOT NULL DEFAULT '2040-12-31',
    pfc_multiplier_1  NUMERIC(8,4) NOT NULL DEFAULT 1.0,
    pfc_multiplier_2  NUMERIC(8,4) NOT NULL DEFAULT 1.0,

    -- Prevent overlapping date periods for the same factor + country pair
    CONSTRAINT pconv_no_overlap
        EXCLUDE USING gist (
            pcf_id WITH =,
            ccp_id WITH =,
            daterange(pfc_from_date, pfc_to_date, '[]') WITH &&
        ),

    -- Ensure from_date <= to_date
    CONSTRAINT pconv_date_order
        CHECK (pfc_from_date <= pfc_to_date)
);

CREATE INDEX IF NOT EXISTS idx_pfv_factor
    ON pconv_factor_values (pcf_id);

CREATE INDEX IF NOT EXISTS idx_pfv_ccp
    ON pconv_factor_values (ccp_id);

CREATE INDEX IF NOT EXISTS idx_pfv_dates
    ON pconv_factor_values (pfc_from_date, pfc_to_date);
