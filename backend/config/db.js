const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let dbType = 'mysql';
let pool = null;
let sqliteDb = null;
let pgPool = null;

// Helper to sanitize SQL for SQLite fallback
function adaptSqlForSqlite(sql) {
  let s = sql;
  // Replace AUTO_INCREMENT with AUTOINCREMENT
  s = s.replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT');
  // In SQLite, AUTOINCREMENT requires INTEGER PRIMARY KEY
  s = s.replace(/INT\s+AUTOINCREMENT\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
  s = s.replace(/INT\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
  // Strip ENGINE=InnoDB and CHARSET
  s = s.replace(/ENGINE\s*=\s*\w+/gi, '');
  s = s.replace(/DEFAULT\s+CHARSET\s*=\s*\w+/gi, '');
  s = s.replace(/COLLATE\s*=\s*[\w_]+/gi, '');
  // Replace ON UPDATE CURRENT_TIMESTAMP
  s = s.replace(/ON\s+UPDATE\s+CURRENT_TIMESTAMP/gi, '');
  // Replace ENUM(...) with VARCHAR(50)
  s = s.replace(/ENUM\([^)]+\)/gi, 'VARCHAR(50)');
  // Replace NOW() with CURRENT_TIMESTAMP
  s = s.replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP');
  // Strip INT(x) -> INTEGER
  s = s.replace(/\bINT\(\d+\)/gi, 'INTEGER');
  // Strip DECIMAL(x, y) -> REAL
  s = s.replace(/\bDECIMAL\(\d+,\s*\d+\)/gi, 'REAL');
  return s;
}

// Initialize SQLite fallback engine
function initSqlite() {
  const { DatabaseSync } = require('node:sqlite');
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'invoice_pro.sqlite');
  sqliteDb = new DatabaseSync(dbPath);
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  dbType = 'sqlite';
  console.log(`[Database] Using local SQLite database at: ${dbPath}`);
}

async function connectPostgres(dbUrl) {
  try {
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });
    await pgPool.query('SELECT 1 as test');
    dbType = 'postgres';
    console.log('[Database] Connected successfully to PostgreSQL (Supabase/Cloud DB)');
    return true;
  } catch (err) {
    console.warn(`[Database] PostgreSQL connection failed (${err.message}). Trying fallback.`);
    return false;
  }
}

async function connectMySQL() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'invoice_pro';

  try {
    // Check if server is reachable and create DB if not exists
    const tempConn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      connectTimeout: 2000
    });
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await tempConn.end();

    // Create pool for actual database
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      decimalNumbers: true
    });

    // Test connection
    const [test] = await pool.query('SELECT 1 as test');
    dbType = 'mysql';
    console.log(`[Database] Connected successfully to MySQL at ${host}:${port}/${database}`);
    return true;
  } catch (err) {
    console.warn(`[Database] MySQL connection failed (${err.message}). Falling back to embedded SQLite.`);
    initSqlite();
    return false;
  }
}

async function connectDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'))) {
    const pgSuccess = await connectPostgres(dbUrl);
    if (pgSuccess) return true;
  }
  return await connectMySQL();
}

