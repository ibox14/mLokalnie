// database.js
const sqlite3 = require('sqlite3').verbose();

// Tworzymy lub otwieramy plik bazy danych
const db = new sqlite3.Database('./mlokalnie.db', (err) => {
  if (err) {
    console.error("❌ Błąd połączenia z bazą danych:", err.message);
  } else {
    console.log("✅ Połączono z bazą SQLite (mlokalnie.db)");
  }
});

// Tworzymy tabelę 'zgloszenia', jeśli nie istnieje
db.run(`CREATE TABLE IF NOT EXISTS zgloszenia (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tytul TEXT NOT NULL,
  opis TEXT,
  kategoria TEXT,
  status TEXT DEFAULT 'Nowe',
  data_utworzenia TEXT DEFAULT CURRENT_TIMESTAMP
)`);

module.exports = db;
