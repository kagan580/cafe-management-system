let navbar = document.querySelector('.navbar');
let searchForm = document.querySelector('.search-form');
let cartItem = document.querySelector('.cart-items-container');

// Menü - Arama - Sepet butonları

document.querySelector('#menu-btn').onclick = () => {
    navbar.classList.toggle('active');
    searchForm.classList.remove('active');
    cartItem.classList.remove('active');
}

document.querySelector('#search-btn').onclick = () => {
    searchForm.classList.toggle('active');
    navbar.classList.remove('active');
    cartItem.classList.remove('active');
}

document.querySelector('#cart-btn').onclick = () => {
    cartItem.classList.toggle('active');
    navbar.classList.remove('active');
    searchForm.classList.remove('active');
}

window.onscroll = () => {
    navbar.classList.remove('active');
    searchForm.classList.remove('active');
    cartItem.classList.remove('active');
}

function getCartFooterItem() {
  // Checkout butonunu bul, onu taşıyan .cart-item’ı döndür
  const checkout = document.getElementById('checkoutBtn');
  if (!checkout) return null;
  const footerItem = checkout.closest('.cart-item');
  return footerItem || null;
}

function updateCartScrollHeight() {
  const container = document.getElementById('shop_card');
  const scroll = container.querySelector('.cart-scroll');
  const footerItem = getCartFooterItem();
  if (!scroll) return;

  // Footerın (masa label + select + buton) gerçek yüksekliğini al
  const footerH = footerItem ? footerItem.offsetHeight + 50: 50;

  // Dış kutu max-height:70vh → iç scroll bunu footer kadar düşürsün
  scroll.style.maxHeight = `calc(70vh - ${footerH}px)`;
}

function ensureCartScroll() {
  const container = document.getElementById('shop_card'); // #shop_card.cart-items-container
  let scroll = container.querySelector('.cart-scroll');

  // Footer (masa+checkout) olan .cart-item
  const footerItem = getCartFooterItem();

  if (!scroll) {
    // İç scroll kutusunu oluştur
    scroll = document.createElement('div');
    scroll.className = 'cart-scroll';

    // Scroll kutusunu footerItem’dan ÖNCE konumlandır
    if (footerItem) {
      container.insertBefore(scroll, footerItem);
    } else {
      container.insertBefore(scroll, container.firstChild);
    }

    // Yalnız ÜRÜN .cart-item’larını (footer olmayanları) içeri taşı
    const items = Array.from(container.querySelectorAll('.cart-item'))
      .filter(item => item !== footerItem); // footer’ı dışarıda bırak
    items.forEach(node => scroll.appendChild(node));
  }

  // Her çağrıda yükseklik güncelle
  updateCartScrollHeight();
  return scroll;
}

