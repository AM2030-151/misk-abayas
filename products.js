
import { supabase } from "./supabase.js";

const TABLE = "products";
const STORAGE_BUCKET = "products";

// استخراج الصورة الرئيسية
function getMainImage(images) {
  if (!images) return "";

  if (typeof images === "string") return images;

  if (Array.isArray(images)) {
    const first = images[0];

    if (typeof first === "string") return first;
    if (first?.url) return first.url;
    if (first?.src) return first.src;

    return "";
  }

  if (typeof images === "object") {
    return images.url || images.src || "";
  }

  return "";
}

// تجهيز المقاسات
function normalizeSizes(sizes) {
  if (!Array.isArray(sizes)) return [];

  return [...new Set(
    sizes
      .map(size => String(size).trim())
      .filter(Boolean)
  )];
}

// تجهيز الصور
function normalizeImages(images) {
  if (!images) return [];

  if (typeof images === "string") {
    return images ? [images] : [];
  }

  if (Array.isArray(images)) {
    return images.filter(Boolean);
  }

  return [];
}

// تجهيز بيانات المنتج
function normalizeProduct(product) {
  const unlimited =
    product.stock_type === "unlimited" ||
    product.stock_type === "غير محدود";

  const originalPrice = Number(product.original_price || 0);
  const databaseSalePrice = Number(product.sale_price || 0);

  return {
    id: product.id,
    legacyId: product.legacy_id || "",

    name: product.name || "",
    sku: product.sku || "",
    description: product.description || "",

    price: originalPrice,

    salePrice:
      databaseSalePrice > 0 &&
      databaseSalePrice < originalPrice
        ? databaseSalePrice
        : null,

    image: getMainImage(product.images),
    images: normalizeImages(product.images),

    category: product.category || "",

    sizes: normalizeSizes(product.sizes),

    colors: Array.isArray(product.colors)
      ? product.colors
      : [],

    quality: product.quality || "",

    quantity: Number(product.stock || 0),

    unlimited,
    stockType: product.stock_type || "limited",

    active: product.active !== false,

    seoTitle: product.seo_title || "",
    seoDescription: product.seo_description || "",

    createdAt: product.created_at,
    updatedAt: product.updated_at
  };
}

// تجهيز الصور للحفظ
function prepareImages(product) {
  if (Array.isArray(product.images)) {
    return product.images.filter(Boolean);
  }

  const image = product.image || product.imageUrl || "";

  return image ? [image] : [];
}

// تجهيز الألوان للحفظ
function prepareColors(colors) {
  if (!Array.isArray(colors)) return [];

  return colors
    .filter(color => color && typeof color === "object")
    .map(color => ({
      name: String(color.name || "").trim(),
      value: String(color.value || "").trim()
    }))
    .filter(color => color.name && color.value);
}

// تجهيز الجودة
function prepareQuality(quality) {
  return String(quality || "").trim();
}

// التحقق من السعر
function validatePrice(value, fieldName) {
  const price = Number(value);

  if (!Number.isFinite(price) || price < 0) {
    throw new Error(`قيمة ${fieldName} غير صحيحة.`);
  }

  return price;
}

// التحقق من المخزون
function validateQuantity(value) {
  const quantity = Number(value ?? 0);

  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("كمية المخزون يجب أن تكون رقمًا صحيحًا غير سالب.");
  }

  return quantity;
}

// رفع صورة إلى Supabase Storage
export async function uploadProductImage(file) {
  if (!file) {
    throw new Error("لم يتم اختيار صورة.");
  }

  if (!file.type || !file.type.startsWith("image/")) {
    throw new Error("الملف المختار ليس صورة.");
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WEBP أو GIF.");
  }

  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error("حجم الصورة أكبر من 5 ميجابايت.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";

  const fileName =
    `${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const filePath = `products/${fileName}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

  if (error) {
    console.error("خطأ رفع الصورة:", error.message);
    throw error;
  }

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error("تعذر الحصول على رابط الصورة.");
  }

  return data.publicUrl;
}

