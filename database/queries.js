// === queries.js ===
const db = require("./db");

// Kategoriler
const getCategories = (cb) => db.query("SELECT * FROM cafe_db01.categories", cb);

// Ürünler
const getProducts = (cb) => {
  const q = `SELECT id, name, description, price, category_id, is_available, stock, unit, product_img FROM cafe_db01.products`;
  db.query(q, (err, results) => {
    if (err) return cb(err);
    const formatted = results.map(p => ({ ...p, image: p.product_img ? p.product_img.toString() : null }));
    cb(null, formatted);
  });
};

// Masalar
const getTables = (cb) => db.query("SELECT * FROM cafe_db01.tables", cb);

// Siparişler
const getOrders = (cb) => db.query("SELECT * FROM cafe_db01.orders", cb);
const getOrderItems = (cb) => db.query("SELECT * FROM cafe_db01.order_items", cb);
const getOrderLogs = (cb) => db.query("SELECT * FROM cafe_db01.order_logs", cb);

// Sadece preparing siparişler
const getPreparingOrders = (cb) => {
  const q = `SELECT * FROM cafe_db01.orders WHERE status = 'preparing' ORDER BY order_time DESC`;
  db.query(q, cb);
};

// Sipariş detay
const getOrderDetails = (orderId, cb) => {
  const q = `SELECT oi.quantity, oi.unit_price, p.name AS product_name FROM cafe_db01.order_items oi JOIN cafe_db01.products p ON p.id = oi.product_id WHERE oi.order_id = ?`;
  db.query(q, [orderId], cb);
};

// Sipariş durumu güncelle
const updateOrderStatus = async (orderId, newStatus) => {
  await db.promise().query(`UPDATE cafe_db01.orders SET status = ? WHERE id = ?`, [newStatus, orderId]);

  if (newStatus.toLowerCase() === 'canceled' || newStatus.toLowerCase() === 'cancelled') {
    const [items] = await db.promise().query(`SELECT product_id, quantity FROM cafe_db01.order_items WHERE order_id = ?`, [orderId]);
    for (const item of items) {
      await db.promise().query(`UPDATE cafe_db01.products SET stock = stock + ? WHERE id = ?`, [item.quantity, item.product_id]);
      await db.promise().query(`DELETE FROM cafe_db01.order_items WHERE order_id = ?`, [orderId]);
    }
  }

  const [[{ email } = {}]] = await db.promise().query(
    `SELECT email FROM cafe_db01.order_logs WHERE order_id = ? ORDER BY changed_at DESC LIMIT 1`,
    [orderId]
  );
  // console.log("📧 order_logs tablosundan alınan email:", email);


  if (email) {
    let subject = '';
    let text = '';

    if (newStatus.toLowerCase() === 'served') {
      subject = '🥳 Siparişiniz Servis Edildi!';
      text = `
✅ SİPARİŞİNİZ SERVİS EDİLDİ

Merhaba,

Siparişiniz şu anda masanıza servis edilmiştir. Afiyet olsun! 🍽️

✨ Keyifli anlar geçirmeniz dileğiyle...

MKD Coffee ailesi olarak bizi tercih ettiğiniz için teşekkür ederiz. ☕️

💬 Görüş ve önerilerinizi bizimle paylaşabilirsiniz.
📍 Şube: MKD Coffee, Sivas Cumhuriyet Üniversitesi

🕒 Sipariş Saati: ${new Date().toLocaleString('tr-TR')}

---
Bu mesaj sistem tarafından otomatik olarak gönderilmiştir.
    `.trim();
    } else if (newStatus.toLowerCase() === 'cancelled') {
      subject = '❌ Siparişiniz İptal Edildi';
      text = `
❌ SİPARİŞİNİZ İPTAL EDİLDİ

Merhaba,

Üzgünüz, vermiş olduğunuz sipariş iptal edilmiştir.

😔 Yaşanan aksaklık için özür dileriz.

💡 Yeni siparişlerinizde size en iyi hizmeti sunmak için buradayız.

MKD Coffee ailesi olarak anlayışınız için teşekkür eder, sizi tekrar ağırlamaktan memnuniyet duyarız. ☕️

---
Bu mesaj sistem tarafından otomatik olarak gönderilmiştir.
    `.trim();
    }

    if (subject && text) {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'mkd.coffee58@gmail.com',
          pass: 'dpstipemnkagrnlk'
        }
      });

      try {
        await transporter.sendMail({
          from: 'mkd.coffee58@gmail.com',
          to: email,
          subject,
          text
        });
        console.log('📨 Mail gönderildi:', subject);
      } catch (err) {
        console.error('❌ Mail gönderilemedi:', err);
      }
    }
  }


};