// Universal query execution
async function query(sql, params = []) {
  if (dbType === 'postgres' && pgPool) {
    let paramIndex = 1;
    let pSql = sql.replace(/\?/g, () => `$${paramIndex++}`).replace(/`/g, '');
    if (/^INSERT\s+INTO/i.test(pSql.trim()) && !/RETURNING/i.test(pSql)) {
      pSql += ' RETURNING id';
    }
    const res = await pgPool.query(pSql, params);
    const isSelect = /^SELECT/i.test(pSql.trim()) || /^SHOW/i.test(pSql.trim()) || /^WITH/i.test(pSql.trim());
    if (isSelect) {
      return [res.rows, []];
    } else {
      const insertId = res.rows && res.rows[0] ? (res.rows[0].id || 0) : 0;
      return [{
        insertId,
        affectedRows: res.rowCount || 0,
        changedRows: res.rowCount || 0
      }, []];
    }
  }

  if (dbType === 'mysql' && pool) {
    return await pool.query(sql, params);
  }

  // SQLite execution
  if (!sqliteDb) {
    initSqlite();
  }

  try {
    const trimmedSql = sql.trim();
    const isSelect = /^SELECT/i.test(trimmedSql) || /^PRAGMA/i.test(trimmedSql) || /^SHOW/i.test(trimmedSql);

    // Format params for SQLite: boolean to int, undefined to null
    const sanitizedParams = params.map(p => {
      if (p === undefined) return null;
      if (typeof p === 'boolean') return p ? 1 : 0;
      return p;
    });

    const stmt = sqliteDb.prepare(sql);

    if (isSelect) {
      const rows = stmt.all(...sanitizedParams);
      return [rows, []];
    } else {
      const result = stmt.run(...sanitizedParams);
      const resObj = {
        insertId: Number(result.lastInsertRowid || 0),
        affectedRows: Number(result.changes || 0),
        changedRows: Number(result.changes || 0)
      };
      return [resObj, []];
    }
  } catch (err) {
    console.error('[Database Query Error]:', err.message, '\nSQL:', sql, '\nParams:', params);
    throw err;
  }
}

// Transaction connection abstraction
async function getConnection() {
  if (dbType === 'postgres' && pgPool) {
    const client = await pgPool.connect();
    return {
      query: async (sql, params = []) => {
        let paramIndex = 1;
        let pSql = sql.replace(/\?/g, () => `$${paramIndex++}`).replace(/`/g, '');
        if (/^INSERT\s+INTO/i.test(pSql.trim()) && !/RETURNING/i.test(pSql)) {
          pSql += ' RETURNING id';
        }
        const res = await client.query(pSql, params);
        const isSelect = /^SELECT/i.test(pSql.trim()) || /^SHOW/i.test(pSql.trim()) || /^WITH/i.test(pSql.trim());
        if (isSelect) {
          return [res.rows, []];
        } else {
          const insertId = res.rows && res.rows[0] ? (res.rows[0].id || 0) : 0;
          return [{
            insertId,
            affectedRows: res.rowCount || 0,
            changedRows: res.rowCount || 0
          }, []];
        }
      },
      beginTransaction: async () => { await client.query('BEGIN'); },
      commit: async () => { await client.query('COMMIT'); },
      rollback: async () => { await client.query('ROLLBACK'); },
      release: () => client.release()
    };
  }

  if (dbType === 'mysql' && pool) {
    const conn = await pool.getConnection();
    return {
      query: (sql, params) => conn.query(sql, params),
      beginTransaction: () => conn.beginTransaction(),
      commit: () => conn.commit(),
      rollback: () => conn.rollback(),
      release: () => conn.release()
    };
  }

  // SQLite transaction
  if (!sqliteDb) initSqlite();
  return {
    query: async (sql, params = []) => query(sql, params),
    beginTransaction: async () => { sqliteDb.exec('BEGIN TRANSACTION;'); },
    commit: async () => { sqliteDb.exec('COMMIT;'); },
    rollback: async () => { sqliteDb.exec('ROLLBACK;'); },
    release: async () => { /* no-op for sync sqlite */ }
  };
}

