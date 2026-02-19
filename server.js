// server.js – backend mLokalnie (Node.js + Express + MySQL)

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const { generujXMLZgloszenie } = require('./xml');


// === KONFIGURACJA BAZY DANYCH ===
// Upewnij się, że:
// - MySQL działa (XAMPP / inny)
// - istnieje baza: mLokalnie
// - użytkownik i hasło są poprawne
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'mLokalnie'
});


// === KONFIGURACJA APLIKACJI EXPRESS ===
const app = express();
const PORT = 3000;

// Middleware CORS (dla frontu pod http://localhost:3000)
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Parsowanie JSON
app.use(express.json());

// Sesje (proste sesje w pamięci – wystarczające do wersji demo)
app.use(session({
  secret: 'mlokalnie_tajny_klucz', // możesz zmienić na inny losowy string
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,           // przy http musi być false
    maxAge: 1000 * 60 * 60   // 1 godzina
  }
}));

// statyczny frontend (index.html, css, js) z katalogu /public
app.use(express.static(path.join(__dirname, 'public')));


// === PROSTE MIDDLEWARE DO UPOWNIENIEŃ (ADMIN / URZĘDNIK) ===

// Sprawdza, czy ktoś jest zalogowany (dowolne konto)
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Wymagane logowanie' });
  }
  next();
}

// Sprawdza, czy zalogowany użytkownik to ADMIN lub URZĘDNIK
// – używane np. przy zmianie statusu zgłoszenia
function requireStaff(req, res, next) {
  const u = req.session.user;
  if (!u || (u.typ_konta !== 'ADMIN' && u.typ_konta !== 'URZEDNIK')) {
    return res.status(403).json({ error: 'Brak uprawnień (wymagany urzędnik lub administrator)' });
  }
  next();
}

// Sprawdza, czy zalogowany użytkownik to ADMIN
// – używane np. przy usuwaniu zgłoszenia
function requireAdmin(req, res, next) {
  const u = req.session.user;
  if (!u || u.typ_konta !== 'ADMIN') {
    return res.status(403).json({ error: 'Brak uprawnień administratora' });
  }
  next();
}


// === ENDPOINTY API ===

// 1. Health-check – żeby sprawdzić, czy serwer żyje
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'API mLokalnie działa' });
});

// 2. Pobranie użytkowników (na razie tylko do testów / podglądu)
// UWAGA: na produkcji nie wysyła się hasło_hash do frontu.
app.get('/api/users', (req, res) => {
  db.query(
    'SELECT id, login, typ_konta, imie, nazwisko, email, data_utworzenia FROM users',
    (err, rows) => {
      if (err) {
        console.error('Błąd zapytania users:', err);
        return res.status(500).json({ error: 'Błąd bazy danych' });
      }
      res.json(rows);
    }
  );
});

// 3. Pobranie zgłoszeń (publiczne / moje / wszystkie)
app.get('/api/zgloszenia', (req, res) => {
  const u = req.session?.user || null;

  // ✅ warunki widoczności
  // - gość: tylko opublikowane
  // - mieszkaniec: swoje (nawet nieopublikowane) + opublikowane innych
  // - urzędnik/admin: wszystko
  let where = 'WHERE z.opublikowane = 1';
  let params = [];

  const isStaff = u && (u.typ_konta === 'ADMIN' || u.typ_konta === 'URZEDNIK');
  const isCitizen = u && u.typ_konta === 'MIESZKANIEC';

  if (isStaff) {
    where = ''; // wszystko
  } else if (isCitizen) {
    where = 'WHERE (z.opublikowane = 1 OR z.id_uzytkownika = ?)';
    params = [u.id];
  }

  const sql = `
    SELECT z.id, z.tytul, z.kategoria, z.opis, z.lokalizacja, z.status,
           z.anonimowe, z.opublikowane, z.data_utworzenia,
           z.info_zwrotna, z.info_zwrotna_data, z.info_zwrotna_przez
    FROM zgloszenia z
    ${where}
    ORDER BY z.id DESC
  `;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('Błąd zapytania zgloszenia:', err);
      return res.status(500).json({ error: 'Błąd bazy danych' });
    }
    res.json(rows);
  });
});