function add_to_card(event) {

    let productId = event.id.substr(8);
    let shp_card = ensureCartScroll();

    let existingItem = document.querySelector(".cart-item.item_" + productId);
    if (existingItem) {
        let quantityInput = existingItem.querySelector(".quantity-input");
        let newQuantity = parseInt(quantityInput.value) + 1;
        quantityInput.value = newQuantity;

        let priceElement = existingItem.querySelector(".price p");
        let unitPrice = parseFloat(priceElement.dataset.unitPrice);
        priceElement.innerText = `$${unitPrice.toFixed(2)} x${newQuantity} = $${(unitPrice * newQuantity).toFixed(2)}`;

        updateCartCount();
        updateCartTotal(); // ekstra: toplam tutarı güncelle
        return;
    }

    let yeniDiv = document.createElement("div");
    yeniDiv.className = "cart-item item_" + productId;

    let yeniSpan = document.createElement("span");
    yeniSpan.className = "remove-item fas fa-times";
    yeniSpan.addEventListener("click", function () {
        yeniDiv.remove();
        updateCartCount();
  updateCartTotal();
  updateCartScrollHeight();   
    });
    yeniDiv.appendChild(yeniSpan);

    let elements = document.getElementsByClassName("cls_urun_" + productId);

    let yeniImg = document.createElement("img");
    yeniImg.className = "item_" + productId;
    yeniImg.src = elements[0].src;
    yeniDiv.appendChild(yeniImg);

    let yeniDiv2 = document.createElement("div");
    yeniDiv2.className = "content";

    let yenih3 = document.createElement("h3");
    yenih3.className = "item_" + productId;
    yenih3.innerText = elements[1].innerText;
    yeniDiv2.appendChild(yenih3);

    let yeniDiv3 = document.createElement("div");
    yeniDiv3.className = "price";
    let yeniP = document.createElement("p");
    yeniP.className = "item_" + productId + " product-price";
    let rawPrice = elements[3].innerText.match(/\$?(\d+(\.\d+)?)/);
    let unitPrice = rawPrice ? parseFloat(rawPrice[1]) : 0;

    yeniP.dataset.unitPrice = unitPrice;
    yeniP.innerText = `$${unitPrice.toFixed(2)} x1 = $${unitPrice.toFixed(2)}`;

    yeniDiv3.appendChild(yeniP);

    yeniDiv2.appendChild(yeniDiv3);

    let quantityDiv = document.createElement("div");
    quantityDiv.className = "quantity-selector";

    let decreaseBtn = document.createElement("button");
    decreaseBtn.innerText = "−";
    decreaseBtn.className = "quantity-btn";
    decreaseBtn.addEventListener("click", function () {
        let currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
            quantityInput.value = currentValue - 1;
        } else {
            yeniDiv.remove();
            updateCartCount();
            updateCartTotal
        }
        const updatedQty = parseInt(quantityInput.value);
        const priceP = yeniDiv2.querySelector('.product-price');
        const unit = parseFloat(priceP.dataset.unitPrice);
        priceP.innerText = `$${unit.toFixed(2)} x${updatedQty} = $${(unit * updatedQty).toFixed(2)}`;
        updateCartTotal();
    });

    let quantityInput = document.createElement("input");
    quantityInput.type = "text";
    quantityInput.value = 1;
    quantityInput.className = "quantity-input";
    quantityInput.setAttribute("readonly", true);

    let increaseBtn = document.createElement("button");
    increaseBtn.innerText = "+";
    increaseBtn.className = "quantity-btn";
    increaseBtn.addEventListener("click", function () {
        quantityInput.value = parseInt(quantityInput.value) + 1;
        const updatedQty = parseInt(quantityInput.value);
        const priceP = yeniDiv2.querySelector('.product-price');
        const unit = parseFloat(priceP.dataset.unitPrice);
        priceP.innerText = `$${unit.toFixed(2)} x${updatedQty} = $${(unit * updatedQty).toFixed(2)}`;
        updateCartTotal()
    });

    quantityDiv.appendChild(decreaseBtn);
    quantityDiv.appendChild(quantityInput);
    quantityDiv.appendChild(increaseBtn);

    yeniDiv2.appendChild(quantityDiv);
    yeniDiv.appendChild(yeniDiv2);

    shp_card.insertBefore(yeniDiv, shp_card.firstChild);

    updateCartCount();

}

