// Supabase Edge Function: send-otp
// Integrates with Kavenegar SMS Gateway securely without exposing API keys to browser clients.
// Features: Cryptographic Randomness, 120s Cooldown, Hourly Rate Limiting, Hash Storage.

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
    const { mobile } = await req.json();
    if (!mobile) {
      return new Response(JSON.stringify({ error: "شماره موبایل الزامی است." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanMobile = normalizeMobile(mobile);
    if (!cleanMobile.match(/^09\d{9}$/)) {
      return new Response(JSON.stringify({ error: "شماره تلفن همراه نامعتبر است (مثال: 09121234567)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Rate Limiting Check: 120s cooldown between requests for same mobile
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: recentRequests } = await supabaseAdmin
      .from("otp_verifications")
      .select("id, created_at")
      .eq("mobile", cleanMobile)
      .gte("created_at", twoMinutesAgo)
      .limit(1);

    if (recentRequests && recentRequests.length > 0) {
      return new Response(
        JSON.stringify({ error: "لطفاً پیش از درخواست مجدد پیامک، ۲ دقیقه شکیبایی فرمایید." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Hourly Anti-Abuse Rate Limit: Maximum 5 requests per hour per mobile
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: hourlyCount } = await supabaseAdmin
      .from("otp_verifications")
      .select("id", { count: "exact", head: true })
      .eq("mobile", cleanMobile)
      .gte("created_at", oneHourAgo);

    if (hourlyCount && hourlyCount >= 5) {
      return new Response(
        JSON.stringify({ error: "تعداد درخواست‌های کد تایید در یک ساعت گذشته به سقف مجاز (۵ بار) رسیده است. لطفاً بعداً تلاش فرمایید." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Cryptographically Secure 5-digit OTP generation (10000 - 99999)
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const code = (10000 + (randomArray[0] % 90000)).toString();

    // 3 minutes validity window
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString();

    // 4. Cryptographic SHA-256 Hash of OTP
    const encoder = new TextEncoder();
    const data = encoder.encode(code + "::amlk_salt::" + cleanMobile);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const otpHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Invalidate any existing unused pending codes for this phone
    await supabaseAdmin
      .from("otp_verifications")
      .update({ verified: true })
      .eq("mobile", cleanMobile)
      .eq("verified", false);

    // 5. Store record in public.otp_verifications
    const { error: insertErr } = await supabaseAdmin.from("otp_verifications").insert({
      mobile: cleanMobile,
      otp_hash: otpHash,
      expires_at: expiresAt,
      verified: false,
      attempts: 0,
    });

    if (insertErr) {
      console.error("Failed storing OTP record:", insertErr);
      return new Response(JSON.stringify({ error: "خطا در پردازش درخواست ورود پیامکی." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Secure Server-Side SMS Transmission via Kavenegar
    const kavenegarApiKey = Deno.env.get("KAVENEGAR_API_KEY");
    if (kavenegarApiKey) {
      const template = Deno.env.get("KAVENEGAR_VERIFY_TEMPLATE") || "amlakino-verify";
      const kavenegarUrl = `https://api.kavenegar.com/v1/${kavenegarApiKey}/verify/lookup.json?receptor=${cleanMobile}&token=${code}&template=${template}`;
      try {
        const smsRes = await fetch(kavenegarUrl);
        if (!smsRes.ok) {
          const errBody = await smsRes.text();
          console.error("Kavenegar SMS transmission error:", errBody);
          return new Response(JSON.stringify({ error: "ارسال پیامک از سمت درگاه مخابراتی با خطا مواجه شد." }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (err: any) {
        console.error("Kavenegar network exception:", err);
        return new Response(JSON.stringify({ error: "عدم برقراری ارتباط با اپراتور پیامکی." }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.info(`[Amlakino Development OTP] Code for ${cleanMobile}: ${code}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "کد تایید پیامکی ارسال شد.",
        expiresInSeconds: 180,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "خطای پیش‌بینی نشده در سرور پیامک." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
