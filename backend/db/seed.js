import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

export default function seed(db) {
  const dbPath = path.join(process.cwd(), 'data', 'app.db');
  const run = (sql, params = []) => {
    db.run(sql, params);
    const id = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
    return { lastInsertRowid: id };
  };
  const get = (sql, params = []) => {
    const stmt = db.prepare(sql);
    const row = stmt.getAsObject(params);
    stmt.free();
    return row && Object.values(row).some((v) => v !== undefined) ? row : null;
  };

  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // المستخدمون التجريبيون (كلمة مرور للجميع: 12345678)
  run(`INSERT INTO users (name, email, password, role, phone, address) VALUES
    ('أحمد السيد', 'customer@test.com', ?, 'customer', '+961 70 111 222', 'بيروت - الحمراء - شارع مونو'),
    ('سامي الخوري', 'vendor@test.com', ?, 'vendor', '+961 71 333 444', 'بيروت - الجميزة'),
    ('علي السائق', 'driver@test.com', ?, 'driver', '+961 76 555 666', 'لبنان'),
    ('مدير النظام', 'admin@test.com', ?, 'admin', '+961 70 999 888', 'بيروت - وسط المدينة')
  `, [hash('12345678'), hash('12345678'), hash('12345678'), hash('12345678')]);

  const vendorId = get('SELECT id FROM users WHERE email = ?', ['vendor@test.com']).id;
  const driverId = get('SELECT id FROM users WHERE email = ?', ['driver@test.com']).id;
  const customerId = get('SELECT id FROM users WHERE email = ?', ['customer@test.com']).id;

  const img = (text) => `https://placehold.co/600x400/png?text=${encodeURIComponent(text)}&font=arial`;

  // التصنيفات
  run(`INSERT INTO categories (name, image) VALUES
    ('مأكولات سريعة', ?),
    ('بيتزا', ?),
    ('سوبرماركت', ?),
    ('صيدلية', ?)
  `, [img('Fast+Food'), img('Pizza'), img('Supermarket'), img('Pharmacy')]);

  const catFastFood = get('SELECT id FROM categories WHERE name = ?', ['مأكولات سريعة']).id;
  const catPizza = get('SELECT id FROM categories WHERE name = ?', ['بيتزا']).id;
  const catMarket = get('SELECT id FROM categories WHERE name = ?', ['سوبرماركت']).id;
  const catPharmacy = get('SELECT id FROM categories WHERE name = ?', ['صيدلية']).id;

  // المتاجر
  run(`INSERT INTO stores (name, description, category, image, rating, delivery_time, delivery_fee, is_open, vendor_id) VALUES
    ('برغر هاوس', 'أفضل برغر في بيروت مع توصيل سريع)', 'مأكولات سريعة', ?, 4.8, '25-40 دقيقة', 2000, 1, ?),
    ('بيتزا كورنر', 'بيتزا إيطالية أصلية بمكونات طازجة', 'بيتزا', ?, 4.7, '30-45 دقيقة', 3000, 1, ?),
    ('سوبرماركت النور', 'تموين، مواد غذائية ومنتجات طازجة', 'سوبرماركت', ?, 4.5, '40-60 دقيقة', 1500, 1, ?),
    ('صيدلية الحياة', 'أدوية ومستحضرات طبية وتوصيل دوائي', 'صيدلية', ?, 4.9, '30-50 دقيقة', 1000, 1, ?)
  `, [img('Burger+House'), vendorId, img('Pizza+Corner'), vendorId, img('Supermarket+Nour'), vendorId, img('Pharmacy+Hayat'), vendorId]);

  const burgerStore = get('SELECT id FROM stores WHERE name = ?', ['برغر هاوس']).id;
  const pizzaStore = get('SELECT id FROM stores WHERE name = ?', ['بيتزا كورنر']).id;
  const marketStore = get('SELECT id FROM stores WHERE name = ?', ['سوبرماركت النور']).id;
  const pharmacyStore = get('SELECT id FROM stores WHERE name = ?', ['صيدلية الحياة']).id;

  const products = [
    // برغر هاوس
    [burgerStore, catFastFood, 'برغر كلاسيكي', 'لحم بقري، خس، طماطم،什يته خاصة', 18000, img('Classic+Burger')],
    [burgerStore, catFastFood, 'برغر دجاج', 'FILET دجاج مشوي مع ثومية', 16000, img('Chicken+Burger')],
    [burgerStore, catFastFood, 'بطاطس مقلية', 'بطاطس طازجة مقليّة وملح', 8000, img('French+Fries')],
    [burgerStore, catFastFood, 'مشروب غازي', 'بيبسي أو سفن أب 330 مل', 4000, img('Soda')],
    // بيتزا كورنر
    [pizzaStore, catPizza, 'بيتزا مارغريتا', 'موزاريلا، طماطم، ريحان', 22000, img('Margherita')],
    [pizzaStore, catPizza, 'بيتزا بيبروني', 'بيبروني وجبنة موزاريلا', 24000, img('Pepperoni')],
    [pizzaStore, catPizza, 'بيتزا أربعة أجبان', 'موزاريلا، بارميزان، غورجونزولا، راكور', 26000, img('Four+Cheese')],
    [pizzaStore, catPizza, 'خبز ثوم', 'خبز بالثوم والزبد والبقدونس', 9000, img('Garlic+Bread')],
    // سوبرماركت النور
    [marketStore, catMarket, 'أرز بسمتي 1 كغ', 'أرز فاخر', 12000, img('Rice')],
    [marketStore, catMarket, 'حليب طازج 1 لتر', 'حليب بقري معقم', 6000, img('Milk')],
    [marketStore, catMarket, 'بيض (30 حبة)', 'بيض مائدة طازج', 14000, img('Eggs')],
    [marketStore, catMarket, 'خضار مشكلة', 'طماطم، خيار، فلفل، بصل 1 كغ', 10000, img('Vegetables')],
    // صيدلية الحياة
    [pharmacyStore, catPharmacy, 'فيتامين سي', 'مناعة وتقوية', 9000, img('Vitamin+C')],
    [pharmacyStore, catPharmacy, 'كمامات طبية (50)', 'كمامات قابلة للتخلص', 12000, img('Masks')],
    [pharmacyStore, catPharmacy, 'معقم أيدي', 'كحول 70%', 7000, img('Sanitizer')],
    [pharmacyStore, catPharmacy, 'لاصقات جروح', 'شريط لاصق معقم', 4000, img('Bandages')],
  ];

  const insertProduct = db.prepare('INSERT INTO products (store_id, category_id, name, description, price, image, is_available) VALUES (?, ?, ?, ?, ?, ?, 1)');
  for (const p of products) insertProduct.run(p);
  insertProduct.free();

  // طلبات تجريبية لعرضها في صفحة التتبع
  const o1 = run('INSERT INTO orders (user_id, store_id, total, status, address, phone, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [customerId, burgerStore, 26000, 'delivered', 'بيروت - الحمراء - شارع مونو', '+961 70 111 222', 'cash', 'من دون بصل']);
  run('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [o1.lastInsertRowid, get('SELECT id FROM products WHERE name = ?', ['برغر كلاسيكي']).id, 1, 18000]);
  run('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [o1.lastInsertRowid, get('SELECT id FROM products WHERE name = ?', ['بطاطس مقلية']).id, 1, 8000]);
  run('INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)', [o1.lastInsertRowid, 'pending', 'تم استلام الطلب']);
  run('INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)', [o1.lastInsertRowid, 'confirmed', 'أكد المتجر الطلب']);
  run('INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)', [o1.lastInsertRowid, 'preparing', 'جاري التحضير']);
  run('INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)', [o1.lastInsertRowid, 'delivered', 'تم تسليم الطلب']);

  const o2 = run('INSERT INTO orders (user_id, store_id, driver_id, total, status, address, phone, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [customerId, pizzaStore, driverId, 24000, 'out_for_delivery', 'بيروت - الجميزة', '+961 70 111 222', 'cash', 'تحية للسائق']);
  run('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [o2.lastInsertRowid, get('SELECT id FROM products WHERE name = ?', ['بيتزا بيبروني']).id, 1, 24000]);
  run('INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)', [o2.lastInsertRowid, 'pending', 'تم استلام الطلب']);
  run('INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)', [o2.lastInsertRowid, 'confirmed', 'أكد المتجر الطلب']);
  run('INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)', [o2.lastInsertRowid, 'preparing', 'جاري التحضير']);
  run('INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)', [o2.lastInsertRowid, 'ready', 'الطلب جاهز للتسليم']);
  run('INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)', [o2.lastInsertRowid, 'out_for_delivery', 'السائق علي في الطريق']);

  const o3 = run('INSERT INTO orders (user_id, store_id, total, status, address, phone, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [customerId, marketStore, 22000, 'preparing', 'بيروت - الحمراء - شارع مونو', '+961 70 111 222', 'cash', '']);
  run('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [o3.lastInsertRowid, get('SELECT id FROM products WHERE name = ?', ['أرز بسمتي 1 كغ']).id, 1, 12000]);
  run('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [o3.lastInsertRowid, get('SELECT id FROM products WHERE name = ?', ['حليب طازج 1 لتر']).id, 1, 6000]);
  run('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [o3.lastInsertRowid, get('SELECT id FROM products WHERE name = ?', ['بيض (30 حبة)']).id, 1, 14000]);
  run('INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)', [o3.lastInsertRowid, 'pending', 'تم استلام الطلب']);
  run('INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)', [o3.lastInsertRowid, 'preparing', 'المتجر يحضر الطلب']);

  console.log('✅ تم زرع البيانات التجريبية بنجاح');
  console.log('   العملاء: customer@test.com / 12345678');
  console.log('   المتجر:   vendor@test.com / 12345678');
  console.log('   السائق:   driver@test.com / 12345678');
  console.log('   المشرف:   admin@test.com / 12345678');

  // حفظ قاعدة البيانات على القرص
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}
