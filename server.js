// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./database");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// GET - pobierz wszystkie zgłoszenia
app.get("/api/zgloszenia", (req, res) => {
  db.all("SELECT * FROM zgloszenia ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// POST - dodaj nowe zgłoszenie
app.post("/api/zgloszenia", (req, res) => {
  const { tytul, opis, kategoria } = req.body;
  if (!tytul) {
    return res.status(400).json({ error: "Brak tytułu zgłoszenia" });
  }

  const sql = "INSERT INTO zgloszenia (tytul, opis, kategoria) VALUES (?, ?, ?)";
  db.run(sql, [tytul, opis || "", kategoria || ""], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({
      id: this.lastID,
      tytul,
      opis,
      kategoria,
      status: "Nowe",
    });
  });
});

// PATCH - zmiana statusu zgłoszenia
app.patch("/api/zgloszenia/:id", (req, res) => {
  const { status } = req.body;
  const id = req.params.id;
  db.run("UPDATE zgloszenia SET status=? WHERE id=?", [status, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

// DELETE - usuń zgłoszenie
app.delete("/api/zgloszenia/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM zgloszenia WHERE id=?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Start serwera
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Serwer działa na http://localhost:${PORT}`);
});
