const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// корінь — щоб у браузері було що побачити
app.get("/", (req, res) => {
  res.type("text").send("✅ TON Vault Backend працює");
});

// простий health-check
app.get("/ping", (req, res) => {
  res.type("text").send("pong");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
