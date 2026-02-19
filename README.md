# mLokalnie — System obsługi formularzy XML dla urzędów i mieszkańców

Politechnika Częstochowska  
Wydział Informatyki  
Praca inżynierska  
Rok akademicki: 2025/2026  

Autor: Sebastian Nowak  

---

## 📌 Opis projektu

mLokalnie to aplikacja webowa umożliwiająca obsługę zgłoszeń mieszkańców przez jednostki samorządowe (gminy/urzędy).  
System pozwala na składanie zgłoszeń, ich przetwarzanie przez urząd, zarządzanie statusem sprawy oraz generowanie i import danych w formacie XML.

Celem projektu było zaprojektowanie oraz implementacja kompletnego systemu umożliwiającego:

- komunikację mieszkaniec ↔ urząd,
- obsługę formularzy XML,
- kontrolę ról użytkowników,
- przetwarzanie zgłoszeń w sposób uporządkowany i bezpieczny.

---

## 🎯 Zakres funkcjonalny

### ✅ Funkcjonalności podstawowe

- Logowanie użytkownika (ADMIN / URZĘDNIK / MIESZKANIEC)
- Zarządzanie sesją użytkownika
- Dodawanie zgłoszeń przez mieszkańców
- Obsługa zgłoszeń przez urząd
- Zmiana statusu zgłoszenia (Nowe → W realizacji → Zakończone)
- Publikacja zgłoszenia
- Informacja zwrotna z urzędu
- Eksport zgłoszenia do formatu XML
- Import danych z pliku XML do formularza
- Filtrowanie i sortowanie zgłoszeń
- Walidacja danych formularza

---

### 🛡 Uprawnienia ról

**Mieszkaniec**
- Dodawanie zgłoszeń
- Przegląd własnych/publicznych zgłoszeń

**Urzędnik**
- Zmiana statusu
- Publikacja zgłoszenia
- Dodawanie informacji zwrotnej

**Administrator**
- Pełne uprawnienia
- Usuwanie zgłoszeń

---

## 🏗 Architektura systemu

Projekt oparty jest na architekturze klient-serwer:

### Backend
- Node.js
- Express.js
- SQLite (baza danych)
- express-session (zarządzanie sesją)
- bcrypt (hashowanie haseł)

### Frontend
- HTML5
- CSS3 (własny system komponentów UI)
- JavaScript (Vanilla JS)

### Struktura projektu

mLokalnie/
│
├── public/ # Frontend (HTML, CSS, JS, zasoby)
├── server.js # Konfiguracja serwera Express
├── db.js # Konfiguracja bazy danych
├── xml.js # Obsługa generowania XML
├── seed-users.js # Skrypt tworzący użytkowników testowych
├── package.json
└── .gitignore


---

## 🗄 Baza danych

System wykorzystuje relacyjną bazę danych SQLite.

Główne encje:
- users
- zgloszenia

Dane obejmują m.in.:
- tytuł zgłoszenia
- opis
- kategorię
- lokalizację
- status
- informację zwrotną
- autora zgłoszenia

---

## 📄 Obsługa XML

System umożliwia:

- generowanie pliku XML dla konkretnego zgłoszenia
- import danych XML do formularza
- walidację podstawowych pól podczas przetwarzania

Format XML zawiera:
- dane zgłoszenia
- status
- informacje techniczne
- informację zwrotną z urzędu

---

## ⚙ Instalacja i uruchomienie lokalne

1. Sklonuj repozytorium: git clone https://github.com/ibox14/mLokalnie.git
2. Przejdź do folderu projektu: cd mLokalnie
3. Zainstaluj zależności: npm install
4. Uruchom serwer: node server.js
5. Otwórz w przeglądarce: http://localhost:3000



---

## 👤 Konta testowe

ADMIN  
login: admin  
hasło: admin123  

URZĘDNIK  
login: urz1  
hasło: urz1pass  

MIESZKANIEC  
login: miesz1  
hasło: miesz1pass  

---

## 🔐 Bezpieczeństwo

- Hasła przechowywane są w postaci zahashowanej (bcrypt)
- Kontrola dostępu oparta na rolach
- Walidacja danych wejściowych po stronie frontend i backend
- Ochrona operacji wrażliwych (usuwanie, zmiana statusu)

---

## 📱 Wymagania niefunkcjonalne

- Responsywność interfejsu
- Czas odpowiedzi API poniżej 2 sekund przy standardowym obciążeniu
- Separacja logiki backendu i warstwy prezentacji
- Możliwość dalszej rozbudowy systemu

---

## 📌 Status projektu

Wersja 1.0 – stabilna wersja funkcjonalna przygotowana na potrzeby pracy inżynierskiej.

---

## 📬 Kontakt

Autor: Sebastian Nowak  
Politechnika Częstochowska  





