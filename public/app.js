// ---------- Helpers, router & role ----------
const API_ZGLOSZENIA = "/api/zgloszenia";
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

let currentRole = 'mieszkaniec'; // lub 'urzednik'
let currentUser = null;          // dane użytkownika z backendu (po zalogowaniu)
let currentModalTicketId = null;

// pozwala initAuth / initLoginUI odświeżać zgłoszenia po zalogowaniu
let loadTickets = null;

function mapTypKontaToRole(typ) {
  if (typ === 'ADMIN') return 'urzednik';
  if (typ === 'URZEDNIK') return 'urzednik';
  if (typ === 'MIESZKANIEC') return 'mieszkaniec';
  return 'mieszkaniec';
}

function roleLabelText(role) {
  if (role === 'urzednik') return 'Urzędnik';
  if (role === 'mieszkaniec') return 'Mieszkaniec';
  return 'Gość (niezalogowano)';
}

// Aktualizacja headera (status logowania + rola)
function applyAuthUI() {
  const userLabel = $('#auth-user-label');
  const roleLabel = $('#auth-role-label');
  const homeRoleLabel = $('#home-role-label');
  const btnLogin = $('#btn-login-open');
  const btnLogout = $('#btn-logout');

  if (!currentUser) {
    if (userLabel) userLabel.textContent = 'Niezalogowano';
    if (roleLabel) roleLabel.textContent = 'Gość';
    if (homeRoleLabel) homeRoleLabel.textContent = roleLabelText('guest');
    if (btnLogin) btnLogin.style.display = 'inline-flex';
    if (btnLogout) btnLogout.style.display = 'none';
    return;
  }

  const name = currentUser.imie || currentUser.login || 'Użytkownik';
  const rolaTxt = roleLabelText(currentRole);

  if (userLabel) userLabel.textContent = name;
  if (roleLabel) roleLabel.textContent = rolaTxt;
  if (homeRoleLabel) homeRoleLabel.textContent = rolaTxt;
  if (btnLogin) btnLogin.style.display = 'none';
  if (btnLogout) btnLogout.style.display = 'inline-flex';
}
function initAccessibilityWidget() {
  const toggleBtn = document.getElementById('access-toggle');
  const panel = document.getElementById('access-panel');
  if (!toggleBtn || !panel) return;

  // odczyt ustawień z localStorage
  let fontScale = parseFloat(localStorage.getItem('ml_font_scale') || '1');
  let highContrast = localStorage.getItem('ml_high_contrast') === '1';

  applyFontScale(fontScale);
  if (highContrast) {
    document.body.classList.add('high-contrast');
  }

  toggleBtn.addEventListener('click', () => {
    const isHidden = panel.hasAttribute('hidden');
    if (isHidden) {
      panel.removeAttribute('hidden');
    } else {
      panel.setAttribute('hidden', '');
    }
  });

  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('.access-btn');
    if (!btn) return;

    const action = btn.dataset.action;
    switch (action) {
      case 'font-inc':
        fontScale = Math.min(1.4, fontScale + 0.1);
        applyFontScale(fontScale);
        localStorage.setItem('ml_font_scale', fontScale.toFixed(2));
        break;
      case 'font-dec':
        fontScale = Math.max(0.8, fontScale - 0.1);
        applyFontScale(fontScale);
        localStorage.setItem('ml_font_scale', fontScale.toFixed(2));
        break;
      case 'contrast':
        highContrast = !highContrast;
        document.body.classList.toggle('high-contrast', highContrast);
        localStorage.setItem('ml_high_contrast', highContrast ? '1' : '0');
        break;
      case 'reset':
        fontScale = 1;
        highContrast = false;
        applyFontScale(fontScale);
        document.body.classList.remove('high-contrast');
        localStorage.removeItem('ml_font_scale');
        localStorage.removeItem('ml_high_contrast');
        break;
    }
  });
}

function applyFontScale(scale) {
  document.documentElement.style.setProperty('--font-scale', scale.toString());
}

// sprawdzenie istniejącej sesji po stronie backendu
function initAuth() {
  fetch('/api/me', { credentials: 'include' })
    .then(r => r.json())
    .then(data => {
      if (data && data.user) {
        currentUser = data.user;
        currentRole = mapTypKontaToRole(currentUser.typ_konta);
      } else {
        currentUser = null;
        currentRole = 'mieszkaniec';
      }

      updateRoleUI();
      updateMessagePlaceholder();
      applyAuthUI();

      if (typeof window.applyGuestRules === 'function') {
        window.applyGuestRules();
      }
      if (typeof window.updateTicketsSectionTitle === 'function') {
        window.updateTicketsSectionTitle();
      }
      if (typeof window.updateMiniStatsVisibility === 'function') {
        window.updateMiniStatsVisibility();
      }

      if (typeof loadTickets === 'function') {
        try { loadTickets(); } catch (_) {}
      }
    })
    .catch(err => {
      console.error('Błąd /api/me:', err);

      currentUser = null;
      currentRole = 'mieszkaniec';

      updateRoleUI();
      updateMessagePlaceholder();
      applyAuthUI();

      if (typeof window.applyGuestRules === 'function') {
        window.applyGuestRules();
      }
      if (typeof window.updateTicketsSectionTitle === 'function') {
        window.updateTicketsSectionTitle();
      }
      if (typeof window.updateMiniStatsVisibility === 'function') {
        window.updateMiniStatsVisibility();
      }

      if (typeof loadTickets === 'function') {
        try { loadTickets(); } catch (_) {}
      }
    });
}



