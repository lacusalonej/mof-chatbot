'use strict';

const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.ADMIN_DB_PATH || path.join(__dirname, 'admin.db');

let SQL = null;
let db = null;

async function ensureInit() {
    if (!SQL) {
        const SQLFactory = require('sql.js');
        SQL = await SQLFactory();
    }
    if (!db) {
        if (fs.existsSync(DB_PATH)) {
            const buffer = fs.readFileSync(DB_PATH);
            db = new SQL.Database(buffer);
        } else {
            db = new SQL.Database();
        }
    }
}

async function run(sqlStmt, params = []) {
    await ensureInit();
    const stmt = db.prepare(sqlStmt);
    const result = stmt.run(params);
    stmt.free();
    save();
    return { id: result.lastInsertRowid, changes: result.changes };
}

async function get(sqlStmt, params = []) {
    await ensureInit();
    const stmt = db.prepare(sqlStmt);
    const row = stmt.get(params);
    stmt.free();
    return row;
}

async function all(sqlStmt, params = []) {
    await ensureInit();
    const stmt = db.prepare(sqlStmt);
    const rows = stmt.all(params);
    stmt.free();
    return rows || [];
}

async function initialize() {
    await ensureInit();

    db.run("PRAGMA journal_mode = WAL");

    db.run(`CREATE TABLE IF NOT EXISTS users (
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
    try { db.run("ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE"); } catch (e) { /* column already exists */ }

    db.run(`CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
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

    db.run(`CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TEXT NOT NULL,
        updated_by INTEGER,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        user_message TEXT NOT NULL,
        bot_response TEXT,
        intent TEXT,
        sources TEXT,
        created_at TEXT NOT NULL
    )`);

    db.run("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)");
    db.run("CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)");
    db.run("CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at)");

    save();
}

function save() {
    if (!db) return;
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function close() {
    if (db) {
        save();
        db.close();
        db = null;
        SQL = null;
    }
}

module.exports = { db: null, run, get, all, initialize, close };
