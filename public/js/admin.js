// Tema ve Menü
const sideMenu = document.querySelector('aside');
const menuBtn = document.querySelector('#menu_bar');
const closeBtn = document.querySelector('#close_btn');
const themeToggler = document.querySelector('.theme-toggler');

document.body.classList.toggle('dark-theme-variables');
themeToggler.querySelector('span:nth-child(1)').classList.toggle('active');
themeToggler.querySelector('span:nth-child(2)').classList.toggle('active');

menuBtn.addEventListener('click', () => {
  sideMenu.style.display = "block";
});
closeBtn.addEventListener('click', () => {
  sideMenu.style.display = "none";
});
themeToggler.addEventListener('click', () => {
  document.body.classList.toggle('dark-theme-variables');
  themeToggler.querySelector('span:nth-child(1)').classList.toggle('active');
  themeToggler.querySelector('span:nth-child(2)').classList.toggle('active');
});

// Frame geçişi + içerik güncelleme
document.querySelectorAll('.sidebar a').forEach(link => {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelectorAll('.sidebar a').forEach(el => el.classList.remove('active'));
    this.classList.add('active');
    const frameName = this.getAttribute('data-frame');
    document.querySelectorAll('.frame').forEach(f => f.style.display = 'none');
    if (frameName) {
      const frameEl = document.querySelector(`.${frameName}-frame`);
      if (frameEl) frameEl.style.display = 'block';

      if (frameName === 'siparis') renderSiparisListesi();
      if (frameName === 'urunler') renderProductList();
    }
  });
});

// Sipariş detay popup kapama
const siparisDetayPopup = document.getElementById('siparisDetayPopup');
siparisDetayPopup?.querySelector('.close-panel')?.addEventListener('click', () => {
  siparisDetayPopup.classList.remove('active');
});

// Analiz grafikler
const tarihInput = document.getElementById('analizTarihSec');
const gunlukCanvas = document.getElementById('chartGunluk');
const aylikCanvas = document.getElementById('chartAylik');
let gunlukChart, aylikChart;

function renderChart(canvas, data, label) {
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.map(d => d.label),
      datasets: [{ label, data: data.map(d => d.value), backgroundColor: '#7380ec' }]
    },
    options: {
      maintainAspectRatio: false, // 💥 Bu kritik
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}


async function fetchGunlukData(tarih) {
  const res = await fetch(`/api/analiz/gunluk?date=${tarih}`);
  if (!res.ok) throw new Error("Günlük verisi çekilemedi");
  return await res.json();
}

async function fetchAylikData(tarih) {
  const ay = tarih.slice(0, 7);
  const res = await fetch(`/api/analiz/aylik?month=${ay}`);
  if (!res.ok) throw new Error("Aylık verisi çekilemedi");
  return await res.json();
}

async function guncelleAnaliz(tarih) {
  try {
    const gunlukData = await fetchGunlukData(tarih);
    const aylikData = await fetchAylikData(tarih);
    if (gunlukChart) gunlukChart.destroy();
    if (aylikChart) aylikChart.destroy();

    gunlukChart = renderChart(gunlukCanvas, gunlukData.map(item => ({
      label: item.product_name,
      value: item.total_quantity
    })), 'Günlük Sipariş');

    aylikChart = renderChart(aylikCanvas, aylikData.map(item => ({
      label: item.order_date.split('T')[0],
      value: item.order_count
    })), 'Aylık Sipariş');

    const tbody = document.getElementById('analizTablo');
    tbody.innerHTML = '';
    gunlukData.forEach(item => {
      tbody.innerHTML += `
        <tr>
          <td>${item.product_name}</td>
          <td>${item.total_quantity}</td>
          <td>${parseFloat(item.total_price).toFixed(2)} ₺</td>
        </tr>`;
    });
  } catch (error) {
    console.error('Analiz verileri alınamadı:', error);
  }
}

tarihInput?.addEventListener('change', () => guncelleAnaliz(tarihInput.value));
const bugun = new Date().toISOString().split('T')[0];
tarihInput.value = bugun;
guncelleAnaliz(bugun);