function add_to_card_from_search(button) {
    const productId = button.dataset.id;
    const productName = button.dataset.name;
    const productPrice = button.dataset.price;
    const productImage = button.dataset.image;

    const shp_card = ensureCartScroll();

    let existingItem = document.querySelector(".cart-item.item_" + productId);
    if (existingItem) {
        let quantityInput = existingItem.querySelector(".quantity-input");
        let newQuantity = parseInt(quantityInput.value) + 1;
        quantityInput.value = newQuantity;

        let priceElement = existingItem.querySelector(".price p");
        let unitPrice = parseFloat(priceElement.dataset.unitPrice);
        priceElement.innerText = `$${unitPrice.toFixed(2)} x${newQuantity} = $${(unitPrice * newQuantity).toFixed(2)}`;

        updateCartCount();
        updateCartTotal(); // ekstra: toplam tutarı güncelle
        return;
    }

    let yeniDiv = document.createElement("div");
    yeniDiv.className = "cart-item item_" + productId;

    let yeniSpan = document.createElement("span");
    yeniSpan.className = "remove-item fas fa-times";
    yeniSpan.addEventListener("click", function () {
        yeniDiv.remove();
        updateCartCount();
  updateCartTotal();
  updateCartScrollHeight();   
    });
    yeniDiv.appendChild(yeniSpan);

    let yeniImg = document.createElement("img");
    yeniImg.className = "item_" + productId;
    yeniImg.src = productImage || '/images/default.jpg';
    yeniDiv.appendChild(yeniImg);

    let yeniDiv2 = document.createElement("div");
    yeniDiv2.className = "content";

    let yenih3 = document.createElement("h3");
    yenih3.className = "item_" + productId;
    yenih3.innerText = productName;
    yeniDiv2.appendChild(yenih3);

    let yeniDiv3 = document.createElement("div");
    yeniDiv3.className = "price";
    let yeniP = document.createElement("p");
    yeniP.className = "item_" + productId + " product-price";
    yeniP.dataset.unitPrice = parseFloat(productPrice);
    yeniP.innerText = `$${productPrice} x1 = $${productPrice}`;

    yeniDiv3.appendChild(yeniP);

    yeniDiv2.appendChild(yeniDiv3);

    let quantityDiv = document.createElement("div");
    quantityDiv.className = "quantity-selector";

    let decreaseBtn = document.createElement("button");
    decreaseBtn.innerText = "−";
    decreaseBtn.className = "quantity-btn";
    decreaseBtn.addEventListener("click", function () {
        let currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
            quantityInput.value = currentValue - 1;
        } else {
            yeniDiv.remove();
            updateCartCount();
            updateCartTotal
        }
        const updatedQty = parseInt(quantityInput.value);
        const priceP = yeniDiv2.querySelector('.product-price');
        const unit = parseFloat(priceP.dataset.unitPrice);
        priceP.innerText = `$${unit.toFixed(2)} x${updatedQty} = $${(unit * updatedQty).toFixed(2)}`;
        updateCartTotal();
    });

    let quantityInput = document.createElement("input");
    quantityInput.type = "text";
    quantityInput.value = 1;
    quantityInput.className = "quantity-input";
    quantityInput.setAttribute("readonly", true);

    let increaseBtn = document.createElement("button");
    increaseBtn.innerText = "+";
    increaseBtn.className = "quantity-btn";
    increaseBtn.addEventListener("click", function () {
        quantityInput.value = parseInt(quantityInput.value) + 1;
        const updatedQty = parseInt(quantityInput.value);
        const priceP = yeniDiv2.querySelector('.product-price');
        const unit = parseFloat(priceP.dataset.unitPrice);
        priceP.innerText = `$${unit.toFixed(2)} x${updatedQty} = $${(unit * updatedQty).toFixed(2)}`;
        updateCartTotal();
    });

    quantityDiv.appendChild(decreaseBtn);
    quantityDiv.appendChild(quantityInput);
    quantityDiv.appendChild(increaseBtn);

    yeniDiv2.appendChild(quantityDiv);
    yeniDiv.appendChild(yeniDiv2);

    shp_card.insertBefore(yeniDiv, shp_card.firstChild);
    updateCartCount();
}


// ================= Payment Modal ================= //

document.addEventListener('DOMContentLoaded', () => {
    const checkoutBtn = document.getElementById('checkoutBtn');
    const modal = document.getElementById('paymentModal');
    const closeBtn = modal.querySelector('.close');
    const paymentForm = document.getElementById('paymentForm');
    const expiryDateInput = document.getElementById('expiryDate');
    const cardNumberInput = document.getElementById('cardNumber');
    const cvvInput = document.getElementById('cvv');
    const cartItem = document.querySelector('.cart-items-container');

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (cartItem && cartItem.children.length > 1) {
                modal.style.display = 'block';
            } else {
                alert('Sepet boş, lütfen ürün ekleyin.');
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    expiryDateInput.addEventListener('input', function () {
        let input = this.value.replace(/[^0-9]/g, '');
        if (input.length > 4) input = input.substring(0, 4);
        if (input.length > 2) input = input.substring(0, 2) + '/' + input.substring(2);
        this.value = input;
    });

    cardNumberInput.addEventListener('input', function () {
        let input = this.value.replace(/\D/g, '').substring(0, 16);
        this.value = input.match(/.{1,4}/g)?.join(' ') || input;
    });

    cvvInput.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 3);
    });

    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Sayfa yenilenmesini engeller

            const fullName = document.getElementById('fullname').value;
            const email = document.getElementById('email').value;
            const cardNumber = cardNumberInput.value;
            const expiryDate = expiryDateInput.value;
            const cvv = cvvInput.value;
            const masa = document.getElementById('masa').value;

            try {
                // 1. Mail gönder
                const res = await fetch('/api/mail/send-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                if (!res.ok) throw new Error('Kod gönderilemedi');

                // 2. Kod girme modalını aç
                showOtpModal(email, { fullName, email, cardNumber, expiryDate, cvv, masa });

            } catch (err) {
                alert('Kod gönderimi sırasında hata oluştu: ' + err.message);
            }
        });

    }
});