//Sipariş oluşturma
const createOrderAndPrepare = async (orderData, items) => {
  const conn = await db.promise();
  try {
    await conn.beginTransaction();
    // 1. orders tablosuna yeni kayıt
    const [orderResult] = await conn.query(
      `INSERT INTO cafe_db01.orders (table_id, total_amount, status, order_time) VALUES (?, ?, 'preparing', NOW())`,
      [orderData.table_id, orderData.total_amount]
    );
    const orderId = orderResult.insertId;
    // 2. order_items tablosuna ürünleri ekle
    for (const item of items) {
      await conn.query(
        `INSERT INTO cafe_db01.order_items (order_id, product_id, quantity, unit_price)
         VALUES (?, ?, ?, ?)`,
        [orderId, item.product_id, item.quantity, item.unit_price]
      );
    }
    // 3. order_logs tablosuna kayıt
    await conn.query(
      `INSERT INTO cafe_db01.order_logs (order_id, email, changed_at) VALUES (?, ?, NOW())`,
      [orderId, orderData.email] // 👈 email backend'e gönderilmeli
    );

    // 4. products tablosundan stok düş
    for (const item of items) {
      await conn.query(
        `UPDATE cafe_db01.products SET stock = stock - ? WHERE id = ?`,
        [item.quantity, item.product_id]
      );
    }
    await conn.commit();
    return { success: true, orderId };
  } catch (err) {
    await conn.rollback();
    console.error("createOrderAndPrepare hatası:", err);
    return { success: false, error: err };
  } finally {
    // conn.release();
  }
};


// Günlük / Aylık analiz
const getDailyOrders = (date, cb) => {
  const q = `SELECT p.name AS product_name, SUM(oi.quantity) AS total_quantity, SUM(oi.unit_price * oi.quantity) AS total_price FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id WHERE o.order_time LIKE CONCAT(?, '%') GROUP BY p.name`;
  db.query(q, [date], cb);
};

const getMonthlyOrders = (month, cb) => {
  const q = `SELECT DATE_FORMAT(o.order_time, '%Y-%m-%d') AS order_date, COUNT(o.id) AS order_count FROM cafe_db01.orders o WHERE DATE_FORMAT(o.order_time, '%Y-%m') = ? GROUP BY order_date ORDER BY order_date ASC`;
  db.query(q, [month], cb);
};

// Ürün ekle
const insertProduct = (p, cb) => {
  const q = `INSERT INTO cafe_db01.products (name, description, price, category_id, is_available, stock, unit, product_img) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const vals = [p.name, p.description, parseFloat(p.price), parseInt(p.category_id), parseInt(p.is_available), parseInt(p.stock) || 0, p.unit || null, p.product_img];
  db.query(q, vals, cb);
};

// Kategori ekle
const insertCategory = (cat, cb) => {
  db.query(`INSERT INTO cafe_db01.categories (name, description) VALUES (?, ?)`, [cat.name, cat.description], cb);
};

// Katefori sil
const deleteCategory = (id, cb) => {
  const q = `DELETE FROM cafe_db01.categories WHERE id = ?`;
  db.query(q, [id], cb);
};

// Ürün güncelle
const updateProduct = (id, data, cb) => {
  const q = `UPDATE cafe_db01.products SET name = ?, description = ?, price = ?, category_id = ?, is_available = ?, stock = ?, unit = ? WHERE id = ?`;
  const vals = [data.name || null, data.desc || null, parseFloat(data.price) || 0, parseInt(data.category_id) || null, data.status === 'aktif' ? 1 : 0, parseInt(data.stock) || 0, data.unit || null, id];
  db.query(q, vals, cb);
};

// Ürün sil
const deleteProduct = (id, cb) => {
  db.query(`DELETE FROM cafe_db01.products WHERE id = ?`, [id], cb);
};

module.exports = {
  getCategories,
  getProducts,
  getTables,
  getOrders,
  getOrderItems,
  getOrderLogs,
  createOrderAndPrepare,
  getPreparingOrders,
  getOrderDetails,
  updateOrderStatus,
  getDailyOrders,
  getMonthlyOrders,
  insertProduct,
  insertCategory,
  deleteCategory,
  updateProduct,
  deleteProduct
};