// Ürün görsel önizleme
const imgInput = document.getElementById('product_img_input');
const fileNamePreview = document.getElementById('fileNamePreview');
const imagePreview = document.getElementById('imagePreview');

imgInput?.addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  fileNamePreview.textContent = file.name;
  const reader = new FileReader();
  reader.onload = function () {
    document.getElementById('product_img').value = reader.result;
    imagePreview.src = reader.result;
    imagePreview.style.display = 'block';
  };
  reader.readAsDataURL(file);
});

// Ürün ekleme
const urunForm = document.querySelector('.urun-ekle-form');
urunForm?.addEventListener('submit', async function (e) {
  e.preventDefault();
  if (!document.getElementById('product_img').value) {
    alert('Lütfen bir ürün görseli seçiniz.');
    return;
  }
  const formData = new FormData(urunForm);
  const data = Object.fromEntries(formData.entries());
  try {
    const response = await fetch('/urun-ekle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (response.ok) {
      alert('✅ Ürün başarıyla kaydedildi!');
      urunForm.reset();
      imagePreview.style.display = 'none';
      fileNamePreview.textContent = 'Dosya seçilmedi';
      renderProductList();
    } else {
      alert('❌ Ürün eklenemedi: ' + response.statusText);
    }
  } catch (err) {
    alert('❌ Sunucu hatası oluştu.');
  }
});

// === SİPARİŞ ===

function ekleSiparisKartiEventleri() {
  document.querySelectorAll('.siparis-card')?.forEach(card => {
    const id = card.getAttribute('data-id');
    card.addEventListener('click', () => {
      // Kart üzerindeki yazılardan Masa ve Tutarı çek
      const txt = card.innerText;

      const masaMatch = txt.match(/Masa No:\s*(\d+)/i);
      const masaNo = masaMatch ? masaMatch[1] : '';

      const tutarMatch = txt.match(/Toplam Tutar:\s*([\d.,]+)/i);
      const toplamTutar = tutarMatch ? tutarMatch[1] : '';

      // meta objesini gönder
      renderSiparisDetayPopup(id, { table: masaNo, total: toplamTutar });
    });
  });
}

async function fetchPreparingOrders() {
  const res = await fetch('/api/orders/preparing');
  if (!res.ok) throw new Error("Siparişler çekilemedi");
  return await res.json();
}

async function renderSiparisListesi() {
  try {
    const res = await fetch('/api/orders/preparing');
    if (!res.ok) throw new Error(`HTTP Hatası: ${res.status}`);
    
    const siparisler = await res.json(); // burası da çökebilir

    const liste = document.querySelector('.siparis-listesi');
    liste.innerHTML = '';
    siparisler.forEach(sip => {
      const card = document.createElement('div');
      card.className = 'siparis-card';
      card.setAttribute('data-id', sip.id);
      card.innerHTML = `
        <h4>Sipariş #ID ${sip.id}</h4>
        <p>Masa No: ${sip.table_id}</p>
        <p>Toplam Tutar: ${sip.total_amount} ₺</p>
        <p>Tarih: ${sip.order_time.slice(0,16).replace('T', ' ')}</p>
        <p>Durum: ${sip.status}</p>`;
      liste.appendChild(card);
    });

    ekleSiparisKartiEventleri();
  } catch (err) {
    console.error("💥 Sipariş listesi yüklenemedi:", err);
  }
}


async function fetchSiparisDetay(id) {
  const res = await fetch(`/api/orders/${id}/details`);
  if (!res.ok) throw new Error("Detay verisi çekilemedi");
  return await res.json();
}

