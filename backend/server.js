import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';
import seed from './db/seed.js';
import { authenticate, authorize, signToken, cleanUser } from './middleware/auth.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, 'app.db');
const schemaSql = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');

// sql.js v1.tx: ملف wasm الفعلي موجود تحت dist/، نُنسخه إلى المسار المتوقع قبل التهيئة
const wasmSrc = path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
const wasmDst = path.join(__dirname, 'node_modules', 'sql.js', 'sql-wasm.wasm');
if (!fs.existsSync(wasmDst) && fs.existsSync(wasmSrc)) {
  fs.cpSync(wasmSrc, wasmDst);
}
const SQL = await initSqlJs({ locateFile: () => wasmDst });
const db = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database();
if (!fs.existsSync(dbPath)) {
  db.exec(schemaSql);
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

const saveDb = () => fs.writeFileSync(dbPath, Buffer.from(db.export()));

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

const run = (sql, params = []) => {
  db.run(sql, params);
  const id = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
  saveDb();
  return { lastInsertRowid: id };
};
const get = (sql, params = []) => {
  const stmt = db.prepare(sql);
  const row = stmt.getAsObject(params);
  stmt.free();
  // sql.js تعيد كائناً بأعمدة غير معرفة (undefined) عند عدم تطابق أي صف → نعيد null لتسهيل الفحص
  return row && Object.values(row).some((v) => v !== undefined) ? row : null;
};
const all = (sql, params = []) => {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
};

// زرع البيانات التجريبية إذا كانت قاعدة البيانات فارغة
const userCount = get('SELECT COUNT(*) AS c FROM users').c;
if (userCount === 0) {
  seed(db);
  console.log('🌱 تم زرع البيانات التجريبية');
}

// ========== مسارات المصادقة ==========
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'customer', phone, address } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'الرجاء إدخال الاسم والبريد وكلمة المرور' });
    }
    if (get('SELECT id FROM users WHERE email = ?', [email])) {
      return res.status(409).json({ error: 'البريد الإلكتروني مستخدم مسبقاً' });
    }
    const hash = bcrypt.hashSync(password, 10);
    const info = run(
      'INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hash, role, phone || null, address || null]
    );
    const user = cleanUser(get('SELECT id, name, email, role, phone, address FROM users WHERE id = ?', [info.lastInsertRowid]));
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const user = get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'بيانات دخول غير صحيحة' });
    }
    res.json({ token: signToken(cleanUser(user)), user: cleanUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = cleanUser(get('SELECT id, name, email, role, phone, address FROM users WHERE id = ?', [req.user.id]));
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
  res.json({ user });
});

// ========== مسارات المتاجر ==========
app.get('/api/stores', (req, res) => {
  let sql = 'SELECT s.* FROM stores s WHERE s.is_open = 1';
  const params = [];
  if (req.query.category) {
    sql += ' AND s.category = ?';
    params.push(req.query.category);
  }
  if (req.query.q) {
    sql += ' AND (s.name LIKE ? OR s.description LIKE ?)';
    params.push(`%${req.query.q}%`, `%${req.query.q}%`);
  }
  sql += ' ORDER BY s.rating DESC, s.id ASC';
  res.json({ stores: all(sql, params) });
});

app.get('/api/stores/:id', (req, res) => {
  const store = get('SELECT * FROM stores WHERE id = ?', [req.params.id]);
  if (!store) return res.status(404).json({ error: 'المتجر غير موجود' });
  const products = all('SELECT * FROM products WHERE store_id = ? AND is_available = 1 ORDER BY name', [req.params.id]);
  res.json({ store, products });
});

