-- ===================================================
--  AEGIS CORE — GUARDIAN COMPLAINT PORTAL
--  Enhanced Database Schema v2.0
-- ===================================================

CREATE DATABASE IF NOT EXISTS police_portal;
USE police_portal;

-- ===== USERS TABLE (JWT Auth) =====
CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    phone       VARCHAR(50),
    password    VARCHAR(255) NOT NULL,
    role        ENUM('citizen','officer','admin') DEFAULT 'citizen',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login  TIMESTAMP NULL
);

-- ===== COMPLAINTS TABLE (Enhanced) =====
CREATE TABLE IF NOT EXISTS complaints (
    id                  VARCHAR(50) PRIMARY KEY,
    name                VARCHAR(255),
    phone               VARCHAR(50),
    address             TEXT,
    complaint           TEXT,
    category            VARCHAR(100),
    priority            VARCHAR(50),
    ipc_section         VARCHAR(255),
    summary             TEXT,
    recommended_action  TEXT,
    area                VARCHAR(255),
    officer             VARCHAR(255),
    badge_no            VARCHAR(100),
    station             VARCHAR(255),
    date                VARCHAR(50),
    status              VARCHAR(50),
    filedBy             VARCHAR(50),
    sentiment           VARCHAR(20) DEFAULT 'Neutral',
    sentiment_score     DECIMAL(4,2) DEFAULT 0.5,
    assigned_officer    VARCHAR(255),
    duplicate_risk      VARCHAR(20) DEFAULT 'Low',
    evidence_path       VARCHAR(500),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ===== SOS ALERTS TABLE =====
CREATE TABLE IF NOT EXISTS sos_alerts (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    latitude    DECIMAL(10, 8),
    longitude   DECIMAL(11, 8),
    active      BOOLEAN DEFAULT TRUE,
    timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== AUDIT LOG TABLE =====
CREATE TABLE IF NOT EXISTS audit_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   VARCHAR(100),
    actor       VARCHAR(255),
    actor_role  VARCHAR(50),
    details     TEXT,
    ip_address  VARCHAR(50),
    timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== OFFICERS TABLE =====
CREATE TABLE IF NOT EXISTS officers (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    badge_no    VARCHAR(100) UNIQUE,
    officer_rank VARCHAR(100),
    station     VARCHAR(255),
    area        VARCHAR(255),
    phone       VARCHAR(50),
    active      BOOLEAN DEFAULT TRUE
);

-- ===== SEED DEFAULT OFFICERS =====
INSERT IGNORE INTO officers (name, badge_no, officer_rank, station, area) VALUES
('SI Ramesh Kumar',   'AP-1001', 'Sub-Inspector',    'Central Town PS',    'Transit Station'),
('SI Priya Sharma',   'AP-1002', 'Sub-Inspector',    'Old Town PS',           'Old Town'),
('ASI Venkat Rao',    'AP-1003', 'Asst Sub-Inspector','Railway Station PS',  'Railway Station'),
('SI Abdul Kalam',    'AP-1004', 'Sub-Inspector',    'Market PS',             'Market Area'),
('SI Lakshmi Devi',   'AP-1005', 'Sub-Inspector',    'Subash Nagar PS',       'Subash Nagar');

-- ===== SEED DEFAULT ADMIN USER =====
-- Password: police@2026 (will be hashed by app, this is plain for reference)
INSERT IGNORE INTO users (name, email, phone, password, role) VALUES
('Admin User', 'admin@citypolice.gov.in', '08554-272222', '$2a$10$placeholder_will_be_set_by_app', 'admin');
