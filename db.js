// backend/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'formularze.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // JUŻ MASZ:
  db.run(`
    CREATE TABLE IF NOT EXISTS zgloszenia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      imie TEXT NOT NULL,
      nazwisko TEXT NOT NULL,
      email TEXT,
      kategoria TEXT NOT NULL,
      opis TEXT NOT NULL,
      lokalizacja TEXT,
      dataZgloszenia TEXT NOT NULL,
      xml TEXT NOT NULL
    )
  `);

  // NOWE: deklaracje śmieciowe
  db.run(`
    CREATE TABLE IF NOT EXISTS deklaracje_odpady (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      imie TEXT NOT NULL,
      nazwisko TEXT NOT NULL,
      pesel TEXT NOT NULL,
      adresZamieszkania TEXT NOT NULL,
      adresNieruchomosci TEXT NOT NULL,
      liczbaOsob INTEGER NOT NULL,
      kompostowanie INTEGER NOT NULL, -- 0/1
      sposobZbierania TEXT NOT NULL,
      dataZlozenia TEXT NOT NULL,
      xml TEXT NOT NULL
    )
  `);

  // NOWE: wnioski o zaświadczenie
  db.run(`
    CREATE TABLE IF NOT EXISTS wnioski_zaswiadczenie (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      imie TEXT NOT NULL,
      nazwisko TEXT NOT NULL,
      pesel TEXT NOT NULL,
      adres TEXT NOT NULL,
      email TEXT,
      telefon TEXT,
      cel TEXT NOT NULL,
      sposobOdbioru TEXT NOT NULL,
      czyZaplacono INTEGER NOT NULL, -- 0/1
      dataZlozenia TEXT NOT NULL,
      xml TEXT NOT NULL
    )
  `);
});

module.exports = db;
