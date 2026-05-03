(() => {
  function patchReportFormTimeInputs() {
    if (!window.AppUI || window.AppUI.__timeExportPatched) return;

    const originalReportForm = window.AppUI.reportForm;
    window.AppUI.reportForm = function patchedReportForm(...args) {
      return originalReportForm(...args)
        .replace('name="generatorStart" type="time"', 'name="generatorStart" type="text" inputmode="numeric" class="time-field" placeholder="06:25 ص"')
        .replace('name="generatorEnd" type="time"', 'name="generatorEnd" type="text" inputmode="numeric" class="time-field" placeholder="03:25 م"')
        .replace('وقت التشغيل<input', 'وقت التشغيل <small class="time-hint">مثال: 06:25 ص</small><input')
        .replace('وقت الإيقاف<input', 'وقت الإيقاف <small class="time-hint">مثال: 03:25 م</small><input');
    };

    window.AppUI.__timeExportPatched = true;
  }

  patchReportFormTimeInputs();
})();