// obsługa formularza logowania i przycisków w headerze
function initLoginUI() {
  const form         = $('#login-form');
  const inputLogin   = $('#login-login');
  const inputHaslo   = $('#login-haslo');
  const errorBox     = $('#login-error');
  const btnCancel    = $('#login-cancel');
  const btnOpenLogin = $('#btn-login-open');
  const btnLogout    = $('#btn-logout');
  const btnSubmit    = $('#login-submit'); // NOWY przycisk

  function hideError() {
    if (errorBox) errorBox.style.display = 'none';
  }

  function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }

  // 🔥 jedyne miejsce, gdzie faktycznie wykonujemy logowanie
  function doLogin(e) {
    if (e) e.preventDefault();
    hideError();

    const login = inputLogin?.value?.trim() || '';
    const haslo = inputHaslo?.value || '';

    if (!login || !haslo) {
      showError('Podaj login i hasło.');
      return;
    }

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ login, haslo })
    })
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data.ok) {
          showError(data.error || 'Nieprawidłowy login lub hasło.');
          return;
        }

        currentUser = data.user;
        currentRole = mapTypKontaToRole(currentUser.typ_konta);

        updateRoleUI();
        updateMessagePlaceholder();
        applyAuthUI();
        if (typeof window.applyGuestRules === 'function') {
  window.applyGuestRules();
}
if (typeof window.updateTicketsSectionTitle === 'function') {
  window.updateTicketsSectionTitle();
}
if (typeof window.updateMiniStatsVisibility === 'function') {
  window.updateMiniStatsVisibility();
}


        if (form) form.reset();
        navigateTo('home');

        if (typeof loadTickets === 'function') {
          try { loadTickets(); } catch (_) {}
        }
      })
      .catch(err => {
        console.error('Błąd logowania:', err);
        showError('Błąd serwera podczas logowania.');
      });
  }

  // otwieranie widoku logowania z headera
  btnOpenLogin?.addEventListener('click', () => {
    hideError();
    navigateTo('login');
  });

  // anuluj – powrót do strony głównej
  btnCancel?.addEventListener('click', () => {
    if (form) form.reset();
    hideError();
    navigateTo('home');
  });

  // 🔑 kluczowe: podpinamy i klik, i submit
  btnSubmit?.addEventListener('click', doLogin);
  form?.addEventListener('submit', doLogin);

// wylogowanie
btnLogout?.addEventListener('click', () => {
  fetch('/api/logout', { method: 'POST', credentials: 'include' })
    .then(r => r.json())
    .then(() => {
      currentUser = null;
      currentRole = 'mieszkaniec';

      updateRoleUI();
      updateMessagePlaceholder();
      applyAuthUI();

      // 🔒 odśwież UI zależne od sesji
      if (typeof window.applyGuestRules === 'function') {
        window.applyGuestRules();
      }
      if (typeof window.updateTicketsSectionTitle === 'function') {
        window.updateTicketsSectionTitle();
      }
      if (typeof window.updateMiniStatsVisibility === 'function') {
        window.updateMiniStatsVisibility();
      }

      navigateTo('home');

      if (typeof loadTickets === 'function') {
        try { loadTickets(); } catch (_) {}
      }
    })
    .catch(err => console.error('Błąd wylogowania:', err));
});

}

function setRole(role) {
  currentRole = role;
  localStorage.setItem('mlokalnie_role', role);
  updateRoleUI();
  if (typeof renderTickets === 'function') renderTickets(); // (renderTickets jest lokalne w initZgloszenia, więc tu nie zadziała – zostawiamy kompatybilnie)
  updateMessagePlaceholder();
}

function updateMessagePlaceholder() {
  const input = $('#msg-input');
  if (!input) return;

  if (currentRole === 'mieszkaniec') {
    input.placeholder = "Napisz wiadomość do urzędu… (piszesz jako Mieszkaniec)";
  } else {
    input.placeholder = "Odpowiedz mieszkańcowi… (piszesz jako Urząd)";
  }
}

function updateRoleUI() {
  const btnM = $('#role-mieszkaniec');
  const btnU = $('#role-urzednik');

  if (btnM && btnU) {
    btnM.classList.toggle('active', currentRole === 'mieszkaniec');
    btnU.classList.toggle('active', currentRole === 'urzednik');
  }

  const homeRoleLabel = $('#home-role-label');
  if (homeRoleLabel) {
    homeRoleLabel.textContent = (currentRole === 'mieszkaniec' ? 'Mieszkaniec' : 'Urzędnik');
  }
}

function navigateTo(name, fromPopState = false) {
  const viewName = name || 'home';

  $$('[data-view]').forEach(el => el.classList.remove('active'));
  const view = document.querySelector(`[data-view="${viewName}"]`) || document.querySelector('[data-view="home"]');


  if (view) {
    view.classList.add('active');
    window.scrollTo(0, 0);
  }

  // Kontakt: automatycznie czyść formularz po wyjściu
  if (viewName !== 'contact' && typeof window.contactReset === 'function') {
    window.contactReset();
  }

  // Dokumenty: zawsze wracaj do folderów po wejściu
  if (viewName === 'dokumenty' && typeof window.docsReset === 'function') {
    window.docsReset();
  }

  localStorage.setItem('mlokalnie_lastView', viewName);

  if (!fromPopState) {
    history.pushState({ view: viewName }, "", "#" + viewName);
  }
}

// globalna nawigacja po data-goto
document.addEventListener('click', (e) => {
  const goto = e.target.closest('[data-goto]');
  if (goto) {
    e.preventDefault();
    const name = goto.getAttribute('data-goto');
    navigateTo(name);
  }
});

$('#btn-home')?.addEventListener('click', () => navigateTo('home'));
$('#btn-help')?.addEventListener('click', () => alert(
  'Tryb ról: Mieszkaniec / Urzędnik.\n' +
  'Zgłoszenia obsługiwane są przez backend (/api/zgloszenia), a część modułów ma charakter prezentacyjny.'
));
$('#btn-faq')?.addEventListener('click', () => navigateTo('faq'));
$('#btn-contact')?.addEventListener('click', () => navigateTo('contact'));

$('#role-mieszkaniec')?.addEventListener('click', () => setRole('mieszkaniec'));
$('#role-urzednik')?.addEventListener('click', () => setRole('urzednik'));

