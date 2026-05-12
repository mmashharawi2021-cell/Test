(() => {
  function removeAuditButton() {
    document.querySelectorAll('[data-audit-button]').forEach(button => button.remove());
    document.querySelectorAll('button').forEach(button => {
      const text = button.textContent || '';
      if (text.includes('فحص البيانات') || text.includes('تنظيف المكرر')) button.remove();
    });
  }

  function cleanIncomingFuelSection() {
    const section = document.getElementById('incomingFuelSection');
    if (!section) return;
    section.querySelectorAll('.fuel-cleanup-btn').forEach(button => button.remove());
    const small = section.querySelector('.fuel-head small');
    if (small) {
      small.textContent = String(small.textContent || '').replace(/\s*—\s*تم إخفاء\s*\d+\s*سجل مكرر/g, '');
    }
  }

  function softenReportBadges() {
    document.querySelectorAll('.card-badge.warn').forEach(badge => {
      badge.textContent = 'مراجعة';
      badge.classList.add('review-soft-badge');
    });
  }

  function cleanUi() {
    removeAuditButton();
    cleanIncomingFuelSection();
    softenReportBadges();
    document.querySelectorAll('.fuel-audit-notice, #dataAuditModal, .audit-modal').forEach(element => element.remove());
  }

  function noop() {
    cleanUi();
  }

  window.WaterDataAudit = {
    open: noop,
    close: noop,
    setFilter: noop,
    injectButton: noop
  };

  window.addEventListener('DOMContentLoaded', () => {
    cleanUi();
    const observer = new MutationObserver(cleanUi);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
})();