app.post('/api/stores', authenticate, authorize('vendor', 'admin'), multer().single('image'), (req, res) => {
  try {
    const { name, description, category, delivery_time, delivery_fee } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'اسم المتجر والتصنيف مطلوبان' });
    const image = req.file ? `/uploads/${req.file.filename}` : null;
    const vendorId = req.user.role === 'vendor' ? req.user.id : (Number(req.body.vendor_id) || null);
    const info = run(
      'INSERT INTO stores (name, description, category, image, delivery_time, delivery_fee, vendor_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, description || null, category, image, delivery_time || null, Number(delivery_fee) || 0, vendorId]
    );
    res.status(201).json({ store: get('SELECT * FROM stores WHERE id = ?', [info.lastInsertRowid]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/stores/:id', authenticate, authorize('vendor', 'admin'), (req, res) => {
  try {
    const store = get('SELECT * FROM stores WHERE id = ?', [req.params.id]);
    if (!store) return res.status(404).json({ error: 'المتجر غير موجود' });
    if (req.user.role === 'vendor' && store.vendor_id !== req.user.id) {
      return res.status(403).json({ error: 'لا يمكنك تعديل متجر ليس ملكك' });
    }
    const fields = [];
    const params = [];
    for (const key of ['name', 'description', 'category', 'image', 'delivery_time', 'delivery_fee', 'is_open']) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(req.body[key]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'لا شيء للتعديل' });
    params.push(req.params.id);
    run(`UPDATE stores SET ${fields.join(', ')} WHERE id = ?`, params);
    res.json({ store: get('SELECT * FROM stores WHERE id = ?', [req.params.id]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== مسارات المنتجات ==========
app.get('/api/products', (req, res) => {
  let sql = 'SELECT p.*, s.name AS store_name FROM products p JOIN stores s ON s.id = p.store_id WHERE p.is_available = 1';
  const params = [];
  if (req.query.storeId) {
    sql += ' AND p.store_id = ?';
    params.push(req.query.storeId);
  }
  if (req.query.categoryId) {
    sql += ' AND p.category_id = ?';
    params.push(req.query.categoryId);
  }
  sql += ' ORDER BY p.name';
  res.json({ products: all(sql, params) });
});

app.get('/api/products/:id', (req, res) => {
  const product = get('SELECT p.*, s.name AS store_name FROM products p JOIN stores s ON s.id = p.store_id WHERE p.id = ?', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
  res.json({ product });
});

app.post('/api/products', authenticate, authorize('vendor', 'admin'), multer().single('image'), (req, res) => {
  try {
    const { store_id, category_id, name, description, price } = req.body;
    if (!store_id || !name || !price) return res.status(400).json({ error: 'المتجر والاسم والسعر مطلوبان' });
    const store = get('SELECT * FROM stores WHERE id = ?', [store_id]);
    if (!store) return res.status(404).json({ error: 'المتجر غير موجود' });
    if (req.user.role === 'vendor' && store.vendor_id !== req.user.id) {
      return res.status(403).json({ error: 'لا يمكنك إضافة منتجات لمتجر ليس ملكك' });
    }
    const image = req.file ? `/uploads/${req.file.filename}` : null;
    const info = run(
      'INSERT INTO products (store_id, category_id, name, description, price, image) VALUES (?, ?, ?, ?, ?, ?)',
      [store_id, category_id || null, name, description || null, Number(price), image]
    );
    res.status(201).json({ product: get('SELECT * FROM products WHERE id = ?', [info.lastInsertRowid]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/products/:id', authenticate, authorize('vendor', 'admin'), (req, res) => {
  try {
    const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
    const store = get('SELECT * FROM stores WHERE id = ?', [product.store_id]);
    if (req.user.role === 'vendor' && store.vendor_id !== req.user.id) {
      return res.status(403).json({ error: 'لا يمكنك تعديل منتج لمتجر ليس ملكك' });
    }
    const fields = [];
    const params = [];
    for (const key of ['name', 'description', 'price', 'image', 'is_available', 'category_id']) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(req.body[key]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ error: 'لا شيء للتعديل' });
    params.push(req.params.id);
    run(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, params);
    res.json({ product: get('SELECT * FROM products WHERE id = ?', [req.params.id]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', authenticate, authorize('vendor', 'admin'), (req, res) => {
  const product = get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
  const store = get('SELECT * FROM stores WHERE id = ?', [product.store_id]);
  if (req.user.role === 'vendor' && store.vendor_id !== req.user.id) {
    return res.status(403).json({ error: 'غير مصرح' });
  }
  run('DELETE FROM products WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ========== التصنيفات ==========
app.get('/api/categories', (req, res) => {
  res.json({ categories: all('SELECT * FROM categories ORDER BY name') });
});

app.post('/api/categories', authenticate, authorize('admin'), (req, res) => {
  const { name, image } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم التصنيف مطلوب' });
  const info = run('INSERT INTO categories (name, image) VALUES (?, ?)', [name, image || null]);
  res.status(201).json({ category: get('SELECT * FROM categories WHERE id = ?', [info.lastInsertRowid]) });
});

// ========== سلة التسوق ==========
app.get('/api/cart', authenticate, (req, res) => {
  const userId = req.query.userId ? Number(req.query.userId) : req.user.id;
  if (req.user.role !== 'admin' && userId !== req.user.id) {
    return res.status(403).json({ error: 'غير مصرح' });
  }
  const items = all(
    `SELECT c.id, c.product_id, c.quantity, c.created_at,
            p.name, p.price, p.image, p.store_id, s.name AS store_name
     FROM carts c
     JOIN products p ON p.id = c.product_id
     JOIN stores s ON s.id = p.store_id
     WHERE c.user_id = ?`,
    [userId]
  );
  res.json({ cart: items });
});

app.post('/api/cart', authenticate, (req, res) => {
  const userId = req.user.id;
  const { productId, quantity = 1 } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId مطلوب' });
  const product = get('SELECT * FROM products WHERE id = ?', [productId]);
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
const existing = get('SELECT * FROM carts WHERE user_id = ? AND product_id = ?', [userId, productId]);

  if (existing) {
    run('UPDATE carts SET quantity = quantity + ? WHERE id = ?', [quantity, existing.id]);
  } else {
    run('INSERT INTO carts (user_id, product_id, quantity) VALUES (?, ?, ?)', [userId, productId, quantity]);
  }
  res.json({ ok: true });
});

app.patch('/api/cart/:productId', authenticate, (req, res) => {
  const userId = req.user.id;
  const { quantity } = req.body;
  if (!quantity || quantity < 1) {
    run('DELETE FROM carts WHERE user_id = ? AND product_id = ?', [userId, Number(req.params.productId)]);
  } else {
    run('UPDATE carts SET quantity = ? WHERE user_id = ? AND product_id = ?', [quantity, userId, Number(req.params.productId)]);
  }
  res.json({ ok: true });
});

app.delete('/api/cart/:productId', authenticate, (req, res) => {
  run('DELETE FROM carts WHERE user_id = ? AND product_id = ?', [req.user.id, Number(req.params.productId)]);
  res.json({ ok: true });
});

app.delete('/api/cart', authenticate, (req, res) => {
  run('DELETE FROM carts WHERE user_id = ?', [req.user.id]);
  res.json({ ok: true });
});

// ========== الطلبات ==========
app.post('/api/orders', authenticate, (req, res) => {
  try {
    const { storeId, address, phone, paymentMethod = 'cash', notes, items } = req.body;
    if (!storeId || !address || !phone || !items || items.length === 0) {
      return res.status(400).json({ error: 'الرجاء تعبئة العنوان والهاتف واختيار منتج واحد على الأقل' });
    }
    const store = get('SELECT * FROM stores WHERE id = ?', [storeId]);
    if (!store) return res.status(404).json({ error: 'المتجر غير موجود' });

    let total = 0;
    const resolved = items.map((it) => {
      const p = get('SELECT * FROM products WHERE id = ?', [it.productId]);
      if (!p) throw new Error(`المنتج ${it.productId} غير موجود`);
      if (!p.is_available) throw new Error(`${p.name} غير متاح`);
      const subtotal = Number(p.price) * Number(it.quantity);
      total += subtotal;
      return { product: p, quantity: Number(it.quantity), subtotal };
    });

    const info = run(
      'INSERT INTO orders (user_id, store_id, total, status, address, phone, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, storeId, total, 'pending', address, phone, paymentMethod, notes || null]
    );
    const orderId = info.lastInsertRowid;
    const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
    for (const it of resolved) {
      insertItem.run([orderId, it.product.id, it.quantity, it.product.price]);
    }
    insertItem.free();
    run('DELETE FROM carts WHERE user_id = ?', [req.user.id]);
    run('INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)', [orderId, 'pending', 'تم استلام الطلب']);

    const order = get('SELECT * FROM orders WHERE id = ?', [orderId]);
    order.items = all('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    order.store = get('SELECT * FROM stores WHERE id = ?', [storeId]);
    res.status(201).json({ order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', authenticate, (req, res) => {
  let sql, params;
  if (req.user.role === 'customer') {
    sql = `SELECT o.*, s.name AS store_name FROM orders o JOIN stores s ON s.id = o.store_id WHERE o.user_id = ? ORDER BY o.created_at DESC`;
    params = [req.user.id];
  } else if (req.user.role === 'vendor') {
    sql = `SELECT o.*, u.name AS customer_name, s.name AS store_name FROM orders o
           JOIN users u ON u.id = o.user_id
           JOIN stores s ON s.id = o.store_id
           WHERE s.vendor_id = ? ORDER BY o.created_at DESC`;
    params = [req.user.id];
  } else if (req.user.role === 'driver') {
    sql = `SELECT o.*, u.name AS customer_name, s.name AS store_name FROM orders o
           JOIN users u ON u.id = o.user_id
           JOIN stores s ON s.id = o.store_id
           WHERE o.driver_id = ? OR o.status IN ('pending', 'confirmed', 'preparing', 'ready')
           ORDER BY o.created_at DESC`;
    params = [req.user.id];
  } else {
    sql = `SELECT o.*, u.name AS customer_name, s.name AS store_name FROM orders o
           JOIN users u ON u.id = o.user_id
           JOIN stores s ON s.id = o.store_id
           ORDER BY o.created_at DESC`;
    params = [];
  }
  const orders = all(sql, params).map((o) => ({ ...o, items: all('SELECT * FROM order_items WHERE order_id = ?', [o.id]) }));
  res.json({ orders });
});

app.get('/api/orders/:id', authenticate, (req, res) => {
  const order = get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
  const isVendor = req.user.role === 'vendor' && get('SELECT id FROM stores WHERE id = ? AND vendor_id = ?', [order.store_id, req.user.id]);
  const allowed =
    req.user.role === 'admin' ||
    (req.user.role === 'customer' && order.user_id === req.user.id) ||
    isVendor ||
    (req.user.role === 'driver' && order.driver_id === req.user.id);
  if (!allowed) return res.status(403).json({ error: 'غير مصرح لك بعرض هذا الطلب' });
  order.items = all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
  order.store = get('SELECT * FROM stores WHERE id = ?', [order.store_id]);
  order.history = all('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC', [order.id]);
  if (order.driver_id) order.driver = cleanUser(get('SELECT id, name, phone FROM users WHERE id = ?', [order.driver_id]));
  res.json({ order });
});

app.patch('/api/orders/:id/status', authenticate, (req, res) => {
  try {
    const { status, note } = req.body;
    const valid = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!status || !valid.includes(status)) return res.status(400).json({ error: 'حالة غير صالحة' });

    const order = get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });

    let authorized = false;
    if (req.user.role === 'admin') authorized = true;
    else if (req.user.role === 'vendor') {
      authorized = !!get('SELECT id FROM stores WHERE id = ? AND vendor_id = ?', [order.store_id, req.user.id]);
    } else if (req.user.role === 'driver') {
      if (order.driver_id === req.user.id && (status === 'out_for_delivery' || status === 'delivered')) authorized = true;
    }
    if (!authorized) return res.status(403).json({ error: 'غير مصرح لك بتحديث حالة هذا الطلب' });

    run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);
    run('INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)', [req.params.id, status, note || null]);

    res.json({ order: get('SELECT * FROM orders WHERE id = ?', [req.params.id]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/driver/orders/:id/accept', authenticate, authorize('driver'), (req, res) => {
  const order = get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
  if (order.status !== 'ready') return res.status(400).json({ error: 'هذا الطلب غير جاهز للتسليم بعد' });
  if (order.driver_id) return res.status(409).json({ error: 'تم قبول هذا الطلب من سائق آخر' });
  run('UPDATE orders SET driver_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.user.id, 'out_for_delivery', req.params.id]);
  run('INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)', [req.params.id, 'out_for_delivery', 'قبل السائق الطلب وهو في الطريق']);
  res.json({ order: get('SELECT * FROM orders WHERE id = ?', [req.params.id]) });
});

app.patch('/api/driver/orders/:id/deliver', authenticate, authorize('driver'), (req, res) => {
  const order = get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
  if (order.driver_id !== req.user.id) return res.status(403).json({ error: 'هذا التوصيل ليس تحت مسؤوليتك' });
  if (order.status !== 'out_for_delivery') return res.status(400).json({ error: 'الطلب ليس في حالة التوصيل حالياً' });
  run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['delivered', req.params.id]);
  run('INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)', [req.params.id, 'delivered', 'تم تسليم الطلب للزبون']);
  res.json({ order: get('SELECT * FROM orders WHERE id = ?', [req.params.id]) });
});

// ========== إحصائيات المشرف ==========
app.get('/api/admin/stats', authenticate, authorize('admin'), (req, res) => {
  const stats = {
    users: get('SELECT COUNT(*) AS c FROM users').c,
    stores: get('SELECT COUNT(*) AS c FROM stores').c,
    orders: get('SELECT COUNT(*) AS c FROM orders').c,
    revenue: get("SELECT COALESCE(SUM(total), 0) AS s FROM orders WHERE status = 'delivered'").s,
    pending: get("SELECT COUNT(*) AS c FROM orders WHERE status = 'pending'").c,
    delivered: get("SELECT COUNT(*) AS c FROM orders WHERE status = 'delivered'").c,
  };
  res.json({ stats });
});

app.get('/api/admin/users', authenticate, authorize('admin'), (req, res) => {
  res.json({ users: all('SELECT id, name, email, role, phone, created_at FROM users ORDER BY id DESC') });
});

app.get('/api/admin/stores', authenticate, authorize('admin'), (req, res) => {
  res.json({ stores: all('SELECT s.*, u.name AS vendor_name FROM stores s LEFT JOIN users u ON u.id = s.vendor_id ORDER BY s.id DESC') });
});

app.listen(PORT, () => {
  console.log(`🚀 خادم التطبيق يعمل على http://localhost:${PORT}`);
  console.log(`📂 قاعدة البيانات: ${dbPath}`);
});
