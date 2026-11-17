'use strict';

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.ADMIN_DB_PATH || path.join(__dirname, 'admin.db');

const db = new Database(DB_PATH);

function run(sql, params = []) {
    const result = db.prepare(sql).run(params);
    return { id: result.lastInsertRowid, changes: result.changes };
}

function get(sql, params = []) {
    return db.prepare(sql).get(params);
}

function all(sql, params = []) {
    return db.prepare(sql).all(params);
}

async function initialize() {
    run("PRAGMA journal_mode = WAL");

    run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        google_id TEXT UNIQUE,
        role TEXT NOT NULL DEFAULT 'admin',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_login_at TEXT
    )`);
    try { run("ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE"); } catch (e) { /* column already exists */ }

    run(`CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    run(`CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`);

    run(`CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TEXT NOT NULL,
        updated_by INTEGER,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    )`);

    run(`CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        user_message TEXT NOT NULL,
        bot_response TEXT,
        intent TEXT,
        sources TEXT,
        created_at TEXT NOT NULL
    )`);

    run("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)");
    run("CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)");
    run("CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)");
    run("CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id)");
    run("CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at)");
}

function close() {
    db.close();
}

module.exports = { db, run, get, all, initialize, close };
