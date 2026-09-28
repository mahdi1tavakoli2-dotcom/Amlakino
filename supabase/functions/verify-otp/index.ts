// Supabase Edge Function: verify-otp
// Validates OTP against stored cryptographic hash, prevents brute-force,
// and issues legitimate Supabase Auth session credentials.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeMobile(mobile: string): string {
  const persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let res = mobile || "";
  for (let i = 0; i < 10; i++) {
    res = res.replace(persianNumbers[i], i.toString()).replace(arabicNumbers[i], i.toString());
  }
  return res.trim().replace(/\s+/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mobile, code } = await req.json();
    if (!mobile || !code) {
      return new Response(JSON.stringify({ error: "شماره موبایل و کد تایید الزامی هستند." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanMobile = normalizeMobile(mobile);
    const cleanCode = normalizeMobile(code);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Fetch latest active OTP verification record for this mobile
    const { data: records, error: fetchErr } = await supabaseAdmin
      .from("otp_verifications")
      .select("*")
      .eq("mobile", cleanMobile)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchErr || !records || records.length === 0) {
      return new Response(JSON.stringify({ error: "کد تایید منقضی شده یا درخواست فعالی یافت نشد. لطفاً کد جدید دریافت کنید." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const record = records[0];

    // 2. Strict Brute-Force Check: Max 3 attempts
    if (record.attempts >= 3) {
      // Invalidate the record immediately
      await supabaseAdmin
        .from("otp_verifications")
        .update({ verified: true, expires_at: new Date().toISOString() })
        .eq("id", record.id);

      return new Response(JSON.stringify({ error: "تعداد دفعات ورود اشتباه بیش از حد مجاز (۳ بار) است. کد باطل شد؛ لطفاً مجدداً درخواست دهید." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Compute Cryptographic SHA-256 Hash of incoming attempt
    const encoder = new TextEncoder();
    const data = encoder.encode(cleanCode + "::amlk_salt::" + cleanMobile);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const otpHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    if (record.otp_hash !== otpHash) {
      const nextAttempts = record.attempts + 1;
      const isNowLocked = nextAttempts >= 3;

      await supabaseAdmin
        .from("otp_verifications")
        .update({
          attempts: nextAttempts,
          ...(isNowLocked ? { expires_at: new Date().toISOString() } : {}),
        })
        .eq("id", record.id);

      const remaining = 3 - nextAttempts;
      const errorMsg = isNowLocked
        ? "کد تایید اشتباه است و به دلیل ۳ تلاش ناموفق باطل شد. لطفاً کد جدید دریافت کنید."
        : `کد تایید وارد شده نادرست است. (${remaining} فرصت باقیمانده)`;

      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Mark verified & consumed to prevent any replay attacks
    await supabaseAdmin
      .from("otp_verifications")
      .update({ verified: true })
      .eq("id", record.id);

    // 5. Establish Official Supabase Auth Identity
    const authEmail = `${cleanMobile}@amlakino.internal`;

    // Query using existing RPC
    const { data: userId } = await supabaseAdmin.rpc("get_user_id_by_email", { email: authEmail });

    let finalUserId = userId;
    if (!finalUserId) {
      // User does not exist yet: create user in auth.users
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        phone: cleanMobile,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          full_name: "مشاور جدید",
          mobile: cleanMobile,
          role: "agent",
        },
      });

      if (createErr && !createErr.message.includes("already registered")) {
        console.error("Error creating auth user:", createErr);
        throw createErr;
      }
      finalUserId = newUser?.user?.id;
    }

    // 6. Generate Magiclink Token Hash for native client session establishment
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: authEmail,
    });

    if (linkErr) {
      console.error("Error generating session link:", linkErr);
      throw linkErr;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "احراز هویت پیامکی با موفقیت تایید شد.",
        token_hash: linkData.properties?.hashed_token,
        email: authEmail,
        userId: finalUserId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("verify-otp error:", error);
    return new Response(JSON.stringify({ error: error.message || "خطای تایید کد یکبار مصرف در سرور." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
