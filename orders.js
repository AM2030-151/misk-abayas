
import { supabase } from "./supabase.js";

const TABLE = "orders";

// الحالات المعتمدة في لوحة الإدارة
const ALLOWED_STATUSES = [
  "new",
  "processing",
  "shipped",
  "delivered",
  "cancelled"
];

// توحيد الحالات القديمة والجديدة للعرض والحساب
function normalizeStatus(status) {
  const value = String(status || "").trim().toLowerCase();

  const statusMap = {
    "جديد": "new",
    "قيد المعالجة": "processing",
    "قيد التجهيز": "processing",
    "تم الشحن": "shipped",
    "تم التوصيل": "delivered",
    "ملغي": "cancelled",
    "ملغى": "cancelled"
  };

  return statusMap[value] || value;
}

// تجهيز بيانات الطلب
function normalizeOrder(order) {
  const customer = order.customer || {};

  return {
    ...order,

    customer,

    customer_name: customer.name || "",
    customer_phone: customer.phone || "",
    customer_address: customer.address || "",
    customer_city: customer.city || "",
    customer_email: customer.email || "",

    paymentMethod: order.payment_method || "",

    quantity: Number(order.quantity || 0),
    total: Number(order.total || 0),

    status: normalizeStatus(order.status),

    originalStatus: order.status,

    createdAt: order.created_at
  };
}

// جلب جميع الطلبات
export async function getOrders() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("خطأ جلب الطلبات:", error.message);
    throw error;
  }

  return (data || []).map(normalizeOrder);
}

// جلب طلب واحد
export async function getOrder(id) {
  if (!id) {
    throw new Error("رقم الطلب غير صحيح.");
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("خطأ جلب الطلب:", error.message);
    throw error;
  }

  return data ? normalizeOrder(data) : null;
}

// تحديث حالة الطلب
export async function updateOrderStatus(id, status) {
  if (!id) {
    throw new Error("رقم الطلب غير صحيح.");
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error("حالة الطلب غير صحيحة.");
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("خطأ تحديث حالة الطلب:", error.message);
    throw error;
  }

  return normalizeOrder(data);
}

// حساب إجمالي المبيعات للطلبات غير الملغاة
export async function getOrdersSales() {
  const orders = await getOrders();

  return orders
    .filter(order => order.status !== "cancelled")
    .reduce((total, order) => {
      return total + Number(order.total || 0);
    }, 0);
}

// حساب الطلبات الجديدة
export async function getNewOrdersCount() {
  const orders = await getOrders();

  return orders.filter(order => {
    return order.status === "new";
  }).length;
}

// حساب عدد القطع في الطلب
export function getTotalQuantity(items, fallback = 0) {
  if (!Array.isArray(items)) {
    return Number(fallback || 0);
  }

  return items.reduce((total, item) => {
    const quantity = Number(
      item.quantity ?? item.qty ?? 1
    );

    return total + (
      Number.isFinite(quantity) && quantity > 0
        ? quantity
        : 0
    );
  }, 0);
}

// إنشاء رقم طلب
export function generateOrderNumber() {
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

// إنشاء طلب عميل
// سيُربط لاحقًا بوظيفة آمنة تتحقق من الأسعار والمخزون في الخادم.
// لا نسمح حاليًا بإدخال طلب مباشر من المتصفح.
export async function createDatabaseOrder(order) {
  throw new Error(
    "إنشاء الطلبات غير مفعّل حاليًا. سنفعّله بعد إعداد التحقق الآمن من الأسعار والمخزون."
  );
}