window.addEventListener('popstate', () => {
  const hash = (location.hash || '').replace('#', '') || 'home';
  navigateTo(hash, true);
});


// ---------- Zgłoszenia (backend API) ----------
function initZgloszenia() {
  console.log('[initZgloszenia] start', { currentRole, currentUser });

  const form = $('#ticket-form');
  const listEl = $('#tickets-list');

  const statusFilterEl = $('#t-filter-status');
  const sortEl = $('#t-sort');
  const searchEl = $('#t-filter-search');

  let filterStatus = 'ALL';
  let sortMode = 'NEWEST';
  let searchTerm = '';

  let tickets = []; // zgłoszenia pobrane z backendu

function applyGuestRules() {
  const isGuest = !currentUser; // ✅ klucz: gość = brak sesji

  const note = $('#login-required-note');
  if (note) note.style.display = isGuest ? 'block' : 'none';

  if (form) {
    form.style.opacity = isGuest ? '0.6' : '1';
    form.style.pointerEvents = isGuest ? 'none' : 'auto';
  }

  const submitBtn = $('#t-submit');
  if (submitBtn) submitBtn.disabled = isGuest;

  // ✅ poprawne ID z index.html: t-xml-import (u Ciebie nie ma t-xml-read)
  const xmlBtn = $('#t-xml-import');
  if (xmlBtn) xmlBtn.disabled = isGuest;

  const xmlFile = $('#t-xml-file');
  if (xmlFile) xmlFile.disabled = isGuest;
}
window.applyGuestRules = applyGuestRules; // globalnie, żeby initAuth/login/logout mogły odświeżać UI
applyGuestRules(); // startowo od razu ustaw blokady


  function mapStatusDisplay(db) {
    if (db === 'W_realizacji') return 'W realizacji';
    if (db === 'Zakonczone') return 'Zakończone';
    return db || 'Nowe';
  }

  function xmlText(el, tagName) {
    if (!el) return '';
    const node = el.getElementsByTagName(tagName)[0];
    return node?.textContent?.trim() || '';
  }

  function xmlBool(el, tagName) {
    const v = (xmlText(el, tagName) || '').toLowerCase();
    return v === '1' || v === 'true' || v === 'tak' || v === 'yes';
  }

  function parseZgloszenieXML(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) {
      throw new Error('Niepoprawny XML (parsererror)');
    }

    const root = doc.documentElement;

    const tytul = xmlText(root, 'tytul') || xmlText(root, 'Tytul') || xmlText(root, 'title');
    const kategoria = xmlText(root, 'kategoria') || xmlText(root, 'Kategoria') || xmlText(root, 'category');
    const opis = xmlText(root, 'opis') || xmlText(root, 'Opis') || xmlText(root, 'description');
    const lokalizacja = xmlText(root, 'lokalizacja') || xmlText(root, 'adres') || xmlText(root, 'location');

    const anonimowe =
      xmlBool(root, 'anonimowe') ||
      xmlBool(root, 'Anonimowe') ||
      xmlBool(root, 'anonymous');

    return { tytul, kategoria, opis, lokalizacja, anonimowe };

  }


function updateTicketsSectionTitle() {
  const title = $('#tickets-section-title');
  if (!title) return;

  if (!currentUser) {
    title.textContent = 'Publiczne zgłoszenia';
  } else {
    title.textContent = 'Moje zgłoszenia';
  }
}

function updateMiniStatsVisibility() {
  const mini = $('#mini-stats');
  if (!mini) return;

  // pokazuj TYLKO dla zalogowanego urzędnika/admina
  const show = !!currentUser && currentRole === 'urzednik';
  mini.style.display = show ? '' : 'none';
}

window.updateMiniStatsVisibility = updateMiniStatsVisibility;
updateMiniStatsVisibility();


window.updateTicketsSectionTitle = updateTicketsSectionTitle;
updateTicketsSectionTitle();


function fillTicketFormFromXML(parsed) {
  const titleEl = $('#t-title');
  const catEl   = $('#t-cat');
  const descEl  = $('#t-desc');
  const locEl   = $('#t-location');
  const anonEl  = $('#t-anon');

  if (titleEl && parsed.tytul)      titleEl.value = parsed.tytul;
  if (descEl  && parsed.opis)       descEl.value  = parsed.opis;
  if (locEl   && parsed.lokalizacja) locEl.value  = parsed.lokalizacja;

  if (catEl && parsed.kategoria) {
    const opts = Array.from(catEl.options).map(o => o.value);
    if (opts.includes(parsed.kategoria)) {
      catEl.value = parsed.kategoria;
    } else if (descEl) {
      descEl.value =
        (descEl.value ? (descEl.value + "\n\n") : "") +
        `[Kategoria z XML: ${parsed.kategoria}]`;
    }
  }

  if (anonEl) anonEl.checked = !!parsed.anonimowe;
}


// import XML do formularza
const xmlImportBtn = $('#t-xml-import');
const xmlFile = $('#t-xml-file');
const xmlInfo = $('#t-xml-info');
const xmlName = $('#t-xml-name');

// pokazuj nazwę wybranego pliku
xmlFile?.addEventListener('change', () => {
  const f = xmlFile.files && xmlFile.files[0];
  if (xmlName) {
    xmlName.textContent = f ? f.name : 'Nie wybrano pliku';
  }
  if (xmlInfo) {
    xmlInfo.style.display = 'none';
    xmlInfo.textContent = '';
  }
});

