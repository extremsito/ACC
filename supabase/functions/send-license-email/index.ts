// Supabase Edge Function · envía por email la licencia recién asignada.
// La web la llama justo después de asignar una licencia (piloto o equipo)
// y el panel de administración la usa para "Reenviar email".
//
// Secretos necesarios (Supabase > Edge Functions > Secrets):
//   RESEND_API_KEY  clave de https://resend.com
//   MAIL_FROM       remitente verificado en Resend, p. ej. "ACC Community <licencias@tudominio.com>"
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya los pone Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { request_id } = await req.json().catch(() => ({}));
    if (!request_id) return json({ error: "Falta request_id" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: auth } = await admin.auth.getUser(jwt);
    const user = auth?.user;
    if (!user) return json({ error: "No has iniciado sesión" }, 401);

    const { data: lr } = await admin.from("license_requests").select("*").eq("id", request_id).maybeSingle();
    if (!lr || !lr.assigned_license) return json({ error: "Solicitud no encontrada" }, 404);

    const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const isAdmin = me?.role === "admin";
    if (lr.user_id !== user.id && !isAdmin) return json({ error: "No autorizado" }, 403);
    // Evita reenvíos en bucle desde la web; administración puede reenviar cuando quiera.
    if (!isAdmin && lr.email_sent_at && Date.now() - new Date(lr.email_sent_at).getTime() < 10 * 60 * 1000) {
      return json({ ok: true, to: lr.email, skipped: true });
    }

    let to = lr.email as string | null;
    if (!to && lr.user_id) to = (await admin.auth.admin.getUserById(lr.user_id)).data.user?.email ?? null;
    if (!to) return json({ error: "La solicitud no tiene email" }, 400);

    const isTeam = lr.type === "team";
    const name = `${lr.name || ""} ${lr.last_name || ""}`.trim() || "piloto";
    const subject = isTeam
      ? `Licencia de equipo ${lr.assigned_license} · ${lr.team_name || "ACC Community"}`
      : `Tu licencia de piloto ${lr.assigned_license} · ACC Community`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0b1220">
      <h2 style="margin:0 0 8px">Assetto Corsa Community</h2>
      <p>Hola ${esc(name)},</p>
      <p>${isTeam
        ? `Tu equipo <b>${esc(lr.team_name)}</b> ya tiene licencia de equipo:`
        : "Ya tienes tu licencia de piloto de la comunidad:"}</p>
      <p style="font-size:28px;font-weight:800;letter-spacing:2px;background:#fff1ea;color:#ff5a1f;padding:16px 20px;border-radius:12px;text-align:center">${esc(lr.assigned_license)}</p>
      <p>${isTeam
        ? "Comparte esta licencia con los pilotos de tu equipo: se añade sola a su perfil cuando aceptas su solicitud."
        : "Se ha añadido automáticamente a tu perfil. La necesitarás para inscribirte en las pruebas."}</p>
      <p style="color:#64748b;font-size:13px">Este es un mensaje automático, no hace falta responder.</p></div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: Deno.env.get("MAIL_FROM"), to: [to], subject, html }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      await admin.from("license_requests").update({ email_error: detail }).eq("id", request_id);
      return json({ error: "El proveedor de email rechazó el envío", detail }, 502);
    }
    await admin.from("license_requests")
      .update({ email_sent_at: new Date().toISOString(), email_error: null, email: to })
      .eq("id", request_id);
    return json({ ok: true, to });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});
