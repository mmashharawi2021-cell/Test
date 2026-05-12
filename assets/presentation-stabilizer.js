(() => {
  const VERSION = '20260513-presentation-stable-1';

  function num(value) {
    if (window.ReportUtils?.number) return window.ReportUtils.number(value);
    const n = Number(String(value ?? '').replace(',', '.').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  function fmt(value) {
    const n = num(value);
    const rounded = +n.toFixed(2);
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
  }

  function clean(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function entryKey(entry) {
    return [
      clean(entry.date),
      clean(entry.time),
      clean(entry.supplier || entry.donor),
      fmt(entry.quantityLiters ?? entry.quantity),
      clean(entry.fillingMethod),
      clean(entry.deliveredBy)
    ].join('|');
  }

  function uniqueIncomingEntries() {
    const raw = Array.isArray(window.WaterFuelRawEntries) ? window.WaterFuelRawEntries : [];
    const seen = new Set();
    const unique = [];
    raw.forEach(entry => {
      const key = entryKey(entry);
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(entry);
    });
    return unique;
  }

  function incomingTotal() {
    return uniqueIncomingEntries().reduce((sum, entry) => sum + num(entry.quantityLiters ?? entry.quantity), 0);
  }

  function findCard(patterns) {
    const cards = [...document.querySelectorAll('.kpi-card, .kpi-wide')];
    return cards.find(card => patterns.some(pattern => pattern.test(card.textContent || ''))) || null;
  }

  function setCard(card, { label, value, hint, className }) {
    if (!card) return;
    if (className) card.classList.add(className);
    const labelEl = card.querySelector('span') || card.querySelector('.kpi-head span');
    const valueEl = card.querySelector('strong');
    const hintEl = card.querySelector('small');
    if (labelEl && label) labelEl.textContent = label;
    if (valueEl && value !== undefined) valueEl.textContent = value;
    if (hintEl && hint) hintEl.textContent = hint;
  }

  function stabilizeFuelCards() {
    const total = incomingTotal();

    setCard(findCard([/إجمالي السولار المستلم/, /سولار مستلم/, /وقود وارد مسجل/]), {
      label: 'وقود وارد مسجل',
      value: fmt(total),
      hint: 'من سجل إضافة وقود وارد',
      className: 'official-incoming-fuel-kpi'
    });

    setCard(findCard([/السولار في المخزون/, /آخر رصيد فعلي/]), {
      label: 'آخر رصيد فعلي للمخزون',
      hint: 'آخر رصيد محفوظ في التقرير اليومي',
      className: 'official-stock-kpi'
    });

    setCard(findCard([/وقود مستهلك/, /إجمالي السولار المستهلك/]), {
      label: 'وقود مستهلك بالتقارير',
      hint: 'من التقارير اليومية المحفوظة',
      className: 'official-consumed-fuel-kpi'
    });
  }

  function stabilizeIncomingSection() {
    const section = document.getElementById('incomingFuelSection');
    if (!section) return;
    const total = incomingTotal();
    const small = section.querySelector('.fuel-head small');
    if (small) small.textContent = `إجمالي الوقود الوارد المسجل: ${fmt(total)} لتر`;
    section.querySelectorAll('.fuel-cleanup-btn').forEach(btn => btn.remove());
  }

  function softenWarningBadges() {
    document.querySelectorAll('.card-badge.warn').forEach(badge => {
      const text = badge.textContent || '';
      const match = text.match(/\d+/);
      badge.textContent = match ? `${match[0]} ملاحظة` : 'ملاحظة';
      badge.classList.add('soft-note-badge');
    });
  }

  function hideTechnicalWarnings() {
    document.querySelectorAll('.fuel-audit-notice').forEach(el => el.remove());
  }

  function stabilize() {
    document.body.classList.add('presentation-safe');
    document.documentElement.dataset.presentationVersion = VERSION;
    stabilizeFuelCards();
    stabilizeIncomingSection();
    softenWarningBadges();
    hideTechnicalWarnings();
  }

  let timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(stabilize, 80);
  }

  window.WaterPresentationStabilizer = { stabilize, version: VERSION };
  window.addEventListener('DOMContentLoaded', () => {
    stabilize();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    setInterval(stabilize, 1200);
  });
})();
