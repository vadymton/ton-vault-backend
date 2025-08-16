import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

// ==== ENV ====
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ Missing BOT_TOKEN env");
  process.exit(1); // зупиняємо, щоб у логах було видно причину
}
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ==== HEALTH ====
app.get("/", (_, res) => res.status(200).send("OK"));

// ==== VALIDATION (Telegram WebApp initData) ====
function validateInitData(initData) {
  try {
    if (!initData) return false;
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return false;
    params.delete("hash");

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = crypto.createHash("sha256").update(BOT_TOKEN).digest();
    const hmac = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    return hmac === hash;
  } catch {
    return false;
  }
}

// ==== CREATE STARS INVOICE ====
app.post("/api/create-stars-invoice", async (req, res) => {
  try {
    const { initData, sku = "item", amount } = req.body || {};

    // 1) validate initData
    if (!validateInitData(initData)) {
      return res.status(400).json({ error: "initData invalid" });
    }

    // 2) validate amount
    const amt = Number.parseInt(amount, 10);
    if (!Number.isInteger(amt) || amt <= 0) {
      return res.status(400).json({ error: "amount must be positive integer (XTR)" });
    }

    // 3) call Telegram createInvoiceLink
    const payload = {
      title: `Purchase: ${sku}`,
      description: `TON Vault Clicker — ${sku}`,
      currency: "XTR",                       // Stars = XTR
      prices: [{ label: sku, amount: amt }]  // ціна в цілих XTR
    };

    const tgResp = await fetch(`${TG_API}/createInvoiceLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

// ==== START ====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});