async function renderSiparisDetayPopup(id, meta = {}) {
  const masaEl = document.getElementById('popupMasaNo');
  const tutarEl = document.getElementById('popupToplamTutar');
  if (masaEl && meta.table) masaEl.textContent = meta.table;

  if (tutarEl && typeof meta.total !== 'undefined') {
    // 39,90 ve 39.90 ikisini de destekle
    const t = parseFloat(String(meta.total).replace(',', '.'));
    tutarEl.textContent = isNaN(t) ? ` ${meta.total} ₺` : ` ${t.toFixed(2)} ₺`;
  }


  const detaylar = await fetchSiparisDetay(id);
  const tbody = document.getElementById('popupSiparisDetaylari');
  tbody.innerHTML = '';
  detaylar.forEach(item => {
    tbody.innerHTML += `
      <tr>
        <td>${item.product_name}</td>
        <td>${item.quantity}</td>
        <td>${item.unit_price} ₺</td>
      </tr>`;
  });
  document.querySelector('#durumGuncelleForm input[name="siparis_id"]').value = id;
  document.getElementById('siparisDetayPopup').classList.add('active');
}

document.getElementById('durumGuncelleForm')?.addEventListener('submit', async function (e) {
  e.preventDefault();
  const id = this.elements['siparis_id'].value;
  const status = this.elements['status'].value;

  try {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    if (res.ok) {
      alert(`✅ Sipariş durumu "${status}" olarak güncellendi!`);
      document.getElementById('siparisDetayPopup').classList.remove('active');
      renderSiparisListesi();
    } else {
      alert('❌ Güncelleme başarısız!');
    }
  } catch (err) {
    alert('❌ Sunucu hatası!');
  }
});

// === ÜRÜNLER ===

function ekleUrunDuzenlemeEventleri() {
  document.querySelectorAll('.product-card .edit').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.product-wrapper').forEach(wrapper => wrapper.classList.remove('open'));
      const wrapper = button.closest('.product-wrapper');
      if (wrapper) wrapper.classList.add('open');
    });
  });

  document.querySelectorAll('.edit-popup-panel .close-panel').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrapper = btn.closest('.product-wrapper');
      if (wrapper) wrapper.classList.remove('open');
    });
  });
}

let categoriesCache = [];

async function fetchCategories() {
  if (categoriesCache.length > 0) return categoriesCache;
  const res = await fetch('/api/categories');
  if (!res.ok) throw new Error("Kategoriler çekilemedi");
  const data = await res.json();
  categoriesCache = data;
  return data;
}

async function renderProductList(kategoriId = 'all') {
  const [products, categories] = await Promise.all([
    fetch('/api/products').then(r => r.json()),
    fetchCategories()
  ]);

  const container = document.querySelector('.product-list');
  container.innerHTML = '';

  // 🔥 KATEGORİ FİLTRESİ
  let filteredProducts = products;
  if (kategoriId !== 'all') {
    filteredProducts = products.filter(p => p.category_id == kategoriId);
  }

  filteredProducts.forEach(urun => {
    const wrapper = document.createElement('div');
    wrapper.className = 'product-wrapper';

    // Kategori seçenekleri
    const kategoriOptions = categories.map(cat =>
      `<option value="${cat.id}" ${cat.id === urun.category_id ? 'selected' : ''}>${cat.name}</option>`
    ).join('');

    wrapper.innerHTML = `
      <div class="product-card">
        ${urun.image ? `<img src="${urun.image}" class="product-img">` : `<div class="no-img">(Görsel Yok)</div>`}
        <h3>${urun.name}</h3>
        <p>Açıklama: ${urun.description || 'Tanımlanmamış'}</p>
        <p>Fiyat: ${urun.price} ₺</p>
        <p>Kategori: ${urun.category_id || 'Bilinmiyor'}</p>
        <p>Stok: ${urun.stock || 0} ${urun.unit || ''}</p>
        <p>Durum: ${urun.is_available ? 'Aktif' : 'Pasif'}</p>
        <div class="actions">
          <button class="edit" data-id="${urun.id}">Düzenle</button>
          <button class="delete" data-id="${urun.id}">Sil</button>
        </div>
      </div>
      <div class="edit-popup-panel" data-id="${urun.id}">
        <button class="close-panel" type="button">
          <span class="material-icons">close</span>
        </button>
        <form method="POST" action="/urun-guncelle/${urun.id}">
          <label>Ürün Adı</label>
          <input type="text" name="name" value="${urun.name}">

          <label>Açıklama</label>
          <input type="text" name="desc" value="${urun.description}">

          <label>Fiyat</label>
          <input type="number" name="price" step="0.01" value="${urun.price}">

          <label>Kategori</label>
          <select name="category_id" required>
            ${kategoriOptions}
          </select>

          <label>Stok</label>
          <input type="number" name="stock" value="${urun.stock}">

          <label>Ölçü Birimi</label>
          <input type="text" name="unit" value="${urun.unit}">

          <label>Durum</label>
          <select name="status">
            <option value="aktif" ${urun.is_available ? 'selected' : ''}>Aktif</option>
            <option value="pasif" ${!urun.is_available ? 'selected' : ''}>Pasif</option>
          </select>

          <button type="submit">Kaydet</button>
        </form>
      </div>
    `;

    container.appendChild(wrapper);
  });

  ekleUrunDuzenlemeEventleri();
}


