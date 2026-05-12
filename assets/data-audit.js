(() => {
  function removeAuditButton() {
    document.querySelectorAll('[data-audit-button]').forEach(button => button.remove());
    document.querySelectorAll('button').forEach(button => {
      if ((button.textContent || '').includes('فحص البيانات')) button.remove();
    });
  }

  function noop() {
    removeAuditButton();
  }

  window.WaterDataAudit = {
    open: noop,
    close: noop,
    setFilter: noop,
    injectButton: noop
  };

  window.addEventListener('DOMContentLoaded', () => {
    removeAuditButton();
    const observer = new MutationObserver(removeAuditButton);
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
