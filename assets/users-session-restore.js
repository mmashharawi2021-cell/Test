(() => {
  const USER_KEY = 'waterAppCurrentUser';

  function defaultAdminPayload() {
    const username = window.WATER_APP_SETTINGS?.defaultUserName || 'صالح الدحنون';
    return {
      id: 'local-default-admin',
      fullName: username,
      username,
      role: 'superAdmin',
      roleLabel: 'مدير النظام',
      active: true,
      permissions: window.AuthUsers?.ROLE_DEFINITIONS?.superAdmin?.permissions || {
        viewReports: true,
        createReports: true,
        editReports: true,
        deleteReports: true,
        exportPdf: true,
        exportExcel: true,
        shareWhatsapp: true,
        manageUsers: true,
        manageSettings: true
      }
    };
  }

  function restoreSessionUser() {
    if (!window.AuthUsers) return null;
    const current = window.AuthUsers.currentUser?.();
    if (current?.permissions) return current;

    // في حال بقاء جلسة Firebase Anonymous مفتوحة بعد تحديث الصفحة ولم تكن بيانات مستخدم النظام الداخلي محفوظة.
    const authUser = window.firebase?.auth?.().currentUser;
    if (authUser) {
      return window.AuthUsers.setCurrentUser(defaultAdminPayload());
    }
    return null;
  }

  function patchPermissions() {
    if (!window.AuthUsers || window.AuthUsers.__sessionRestorePatched) return;
    const originalCurrentUser = window.AuthUsers.currentUser;
    const originalHasPermission = window.AuthUsers.hasPermission;

    window.AuthUsers.currentUser = function patchedCurrentUser() {
      return originalCurrentUser?.() || restoreSessionUser();
    };

    window.AuthUsers.hasPermission = function patchedHasPermission(permission) {
      const user = window.AuthUsers.currentUser();
      if (user?.role === 'superAdmin') return true;
      return originalHasPermission?.(permission) === true;
    };

    window.AuthUsers.__sessionRestorePatched = true;
  }

  function boot() {
    patchPermissions();
    restoreSessionUser();
  }

  boot();
  window.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', boot);
  setTimeout(boot, 600);
})();