// Auto-initialize tables and seed demo data
async function initDb() {
  await connectDatabase();

  if (dbType === 'postgres') {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        business_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS business_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        business_name TEXT NOT NULL,
        logo_url TEXT,
        signature_url TEXT,
        signature_type TEXT DEFAULT 'draw',
        email TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        postal_code TEXT,
        country TEXT DEFAULT 'India',
        gstin TEXT,
        currency TEXT DEFAULT 'INR',
        currency_symbol TEXT DEFAULT '₹',
        invoice_prefix TEXT DEFAULT 'INV-',
        next_invoice_number INTEGER DEFAULT 1001,
        default_tax_rate NUMERIC DEFAULT 18.00,
        default_payment_terms TEXT DEFAULT 'Payment due within 15 days of invoice date',
        invoice_footer TEXT DEFAULT 'Thank you for your business! For any questions, please contact our support.',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        company_name TEXT,
        email TEXT,
        phone TEXT,
        avatar_url TEXT,
        billing_address TEXT,
        city TEXT,
        state TEXT,
        postal_code TEXT,
        gstin TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'General',
        image_url TEXT,
        unit_price NUMERIC DEFAULT 0.00,
        gst_rate NUMERIC DEFAULT 18.00,
        product_type TEXT DEFAULT 'service',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        invoice_number TEXT NOT NULL,
        invoice_date TEXT NOT NULL,
        due_date TEXT NOT NULL,
        payment_terms TEXT DEFAULT 'Due within 15 days',
        tax_type TEXT DEFAULT 'cgst_sgst',
        subtotal NUMERIC DEFAULT 0.00,
        discount_total NUMERIC DEFAULT 0.00,
        tax_total NUMERIC DEFAULT 0.00,
        cgst_amount NUMERIC DEFAULT 0.00,
        sgst_amount NUMERIC DEFAULT 0.00,
        igst_amount NUMERIC DEFAULT 0.00,
        grand_total NUMERIC DEFAULT 0.00,
        paid_amount NUMERIC DEFAULT 0.00,
        due_amount NUMERIC DEFAULT 0.00,
        status TEXT DEFAULT 'draft',
        notes TEXT,
        terms TEXT,
        signature_data TEXT,
        signature_type TEXT DEFAULT 'draw',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER NOT NULL,
        product_id INTEGER,
        item_name TEXT NOT NULL,
        description TEXT,
        quantity NUMERIC NOT NULL DEFAULT 1.00,
        unit_price NUMERIC NOT NULL DEFAULT 0.00,
        discount_percent NUMERIC DEFAULT 0.00,
        tax_percent NUMERIC DEFAULT 18.00,
        line_total NUMERIC NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        invoice_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        payment_date TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        payment_method TEXT DEFAULT 'UPI',
        transaction_reference TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  } else if (dbType === 'mysql') {
    // Run schema creation for MySQL
    const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      const statements = schemaSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !/^USE\b/i.test(s));

      for (const statement of statements) {
        try {
          await pool.query(statement);
        } catch (e) {
          // ignore already existing or minor warnings
        }
      }
    }
  } else {
    // SQLite table creation
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        business_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS business_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        business_name TEXT NOT NULL,
        logo_url TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        postal_code TEXT,
        country TEXT DEFAULT 'India',
        gstin TEXT,
        currency TEXT DEFAULT 'INR',
        currency_symbol TEXT DEFAULT '₹',
        invoice_prefix TEXT DEFAULT 'INV-',
        next_invoice_number INTEGER DEFAULT 1001,
        default_tax_rate REAL DEFAULT 18.00,
        default_payment_terms TEXT DEFAULT 'Payment due within 15 days of invoice date',
        invoice_footer TEXT DEFAULT 'Thank you for your business! For any questions, please contact our support.',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        company_name TEXT,
        email TEXT,
        phone TEXT,
        billing_address TEXT,
        city TEXT,
        state TEXT,
        postal_code TEXT,
        gstin TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'General',
        unit_price REAL DEFAULT 0.00,
        gst_rate REAL DEFAULT 18.00,
        product_type TEXT DEFAULT 'service',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        invoice_number TEXT NOT NULL,
        invoice_date TEXT NOT NULL,
        due_date TEXT NOT NULL,
        payment_terms TEXT,
        tax_type TEXT DEFAULT 'cgst_sgst',
        subtotal REAL DEFAULT 0.00,
        discount_total REAL DEFAULT 0.00,
        tax_total REAL DEFAULT 0.00,
        cgst_amount REAL DEFAULT 0.00,
        sgst_amount REAL DEFAULT 0.00,
        igst_amount REAL DEFAULT 0.00,
        grand_total REAL DEFAULT 0.00,
        paid_amount REAL DEFAULT 0.00,
        due_amount REAL DEFAULT 0.00,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        terms TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        product_id INTEGER,
        item_name TEXT NOT NULL,
        description TEXT,
        quantity REAL DEFAULT 1.00,
        unit_price REAL DEFAULT 0.00,
        discount_percent REAL DEFAULT 0.00,
        tax_percent REAL DEFAULT 0.00,
        line_total REAL DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        invoice_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        payment_date TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'UPI',
        transaction_reference TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }

  // Seed demo data if users table is empty
  await seedInitialDataIfEmpty();
}

