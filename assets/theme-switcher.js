(() => {
  const params = new URLSearchParams(window.location.search);
  const theme = params.get('theme');
  const allowed = ['ocean', 'midnight', 'copper'];
  if (allowed.includes(theme)) {
    document.body.classList.add(`theme-${theme}`);
  }
})();
