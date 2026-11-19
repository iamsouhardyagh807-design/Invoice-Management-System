const db = require('../config/db');

// GET /api/products
exports.getProducts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { search, category, type } = req.query;

    let sql = 'SELECT * FROM products WHERE user_id = ?';
    const params = [userId];

    if (search && search.trim() !== '') {
      sql += ' AND (name LIKE ? OR description LIKE ? OR category LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    if (category && category.trim() !== '') {
      sql += ' AND category = ?';
      params.push(category.trim());
    }

    if (type && (type === 'product' || type === 'service')) {
      sql += ' AND product_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY name ASC';

    const [products] = await db.query(sql, params);

    return res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:id
exports.getProductById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const productId = req.params.id;

    const [products] = await db.query(
      'SELECT * FROM products WHERE id = ? AND user_id = ?',
      [productId, userId]
    );

    if (!products || products.length === 0) {
      return res.status(404).json({ success: false, message: 'Product or service not found.' });
    }

    return res.json({
      success: true,
      product: products[0]
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/products
exports.createProduct = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, description, category, unit_price, gst_rate, product_type, image_url } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Item name is required.' });
    }

    const price = Number(unit_price) >= 0 ? Number(unit_price) : 0;
    const gst = Number(gst_rate) >= 0 ? Number(gst_rate) : 18;
    const pType = product_type === 'product' ? 'product' : 'service';

    const [result] = await db.query(
      `INSERT INTO products (user_id, name, description, category, unit_price, gst_rate, product_type, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name.trim(),
        description ? description.trim() : '',
        category ? category.trim() : 'General',
        price,
        gst,
        pType,
        image_url || ''
      ]
    );

    const [newProduct] = await db.query('SELECT * FROM products WHERE id = ?', [result.insertId]);

    return res.status(201).json({
      success: true,
      message: `${pType === 'service' ? 'Service' : 'Product'} created successfully.`,
      product: newProduct[0]
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/products/:id
exports.updateProduct = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const productId = req.params.id;
    const { name, description, category, unit_price, gst_rate, product_type, image_url } = req.body;

    const [existing] = await db.query('SELECT id FROM products WHERE id = ? AND user_id = ?', [productId, userId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Product or service not found.' });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Item name is required.' });
    }

    const price = Number(unit_price) >= 0 ? Number(unit_price) : 0;
    const gst = Number(gst_rate) >= 0 ? Number(gst_rate) : 18;
    const pType = product_type === 'product' ? 'product' : 'service';

    await db.query(
      `UPDATE products SET 
         name = ?, description = ?, category = ?, unit_price = ?, gst_rate = ?, product_type = ?, image_url = COALESCE(?, image_url), updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        name.trim(),
        description ? description.trim() : '',
        category ? category.trim() : 'General',
        price,
        gst,
        pType,
        image_url !== undefined ? image_url : null,
        productId,
        userId
      ]
    );

    const [updated] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);

    return res.json({
      success: true,
      message: 'Item updated successfully.',
      product: updated[0]
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/products/:id
exports.deleteProduct = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const productId = req.params.id;

    const [existing] = await db.query('SELECT id, name FROM products WHERE id = ? AND user_id = ?', [productId, userId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Product or service not found.' });
    }

    await db.query('DELETE FROM products WHERE id = ? AND user_id = ?', [productId, userId]);

    return res.json({
      success: true,
      message: 'Item deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/products/upload-image
exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded.' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    return res.json({
      success: true,
      message: 'Product image uploaded successfully.',
      imageUrl
    });
  } catch (err) {
    next(err);
  }
};