async function seedInitialDataIfEmpty() {
  try {
    const [existingUsers] = await query('SELECT id FROM users LIMIT 1');
    if (existingUsers && existingUsers.length > 0) {
      console.log(`[Database] Database already has data (${existingUsers.length} users).`);
      return;
    }

    console.log('[Database] Seeding initial demo data for test user demo@invoicepro.com...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // Insert Demo User
    const [userRes] = await query(
      `INSERT INTO users (name, business_name, email, phone, password, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Alex Morgan', 'Apex Digital Solutions Pvt Ltd', 'demo@invoicepro.com', '+91 98765 43210', hashedPassword, 'admin']
    );
    const userId = userRes.insertId || 1;

    // Insert Business Settings
    await query(
      `INSERT INTO business_settings 
       (user_id, business_name, logo_url, email, phone, address, city, state, postal_code, country, gstin, currency, currency_symbol, invoice_prefix, next_invoice_number, default_tax_rate, default_payment_terms, invoice_footer)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        'Apex Digital Solutions Pvt Ltd',
        '',
        'billing@apexdigital.io',
        '+91 80 4912 3456',
        'Tower 4, 6th Floor, Embassy TechVillage, Outer Ring Road',
        'Bengaluru',
        'Karnataka',
        '560103',
        'India',
        '29AABCA1234F1Z5',
        'INR',
        '₹',
        'INV-',
        1007,
        18.00,
        'Due within 15 days of invoice date',
        'Thank you for choosing Apex Digital Solutions. Please transfer payments to HDFC A/C: 50200012345678, IFSC: HDFC0000123.'
      ]
    );

    // Insert 5 Customers
    const customers = [
      ['Rajesh Sharma', 'Quantum Innovations Ltd', 'finance@quantuminnovations.com', '+91 98111 22334', 'Level 5, DLF Cyber City, Phase II', 'Gurugram', 'Haryana', '122002', '06AAACQ4321B1Z2', 'Key enterprise client. NET 30 payment terms.'],
      ['Priya Nair', 'Zenith Cloud Softwares', 'priya@zenithcloud.io', '+91 97222 33445', 'Plot 18, Electronic City Phase 1', 'Bengaluru', 'Karnataka', '560100', '29AAACZ9876C1Z4', 'Prompt monthly payer.'],
      ['Vikram Mehta', 'Aura Retail Enterprises', 'accounts@auraretail.in', '+91 99333 44556', '88 Nariman Point, Marine Lines', 'Mumbai', 'Maharashtra', '400021', '27AAACA5432D1Z8', 'Retail chain integration project.'],
      ['Sneha Patel', 'NextGen Logistics Co.', 'sneha@nextgenlogistics.com', '+91 98444 55667', '402 SG Highway, Bodakdev', 'Ahmedabad', 'Gujarat', '380054', '24AAACN1122E1Z1', 'Custom ERP deployment.'],
      ['Arjun Reddy', 'Kaveri MedTech Solutions', 'billing@kaverimedtech.org', '+91 97555 66778', 'Road No. 36, Jubilee Hills', 'Hyderabad', 'Telangana', '500033', '36AAACK7788F1Z9', 'Healthcare analytics portal client.']
    ];

    const customerIds = [];
    for (const c of customers) {
      const [cRes] = await query(
        `INSERT INTO customers (user_id, name, company_name, email, phone, billing_address, city, state, postal_code, gstin, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, ...c]
      );
      customerIds.push(cRes.insertId);
    }

    // Insert 6 Products & Services
    const products = [
      ['Custom Cloud Architecture & DevOps', 'Complete architecture design, AWS/GCP orchestration, CI/CD pipeline, and Kubernetes setup', 'DevOps & Cloud', 75000.00, 18.00, 'service'],
      ['Full-Stack Web App Development', 'Bespoke React + Node.js full-stack portal development per milestone specification', 'Software Development', 120000.00, 18.00, 'service'],
      ['Enterprise Security & Penetration Audit', 'Comprehensive vulnerability assessment, penetration testing, and compliance report', 'Security', 45000.00, 18.00, 'service'],
      ['UI/UX Design System & Prototyping', 'Complete design tokens, high-fidelity Figma components, mobile app mockups', 'Design', 35000.00, 18.00, 'service'],
      ['Monthly Retainer Maintenance', 'Dedicated 24/7 SLA, monitoring, database backups, minor enhancement support', 'Maintenance', 25000.00, 18.00, 'service'],
      ['Hardware IoT Gateway Unit', 'Edge compute gateway unit with dual SIM 4G failover and telemetry firmware', 'Hardware', 18500.00, 18.00, 'product']
    ];

    const productIds = [];
    for (const p of products) {
      const [pRes] = await query(
        `INSERT INTO products (user_id, name, description, category, unit_price, gst_rate, product_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, ...p]
      );
      productIds.push(pRes.insertId);
    }

    // Invoices and items
    // Invoice 1: Paid (135,700 INR)
    const [inv1] = await query(
      `INSERT INTO invoices 
       (user_id, customer_id, invoice_number, invoice_date, due_date, payment_terms, tax_type, subtotal, discount_total, tax_total, cgst_amount, sgst_amount, igst_amount, grand_total, paid_amount, due_amount, status, notes, terms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, customerIds[1], 'INV-1001', '2026-10-01', '2026-10-15', 'Due within 15 days', 'cgst_sgst', 120000.00, 5000.00, 20700.00, 10350.00, 10350.00, 0.00, 135700.00, 135700.00, 0.00, 'paid', 'Phase 1 portal completion invoice.', 'Warranty covers 90 days after delivery.']
    );
    await query(
      `INSERT INTO invoice_items (invoice_id, product_id, item_name, description, quantity, unit_price, discount_percent, tax_percent, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [inv1.insertId, productIds[1], 'Full-Stack Web App Development', 'Bespoke React + Node.js milestone 1 deliverables', 1.00, 120000.00, 4.17, 18.00, 135700.00]
    );
    await query(
      `INSERT INTO payments (user_id, invoice_id, customer_id, payment_date, amount, payment_method, transaction_reference, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, inv1.insertId, customerIds[1], '2026-10-12', 135700.00, 'Bank Transfer', 'NEFT-HDFC-991204', 'Full settlement received via NEFT.']
    );

    // Invoice 2: Partially Paid (Total: 88,500, Paid: 50,000, Due: 38,500)
    const [inv2] = await query(
      `INSERT INTO invoices 
       (user_id, customer_id, invoice_number, invoice_date, due_date, payment_terms, tax_type, subtotal, discount_total, tax_total, cgst_amount, sgst_amount, igst_amount, grand_total, paid_amount, due_amount, status, notes, terms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, customerIds[0], 'INV-1002', '2026-10-18', '2026-11-02', 'Due within 15 days', 'igst', 75000.00, 0.00, 13500.00, 0.00, 0.00, 13500.00, 88500.00, 50000.00, 38500.00, 'partially_paid', 'Cloud architecture milestone 1.', 'Balance payable upon final sign-off.']
    );
    await query(
      `INSERT INTO invoice_items (invoice_id, product_id, item_name, description, quantity, unit_price, discount_percent, tax_percent, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [inv2.insertId, productIds[0], 'Custom Cloud Architecture & DevOps', 'AWS infrastructure provisioning and EKS setup', 1.00, 75000.00, 0.00, 18.00, 88500.00]
    );
    await query(
      `INSERT INTO payments (user_id, invoice_id, customer_id, payment_date, amount, payment_method, transaction_reference, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, inv2.insertId, customerIds[0], '2026-10-25', 50000.00, 'UPI', 'UPI/229011928371@hdfc', 'Milestone 1 advance payment via UPI.']
    );

    // Invoice 3: Pending (Total: 40,120)
    const [inv3] = await query(
      `INSERT INTO invoices 
       (user_id, customer_id, invoice_number, invoice_date, due_date, payment_terms, tax_type, subtotal, discount_total, tax_total, cgst_amount, sgst_amount, igst_amount, grand_total, paid_amount, due_amount, status, notes, terms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, customerIds[2], 'INV-1003', '2026-11-10', '2026-11-25', 'Due within 15 days', 'igst', 35000.00, 1000.00, 6120.00, 0.00, 0.00, 6120.00, 40120.00, 0.00, 40120.00, 'pending', 'UI/UX Design system delivery.', 'Includes all Figma component sources.']
    );
    await query(
      `INSERT INTO invoice_items (invoice_id, product_id, item_name, description, quantity, unit_price, discount_percent, tax_percent, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [inv3.insertId, productIds[3], 'UI/UX Design System & Prototyping', 'Complete design system and prototype in Figma', 1.00, 35000.00, 2.86, 18.00, 40120.00]
    );

    // Invoice 4: Overdue (Total: 53,100)
    const [inv4] = await query(
      `INSERT INTO invoices 
       (user_id, customer_id, invoice_number, invoice_date, due_date, payment_terms, tax_type, subtotal, discount_total, tax_total, cgst_amount, sgst_amount, igst_amount, grand_total, paid_amount, due_amount, status, notes, terms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, customerIds[3], 'INV-1004', '2026-09-15', '2026-09-30', 'Due within 15 days', 'igst', 45000.00, 0.00, 8100.00, 0.00, 0.00, 8100.00, 53100.00, 0.00, 53100.00, 'overdue', 'Security audit report invoice. Payment reminder sent.', 'Overdue interest applicable at 1.5% per month.']
    );
    await query(
      `INSERT INTO invoice_items (invoice_id, product_id, item_name, description, quantity, unit_price, discount_percent, tax_percent, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [inv4.insertId, productIds[2], 'Enterprise Security & Penetration Audit', 'Complete security audit & remediation report', 1.00, 45000.00, 0.00, 18.00, 53100.00]
    );

    // Invoice 5: Draft (Total: 29,500)
    const [inv5] = await query(
      `INSERT INTO invoices 
       (user_id, customer_id, invoice_number, invoice_date, due_date, payment_terms, tax_type, subtotal, discount_total, tax_total, cgst_amount, sgst_amount, igst_amount, grand_total, paid_amount, due_amount, status, notes, terms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, customerIds[4], 'INV-1005', '2026-11-15', '2026-11-30', 'Due within 15 days', 'igst', 25000.00, 0.00, 4500.00, 0.00, 0.00, 4500.00, 29500.00, 0.00, 29500.00, 'draft', 'Draft for monthly maintenance retainer.', 'Standard maintenance terms apply.']
    );
    await query(
      `INSERT INTO invoice_items (invoice_id, product_id, item_name, description, quantity, unit_price, discount_percent, tax_percent, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [inv5.insertId, productIds[4], 'Monthly Retainer Maintenance', 'Monthly maintenance and support package', 1.00, 25000.00, 0.00, 18.00, 29500.00]
    );

    // Invoice 6: Paid (Total: 56,640)
    const [inv6] = await query(
      `INSERT INTO invoices 
       (user_id, customer_id, invoice_number, invoice_date, due_date, payment_terms, tax_type, subtotal, discount_total, tax_total, cgst_amount, sgst_amount, igst_amount, grand_total, paid_amount, due_amount, status, notes, terms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, customerIds[1], 'INV-1006', '2026-08-05', '2026-08-20', 'Due within 15 days', 'cgst_sgst', 50000.00, 2000.00, 8640.00, 4320.00, 4320.00, 0.00, 56640.00, 56640.00, 0.00, 'paid', 'Sprint 1 development & staging deploy.', 'Full payment received with thanks.']
    );
    await query(
      `INSERT INTO invoice_items (invoice_id, product_id, item_name, description, quantity, unit_price, discount_percent, tax_percent, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [inv6.insertId, productIds[4], 'Monthly Retainer Maintenance', 'Maintenance for Month of August', 2.00, 25000.00, 4.00, 18.00, 56640.00]
    );
    await query(
      `INSERT INTO payments (user_id, invoice_id, customer_id, payment_date, amount, payment_method, transaction_reference, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, inv6.insertId, customerIds[1], '2026-08-18', 56640.00, 'Card', 'TXN_CARD_887163', 'Paid via corporate credit card portal.']
    );

    console.log('[Database] Initial demo data seeded successfully!');
  } catch (err) {
    console.error('[Database Seed Error]:', err.message);
  }
}

module.exports = {
  query,
  getConnection,
  initDb,
  getDbType: () => dbType
};
