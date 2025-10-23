// Minimal demo interactions and localStorage persistence
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));

// Zgłoszenia page logic
function initZgloszenia() {
  const API = "http://localhost:3000/api/zgloszenia";
  const listKey = "mlokalnie_tickets";
  const form = $("#ticket-form");
  const listEl = $("#tickets-list");

  const readLocal = () => JSON.parse(localStorage.getItem(listKey) || "[]");
  const writeLocal = (v) => localStorage.setItem(listKey, JSON.stringify(v));

  let useBackend = false;

  // próba wykrycia backendu
  async function checkBackend() {
    try {
      const res = await fetch(API);
      if (res.ok) useBackend = true;
    } catch {
      useBackend = false;
    }
  }

  async function getTickets() {
    if (useBackend) {
      const res = await fetch(API);
      return await res.json();
    } else return readLocal();
  }

  async function addTicket(obj) {
    if (useBackend) {
      await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tytul: obj.title }),
      });
    } else {
      const items = readLocal();
      items.unshift(obj);
      writeLocal(items);
    }
  }

  function advanceStatus(s) {
    if (s === "Nowe") return "W realizacji";
    if (s === "W realizacji") return "Zakończone";
    return "Zakończone";
  }

  async function render() {
    listEl.innerHTML = "";
    const items = await getTickets();
    if (!items || items.length === 0) {
      listEl.innerHTML =
        "<li style='padding:12px 0;color:#64748b'>Brak zgłoszeń. Dodaj pierwsze.</li>";
      return;
    }
    items.forEach((it) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div>
          <div style="font-weight:600">${it.title || it.tytul}</div>
          <div class="kicker">${it.desc || it.opis || '—'}</div>
        </div>
        <div class="actions-row">
          <span class="badge ${
            it.status === "Zakończone"
              ? "success"
              : it.status === "W realizacji"
              ? "warn"
              : "neutral"
          }">${it.status || "Nowe"}</span>
        </div>`;
      li.dataset.id = it.id;
      listEl.appendChild(li);
    });
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = $("#t-title").value.trim();
    const desc = $("#t-desc").value.trim();
    const cat = $("#t-cat").value;
    if (!title) {
      alert("Wpisz tytuł zgłoszenia");
      return;
    }

    const obj = {
      id: Date.now(),
      title: `${title} (${cat})`,
      desc,
      status: "Nowe",
    };

    await addTicket(obj);
    form.reset();
    render();
  });

  // seed demo items if empty (local only)
  if (readLocal().length === 0) {
    writeLocal([
      {
        id: 1,
        title: "Uszkodzony chodnik przy ul. Lipowej (Infrastruktura)",
        desc: "Płyty chodnikowe zapadnięte",
        status: "W realizacji",
      },
      {
        id: 2,
        title: "Brak oświetlenia – os. Słoneczne (Oświetlenie)",
        desc: "Latarnie 12–18 nie świecą",
        status: "Nowe",
      },
      {
        id: 3,
        title: "Przepełnione kosze przy parku (Czystość)",
        desc: "Kosze przy wejściu A",
        status: "Zakończone",
      },
    ]);
  }

  checkBackend().then(render);
}

// Komunikacja page logic
function initKomunikacja() {
  const key = 'mlokalnie_msgs';
  const read = () => JSON.parse(localStorage.getItem(key) || '[]');
  const write = (v) => localStorage.setItem(key, JSON.stringify(v));
  const list = $('#msg-list');
  const input = $('#msg-input');

  function render() {
    list.innerHTML = '';
    const msgs = read();
    if (msgs.length === 0) {
      list.innerHTML = '<li style="padding:12px 0;color:#64748b">Brak wiadomości.</li>';
      return;
    }
    msgs.forEach(m => {
      const li = document.createElement('li');
      li.innerHTML = `<div><div style="font-weight:600">${m.from} • <span class="kicker">${m.date}</span></div><div>${m.text}</div></div>`;
      list.appendChild(li);
    });
  }

  $('#msg-send')?.addEventListener('click', () => {
    const t = input.value.trim(); if (!t) return;
    const msgs = read();
    msgs.unshift({ from: 'Mieszkaniec', date: new Date().toLocaleDateString('pl-PL'), text: t });
    write(msgs);
    input.value = '';
    render();
  });

  if (read().length === 0) {
    write([
      { from: 'Urząd', date: '01.06.2025', text: 'Przerwa w dostawie wody 10.06 w godz. 10–14.' },
      { from: 'Mieszkaniec', date: '02.06.2025', text: 'Kiedy planowana naprawa chodnika na Lipowej?' }
    ]);
  }
  render();
}

// Dokumenty page
function initDokumenty() {
  const list = $('#docs-list');
  const docs = [
    { name: 'Regulamin gospodarki odpadami.pdf', date: '10.12.2024' },
    { name: 'Plan zagospodarowania – rejon północny.pdf', date: '09.05.2023' },
    { name: 'Taryfa za wodę 2025.pdf', date: '14.03.2025' }
  ];
  docs.forEach(d => {
    const li = document.createElement('li');
    li.innerHTML = `<div><div style="font-weight:600">${d.name}</div><div class="kicker">Data: ${d.date}</div></div>
                    <a class="btn btn-ghost" href="#">Pobierz</a>`;
    list.appendChild(li);
  });
}

// Simple router init based on body data-page attr
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'zgloszenia') initZgloszenia();
  if (page === 'komunikacja') initKomunikacja();
  if (page === 'dokumenty') initDokumenty();
});