document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.category-btn');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.category-btn.active')?.classList.remove('active');
            btn.classList.add('active');

            selectedCategoryId = btn.dataset.id; // seçilen kategori güncellenir
            currentPage = 0; // kategori değişince ilk sayfaya dön
            renderPaginatedProducts(allProducts); // ürünleri yeniden çiz
        });
    });
});



let selectedCategoryId = 'all'; // Seçilen kategori (varsayılan: tümü)
const itemsPerPage = 6;
let allProducts = [];

function renderPaginatedProducts(products) {
    const container = document.getElementById('productGrid');
    container.innerHTML = '';

    const filtered = (selectedCategoryId === 'all'
        ? products
        : products.filter(p => String(p.category_id) === selectedCategoryId)
    ).filter(p => p.is_available); // sadece aktif ürünleri getir

    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    const visibleItems = filtered.slice(start, end);

    visibleItems.forEach((urun, index) => {
        const box = document.createElement('div');
        box.className = 'box';
        box.innerHTML = `
  <img src="${urun.image || '/images/default.jpg'}" class="cls_urun_${urun.id}" />
  <h3 class="cls_urun_${urun.id}">${urun.name}</h3>
  <p class="desc cls_urun_${urun.id}">${urun.description || ''}</p>
  <div class="price cls_urun_${urun.id}">$${urun.price}</div>
  <a class="btn" id="id_urun_${urun.id}" onclick="add_to_card(this)">Add To Cart</a>
`;


        container.appendChild(box);
    });
}


async function fetchAndRenderProducts() {
    const res = await fetch('/api/products');
    const data = await res.json();
    allProducts = data;
    currentPage = 0;
    renderPaginatedProducts(allProducts);
}

document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 0) {
        currentPage--;
        renderPaginatedProducts(allProducts);
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    if ((currentPage + 1) * itemsPerPage < allProducts.length) {
        currentPage++;
        renderPaginatedProducts(allProducts);
    }
});

window.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderProducts();      // ürünleri çekip göster
    setupSearchResults();         // arama kutusu için
    updateCartCount();            // varsa sepet sayısını güncelle
});


function updateCartCount() {
    const cartItems = document.querySelectorAll('.cart-item');
    const itemCount = Math.max(0, cartItems.length - 1); // checkout hariç

    const badge = document.getElementById('cart-badge');
    if (badge) {
        if (itemCount > 0) {
            badge.style.display = 'inline-block';
            badge.textContent = itemCount;
        } else {
            badge.style.display = 'none';
        }
    }
    updateCartTotal();

}
function updateCartTotal() {
    let total = 0;
    const items = document.querySelectorAll('.cart-item');
    items.forEach(item => {
        const priceP = item.querySelector('.price p');
        if (priceP?.dataset?.unitPrice) {
            const unit = parseFloat(priceP.dataset.unitPrice);
            const qty = parseInt(item.querySelector('.quantity-input')?.value || 1);
            total += unit * qty;
        }
    });

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.innerText = `Checkout Now - $${total.toFixed(2)}`;
    }
}



function setupSearchResults() {
    const searchBox = document.getElementById('search-box');
    const resultsContainer = document.getElementById('search-results');

    searchBox.addEventListener('input', () => {
        const searchTerm = searchBox.value.trim().toLowerCase();
        resultsContainer.innerHTML = '';

        if (!searchTerm) {
            resultsContainer.style.display = 'none';
            return;
        }

        const matched = allProducts
            .filter(p => p.is_available) // sadece aktifler
            .filter(urun => urun.name.toLowerCase().includes(searchTerm));

        if (matched.length === 0) {
            resultsContainer.innerHTML = '<p style="color:#000">Ürün bulunamadı.</p>';
            resultsContainer.style.display = 'block';
            return;
        }

        matched.slice(0, 5).forEach(urun => {
            const card = document.createElement('div');
            card.className = 'search-card';
            card.innerHTML = `
  <img src="${urun.image || '/images/default.jpg'}" alt="${urun.name}" />
  <h4>${urun.name}</h4>
  <span class="price">$${urun.price}</span>
  <a class="btn"
     data-id="${urun.id}"
     data-name="${urun.name}"
     data-price="${urun.price}"
     data-image="${urun.image}"
     onclick="add_to_card_from_search(this)">Add to Cart</a>
`;

            resultsContainer.appendChild(card);
        });

        resultsContainer.style.display = 'block';
    });
}