xmlImportBtn?.addEventListener('click', () => {
  const f = xmlFile?.files?.[0];
  if (!f) {
    alert('Wybierz plik .xml');
    return;
  }
  if (!f.name.toLowerCase().endsWith('.xml')) {
    alert('To nie wygląda na plik XML.');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = parseZgloszenieXML(String(reader.result || ''));
      fillTicketFormFromXML(parsed);

      if (xmlInfo) {
        xmlInfo.style.display = 'block';
        xmlInfo.textContent = 'XML wczytany — formularz został uzupełniony.';
      }
    } catch (e) {
      console.error(e);
      alert('Nie udało się wczytać XML. Sprawdź strukturę pliku.');

      if (xmlInfo) {
        xmlInfo.style.display = 'block';
        xmlInfo.textContent = 'Błąd wczytywania XML.';
      }
    }
  };
  reader.readAsText(f, 'utf-8');
});

  function nextStatusDb(currentDb) {
    if (currentDb === 'Nowe') return 'W_realizacji';
    if (currentDb === 'W_realizacji') return 'Zakonczone';
    return 'Zakonczone';
  }

  function computeStats(items) {
    const n = items.filter(i => i.status_db === 'Nowe').length;
    const w = items.filter(i => i.status_db === 'W_realizacji').length;
    const z = items.filter(i => i.status_db === 'Zakonczone').length;

    const mn = $('#mini-new'); if (mn) mn.textContent = n;
    const mw = $('#mini-inprogress'); if (mw) mw.textContent = w;
    const mz = $('#mini-done'); if (mz) mz.textContent = z;

    const statLast = $('#stat-last');
    const statLastEmpty = $('#stat-last-empty');
    const titleEl = $('#stat-last-title');
    const metaEl = $('#stat-last-meta');

    if (items.length === 0) {
      if (statLast) statLast.style.display = 'none';
      if (statLastEmpty) statLastEmpty.style.display = 'block';
    } else {
      const last = items[0];
      if (statLast) statLast.style.display = 'block';
      if (statLastEmpty) statLastEmpty.style.display = 'none';
      if (titleEl) titleEl.textContent = last.title;
      if (metaEl) metaEl.textContent = `${last.status_label} • ${last.date || ''}`;
    }
  }

  function applyFilters(items) {
    let out = [...items];

    if (filterStatus !== 'ALL') out = out.filter(it => it.status_label === filterStatus);

    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      out = out.filter(it =>
        (it.title && it.title.toLowerCase().includes(t)) ||
        (it.desc && it.desc.toLowerCase().includes(t))
      );
    }

    out.sort((a, b) => {
      const da = a.createdAt || 0;
      const db = b.createdAt || 0;
      return (sortMode === 'NEWEST') ? (db - da) : (da - db);
    });

    return out;
  }

  function computeBadgeClass(statusLabel) {
    if (statusLabel === 'Zakończone') return 'success';
    if (statusLabel === 'W realizacji') return 'warn';
    return 'neutral';
  }

  function openModal(item) {
  // 🔒 1. modal tylko w zakładce "Zgłoszenia"
  const zglView = document.querySelector('[data-view="zgloszenia"]');
  if (!zglView || !zglView.classList.contains('active')) {
    return;
  }

  const backdrop = $('#ticket-modal-backdrop');
  if (!backdrop) return;

  currentModalTicketId = item.id;

  const mTitle = $('#m-title');
  const mDesc  = $('#m-desc');
  const mStatus = $('#m-status');
  const mId    = $('#m-id');
  const mSub   = $('#m-sub');

  if (mTitle)  mTitle.textContent  = item.title || '';
  if (mDesc)   mDesc.textContent   = item.desc || '—';
  if (mStatus) mStatus.textContent = item.status_label || '';
  if (mId)     mId.textContent     = item.id;
  if (mSub) {
    const metaParts = [];
    if (item.category)  metaParts.push(item.category);
    if (item.location)  metaParts.push(item.location);
    if (item.date)      metaParts.push(item.date);
    mSub.textContent = metaParts.join(' • ');
  }

    // ===== INFORMACJA ZWROTNA =====
  const fbText   = $('#m-feedback-text');
  const fbMeta   = $('#m-feedback-meta');
  const fbEditor = $('#m-feedback-editor');
  const fbInput  = $('#m-feedback-input');

  const hasFeedback = !!(item.feedback_text && item.feedback_text.trim().length);

  // treść informacji zwrotnej
  if (fbText) {
    fbText.textContent = hasFeedback
      ? item.feedback_text
      : 'Brak informacji zwrotnej.';
  }

  // meta: kto i kiedy
  if (fbMeta) {
    const parts = [];
    if (item.feedback_by) parts.push(`przez: ${item.feedback_by}`);
    if (item.feedback_date) {
      try {
        parts.push(`data: ${new Date(item.feedback_date).toLocaleString('pl-PL')}`);
      } catch {}
    }
    fbMeta.textContent = parts.join(' • ');
  }

  // edycja tylko dla urzędnika/admin
  if (fbEditor) {
    fbEditor.style.display = (currentRole === 'urzednik') ? 'block' : 'none';
  }

  if (fbInput) {
    fbInput.value = item.feedback_text || '';
  }


  const advBtn = $('#m-advance');
  const delBtn = $('#m-delete');
  
    // uprawnienia:
    // - ADMIN + URZĘDNIK: mogą zmieniać status
    // - tylko ADMIN: może usuwać
    const canAdvance = (currentRole === 'urzednik'); // ADMIN mapuje się też na "urzednik"
    const isAdmin = currentUser && currentUser.typ_konta === 'ADMIN';

    if (advBtn) advBtn.style.display = canAdvance ? 'inline-flex' : 'none';
    if (delBtn) delBtn.style.display = isAdmin ? 'inline-flex' : 'none';

    backdrop.dataset.id = item.id;
    backdrop.classList.add('open');
  }


  function closeModal() {
    const backdrop = $('#ticket-modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('open');
      currentModalTicketId = null;
    }
  }

  $('#modal-close')?.addEventListener('click', closeModal);
  $('#ticket-modal-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'ticket-modal-backdrop') closeModal();
  });

  // zmiana statusu w modalu (ADMIN + URZĘDNIK)
  $('#m-advance')?.addEventListener('click', async () => {
    const backdrop = $('#ticket-modal-backdrop');
    if (!backdrop?.dataset?.id) return;
    const id = backdrop.dataset.id;

    const item = tickets.find(t => String(t.id) === String(id));
    if (!item) return;

    const newStatusDb = nextStatusDb(item.status_db);

    try {
      const res = await fetch(`${API_ZGLOSZENIA}/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatusDb })
      });
      if (!res.ok) throw new Error('Błąd odpowiedzi API');
      await loadTickets();
      const updated = tickets.find(t => String(t.id) === String(id));
      if (updated) openModal(updated);
    } catch (err) {
      console.error(err);
      alert('Nie udało się zmienić statusu (błąd backendu).');
    }
  });

  // pobranie XML z modala
  $('#m-xml')?.addEventListener('click', async () => {
    if (!currentModalTicketId) {
      alert('Brak ID zgłoszenia.');
      return;
    }

    try {
      const res = await fetch(`${API_ZGLOSZENIA}/${currentModalTicketId}/xml`, { credentials: 'include' });
      if (!res.ok) throw new Error('Błąd pobierania XML');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `zgloszenie_${currentModalTicketId}.xml`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Nie udało się pobrać pliku XML.');
    }
  });

  // usunięcie zgłoszenia z poziomu modala – TYLKO ADMIN
  $('#m-delete')?.addEventListener('click', async () => {
    // dodatkowa ochrona po stronie frontu
    if (!currentUser || currentUser.typ_konta !== 'ADMIN') {
      alert('Tylko administrator może usuwać zgłoszenia.');
      return;
    }

    const backdrop = $('#ticket-modal-backdrop');
    if (!backdrop?.dataset?.id) return;
    const id = backdrop.dataset.id;

    if (!confirm('Na pewno usunąć to zgłoszenie?')) return;

    try {
      const res = await fetch(`${API_ZGLOSZENIA}/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Błąd odpowiedzi API');
      closeModal();
      await loadTickets();
    } catch (err) {
      console.error(err);
      alert('Nie udało się usunąć zgłoszenia (błąd backendu).');
    }
  });

    $('#m-feedback-save')?.addEventListener('click', async () => {
    if (currentRole !== 'urzednik') return;

    const backdrop = $('#ticket-modal-backdrop');
    const id = backdrop?.dataset?.id;
    if (!id) return;

    const text = $('#m-feedback-input')?.value ?? '';
    const trimmed = String(text).trim();

    if (trimmed.length > 0 && trimmed.length < 10) {
      alert('Informacja zwrotna musi mieć co najmniej 10 znaków.');
      return;
    }

    try {
      const res = await fetch(`${API_ZGLOSZENIA}/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ info_zwrotna: trimmed })
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Błąd odpowiedzi API');
      }

      await loadTickets();
      const updated = tickets.find(t => String(t.id) === String(id));
      if (updated) openModal(updated);
    } catch (err) {
      console.error(err);
      alert('Nie udało się zapisać informacji zwrotnej (błąd backendu).');
    }
  });


  function renderTickets() {
    if (!listEl) return;

    listEl.innerHTML = '';
    computeStats(tickets);
    const filtered = applyFilters(tickets);

    if (filtered.length === 0) {
      listEl.innerHTML = '<li style="padding:12px 0;color:#64748b">Brak zgłoszeń dla wybranych filtrów.</li>';
      return;
    }

    filtered.forEach(it => {
      const li = document.createElement('li');

      // logika widoczności akcji:
      // - każdy: Szczegóły
      // - ADMIN + URZĘDNIK: Status
      // - tylko ADMIN: Usuń
      const canAdvance = (currentRole === 'urzednik'); // admin mapuje się również na „urzednik”
      const isAdmin = currentUser && currentUser.typ_konta === 'ADMIN';

let actionsHtml = `
  <button type="button" class="btn btn-ghost btn-ghost-sm" data-action="details">
    Szczegóły
  </button>
`;


// 🔵 przycisk publikacji (tylko dla urzędu i gdy nieopublikowane)
if (currentRole === 'urzednik' && !it.opublikowane) {
  actionsHtml += `
    <button type="button"
            class="btn btn-ghost btn-ghost-sm btn-publish"
            data-action="publish"
            title="Opublikuj zgłoszenie">
      Opublikuj
    </button>
  `;
}




if (canAdvance) {
  actionsHtml += `
    <button type="button" class="btn btn-ghost btn-ghost-sm" data-action="advance">
      Status
    </button>
  `;
}

if (isAdmin) {
  actionsHtml += `
    <button type="button"
            class="btn btn-ghost btn-ghost-sm btn-remove"
            data-action="remove">
      Usuń
    </button>
  `;
}




li.innerHTML = `
  <div style="flex:1;min-width:0">
    <div style="font-weight:600;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
  <span>${it.title}</span>
  <span class="pill">${it.category || 'Brak kategorii'}</span>

  ${it.anonimowe ? '<span class="pill pill-anon">Anonimowe</span>' : ''}


  ${
    currentRole === 'urzednik'
      ? (!it.opublikowane
          ? '<span class="pill pill-warn">Nieopublikowane</span>'
          : '<span class="pill pill-ok">Publiczne</span>')
      : ''
  }
</div>

    <div class="kicker" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
      ${(it.desc || '—')}
    </div>
  </div>

  <div class="actions-row" style="justify-content:flex-end;align-items:center;gap:10px;flex-wrap:wrap;">
    <div class="ticket-meta">
      <span class="badge ${computeBadgeClass(it.status_label)}">
        ${it.status_label}
      </span>
    </div>

    ${actionsHtml}
  </div>
`;



      li.dataset.id = it.id;
      listEl.appendChild(li);
    });
  }

  // klik w akcje na liście
  $('#tickets-list')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    const li = e.target.closest('li'); if (!li) return;

    const id = li.dataset.id;
    const item = tickets.find(t => String(t.id) === String(id));
    if (!item) return;

    const action = btn.dataset.action;

    if (action === 'details') openModal(item);

    // 🔵 publikacja zgłoszenia
if (action === 'publish' && currentRole === 'urzednik') {
  try {
    const res = await fetch(`${API_ZGLOSZENIA}/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opublikowane: true })
    });

    if (!res.ok) throw new Error('Błąd publikacji');

    await loadTickets();
  } catch (err) {
    console.error(err);
    alert('Nie udało się opublikować zgłoszenia.');
  }
}


    // zmiana statusu: ADMIN + URZĘDNIK (mapują się na currentRole === 'urzednik')
    if (action === 'advance' && currentRole === 'urzednik') {
      const newStatusDb = nextStatusDb(item.status_db);
      try {
        const res = await fetch(`${API_ZGLOSZENIA}/${id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatusDb })
        });
        if (!res.ok) throw new Error('Błąd odpowiedzi API');
        await loadTickets();
      } catch (err) {
        console.error(err);
        alert('Nie udało się zmienić statusu (błąd backendu).');
      }
    }

    // usunięcie: TYLKO ADMIN
    if (action === 'remove') {
      if (!currentUser || currentUser.typ_konta !== 'ADMIN') {
        alert('Tylko administrator może usuwać zgłoszenia.');
        return;
      }
      if (!confirm('Na pewno usunąć to zgłoszenie?')) return;
      try {
        const res = await fetch(`${API_ZGLOSZENIA}/${id}`, { method: 'DELETE', credentials: 'include' });
        if (!res.ok) throw new Error('Błąd odpowiedzi API');
        await loadTickets();
      } catch (err) {
        console.error(err);
        alert('Nie udało się usunąć zgłoszenia (błąd backendu).');
      }
    }
  });

  statusFilterEl?.addEventListener('change', () => {
    filterStatus = statusFilterEl.value;
    renderTickets();
  });

  sortEl?.addEventListener('change', () => {
    sortMode = sortEl.value;
    renderTickets();
  });

  searchEl?.addEventListener('input', () => {
    searchTerm = searchEl.value.toLowerCase();
    renderTickets();
  });

  // --- NOWE: wspólna obsługa dodania zgłoszenia ---
  async function handleTicketSubmit(e) {
    if (e) e.preventDefault();

    const title = $('#t-title')?.value?.trim() || '';
    const desc  = $('#t-desc')?.value?.trim() || '';
    const locEl   = $('#t-location');
    const cat   = $('#t-cat')?.value || '';
    const location = locEl?.value?.trim() || '';

   // --- Walidacja formularza (frontend) ---
  if (!title || title.length < 5) {
    alert('Tytuł jest wymagany (min. 5 znaków).');
    $('#t-title')?.focus();
    return;
  }

  if (!cat) {
    alert('Wybierz kategorię zgłoszenia.');
    $('#t-cat')?.focus();
    return;
  }

  if (!location || location.length < 5) {
    alert('Lokalizacja jest wymagana (min. 5 znaków).');
    $('#t-location')?.focus();
    return;
  }

  if (!desc || desc.length < 40) {
    alert('Opis jest wymagany (min. 40 znaków).');
    $('#t-desc')?.focus();
    return;
  }


    const anon = !!$('#t-anon')?.checked;

        const payload = {
      tytul: title,
      kategoria: cat,
      opis: desc,
      lokalizacja: location,
      anonimowe: anon,
      userId: currentUser?.id ?? null
    };


    try {
      const res = await fetch(API_ZGLOSZENIA, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.error('Odpowiedź API != 200', await res.text());
        throw new Error('Błąd odpowiedzi API');
      }

      await loadTickets();

      if (form) form.reset();
      const xmlInfo = $('#t-xml-info');
      if (xmlInfo) {
        xmlInfo.style.display = 'none';
        xmlInfo.textContent = '';
      }
    } catch (err) {
      console.error(err);
      alert('Nie udało się dodać zgłoszenia (błąd backendu).');
    }
  }

  // klik w przycisk „Wyślij zgłoszenie”
  const submitBtn = $('#t-submit');
  submitBtn?.addEventListener('click', handleTicketSubmit);

  // Enter w formularzu też działa, ale przez tę samą funkcję
  form?.addEventListener('submit', handleTicketSubmit);


  // udostępniamy jako globalną funkcję dla initAuth/initLoginUI
  loadTickets = async function loadTicketsImpl() {
    try {
      if (listEl) listEl.innerHTML = '<li style="padding:12px 0;color:#64748b">Ładowanie zgłoszeń…</li>';

      const res = await fetch(API_ZGLOSZENIA, { credentials: 'include' });
      if (!res.ok) throw new Error('Błąd odpowiedzi API');
      const data = await res.json();

            tickets = data.map(row => {
        const createdAt = row.data_utworzenia ? Date.parse(row.data_utworzenia) : 0;
        const statusLabel = mapStatusDisplay(row.status);
        const prettyDate = row.data_utworzenia
          ? new Date(row.data_utworzenia).toLocaleString('pl-PL')
          : '';

        return {
          id: row.id,
          title: row.tytul,
          desc: row.opis,
          category: row.kategoria,
          location: row.lokalizacja || '',
          status_db: row.status,
          status_label: statusLabel,
          anonimowe: !!row.anonimowe,
          opublikowane: !!row.opublikowane,
          date: prettyDate,
          createdAt,

          // informacja zwrotna urzędu
          feedback_text: row.info_zwrotna || '',
          feedback_date: row.info_zwrotna_data || '',
          feedback_by: row.info_zwrotna_przez || ''
        };
      });

      renderTickets();

    } catch (err) {
      console.error(err);
      if (listEl) {
        listEl.innerHTML = '<li style="padding:12px 0;color:#b91c1c">Błąd pobierania zgłoszeń z backendu.</li>';
      }
    }
  };

  // start
  if (typeof loadTickets === 'function') {
    loadTickets();
  }
}



// ---------- Kontakt (mailto) ----------
function initKontakt() {
  const form = $('#contact-form');
  const info = $('#c-info');
  const name = $('#c-name');
  const email = $('#c-email');
  const subject = $('#c-subject');
  const message = $('#c-message');

  if (!form) return;

  $('#c-send')?.addEventListener('click', () => {
    const n = name?.value?.trim() || '';
    const e = email?.value?.trim() || '';
    const s = subject?.value?.trim() || '';
    const m = message?.value?.trim() || '';

    if (!n || !e || !m) {
      alert('Uzupełnij imię, e-mail i treść wiadomości.');
      return;
    }

    const mailTo = 'kontakt@mlokalnie.pl';
    const mailSubject = encodeURIComponent(s || 'Wiadomość z portalu mLokalnie');
    const mailBody = encodeURIComponent(
      `Imię i nazwisko: ${n}\n` +
      `Adres e-mail: ${e}\n\n` +
      `Treść wiadomości:\n${m}`
    );

    if (info) {
      info.style.display = 'block';
      info.textContent =
        'Wiadomość została przygotowana w kliencie poczty. Aby ją wysłać, zatwierdź wysyłkę w programie pocztowym.';
      clearTimeout(window.__contactInfoTimer);
      window.__contactInfoTimer = setTimeout(() => {
        info.style.display = 'none';
      }, 6000);
    }

    window.location.href = `mailto:${mailTo}?subject=${mailSubject}&body=${mailBody}`;
  });

  // reset formularza po wyjściu z zakładki
  window.contactReset = () => {
    form.reset();
    if (info) info.style.display = 'none';
  };
}


// ---------- Komunikacja (localStorage) ----------
function initKomunikacja() {
  const key = 'mlokalnie_msgs';
  const read = () => JSON.parse(localStorage.getItem(key) || '[]');
  const write = (v) => localStorage.setItem(key, JSON.stringify(v));

  const list = $('#msg-list');
  const input = $('#msg-input');

  updateMessagePlaceholder();

  function render() {
    if (!list) return;

    list.innerHTML = '';
    const msgs = read();

    if (msgs.length === 0) {
      list.innerHTML = '<li style="padding:12px 0;color:#64748b">Brak wiadomości.</li>';
      return;
    }

    msgs.forEach(m => {
      const li = document.createElement('li');
      const align = m.from === 'Mieszkaniec' ? 'flex-end' : 'flex-start';
      const bg = m.from === 'Mieszkaniec' ? 'background:#eff6ff' : 'background:#f1f5f9';

      li.style.justifyContent = align;
      li.innerHTML = `
        <div style="max-width:80%;${bg};padding:8px 10px;border-radius:12px;">
          <div style="font-weight:600;font-size:13px">
            ${m.from} • <span class="kicker" style="font-size:11px">${m.date}</span>
          </div>
          <div style="font-size:13px;margin-top:2px">${m.text}</div>
        </div>`;
      list.appendChild(li);
    });
  }

  $('#msg-send')?.addEventListener('click', () => {
    const t = input?.value?.trim() || '';
    if (!t) return;

    const msgs = read();
    const sender = (currentRole === 'urzednik') ? 'Urząd' : 'Mieszkaniec';

    msgs.unshift({
      from: sender,
      date: new Date().toLocaleString('pl-PL'),
      text: t
    });

    if (currentRole === 'mieszkaniec' && Math.random() < 0.4) {
      msgs.unshift({
        from: 'Urząd',
        date: new Date().toLocaleString('pl-PL'),
        text: 'Dziękujemy za wiadomość, sprawa została przekazana do realizacji.'
      });
    }

    write(msgs);
    input.value = '';
    render();
  });

  if (read().length === 0) {
    write([
      { from: 'Urząd', date: '01.06.2025 09:12', text: 'Przerwa w dostawie wody 10.06 w godz. 10–14.' },
      { from: 'Mieszkaniec', date: '02.06.2025 18:03', text: 'Kiedy planowana naprawa chodnika na Lipowej?' }
    ]);
  }

  render();
}


// ---------- Dokumenty (kategorie -> lista) ----------
function initDokumenty() {
  const listBox = $('#docs-list');
  const catsBox = $('#docs-cats');
  const titleEl = $('#docs-title');
  const backBtn = $('#docs-back');

  const docs = [
    { name: 'Regulamin gospodarki odpadami.pdf', date: '10.12.2025', category: 'Regulaminy' },
    { name: 'Plan zagospodarowania – rejon północny.pdf', date: '09.05.2024', category: 'Plany' },
    { name: 'Taryfa za wodę 2026.pdf', date: '14.01.2026', category: 'Opłaty' },
    { name: 'Uchwała budżetowa gminy 2026.pdf', date: '20.01.2026', category: 'Finanse' },
    { name: 'Harmonogram odbioru odpadów – I półrocze 2026.pdf', date: '02.01.2026', category: 'Harmonogramy' },
    { name: 'Informator podatkowy dla mieszkańców 2026.pdf', date: '15.02.2026', category: 'Podatki' },
    { name: 'Wniosek o wydanie zaświadczenia o zameldowaniu.pdf', date: '05.11.2025', category: 'Wnioski' },
    { name: 'Instrukcja korzystania z portalu mLokalnie.pdf', date: '05.01.2026', category: 'Instrukcje' }
  ];

  if (!catsBox || !backBtn || !titleEl) {
    if (!listBox) return;
    listBox.innerHTML = '';
    docs.forEach(d => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div style="flex:1">
          <div style="font-weight:600">${d.name}</div>
          <div class="kicker">Data: ${d.date} • Kategoria: ${d.category}</div>
        </div>
        <button class="btn btn-ghost btn-ghost-sm" disabled>Pobierz dokument</button>`;
      listBox.appendChild(li);
    });
    return;
  }

  const byCat = docs.reduce((acc, d) => {
    (acc[d.category] ||= []).push(d);
    return acc;
  }, {});

  const categories = Object.keys(byCat).sort((a, b) => a.localeCompare(b, 'pl'));

  function renderCategories() {
    titleEl.textContent = 'Dokumenty';
    backBtn.style.display = 'none';
    catsBox.style.display = '';
    listBox.style.display = 'none';

    catsBox.innerHTML = '';
    categories.forEach(cat => {
      const count = byCat[cat].length;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'docs-folder';
      b.dataset.cat = cat;
      b.innerHTML = `
        <div class="docs-folder__icon">📁</div>
        <div class="docs-folder__meta">
          <div class="docs-folder__name">${cat}</div>
          <div class="kicker docs-folder__count">Dostępne pliki: ${count}</div>
        </div>`;
      catsBox.appendChild(b);
    });
  }

  function renderDocs(cat) {
    titleEl.textContent = cat;
    backBtn.style.display = 'inline-flex';
    catsBox.style.display = 'none';
    listBox.style.display = '';

    listBox.innerHTML = '';
    (byCat[cat] || []).forEach(d => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div style="flex:1">
          <div style="font-weight:600">${d.name}</div>
          <div class="kicker">Data: ${d.date} • Kategoria: ${d.category}</div>
        </div>
        <button class="btn btn-ghost btn-ghost-sm" disabled>Pobierz dokument</button>`;
      listBox.appendChild(li);
    });
  }

  catsBox.addEventListener('click', (e) => {
    const folder = e.target.closest('.docs-folder');
    if (!folder) return;
    renderDocs(folder.dataset.cat);
  });

  backBtn.addEventListener('click', renderCategories);

  // reset dla routera
  window.docsReset = renderCategories;

  renderCategories();
}


// ---------- Aktualności (static list) ----------
function initAktualnosci() {
  const list = $('#news-list');
  if (!list) return;

  // Statyczna lista aktualności – stare + nowe, żeby widać było ciągłość do 02.2026
  const news = [
    // LUTY 2026
    {
      title: 'Nowa wersja portalu mLokalnie – zgłoszenia online w jednym miejscu',
      date: '05.02.2026',
      text: 'Udostępniono nową wersję portalu mLokalnie z możliwością składania zgłoszeń online oraz generowaniem formularzy XML do dalszego przetwarzania w urzędzie.'
    },
    {
      title: 'Akcja „Zima 2025/2026” – podsumowanie działań utrzymaniowych',
      date: '22.01.2026',
      text: 'Zakończono główne prace związane z zimowym utrzymaniem dróg i chodników. Zgłoszenia dotyczące oblodzeń nadal można przekazywać przez portal mLokalnie.'
    },

    // KONIEC 2025
    {
      title: 'Przegląd oświetlenia ulicznego przed okresem zimowym',
      date: '10.12.2025',
      text: 'Na terenie gminy trwa przegląd opraw oświetleniowych. Usterki można zgłaszać poprzez kategorię „Oświetlenie uliczne” w portalu mLokalnie.'
    },
    {
      title: 'Nasadzenia drzew na osiedlu Południe',
      date: '25.10.2025',
      text: 'Rozpoczęto jesienne nasadzenia drzew i krzewów na osiedlu Południe. Mieszkańcy mogą zgłaszać propozycje lokalizacji kolejnych nasadzeń.'
    },
    {
      title: 'Modernizacja sieci wodociągowej na ul. Lipowej',
      date: '15.09.2025',
      text: 'W związku z pracami modernizacyjnymi możliwe są czasowe przerwy w dostawie wody. Bieżące komunikaty publikowane są w zakładce Aktualności.'
    },

    // TWOJE DOTYCHCZASOWE (2025)
    {
      title: 'Planowane prace drogowe na ul. Słonecznej',
      date: '12.06.2025',
      text: 'W dniach 15–18 czerwca mogą wystąpić czasowe utrudnienia w ruchu.'
    },
    {
      title: 'Przerwa w dostawie wody – osiedle Północ',
      date: '08.06.2025',
      text: 'Planowana przerwa w dostawie wody w godzinach 8:00–14:00.'
    },
    {
      title: 'Konsultacje społeczne – nowy plan zagospodarowania',
      date: '02.06.2025',
      text: 'Zapraszamy mieszkańców do udziału w konsultacjach społecznych.'
    },
    {
      title: 'Zmiana godzin pracy urzędu',
      date: '28.05.2025',
      text: 'W dniu 31 maja urząd będzie czynny do godziny 13:00.'
    }
  ];

  // Posprzątane: sortujemy aktualności po dacie (najnowsze na górze)
  const sorted = [...news].sort((a, b) => {
    const [da, ma, ya] = a.date.split('.').map(Number);
    const [db, mb, yb] = b.date.split('.').map(Number);
    const ta = new Date(ya, ma - 1, da).getTime();
    const tb = new Date(yb, mb - 1, db).getTime();
    return tb - ta; // malejąco (najnowsze pierwsze)
  });

  list.innerHTML = '';
  sorted.forEach(n => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div style="flex:1">
        <div style="font-weight:600">${n.title}</div>
        <div class="kicker">${n.text}</div>
      </div>
      <span class="pill">${n.date}</span>`;
    list.appendChild(li);
  });
}



// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
  const savedRole = localStorage.getItem('mlokalnie_role');
  currentRole = (savedRole === 'urzednik' || savedRole === 'mieszkaniec') ? savedRole : 'mieszkaniec';

  updateRoleUI();
  updateMessagePlaceholder();

  initAuth();
  initLoginUI();

  initZgloszenia();
  initKomunikacja();
  initDokumenty();
  initAktualnosci();
  initKontakt();
  initAccessibilityWidget();
  // start view: hash > localStorage > home
  const hash = (location.hash || '').replace('#', '');
  const lastView = localStorage.getItem('mlokalnie_lastView') || 'home';
  const startView = hash || lastView || 'home';
  navigateTo(startView, true);

  document.querySelectorAll('.footer-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      alert(
        'To jest demonstracyjna implementacja systemu przygotowana na potrzeby pracy inżynierskiej.\n\n' +
        'W docelowym wdrożeniu w tym miejscu znajdowałby się pełny dokument.'
      );
    });
  });
});
