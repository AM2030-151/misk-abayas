
const STORE_CONFIG = {
  name: "MISK ABAYAS",
  nameAr: "مسك للعبايات",

  currency: "SAR",
  currencySymbol: "ر.س",

  direction: "rtl",
  language: "ar",

  theme: {
    primary: "#596044",
    secondary: "#777C5C",
    background: "#E9E2D2",
    surface: "#FFFFFF",
    border: "#C9BDA7",
    text: "#34382B"
  },

  categories: [
    { id: "classic", name: "عبايات كلاسيكية" },
    { id: "winter", name: "عبايات شتوية" },
    { id: "embroidered", name: "عبايات مطرزة" },
    { id: "modern", name: "عبايات عصرية" },
    { id: "daily", name: "عبايات يومية" }
  ],

  // هذه مقاسات مقترحة فقط.
  // لوحة الإدارة ستسمح بإضافة أي مقاسات أخرى يدويًا.
  sizes: ["50", "52", "54", "56", "58", "60", "62"],

  shipping: {
    enabled: true,
    price: 25,
    freeShippingMinimum: 500
  },

  cart: {
    storageKey: "misk_cart"
  },

  wishlist: {
    storageKey: "misk_wishlist"
  },

  products: {
    storageKey: "misk_products"
  },

  orders: {
    storageKey: "misk_orders"
  }
};

if (typeof window !== "undefined") {
  window.STORE_CONFIG = STORE_CONFIG;
}
