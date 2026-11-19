const db = require('../config/db');

async function runMigration() {
  console.log('[Migration] Adding signature columns to business_settings and invoices...');

  // 1. business_settings
  try {
    await db.query(`ALTER TABLE business_settings ADD COLUMN signature_text VARCHAR(255) DEFAULT 'INFOTECH'`);
    console.log('[Migration] Added signature_text to business_settings');
  } catch (err) {
    console.log('[Migration] signature_text might already exist in business_settings:', err.message);
  }

  try {
    await db.query(`ALTER TABLE business_settings ADD COLUMN signature_title VARCHAR(255) DEFAULT 'AUTHORIZED SIGNATORY'`);
    console.log('[Migration] Added signature_title to business_settings');
  } catch (err) {
    console.log('[Migration] signature_title might already exist in business_settings:', err.message);
  }

  try {
    await db.query(`ALTER TABLE business_settings ADD COLUMN signature_image_url TEXT DEFAULT ''`);
    console.log('[Migration] Added signature_image_url to business_settings');
  } catch (err) {
    console.log('[Migration] signature_image_url might already exist in business_settings:', err.message);
  }

  try {
    await db.query(`ALTER TABLE business_settings ADD COLUMN signature_font VARCHAR(50) DEFAULT 'marker'`);
    console.log('[Migration] Added signature_font to business_settings');
  } catch (err) {
    console.log('[Migration] signature_font might already exist in business_settings:', err.message);
  }

  // 2. invoices
  try {
    await db.query(`ALTER TABLE invoices ADD COLUMN signature_text VARCHAR(255) DEFAULT NULL`);
    console.log('[Migration] Added signature_text to invoices');
  } catch (err) {
    console.log('[Migration] signature_text might already exist in invoices:', err.message);
  }

  try {
    await db.query(`ALTER TABLE invoices ADD COLUMN signature_title VARCHAR(255) DEFAULT NULL`);
    console.log('[Migration] Added signature_title to invoices');
  } catch (err) {
    console.log('[Migration] signature_title might already exist in invoices:', err.message);
  }

  try {
    await db.query(`ALTER TABLE invoices ADD COLUMN signature_image_url TEXT DEFAULT NULL`);
    console.log('[Migration] Added signature_image_url to invoices');
  } catch (err) {
    console.log('[Migration] signature_image_url might already exist in invoices:', err.message);
  }

  try {
    await db.query(`ALTER TABLE invoices ADD COLUMN signature_font VARCHAR(50) DEFAULT NULL`);
    console.log('[Migration] Added signature_font to invoices');
  } catch (err) {
    console.log('[Migration] signature_font might already exist in invoices:', err.message);
  }

  // Update existing business_settings with default 'INFOTECH' and 'AUTHORIZED SIGNATORY'
  try {
    await db.query(`
      UPDATE business_settings 
      SET signature_text = 'INFOTECH', 
          signature_title = 'AUTHORIZED SIGNATORY',
          signature_font = 'marker'
      WHERE signature_text IS NULL OR signature_text = ''
    `);
    console.log('[Migration] Updated existing business_settings with default signature values.');
  } catch (err) {
    console.log('[Migration] Update existing error:', err.message);
  }

  console.log('[Migration] Signature migration completed successfully.');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('[Migration Error]:', err);
  process.exit(1);
});
