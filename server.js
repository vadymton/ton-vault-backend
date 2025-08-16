const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для JSON
app.use(express.json());

// Тестовий маршрут
app.get("/", (req, res) => {
  res.send("TON Vault Backend працює 🚀");
});

// Старт сервера
app.listen(PORT, () => {
  console.log(`Сервер запущений на порту ${PORT}`);
});