document.getElementById('otpForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const code = document.getElementById('otp').value;
    const email = document.getElementById('email').value;

    try {
        const res = await fetch('/api/mail/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });

        if (!res.ok) throw new Error("Kod hatalı");

        document.getElementById('otpModal').style.display = 'none';
        alert("Kod doğru! Sipariş alındı.");

        // 🧾 Sipariş verilerini toparla
        const tableId = parseInt(document.getElementById('masa').value);
        if (!tableId) throw new Error("Masa numarası seçilmedi!");

       const items = Array.from(document.querySelectorAll('.cart-item'))
  .filter(item => !item.querySelector('#checkoutBtn')) // checkout butonlu öğeyi çıkar
  .map(item => {
    const quantityInput = item.querySelector('.quantity-input');
    const productPrice = item.querySelector('.product-price');
    const nameEl = item.querySelector('h3');
    const match = item.className.match(/item_(\d+)/);

    const product_id = match ? parseInt(match[1]) : null;
    const name = nameEl ? nameEl.innerText.trim() : 'Bilinmeyen Ürün';
    const quantity = quantityInput ? parseInt(quantityInput.value) : 0;
    const unit_price = productPrice ? parseFloat(productPrice.dataset.unitPrice) : 0;

    return { product_id, name, quantity, unit_price };
  })
  .filter(item => item.product_id && item.quantity > 0 && !isNaN(item.unit_price));


        if (items.length === 0) throw new Error("Sepette ürün yok veya geçersiz ürün bilgisi!");

        const total_price = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

        // 🔄 Siparişi oluştur
        const orderRes = await fetch('/api/orders/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                table_id: tableId,
                total_amount: total_price,
                email, 
                items: items.map(i => ({
                    product_id: i.product_id,
                    quantity: i.quantity,
                    unit_price: i.unit_price
                }))
            })
        });

        if (!orderRes.ok) throw new Error("Sipariş veritabanına kaydedilemedi");
        const { orderId } = await orderRes.json();

        // ✉️ Mail ile sipariş özeti gönder
        const summary = {
            email,
            summary: {
                orderNo: orderId,
                tableNo: tableId,
                total: total_price.toFixed(2),
                items: items.map(i => ({
                    name: i.name,
                    quantity: i.quantity,
                    price: i.unit_price.toFixed(2)
                }))
            }
        };

        const summaryRes = await fetch('/api/mail/send-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(summary)
        });

        if (!summaryRes.ok) throw new Error("Sipariş özeti gönderilemedi");

        alert("Sipariş özeti başarıyla mail adresinize gönderildi!");

        // 🧹 İsteğe bağlı: sepeti temizle
        // document.querySelectorAll('.cart-item').forEach((item, i) => i > 0 && item.remove());
        // updateCartCount();
        location.reload(); 

    } catch (err) {
        alert("Hata: " + err.message);
    }
});



function showOtpModal(email, summaryData) {
    const modal = document.getElementById('otpModal');
    modal.style.display = 'block';

    // E-posta bilgisini formda sakla
    document.getElementById('email').value = email;

    // Bu datayı global olarak tutalım ki verify sonrası kullanabilelim
    window._orderSummaryData = summaryData;
}

// Tekrar gönder butonuna basıldığında kodu yeniden gönder
function resendOtp() {
    const email = document.getElementById('email').value;
    if (!email) return alert("E-posta adresi bulunamadı");

    fetch('/api/mail/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    })
        .then(res => {
            if (!res.ok) throw new Error("Kod gönderilemedi");
            alert("Yeni kod gönderildi!");
        })
        .catch(err => alert(err.message));
}