// 4. Dodanie nowego zgłoszenia
// - jeśli "anonimowe" = true → id_uzytkownika = NULL
// - jeśli "anonimowe" = false i podano userId → przypisujemy do userId
app.post('/api/zgloszenia', (req, res) => {

  // 🔒 1. Wymagane logowanie
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      error: 'Aby dodać zgłoszenie, musisz być zalogowany.'
    });
  }

  const { tytul, kategoria, opis, lokalizacja, anonimowe } = req.body;

  if (!tytul || !opis) {
    return res.status(400).json({ error: 'Brakuje tytułu lub opisu' });
  }

  const isAnon = anonimowe ? 1 : 0;

  // 🔐 użytkownik zawsze z sesji (nie z req.body!)
  const idUzytkownika = isAnon ? null : req.session.user.id;

  const lok = lokalizacja || null;

  const sql = `
    INSERT INTO zgloszenia (id_uzytkownika, tytul, kategoria, opis, lokalizacja, status, anonimowe, opublikowane)
    VALUES (?, ?, ?, ?, ?, 'Nowe', ?, 0)
  `;



 db.query(
  sql,
  [idUzytkownika, tytul, kategoria || null, opis, lok, isAnon],
  (err, result) => {
    if (err) {
      console.error('Błąd zapisu zgłoszenia:', err);
      return res.status(500).json({ error: 'Błąd bazy danych przy zapisie zgłoszenia' });
    }


    res.status(201).json({
      ok: true,
      id: result.insertId,
      message: 'Zgłoszenie zapisane w bazie'
    });
  });
});

