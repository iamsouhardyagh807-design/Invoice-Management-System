const db = require('../config/db');

async function migrate() {
  await db.initDb();
  console.log('[Migration] Checking customer and product image columns...');

  try {
    await db.query("ALTER TABLE customers ADD COLUMN avatar_url TEXT DEFAULT '';");
    console.log('[Migration] Added avatar_url to customers table.');
  } catch (err) {
    console.log('[Migration] customers.avatar_url already exists or handled:', err.message);
  }

  try {
    await db.query("ALTER TABLE products ADD COLUMN image_url TEXT DEFAULT '';");
    console.log('[Migration] Added image_url to products table.');
  } catch (err) {
    console.log('[Migration] products.image_url already exists or handled:', err.message);
  }

  // Update existing seed customers with sample high quality avatars
  const sampleAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  ];

  const [customers] = await db.query('SELECT id FROM customers ORDER BY id ASC LIMIT 5');
  for (let i = 0; i < customers.length; i++) {
    await db.query('UPDATE customers SET avatar_url = ? WHERE id = ?', [sampleAvatars[i % sampleAvatars.length], customers[i].id]);
  }

  // Update existing seed products with sample high quality product/service images
  const sampleProductImages = [
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=150&auto=format&fit=crop&q=80', // Cloud
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=150&auto=format&fit=crop&q=80', // Code
    'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=150&auto=format&fit=crop&q=80', // Security
    'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=150&auto=format&fit=crop&q=80', // Design
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=80', // Maintenance
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=150&auto=format&fit=crop&q=80'  // Hardware
  ];

  const [products] = await db.query('SELECT id FROM products ORDER BY id ASC LIMIT 6');
  for (let i = 0; i < products.length; i++) {
    await db.query('UPDATE products SET image_url = ? WHERE id = ?', [sampleProductImages[i % sampleProductImages.length], products[i].id]);
  }

  console.log('[Migration] Customer and product images migration finished!');
  process.exit(0);
}

migrate().catch(e => {
  console.error('[Migration Error]:', e);
  process.exit(1);
});
