(() => {
  const STORAGE_KEY = 'waterAppTheme';
  const allowed = ['default', 'graphite', 'emerald', 'sand', 'ocean', 'copper'];

  function cleanThemeClasses() {
    document.body.classList.remove(
      'theme-ocean',
      'theme-midnight',
      'theme-copper',
      'theme-graphite',
      'theme-emerald',
      'theme-sand'
    );
  }

  function applyTheme(theme) {
    const selected = allowed.includes(theme) ? theme : 'default';
    cleanThemeClasses();
    if (selected !== 'default') document.body.classList.add(`theme-${selected}`);
    document.documentElement.dataset.theme = selected;
    try { localStorage.setItem(STORAGE_KEY, selected); } catch {}
    document.querySelectorAll('[data-theme-dot]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeDot === selected);
    });
  }

  function getInitialTheme() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('theme');
    if (allowed.includes(fromUrl)) return fromUrl;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (allowed.includes(stored)) return stored;
    } catch {}
    return 'default';
  }

  async function saveUserTheme(theme) {
    applyTheme(theme);
    try {
      if (!window.firebase || !firebase.auth || !firebase.firestore) return;
      const user = firebase.auth().currentUser;
      if (!user) return;
      await firebase.firestore().collection('userPreferences').doc(user.uid).set({
        theme,
        userName: window.WATER_APP_SETTINGS?.defaultUserName || 'صالح الدحنون',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.warn('Theme preference was saved locally only.', error);
    }
  }

  async function loadUserTheme(user) {
    try {
      if (!user || !window.firebase || !firebase.firestore) return;
      const snap = await firebase.firestore().collection('userPreferences').doc(user.uid).get();
      const saved = snap.exists ? snap.data()?.theme : null;
      if (allowed.includes(saved)) applyTheme(saved);
    } catch (error) {
      console.warn('Could not load remote theme preference.', error);
    }
  }

  window.ThemeManager = {
    allowed,
    applyTheme,
    saveUserTheme,
    loadUserTheme,
    current: () => document.documentElement.dataset.theme || 'default'
  };

  if (document.body) applyTheme(getInitialTheme());
  else window.addEventListener('DOMContentLoaded', () => applyTheme(getInitialTheme()));
})();