// 4.5. Eksport pojedynczego zgłoszenia do XML
app.get('/api/zgloszenia/:id/xml', (req, res) => {
  const id = req.params.id;

    const sql = `
  SELECT z.id, z.tytul, z.kategoria, z.opis, z.lokalizacja, z.anonimowe, z.data_utworzenia,
         z.status, z.info_zwrotna, z.info_zwrotna_data, z.info_zwrotna_przez,
         u.imie, u.nazwisko, u.email
  FROM zgloszenia z
  LEFT JOIN users u ON u.id = z.id_uzytkownika
  WHERE z.id = ?
  LIMIT 1
`;


  db.query(sql, [id], (err, rows) => {
    if (err) {
      console.error('Błąd pobrania zgłoszenia do XML:', err);
      return res.status(500).send('Błąd bazy danych');
    }
    if (!rows || rows.length === 0) {
      return res.status(404).send('Nie znaleziono zgłoszenia');
    }

    const row = rows[0];
    const isAnon = !!row.anonimowe;

    // przygotuj dane do generatora XML
const dane = {
  tytul: row.tytul,
  imie: isAnon ? 'Anonimowe' : (row.imie || ''),
  nazwisko: isAnon ? '' : (row.nazwisko || ''),
  email: isAnon ? '' : (row.email || ''),
  kategoria: row.kategoria || '',
  opis: row.opis || '',
  lokalizacja: row.lokalizacja || '',
  dataZgloszenia: row.data_utworzenia
    ? new Date(row.data_utworzenia).toISOString()
    : new Date().toISOString(),

  // NOWE: status + informacja zwrotna w XML
  status: row.status || '',
  infoZwrotna: row.info_zwrotna || '',
  infoZwrotnaData: row.info_zwrotna_data
    ? new Date(row.info_zwrotna_data).toISOString()
    : '',
  infoZwrotnaPrzez: row.info_zwrotna_przez || ''
};

    const xml = generujXMLZgloszenie(dane);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="zgloszenie_${row.id}.xml"`);
    res.send(xml);
  });
});


// 5. Zmiana statusu / publikacji zgłoszenia
// WYMAGANE: ADMIN lub URZĘDNIK (requireStaff)
app.patch('/api/zgloszenia/:id', requireStaff, (req, res) => {
  const id = req.params.id;
  const { status, opublikowane, info_zwrotna } = req.body;


  const fields = [];
  const params = [];

  if (status) {
    fields.push('status = ?');
    params.push(status); // np. 'Nowe', 'W_realizacji', 'Zakonczone'
  }
  if (typeof opublikowane !== 'undefined') {
    fields.push('opublikowane = ?');
    params.push(opublikowane ? 1 : 0);
  }

    if (typeof info_zwrotna !== 'undefined') {
    const text = String(info_zwrotna || '').trim();

    // minimalna walidacja (żeby nie było pustych "odpowiedzi")
    if (text.length > 0 && text.length < 10) {
      return res.status(400).json({ error: 'Informacja zwrotna musi mieć co najmniej 10 znaków.' });
    }

    fields.push('info_zwrotna = ?');
    params.push(text.length ? text : null);

    fields.push('info_zwrotna_data = NOW()');
    fields.push('info_zwrotna_przez = ?');
    params.push(req.session.user?.login || 'urzad');
  }


  if (fields.length === 0) {
    return res.status(400).json({ error: 'Brak pól do aktualizacji' });
  }

  params.push(id);

  const sql = `UPDATE zgloszenia SET ${fields.join(', ')} WHERE id = ?`;

  db.query(sql, params, (err) => {
    if (err) {
      console.error('Błąd aktualizacji zgłoszenia:', err);
      return res.status(500).json({ error: 'Błąd bazy danych przy aktualizacji zgłoszenia' });
    }
    res.json({ ok: true });
  });
});

// 6. Usunięcie zgłoszenia
// WYMAGANY: ADMIN (requireAdmin)
app.delete('/api/zgloszenia/:id', requireAdmin, (req, res) => {
  const id = req.params.id;

  db.query('DELETE FROM zgloszenia WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('Błąd usuwania zgłoszenia:', err);
      return res.status(500).json({ error: 'Błąd bazy danych przy usuwaniu zgłoszenia' });
    }
    res.json({ ok: true });
  });
});


// === AUTH: logowanie / wylogowanie / info o aktualnym użytkowniku ===

// POST /api/login – logowanie użytkownika
app.post('/api/login', (req, res) => {
  const { login, haslo } = req.body || {};

  if (!login || !haslo) {
    return res.status(400).json({ error: 'Podaj login i hasło' });
  }

  db.query('SELECT * FROM users WHERE login = ?', [login], async (err, rows) => {
    if (err) {
      console.error('Błąd bazy przy logowaniu:', err);
      return res.status(500).json({ error: 'Błąd bazy danych' });
    }

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Nieprawidłowy login lub hasło' });
    }

    const user = rows[0];

    try {
      const ok = await bcrypt.compare(haslo, user.haslo_hash);
      if (!ok) {
        return res.status(401).json({ error: 'Nieprawidłowy login lub hasło' });
      }

      // zapisujemy minimalne info o użytkowniku w sesji
      req.session.user = {
        id: user.id,
        login: user.login,
        typ_konta: user.typ_konta,
        imie: user.imie,
        nazwisko: user.nazwisko,
        email: user.email
      };

      return res.json({
        ok: true,
        user: req.session.user
      });

    } catch (e) {
      console.error('Błąd przy porównywaniu hasła:', e);
      return res.status(500).json({ error: 'Błąd serwera przy logowaniu' });
    }
  });
});

// POST /api/logout – wylogowanie użytkownika
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Błąd przy wylogowaniu:', err);
      return res.status(500).json({ error: 'Błąd przy wylogowaniu' });
    }
    res.clearCookie('connect.sid');
    return res.json({ ok: true });
  });
});

// GET /api/me – zwraca aktualnie zalogowanego użytkownika
app.get('/api/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ loggedIn: true, user: req.session.user });
  }
  return res.json({ loggedIn: false, user: null });
});


// Start serwera
app.listen(PORT, () => {
  console.log(`🚀 API mLokalnie nasłuchuje na http://localhost:${PORT}`);
});
