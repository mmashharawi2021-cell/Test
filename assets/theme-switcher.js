(() => {
  const STORAGE_KEY = 'waterAppThemeMode';
  const LEGACY_KEY = 'waterAppTheme';
  const allowed = ['dark', 'light'];

  function cleanThemeClasses() {
    document.body.classList.remove(
      'theme-ocean', 'theme-midnight', 'theme-copper', 'theme-graphite',
      'theme-emerald', 'theme-sand', 'theme-iceblue', 'theme-dark', 'theme-light'
    );
  }

  function ensureModeSwitcher() {
    if (!document.body) return null;
    let dock = document.getElementById('modeSwitcher');
    if (!dock) {
      dock = document.createElement('div');
      dock.id = 'modeSwitcher';
      dock.className = 'mode-switcher';
      dock.innerHTML = `
        <button type="button" data-mode="dark" aria-label="الوضع المظلم" onclick="ThemeManager.saveUserTheme('dark')"><span>ليل</span></button>
        <button type="button" data-mode="light" aria-label="وضع النهار" onclick="ThemeManager.saveUserTheme('light')"><span>نهار</span></button>
      `;
      document.body.appendChild(dock);
    }
    return dock;
  }

  function applyTheme(theme) {
    const selected = allowed.includes(theme) ? theme : 'dark';
    cleanThemeClasses();
    document.body.classList.add(`theme-${selected}`);
    document.documentElement.dataset.theme = selected;
    try {
      localStorage.setItem(STORAGE_KEY, selected);
      localStorage.removeItem(LEGACY_KEY);
    } catch {}
    const dock = ensureModeSwitcher();
    if (dock) {
      dock.querySelectorAll('[data-mode]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === selected);
      });
    }
  }

  function getInitialTheme() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('mode') || params.get('theme');
    if (allowed.includes(fromUrl)) return fromUrl;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (allowed.includes(stored)) return stored;
    } catch {}
    return 'dark';
  }

  async function saveUserTheme(theme) {
    applyTheme(theme);
    try {
      if (!window.firebase || !firebase.auth || !firebase.firestore) return;
      const user = firebase.auth().currentUser;
      if (!user) return;
      await firebase.firestore().collection('userPreferences').doc(user.uid).set({
        themeMode: theme,
        theme: theme,
        userName: window.WATER_APP_SETTINGS?.defaultUserName || 'صالح الدحنون',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.warn('Theme mode preference was saved locally only.', error);
    }
  }

  async function loadUserTheme(user) {
    try {
      if (!user || !window.firebase || !firebase.firestore) return;
      const snap = await firebase.firestore().collection('userPreferences').doc(user.uid).get();
      const data = snap.exists ? snap.data() : {};
      const saved = data?.themeMode || data?.theme;
      if (allowed.includes(saved)) applyTheme(saved);
    } catch (error) {
      console.warn('Could not load remote theme mode preference.', error);
    }
  }

  window.ThemeManager = {
    allowed,
    applyTheme,
    saveUserTheme,
    loadUserTheme,
    current: () => document.documentElement.dataset.theme || 'dark'
  };

  if (document.body) applyTheme(getInitialTheme());
  else window.addEventListener('DOMContentLoaded', () => applyTheme(getInitialTheme()));
})();
