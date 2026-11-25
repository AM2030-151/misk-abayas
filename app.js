
(function () {
  "use strict";

  const CONFIG = window.STORE_CONFIG || {};

  const KEYS = {
    cart: CONFIG.cart?.storageKey || "misk_cart",
    wishlist: CONFIG.wishlist?.storageKey || "misk_wishlist",
    products: CONFIG.products?.storageKey || "misk_products",
    orders: CONFIG.orders?.storageKey || "misk_orders"
  };

  // قراءة البيانات من التخزين المحلي بأمان
  function readStorage(key, fallback = []) {
    try {
      const value = localStorage.getItem(key);

      if (!value) return fallback;

      const parsed = JSON.parse(value);

      return parsed ?? fallback;
    } catch (error) {
      console.error("خطأ قراءة البيانات:", error);
      return fallback;
    }
  }

  // حفظ البيانات في التخزين المحلي
  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("خطأ حفظ البيانات:", error);
      return false;
    }
  }

  // قراءة السلة
  function getCart() {
    const cart = readStorage(KEYS.cart, []);
    return Array.isArray(cart) ? cart : [];
  }

  // حفظ السلة
  function saveCart(cart) {
    const safeCart = Array.isArray(cart) ? cart : [];

    writeStorage(KEYS.cart, safeCart);
    updateCartCount();

    return safeCart;
  }

  // قراءة المنتجات المخزنة مؤقتًا
  function getProducts() {
    const products = readStorage(KEYS.products, []);
    return Array.isArray(products) ? products : [];
  }

  // حفظ المنتجات
  function saveProducts(products) {
    const safeProducts = Array.isArray(products) ? products : [];

    writeStorage(KEYS.products, safeProducts);

    return safeProducts;
  }

  // البحث عن منتج في التخزين المحلي
  function findProduct(productId) {
    return getProducts().find(product =>
      String(product.id) === String(productId)
    ) || null;
  }

  // توحيد سعر المنتج
  function getProductPrice(product) {
    if (!product) return 0;

    const originalPrice = Number(
      product.price ?? product.original_price ?? 0
    );

    const salePrice = Number(
      product.salePrice ?? product.sale_price ?? 0
    );

    if (
      Number.isFinite(salePrice) &&
      salePrice > 0 &&
      salePrice < originalPrice
    ) {
      return salePrice;
    }

    return Number.isFinite(originalPrice) ? originalPrice : 0;
  }

  // تجهيز عنصر السلة
  function normalizeCartItem(item) {
    const product = item.product || item;

    return {
      productId: String(
        item.productId ??
        item.product_id ??
        product.id ??
        item.id ??
        ""
      ),

      name: item.name || product.name || "",

      image:
        item.image ||
        product.image ||
        product.image_url ||
        "",

      price: Number(
        item.price ??
        getProductPrice(product)
      ),

      size: String(item.size || ""),

      quantity: Math.max(
        1,
        Number(item.quantity ?? item.qty ?? 1)
      ),

      stockType:
        item.stockType ||
        product.stockType ||
        product.stock_type ||
        "limited",

      stock: Number(
        item.stock ??
        product.quantity ??
        product.stock ??
        0
      )
    };
  }

  // إضافة منتج للسلة
  function addToCart(productOrId, quantity = 1, size = "") {
    let product;

    if (
      productOrId &&
      typeof productOrId === "object"
    ) {
      product = productOrId;
    } else {
      product = findProduct(productOrId);
    }

    if (!product || !product.id) {
      alert("تعذر العثور على المنتج. يرجى تحديث الصفحة.");
      return false;
    }

    const amount = Number(quantity);

    if (!Number.isInteger(amount) || amount < 1) {
      alert("يرجى اختيار كمية صحيحة.");
      return false;
    }

    const selectedSize = String(size || "").trim();

    if (
      Array.isArray(product.sizes) &&
      product.sizes.length > 0 &&
      !selectedSize
    ) {
      alert("يرجى اختيار المقاس أولاً.");
      return false;
    }

    const stockType =
      product.stockType ||
      product.stock_type ||
      "limited";

    const unlimited =
      product.unlimited === true ||
      stockType === "unlimited" ||
      stockType === "غير محدود";

    const stock = Number(
      product.quantity ??
      product.stock ??
      0
    );

    if (!unlimited && stock < 1) {
      alert("عذرًا، المنتج غير متوفر حاليًا.");
      return false;
    }

    const cart = getCart();

    const productId = String(product.id);

    const existingIndex = cart.findIndex(item =>
      String(item.productId || item.id) === productId &&
      String(item.size || "") === selectedSize
    );

    const currentQuantity =
      existingIndex >= 0
        ? Number(cart[existingIndex].quantity || 0)
        : 0;

    const newQuantity = currentQuantity + amount;

    if (!unlimited && newQuantity > stock) {
      alert(`الكمية المتاحة من هذا المنتج هي ${stock}.`);
      return false;
    }

    const item = {
      productId,
      name: product.name || "",
      image:
        product.image ||
        product.image_url ||
        "",
      price: getProductPrice(product),
      size: selectedSize,
      quantity: newQuantity,
      stockType,
      stock
    };

    if (existingIndex >= 0) {
      cart[existingIndex] = item;
    } else {
      cart.push(item);
    }

    saveCart(cart);

    return true;
  }

  // تعديل كمية منتج في السلة
  function updateCartItem(productId, size, quantity) {
    const cart = getCart();

    const itemIndex = cart.findIndex(item =>
      String(item.productId || item.id) === String(productId) &&
      String(item.size || "") === String(size || "")
    );

    if (itemIndex === -1) {
      return false;
    }

    const newQuantity = Number(quantity);

    if (!Number.isInteger(newQuantity) || newQuantity < 1) {
      return false;
    }

    const item = normalizeCartItem(cart[itemIndex]);

    const unlimited =
      item.stockType === "unlimited" ||
      item.stockType === "غير محدود";

    if (!unlimited && newQuantity > item.stock) {
      alert(`الكمية المتاحة هي ${item.stock}.`);
      return false;
    }

    cart[itemIndex] = {
      ...item,
      quantity: newQuantity
    };

    saveCart(cart);

    return true;
  }

  // حذف منتج من السلة
  function removeFromCart(productId, size = "") {
    const cart = getCart();

    const updatedCart = cart.filter(item =>
      !(
        String(item.productId || item.id) === String(productId) &&
        String(item.size || "") === String(size || "")
      )
    );

    saveCart(updatedCart);

    return true;
  }

  // إفراغ السلة
  function clearCart() {
    saveCart([]);
    return true;
  }

  // حساب عدد القطع في السلة
  function getCartCount() {
    return getCart().reduce((total, item) => {
      return total + Number(item.quantity || item.qty || 0);
    }, 0);
  }

  // حساب إجمالي السلة
  function getCartTotal() {
    return getCart().reduce((total, item) => {
      const price = Number(item.price || 0);
      const quantity = Number(item.quantity || item.qty || 0);

      return total + (price * quantity);
    }, 0);
  }

  // تحديث رقم السلة الظاهر في الصفحات
  function updateCartCount() {
    const count = getCartCount();

    const selectors = [
      "#cart-count",
      "#cartCount",
      ".cart-count",
      "[data-cart-count]"
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        element.textContent = String(count);

        if (count > 0) {
          element.style.display = "";
        } else {
          element.style.display = "none";
        }
      });
    });
  }

  // قراءة المفضلة
  function getWishlist() {
    const wishlist = readStorage(KEYS.wishlist, []);

    return Array.isArray(wishlist) ? wishlist : [];
  }

  // حفظ المفضلة
  function saveWishlist(wishlist) {
    const safeWishlist = Array.isArray(wishlist)
      ? wishlist
      : [];

    writeStorage(KEYS.wishlist, safeWishlist);

    updateWishlistCount();

    return safeWishlist;
  }

  // التحقق من وجود المنتج في المفضلة
  function isFavorite(productId) {
    return getWishlist().some(item => {
      const id =
        typeof item === "object"
          ? item.id || item.productId
          : item;

      return String(id) === String(productId);
    });
  }

  // إضافة أو إزالة منتج من المفضلة
  function toggleWishlist(productId) {
    if (!productId) return false;

    const wishlist = getWishlist();

    const index = wishlist.findIndex(item => {
      const id =
        typeof item === "object"
          ? item.id || item.productId
          : item;

      return String(id) === String(productId);
    });

    if (index >= 0) {
      wishlist.splice(index, 1);
      saveWishlist(wishlist);
      return false;
    }

    wishlist.push(String(productId));

    saveWishlist(wishlist);

    return true;
  }

  // تحديث عدد المنتجات في المفضلة
  function updateWishlistCount() {
    const count = getWishlist().length;

    const selectors = [
      "#wishlist-count",
      "#wishlistCount",
      ".wishlist-count",
      "[data-wishlist-count]"
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        element.textContent = String(count);

        if (count > 0) {
          element.style.display = "";
        } else {
          element.style.display = "none";
        }
      });
    });
  }

  // تنسيق السعر بالريال السعودي
  function formatPrice(price) {
    const amount = Number(price || 0);

    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: CONFIG.currency || "SAR",
      maximumFractionDigits: 2
    }).format(amount);
  }

  // إنشاء رقم طلب محلي
  function generateLocalOrderNumber() {
    const date = new Date();

    const datePart = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("");

    const randomPart = Math.floor(
      100000 + Math.random() * 900000
    );

    return `MSK-${datePart}-${randomPart}`;
  }

  // إنشاء سجل طلب محلي مؤقت
  // هذا لا ينشئ طلبًا في Supabase ولا يؤكد استلام المتجر له.
  function createOrder(customer) {
    const cart = getCart();

    if (cart.length === 0) {
      throw new Error("السلة فارغة.");
    }

    const customerData =
      customer?.customer &&
      typeof customer.customer === "object"
        ? customer.customer
        : customer || {};

    if (!customerData.name || !customerData.phone) {
      throw new Error("يرجى إدخال اسم العميل ورقم الجوال.");
    }

    const order = {
      id: `local-${Date.now()}`,
      orderNumber: generateLocalOrderNumber(),
      customer: {
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email || "",
        address: customerData.address || "",
        city: customerData.city || ""
      },
      items: cart.map(item => ({ ...item })),
      total: getCartTotal(),
      quantity: getCartCount(),
      status: "new",
      createdAt: new Date().toISOString(),
      localOnly: true
    };

    const orders = readStorage(KEYS.orders, []);

    const safeOrders = Array.isArray(orders)
      ? orders
      : [];

    safeOrders.unshift(order);

    writeStorage(KEYS.orders, safeOrders);

    clearCart();

    return order;
  }

  // قراءة الطلبات المحلية
  function getOrders() {
    const orders = readStorage(KEYS.orders, []);

    return Array.isArray(orders) ? orders : [];
  }

  // تشغيل تحديث العدادات عند تحميل الصفحة
  function initialize() {
    updateCartCount();
    updateWishlistCount();
  }

  // الواجهة العامة التي تستخدمها صفحات المتجر
  window.MiskStore = {
    getCart,
    saveCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,

    getCartCount,
    getCartTotal,

    getProducts,
    saveProducts,

    getWishlist,
    saveWishlist,
    isFavorite,
    toggleWishlist,

    formatPrice,

    createOrder,
    getOrders,

    updateCartCount,
    updateWishlistCount
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }

})();