document.getElementById('kategoriFiltre')?.addEventListener('change', function () {
  const selectedKategori = this.value;
  renderProductList(selectedKategori);
});


document.addEventListener('click', async (e) => {
  if (e.target.classList.contains('delete')) {
    const id = e.target.getAttribute('data-id');
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;

    try {
      const res = await fetch(`/urun-sil/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('✅ Ürün başarıyla silindi.');
        renderProductList(); // listeyi yenile
      } else {
        const data = await res.json();
        alert('❌ Silme hatası: ' + (data.error || 'Bilinmeyen hata'));
      }
    } catch (err) {
      alert('❌ Sunucu hatası: ' + err.message);
    }
  }
});


// === ÜRÜN GÜNCELLEME FORMUNU FETCH İLE ELE AL ===
document.addEventListener('submit', async function (e) {
  const form = e.target;
  if (form.matches('.edit-popup-panel form')) {
    e.preventDefault(); // Sayfa yenilemeyi engelle

    const id = form.getAttribute('action').split('/').pop(); // URL'den ürün ID'yi al
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(`/urun-guncelle/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        alert("✅ Ürün güncellendi.");
        form.closest('.product-wrapper')?.classList.remove('open'); // popup'ı kapat
        renderProductList(); // listeyi yenile
      } else {
        const errData = await res.json();
        alert("❌ Hata: " + (errData.error || 'Bilinmeyen'));
      }
    } catch (err) {
      alert("❌ Sunucu hatası: " + err.message);
    }
  }
});

document.querySelector('.kategori-ekle-form')?.addEventListener('submit', async function (e) {
  e.preventDefault();
  const formData = new FormData(this);
  const data = Object.fromEntries(formData.entries());

  try {
    const res = await fetch('/kategori-ekle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      alert("✅ Kategori başarıyla eklendi.");
      location.reload(); // sayfayı yenile ki dropdown'lar güncellensin
    } else {
      alert("❌ Kategori eklenemedi.");
    }
  } catch (err) {
    alert("❌ Sunucu hatası: " + err.message);
  }
});

document.querySelector('.kategori-sil-form')?.addEventListener('submit', async function (e) {
  e.preventDefault();
  const id = document.getElementById('kategori_sil_id').value;
  if (!id || !confirm("Bu kategoriyi silmek istediğinizden emin misiniz?")) return;

  try {
    const res = await fetch(`/kategori-sil/${id}`, { method: 'DELETE' });
    if (res.ok) {
      alert("✅ Kategori silindi.");
      location.reload(); 
      renderProductList(); // varsa kategorili ürünleri yenile
    } else {
      const data = await res.json();
      alert("❌ Hata: " + (data.error || 'Bilinmeyen'));
    }
  } catch (err) {
    alert("❌ Sunucu hatası: " + err.message);
  }
});


// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
  renderSiparisListesi();
  renderProductList();
});

// Logout
document.querySelectorAll('.logout-link')?.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/logout';
  });
});
