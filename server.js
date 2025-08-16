// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

// === ENV ===
const BOT_TOKEN = process.env.BOT_TOKEN; // токен твого @TonMriyaBot
if (!BOT_TOKEN) {
  console.error("❌ Missing BOT_TOKEN in env");
  process.exit(1);
}
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ---- Перевірка підпису initData (Telegram WebApp) ----
function validateInitData(initData) {
  if (!initData) return false;
  const url = new URLSearchParams(initData);
  const hash = url.get("hash");
  if (!hash) return false;

  url.delete("hash");
  const dataCheckString = Array.from(url.entries())
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([k,v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256")
    .update(BOT_TOKEN)
    .digest();

  const hmac = crypto.createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return hmac === hash;
}

// ---- Роут для створення інвойсу Stars ----
app.post("/api/create-stars-invoice", async (req, res) => {
  try {
    const { initData, sku = "item", amount } = req.body || {};

    // 1) валідація initData
    if (!validateInitData(initData)) {
      return res.status(400).json({ error: "initData invalid" });
    }

    // 2) валідація amount
    const amt = Number.parseInt(amount, 10);
    if (!Number.isInteger(amt) || amt <= 0) {
      return res.status(400).json({ error: "amount must be positive integer (XTR)" });
    }

    // 3) будуємо запит до Telegram: createInvoiceLink
    // Валюта для Stars — XTR; ціна в цілих XTR
    const payload = {
      title: `Purchase: ${sku}`,
      description: `TON Vault Clicker — ${sku}`,
      currency: "XTR",
      prices: [{ label: sku, amount: amt }],
      // додатково:
      need_name: false,
      need_email: false,
      need_phone_number: false,
      is_flexible: false
    };

    const tgResp = await fetch(`${TELEGRAM_API}/createInvoiceLink`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    const tgData = await tgResp.json();

    if (!tgResp.ok || !tgData?.ok || !tgData?.result) {
      console.error("TG error:", tgData);
      return res.status(500).json({ error: tgData?.description || "Telegram API error" });
    }

    return res.json({ invoice_link: tgData.result });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

// ---- health ----
app.get("/", (_, res) => res.send("OK"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server on http://localhost:${PORT}`));
