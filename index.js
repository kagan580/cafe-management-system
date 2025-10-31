// === index.js ===
const session = require('express-session');
const express = require('express');
const app = express();
const path = require("path");
const port = 8080;
const db = require('./database/db');
const {
  getCategories,
  getOrders,
  getOrderItems,
  getTables,
  getProducts,
  getOrderLogs,
  getDailyOrders,
  getMonthlyOrders,
  createOrderAndPrepare,
  insertProduct,
  insertCategory,
  deleteCategory,
  getPreparingOrders,
  getOrderDetails,
  updateOrderStatus,
  updateProduct,
  deleteProduct
} = require(path.join(__dirname, "./database/queries.js"));

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(session({
  secret: 'gizli-admin-anahtari',
  resave: false,
  saveUninitialized: false
}));

// Admin login middleware
function requireAdminAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect('/admin_login');
}

// Anasayfa
app.get('/', async (req, res) => {
  try {
    const [categories, tables, products] = await Promise.all([
      new Promise((resolve, reject) => getCategories((err, data) => err ? reject(err) : resolve(data))),
      new Promise((resolve, reject) => getTables((err, data) => err ? reject(err) : resolve(data))),
      new Promise((resolve, reject) => getProducts((err, data) => err ? reject(err) : resolve(data)))
    ]);
    res.render('index', { categories, tables, products });
  } catch (err) {
    console.error("Veri cekme hatasi:", err);
    res.status(500).send("Sunucu hatasi");
  }
});

// Admin login page
// Giriş sayfası (GET)
app.get('/admin_login', (req, res) => {
  res.render('admin_login', { error: null }); // 🟢 burası düzeltildi
});

// Giriş verisini işleme (POST)
app.post('/admin_login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === '1234') {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }

  res.render('admin_login', { error: 'Kullanıcı adı veya şifre hatalı!' }); // 🟢 burası da düzeltildi
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session yok edilemedi:', err);
      return res.status(500).send('Çıkış yapılamadı');
    }
    res.redirect('/admin_login');
  });
});


// Admin Panel (korumalı)
app.get('/admin', requireAdminAuth, async (req, res) => {
  try {
    const [categories, orders, orderItems, tables, products, orderLogs] = await Promise.all([
      new Promise((resolve, reject) => getCategories((err, data) => err ? reject(err) : resolve(data))),
      new Promise((resolve, reject) => getOrders((err, data) => err ? reject(err) : resolve(data))),
      new Promise((resolve, reject) => getOrderItems((err, data) => err ? reject(err) : resolve(data))),
      new Promise((resolve, reject) => getTables((err, data) => err ? reject(err) : resolve(data))),
      new Promise((resolve, reject) => getProducts((err, data) => err ? reject(err) : resolve(data))),
      new Promise((resolve, reject) => getOrderLogs((err, data) => err ? reject(err) : resolve(data)))
    ]);
    res.render('admin', { categories, orders, orderItems, tables, products, orderLogs });
  } catch (err) {
    console.error("Veri cekme hatasi:", err);
    res.status(500).send("Sunucu hatasi");
  }
});



// API Routes
app.get('/api/orders/preparing', (req, res) => {
  getPreparingOrders((err, data) => {
    if (err) {
      console.error("❌ Siparişler getirilemedi:", err);
      return res.status(500).json({ error: 'Siparişler getirilemedi' });
    }
    res.json(data);
  });
});

app.get('/api/products', (req, res) => {
  getProducts((err, data) => err ? res.status(500).json({ error: 'Urunler getirilemedi' }) : res.json(data));
});
app.get('/api/orders/:id/details', (req, res) => {
  getOrderDetails(req.params.id, (err, data) => err ? res.status(500).json({ error: 'Detay hatasi' }) : res.json(data));
});

app.post('/api/orders/:id/status', async (req, res) => {
  try {
    await updateOrderStatus(req.params.id, req.body.status);
    res.json({ message: 'Durum guncellendi' });
  } catch (err) {
    console.error("Siparis guncelleme hatasi:", err);
    res.status(500).json({ error: 'Durum guncellenemedi' });
  }
});


app.post('/api/orders/create', async (req, res) => {
  const { table_id, total_amount, items, email } = req.body; // 🔥 email eklendi

  if (!table_id || !total_amount || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Eksik sipariş verisi' });
  }

  const orderData = { table_id, total_amount, email }; // ✅ email dahil edildi

  try {
    const result = await createOrderAndPrepare(orderData, items); // email artık burada da var
    if (result.success) {
      return res.status(200).json({ message: 'Sipariş oluşturuldu', orderId: result.orderId });
    } else {
      return res.status(500).json({ error: 'Sipariş oluşturulamadı', detail: result.error });
    }
  } catch (err) {
    console.error("❌ Sipariş oluşturma hatası:", err);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});


app.post('/urun-guncelle/:id', (req, res) => updateProduct(req.params.id, req.body, (err) => err ? res.status(500).json({ error: 'Urun guncellenemedi' }) : res.json({ message: 'Guncelleme basarili' })));

app.delete('/urun-sil/:id', (req, res) => deleteProduct(req.params.id, (err) => err ? res.status(500).json({ error: 'Silme hatasi' }) : res.json({ message: 'Silindi' })));

app.post('/urun-ekle', (req, res) => insertProduct(req.body, (err) => err ? res.status(500).send("Urun eklenemedi") : res.redirect('/admin')));

app.post('/kategori-ekle', (req, res) =>
  insertCategory(req.body, (err) =>
    err ? res.status(500).json({ error: 'Kategori eklenemedi' }) : res.json({ message: 'Eklendi' })
  )
);

app.delete('/kategori-sil/:id', (req, res) => {
  deleteCategory(req.params.id, (err) => {
    if (err) {
      console.error("❌ Kategori silme hatası:", err);
      return res.status(500).json({ error: 'Silinemedi' });
    }
    res.json({ message: 'Silindi' });
  });
});

app.get('/api/categories', (req, res) => {
  getCategories((err, data) => {
    if (err) {
      console.error("Kategori verisi getirilemedi:", err);
      return res.status(500).json({ error: 'Kategoriler getirilemedi' });
    }
    res.json(data);
  });
});

// app.get('/api/orders/preparing', (req, res) => {
//   getPreparingOrders((err, data) =>
//     err ? res.status(500).json({ error: 'Siparişler getirilemedi' }) : res.json(data)
//   );
// });


app.get('/api/analiz/gunluk', (req, res) => {
  if (!req.query.date) return res.status(400).json({ error: 'Tarih eksik' });
  getDailyOrders(req.query.date, (err, data) => err ? res.status(500).json({ error: 'Gunluk veri hatasi' }) : res.json(data));
});

app.get('/api/analiz/aylik', (req, res) => {
  if (!req.query.month) return res.status(400).json({ error: 'Ay eksik' });
  getMonthlyOrders(req.query.month, (err, data) => err ? res.status(500).json({ error: 'Aylik veri hatasi' }) : res.json(data));
});

app.listen(process.env.PORT || port, () => console.log(`App running on http://localhost:${port}`));



const mailerRoute = require('./routes/mailer');
app.use('/api/mail', mailerRoute);


