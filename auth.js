
import { supabase } from "./supabase.js";

// إنشاء حساب جديد
export async function signUp(email, password, fullName = "") {
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail || !password) {
    throw new Error("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
  }

  if (password.length < 8) {
    throw new Error("يجب ألا تقل كلمة المرور عن 8 أحرف.");
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        full_name: String(fullName || "").trim()
      }
    }
  });

  if (error) {
    console.error("خطأ إنشاء الحساب:", error);
    throw error;
  }

  return data;
}

// تسجيل الدخول
export async function signIn(email, password) {
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail || !password) {
    throw new Error("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password
  });

  if (error) {
    console.error("خطأ تسجيل الدخول:", error);
    throw error;
  }

  return data;
}

// تسجيل الخروج
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("خطأ تسجيل الخروج:", error);
    throw error;
  }

  return true;
}

// الحصول على المستخدم الحالي
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("خطأ الحصول على المستخدم:", error);
    return null;
  }

  return data?.user || null;
}

// التحقق من صلاحية إدارة المتجر
export async function isMerchant() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      console.error("فشل التحقق: لا يوجد مستخدم مسجل الدخول.");
      return false;
    }

    console.log("تم العثور على المستخدم المسجل.");

    const { data, error } = await supabase
      .from("merchant_users")
      .select("user_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("خطأ قراءة صلاحيات الإدارة:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });

      return false;
    }

    if (!data) {
      console.error(
        "لم يتم العثور على سجل لهذا المستخدم في merchant_users."
      );

      return false;
    }

    console.log("تم العثور على سجل الصلاحيات.");

    const role = String(data.role || "")
      .trim()
      .toLowerCase();

    console.log("دور الحساب:", role);

    const allowedRoles = [
      "admin",
      "merchant",
      "owner"
    ];

    return allowedRoles.includes(role);

  } catch (error) {
    console.error("خطأ غير متوقع أثناء التحقق من الإدارة:", error);
    return false;
  }
}

// متابعة تغييرات تسجيل الدخول
export function watchAuth(callback) {
  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (typeof callback === "function") {
      callback(event, session?.user || null);
    }
  });

  return subscription;
}
