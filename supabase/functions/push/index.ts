// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type StoredSubscription = {
  endpoint: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json(500, { error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" });
    }

    const authHeader = req.headers.get("Authorization") ?? "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return json(401, { error: "Not authenticated" });
    }

    const payload = await req.json();
    const action = payload?.action as string | undefined;

    if (!action) return json(400, { error: "Missing action" });

    if (action === "upsert") {
      const subscription = payload?.subscription as StoredSubscription | undefined;
      const userAgent = payload?.userAgent as string | undefined;

      const endpoint = subscription?.endpoint;
      const p256dh = subscription?.keys?.p256dh;
      const auth = subscription?.keys?.auth;

      if (!endpoint || !p256dh || !auth) {
        return json(400, { error: "Invalid subscription payload" });
      }

      const { error } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            user_id: user.id,
            endpoint,
            p256dh,
            auth,
            expiration_time: subscription?.expirationTime ?? null,
            user_agent: userAgent ?? null,
          },
          { onConflict: "endpoint" }
        );

      if (error) return json(400, { error: error.message });
      return json(200, { ok: true });
    }

    if (action === "remove") {
      const endpoint = (payload?.endpoint as string | undefined) ?? (payload?.subscription?.endpoint as string | undefined);
      if (!endpoint) return json(400, { error: "Missing endpoint" });

      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("endpoint", endpoint);

      if (error) return json(400, { error: error.message });
      return json(200, { ok: true });
    }

    if (action === "send_test") {
      const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
      const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
      const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

      if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        return json(500, { error: "Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY" });
      }

      const title = (payload?.title as string | undefined) ?? "JuaExpress";
      const body = (payload?.body as string | undefined) ?? "Test notification";
      const url = (payload?.url as string | undefined) ?? "/";

      const { data: subs, error } = await supabase
        .from("push_subscriptions")
        .select("endpoint,p256dh,auth,expiration_time")
        .eq("user_id", user.id);

      if (error) return json(400, { error: error.message });
      if (!subs || subs.length === 0) return json(400, { error: "No subscriptions found for user" });

      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

      const pushPayload = JSON.stringify({ title, body, url });

      const results = await Promise.all(
        subs.map(async (s: any) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: s.endpoint,
                expirationTime: s.expiration_time ?? undefined,
                keys: { p256dh: s.p256dh, auth: s.auth },
              },
              pushPayload
            );
            return { endpoint: s.endpoint, ok: true };
          } catch (e: any) {
            return { endpoint: s.endpoint, ok: false, error: e?.message ?? String(e) };
          }
        })
      );

      return json(200, { ok: true, results });
    }

    return json(400, { error: `Unknown action: ${action}` });
  } catch (e: any) {
    return json(400, { error: e?.message ?? "Unknown error" });
  }
});
