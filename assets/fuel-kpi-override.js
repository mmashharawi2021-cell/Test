(() => {
  const VERSION = '20260513-fuel-kpi-override-1';

  function num(value) {
    if (window.ReportUtils?.number) return window.ReportUtils.number(value);
    const n = Number(String(value ?? '').replace(',', '.').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  function fmt(value) {
    const n = num(value);
    const r = +n.toFixed(2);
    return Number.isInteger(r) ? String(r) : String(r);
  }

  function clean(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function fuelEntryKey(entry) {
    return [
      clean(entry.date),
      clean(entry.time),
      clean(entry.supplier || entry.donor),
      fmt(entry.quantityLiters ?? entry.quantity),
      clean(entry.fillingMethod),
      clean(entry.deliveredBy)
    ].join('|');
  }

  function uniqueFuelEntries(entries) {
    const seen = new Set();
    const unique = [];
    entries.forEach(entry => {
      const key = fuelEntryKey(entry);
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(entry);
    });
    return unique;
  }

  function normalizeFuelDoc(doc) {
    const data = doc.data ? doc.data() : doc;
    return {
      date: data.date || '',
      time: data.time || '',
      supplier: data.supplier || data.donor || '',
      quantityLiters: data.quantityLiters ?? data.quantity ?? '',
      fillingMethod: data.fillingMethod || '',
      deliveredBy: data.deliveredBy || ''
    };
  }

  function findCard(patterns) {
    const cards = [...document.querySelectorAll('.kpi-card, .kpi-wide')];
    return cards.find(card => patterns.some(pattern => pattern.test(card.textContent || ''))) || null;
  }

  function setCard(card, label, value, hint, className) {
    if (!card) return;
    card.classList.add(className);
    const span = card.querySelector('span');
    const strong = card.querySelector('strong');
    const small = card.querySelector('small');
    if (span) span.textContent = label;
    if (strong) strong.textContent = fmt(value);
    if (small) small.textContent = hint;
  }

  function renderValues({ incoming, used, remaining }) {
    document.documentElement.dataset.fuelKpiOverride = VERSION;

    const remainingCard = findCard([/السولار في المخزون/, /آخر رصيد/, /وقود متبقي/]);
    const usedCard = findCard([/وقود مستهلك/, /إجمالي السولار المستهلك/, /وقود مستخدم/]);
    const incomingCard = findCard([/إجمالي السولار المستلم/, /سولار مستلم/, /وقود وارد/]);

    setCard(incomingCard, 'وقود وارد', incoming, 'من زر إضافة وقود وارد', 'fuel-incoming-kpi');
    setCard(usedCard, 'وقود مستخدم', used, 'من استهلاك التقارير اليومية', 'fuel-used-kpi');
    setCard(remainingCard, 'وقود متبقي', remaining, 'الوارد - المستخدم', 'fuel-remaining-kpi');
  }

  async function fetchSummary() {
    if (!window.firebase?.firestore) return null;
    const db = firebase.firestore();
    const [fuelSnap, reportsSnap] = await Promise.all([
      db.collection('fuelEntries').get(),
      db.collection('reports').get()
    ]);

    const incomingEntries = uniqueFuelEntries(fuelSnap.docs.map(normalizeFuelDoc));
    const incoming = incomingEntries.reduce((sum, entry) => sum + num(entry.quantityLiters), 0);
    const used = reportsSnap.docs.reduce((sum, doc) => {
      const data = doc.data() || {};
      return sum + num(data?.fuel?.consumedDaily);
    }, 0);

    return { incoming, used, remaining: incoming - used };
  }

  async function update() {
    try {
      const summary = await fetchSummary();
      if (summary) renderValues(summary);
    } catch (error) {
      console.warn('fuel kpi override skipped', error);
    }
  }

  function start() {
    setTimeout(update, 700);
    setTimeout(update, 2200);
    setTimeout(update, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  if (window.firebase?.auth) {
    try {
      firebase.auth().onAuthStateChanged(() => setTimeout(update, 700));
    } catch {}
  }
})();
