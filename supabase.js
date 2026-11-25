
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://frxpovuoymaxynpxhodv.supabase.co";

// ضع مفتاح Publishable الحقيقي هنا
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_rnYtKDbn8zOxoUFloJpcZA_eXAET4VR";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
