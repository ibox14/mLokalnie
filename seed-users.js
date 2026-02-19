const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

(async () => {
  const db = await mysql.createConnection({
    host: '127.0.0.1',     // lepiej niż "localhost" (czasem próbuje ::1)
    user: 'root',
    password: '',
    database: 'mLokalnie',
    port: 3306
  });

  const users = [
    {
      login: 'admin',
      pass: 'admin123',
      typ_konta: 'ADMIN',
      imie: 'Admin',
      nazwisko: 'Systemu',
      email: 'admin@mlokalnie.local'
    },
    {
      login: 'urz1',
      pass: 'urz1pass',
      typ_konta: 'URZEDNIK',
      imie: 'Jan',
      nazwisko: 'Urzędnik',
      email: 'urz1@mlokalnie.local'
    },
    {
      login: 'miesz1',
      pass: 'miesz1pass',
      typ_konta: 'MIESZKANIEC',
      imie: 'Adam',
      nazwisko: 'Mieszkaniec',
      email: 'miesz1@mlokalnie.local'
    }
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.pass, 10);

    // idempotentnie: jak login już jest -> aktualizujemy hasło/rolę/dane
    await db.execute(
      `INSERT INTO users (login, haslo_hash, typ_konta, imie, nazwisko, email)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         haslo_hash = VALUES(haslo_hash),
         typ_konta = VALUES(typ_konta),
         imie = VALUES(imie),
         nazwisko = VALUES(nazwisko),
         email = VALUES(email)`,
      [u.login, hash, u.typ_konta, u.imie, u.nazwisko, u.email]
    );
  }

  console.log('✅ Seed users: OK');
  await db.end();
})().catch(err => {
  console.error('❌ Seed users error:', err);
  process.exit(1);
});
