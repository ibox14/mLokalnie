// xml.js – generator formularzy XML dla systemu mLokalnie
// Wykorzystuje bibliotekę "xmlbuilder" (npm install xmlbuilder)

const { create } = require('xmlbuilder');

// Mała funkcja pomocnicza, żeby null/undefined zamieniać na pusty string
function safe(value) {
  return (value ?? '').toString();
}

/**
 * ZGŁOSZENIE PROBLEMU
 *
 * Wejście (dane):
 *  - tytul           : string
 *  - imie            : string | 'Anonimowe' (dla zgłoszeń anonimowych)
 *  - nazwisko        : string
 *  - email           : string
 *  - kategoria       : string
 *  - opis            : string
 *  - lokalizacja     : string
 *  - dataZgloszenia  : string | Date (ISO) – jeśli brak, zostanie ustawiona aktualna data
 *
 * Wynik:
 *  <zgloszenie>
 *    <wnioskodawca>
 *      <imie>...</imie>
 *      <nazwisko>...</nazwisko>
 *      <email>...</email>
 *    </wnioskodawca>
 *    <tytul>...</tytul>
 *    <kategoria>...</kategoria>
 *    <opis>...</opis>
 *    <lokalizacja>...</lokalizacja>
 *    <dataZgloszenia>...</dataZgloszenia>
 *  </zgloszenie>
 */
function generujXMLZgloszenie(dane = {}) {
  const {
    tytul,
    imie,
    nazwisko,
    email,
    kategoria,
    opis,
    lokalizacja,
    dataZgloszenia,

    // NOWE POLA
    status,
    infoZwrotna,
    infoZwrotnaData,
    infoZwrotnaPrzez
  } = dane;

  const root = create('zgloszenie', { encoding: 'UTF-8' });

  // === WNIOSKODAWCA ===
  const w = root.ele('wnioskodawca');
  w.ele('imie').text(safe(imie));
  w.ele('nazwisko').text(safe(nazwisko));
  w.ele('email').text(safe(email));

  // === PODSTAWOWE DANE ZGŁOSZENIA ===
  root.ele('tytul').text(safe(tytul));
  root.ele('kategoria').text(safe(kategoria));
  root.ele('opis').text(safe(opis));
  root.ele('lokalizacja').text(safe(lokalizacja));

  // === STATUS ===
  root.ele('status').text(safe(status));

  // === DATA ZGŁOSZENIA ===
  const dataIso = dataZgloszenia
    ? new Date(dataZgloszenia).toISOString()
    : new Date().toISOString();

  root.ele('dataZgloszenia').text(dataIso);

  // === INFORMACJA ZWROTNA Z URZĘDU ===
  const feedback = root.ele('informacjaZwrotna');
  feedback.ele('tresc').text(safe(infoZwrotna));
  feedback.ele('data').text(safe(infoZwrotnaData));
  feedback.ele('przez').text(safe(infoZwrotnaPrzez));

  return root.end({ pretty: true });
}

/**
 * DEKLARACJA ODPADY
 *
 * Ten formularz jest przykładem drugiego typu dokumentu XML,
 * który system mógłby obsługiwać (do wykorzystania w pracy inżynierskiej
 * jako przykład rozszerzalności).
 */
function generujXMLDeklaracjaOdpady(dane = {}) {
  const {
    imie,
    nazwisko,
    pesel,
    adresZamieszkania,
    adresNieruchomosci,
    liczbaOsob,
    kompostowanie,
    sposobZbierania,
    dataZlozenia
  } = dane;

  const root = create('deklaracjaOdpady', { encoding: 'UTF-8' });

  const w = root.ele('wnioskodawca');
  w.ele('imie').text(safe(imie));
  w.ele('nazwisko').text(safe(nazwisko));
  w.ele('pesel').text(safe(pesel));
  w.ele('adresZamieszkania').text(safe(adresZamieszkania));

  const n = root.ele('nieruchomosc');
  n.ele('adresNieruchomosci').text(safe(adresNieruchomosci));
  n.ele('liczbaOsob').text(String(liczbaOsob ?? ''));

  // kompostowanie zapisujemy jako "true"/"false"
  n.ele('kompostowanie').text(kompostowanie ? 'true' : 'false');

  root.ele('sposobZbierania').text(safe(sposobZbierania));

  const dataIso = dataZlozenia
    ? new Date(dataZlozenia).toISOString()
    : new Date().toISOString();

  root.ele('dataZlozenia').text(dataIso);

  return root.end({ pretty: true });
}

/**
 * WNIOSEK O ZAŚWIADCZENIE O NIEZALEGANIU
 *
 * Drugi przykład formularza XML – możesz go wykorzystać w części pracy
 * dotyczącej innych typów wniosków.
 */
function generujXMLWniosekZaswiadczenie(dane = {}) {
  const {
    imie,
    nazwisko,
    pesel,
    adres,
    email,
    telefon,
    cel,
    sposobOdbioru,
    czyZaplacono,
    dataZlozenia
  } = dane;

  const root = create('wniosekZaswiadczenieNiezaleganie', { encoding: 'UTF-8' });

  const w = root.ele('wnioskodawca');
  w.ele('imie').text(safe(imie));
  w.ele('nazwisko').text(safe(nazwisko));
  w.ele('pesel').text(safe(pesel));
  w.ele('adres').text(safe(adres));
  w.ele('email').text(safe(email));
  w.ele('telefon').text(safe(telefon));

  const zak = root.ele('zakres');
  zak.ele('cel').text(safe(cel));

  const odb = root.ele('odbior');
  odb.ele('sposob').text(safe(sposobOdbioru));

  const opl = root.ele('oplataSkarbowa');
  opl.ele('czyZaplacono').text(czyZaplacono ? 'true' : 'false');

  const dataIso = dataZlozenia
    ? new Date(dataZlozenia).toISOString()
    : new Date().toISOString();

  root.ele('dataZlozenia').text(dataIso);

  return root.end({ pretty: true });
}

module.exports = {
  generujXMLZgloszenie,
  generujXMLDeklaracjaOdpady,
  generujXMLWniosekZaswiadczenie
};
