# mLokalnie — System obsługi formularzy XML dla urzędów i mieszkańców

Politechnika Częstochowska  
Wydział Informatyki  
Praca inżynierska  
Rok akademicki: 2025/2026  

Autor: Sebastian Nowak

---

## Opis projektu

mLokalnie to aplikacja webowa umożliwiająca obsługę zgłoszeń mieszkańców przez jednostki samorządu terytorialnego (np. gminy lub urzędy miejskie).  
System umożliwia mieszkańcom zgłaszanie problemów dotyczących infrastruktury lub usług publicznych, natomiast pracownikom urzędu pozwala na obsługę zgłoszeń, zmianę ich statusu oraz przekazywanie informacji zwrotnej.

Istotnym elementem projektu jest obsługa danych w formacie XML, która umożliwia eksport zgłoszeń oraz import danych do formularza zgłoszeniowego.

Celem projektu było zaprojektowanie oraz implementacja systemu umożliwiającego:

- komunikację pomiędzy mieszkańcami a urzędem,
- obsługę formularzy XML,
- kontrolę dostępu użytkowników na podstawie ról,
- zarządzanie zgłoszeniami w uporządkowany sposób.

---

## Zakres funkcjonalny

### Funkcjonalności podstawowe

- logowanie użytkownika (Administrator / Urzędnik / Mieszkaniec)
- zarządzanie sesją użytkownika
- dodawanie zgłoszeń przez mieszkańców
- obsługa zgłoszeń przez pracowników urzędu
- zmiana statusu zgłoszenia (Nowe → W realizacji → Zakończone)
- publikacja zgłoszenia
- dodawanie informacji zwrotnej przez urząd
- eksport zgłoszenia do formatu XML
- import danych XML do formularza zgłoszeniowego
- filtrowanie oraz sortowanie zgłoszeń
- walidacja danych formularza

---

## Role użytkowników

### Mieszkaniec
- dodawanie zgłoszeń
- przegląd własnych zgłoszeń
- przegląd opublikowanych zgłoszeń

### Urzędnik
- przegląd wszystkich zgłoszeń
- zmiana statusu zgłoszenia
- publikacja zgłoszenia
- dodawanie informacji zwrotnej

### Administrator
- pełne uprawnienia administracyjne
- usuwanie zgłoszeń
- zarządzanie systemem

---

## Architektura systemu

System został zaprojektowany w architekturze klient–serwer.

### Backend
Technologie wykorzystane w warstwie serwera:

- Node.js
- Express.js
- SQLite (relacyjna baza danych)
- express-session (zarządzanie sesją użytkownika)
- bcrypt (hashowanie haseł)

Backend odpowiada za obsługę logiki aplikacji, komunikację z bazą danych oraz udostępnianie interfejsu API.

### Frontend

Warstwa interfejsu użytkownika została zrealizowana przy użyciu:

- HTML5
- CSS3
- JavaScript (Vanilla JS)

Frontend odpowiada za prezentację danych oraz komunikację z backendem za pomocą zapytań HTTP.

---

## Struktura projektu

```
mLokalnie/
├── backend/
│   ├── public/            # Frontend (HTML, CSS, JavaScript)
│   ├── server.js          # Konfiguracja serwera Express
│   ├── db.js              # Konfiguracja bazy danych
│   ├── xml.js             # Obsługa XML
│   ├── seed-users.js      # Dane testowe
│   ├── package.json
│   └── formularze.db
│
├── docs/                  # Zrzuty ekranu i diagramy
└── .gitignore
```

## Baza danych

System wykorzystuje relacyjną bazę danych SQLite.

Główne tabele systemu:

- users
- wiadomosci
- zgloszenia

Dane zgłoszenia obejmują m.in.:

- tytuł zgłoszenia
- kategorię
- opis problemu
- lokalizację
- status zgłoszenia
- informację zwrotną z urzędu
- autora zgłoszenia

---

## Obsługa XML

System umożliwia:

- generowanie pliku XML dla wybranego zgłoszenia
- import danych XML do formularza zgłoszeniowego
- podstawową walidację danych podczas przetwarzania

Format XML zawiera informacje dotyczące zgłoszenia, jego statusu oraz ewentualnej informacji zwrotnej z urzędu.

---

## Instalacja i uruchomienie

1. Sklonuj repozytorium:
git clone https://github.com/ibox14/mLokalnie.git

2. Przejdź do katalogu projektu:
cd mLokalnie

3. Zainstaluj zależności:
npm install

4. Uruchom serwer:
node server.js

5. Otwórz aplikację w przeglądarce:
http://localhost:3000


---

## Konta testowe

Administrator  
login: admin  
hasło: admin123  

Urzędnik  
login: urz1  
hasło: urz1pass  

Mieszkaniec  
login: miesz1  
hasło: miesz1pass  

---

## Bezpieczeństwo

W systemie zastosowano podstawowe mechanizmy bezpieczeństwa:

- hasła przechowywane w postaci zahashowanej (bcrypt)
- kontrola dostępu oparta na rolach użytkowników
- walidacja danych wejściowych po stronie frontend i backend
- ograniczenie dostępu do operacji administracyjnych

---

## Status projektu

Wersja 1.0 – stabilna wersja funkcjonalna przygotowana na potrzeby pracy inżynierskiej.

---

## Autor

Sebastian Nowak  
Politechnika Częstochowska  
2026
