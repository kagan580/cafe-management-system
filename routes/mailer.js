const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// Kod ve süreyi birlikte tutacağız
const otpStore = {}; // { [email]: { code, expiresAt } }

// Mail servis yapılandırması
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'mkd.coffee58@gmail.com',
    pass: 'dpstipemnkagrnlk' // Gmail uygulama şifresi
  }
});

// Doğrulama kodu gönderme
router.post('/send-code', (req, res) => {
  const { email } = req.body;
  const code = Math.floor(100000 + Math.random() * 900000); // 6 haneli rastgele kod
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 dakika (ms)

  otpStore[email] = { code, expiresAt };

  const mailOptions = {
  from: 'mkd.coffee58@gmail.com',
  to: email,
  subject: '🔐 Sipariş Doğrulama Kodunuz - MKD Coffee',
  text: `
☕️ Merhaba,

📦 Siparişinizi tamamlamak için aşağıdaki doğrulama kodunu kullanabilirsiniz:

🔐 Kodunuz: ${code}

⏳ Bu kod yalnızca 5 dakika geçerlidir.

Eğer bu işlemi siz yapmadıysanız, bu maili yok sayabilirsiniz.

MKD Coffee olarak iyi günler dileriz 🌿
  `.trim()
};

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) return res.status(500).send('Kod gönderilemedi');
    res.send('Kod gönderildi');
  });
});

// Kod doğrulama
router.post('/verify-code', (req, res) => {
  const { email, code } = req.body;
  const otpData = otpStore[email];

  if (!otpData) {
    return res.status(400).send({ success: false, message: 'Kod bulunamadı' });
  }

  if (Date.now() > otpData.expiresAt) {
    delete otpStore[email];
    return res.status(400).send({ success: false, message: 'Kodun süresi dolmuş' });
  }

  if (otpData.code == code) {
    delete otpStore[email];
    return res.send({ success: true });
  }

  res.status(400).send({ success: false, message: 'Kod hatalı' });
});

// Sipariş özeti gönderme
router.post('/send-summary', (req, res) => {
  const { email, summary } = req.body;

  const formattedItems = summary.items.map(i => 
    `- ${i.name} x${i.quantity} → $${(i.price * i.quantity).toFixed(2)}`
  ).join('\n');

  const mailOptions = {
    from: 'mkd.coffee58@gmail.com',
    to: email,
    subject: '📦 Sipariş Özeti - MKD Coffee',
    text: `
🧾 SİPARİŞ ÖZETİ

📄 Sipariş No : ${summary.orderNo}
🪑 Masa Numarası : ${summary.tableNo}
💰 Toplam Tutar : $${summary.total}

🛍 Alınan Ürünler:
${formattedItems}

🕒 Siparişiniz başarıyla alındı. En kısa sürede hazırlanacaktır.
MKD Coffee olarak bizi tercih ettiğiniz için teşekkür ederiz ☕️
    `.trim()
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error("Mail gönderim hatası:", err);
      return res.status(500).send('Özet gönderilemedi');
    }
    res.send('Özet gönderildi');
  });
});

module.exports = router;