// جلب المنتجات
export async function getProducts(options = {}) {
  let query = supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (!options.includeInactive) {
    query = query.eq("active", true);
  }

  if (options.category) {
    query = query.eq("category", options.category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("خطأ جلب المنتجات:", error.message);
    throw error;
  }

  return (data || []).map(normalizeProduct);
}

// جلب منتج واحد
export async function getProduct(id) {
  if (!id) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("خطأ جلب المنتج:", error.message);
    throw error;
  }

  return data ? normalizeProduct(data) : null;
}

// تجهيز سجل المنتج
function buildProductRecord(product) {
  const price = validatePrice(product.price, "السعر");

  const salePrice =
    product.salePrice === "" || product.salePrice == null
      ? 0
      : validatePrice(product.salePrice, "سعر التخفيض");

  if (salePrice > 0 && salePrice >= price) {
    throw new Error("سعر التخفيض يجب أن يكون أقل من السعر الأصلي.");
  }

  const unlimited = Boolean(product.unlimited);

  return {
    name: String(product.name || "").trim(),

    sku: product.sku?.trim() || null,

    description: product.description || "",

    original_price: price,
    sale_price: salePrice,

    images: prepareImages(product),

    category: product.category || "",

    sizes: normalizeSizes(product.sizes),

    colors: prepareColors(product.colors),

    quality: prepareQuality(product.quality),

    stock_type: unlimited ? "unlimited" : "limited",

    stock: validateQuantity(product.quantity),

    active: product.active !== false,

    seo_title: product.seoTitle || "",
    seo_description: product.seoDescription || ""
  };
}

// إضافة منتج جديد
export async function addProduct(product) {
  if (!product?.name?.trim()) {
    throw new Error("يرجى إدخال اسم المنتج.");
  }

  const record = buildProductRecord(product);

  const { data, error } = await supabase
    .from(TABLE)
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error("خطأ إضافة المنتج:", error.message);
    throw error;
  }

  return normalizeProduct(data);
}

// تعديل منتج
export async function updateProduct(id, changes) {
  if (!id) {
    throw new Error("معرّف المنتج غير صحيح.");
  }

  const record = {};

  if (changes.name !== undefined) {
    if (!String(changes.name).trim()) {
      throw new Error("اسم المنتج مطلوب.");
    }

    record.name = String(changes.name).trim();
  }

  if (changes.sku !== undefined) {
    record.sku = changes.sku?.trim() || null;
  }

  if (changes.description !== undefined) {
    record.description = changes.description;
  }

  if (changes.price !== undefined) {
    record.original_price = validatePrice(changes.price, "السعر");
  }

  if (changes.salePrice !== undefined) {
    record.sale_price =
      changes.salePrice === "" || changes.salePrice == null
        ? 0
        : validatePrice(changes.salePrice, "سعر التخفيض");
  }

  if (
    changes.image !== undefined ||
    changes.imageUrl !== undefined ||
    changes.images !== undefined
  ) {
    record.images = prepareImages(changes);
  }

  if (changes.category !== undefined) {
    record.category = changes.category;
  }

  if (changes.sizes !== undefined) {
    record.sizes = normalizeSizes(changes.sizes);
  }

  if (changes.colors !== undefined) {
    record.colors = prepareColors(changes.colors);
  }

  if (changes.quality !== undefined) {
    record.quality = prepareQuality(changes.quality);
  }

  if (changes.quantity !== undefined) {
    record.stock = validateQuantity(changes.quantity);
  }

  if (changes.unlimited !== undefined) {
    record.stock_type = changes.unlimited
      ? "unlimited"
      : "limited";
  }

  if (changes.active !== undefined) {
    record.active = Boolean(changes.active);
  }

  if (changes.seoTitle !== undefined) {
    record.seo_title = changes.seoTitle;
  }

  if (changes.seoDescription !== undefined) {
    record.seo_description = changes.seoDescription;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(record)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("خطأ تعديل المنتج:", error.message);
    throw error;
  }

  return normalizeProduct(data);
}

// حذف منتج
export async function deleteProduct(id) {
  if (!id) {
    throw new Error("معرّف المنتج غير صحيح.");
  }

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id);

  if (error) {
    console.error("خطأ حذف المنتج:", error.message);
    throw error;
  }

  return true;
}
