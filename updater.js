(function () {
  'use strict';

  var ipcRenderer = typeof require === 'function' ? require('electron').ipcRenderer : null;
  if (!ipcRenderer) return;

  function escapeText(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showUpdateToast(info) {
    var container = document.getElementById('toast-container');
    if (!container) return;

    var headline = info.versionChanged
      ? 'New Version is available: ' + escapeText(info.version)
      : 'Update Available ' + escapeText(info.lastUpdated);

    var promptLine = info.versionChanged
      ? 'Update Available (' + escapeText(info.lastUpdated) + '): install updates?'
      : 'Install updates now?';

    var toast = document.createElement('div');
    toast.className =
      'pointer-events-auto bg-studio-900 border border-amber-500/70 rounded-xl p-3.5 shadow-2xl max-w-sm text-xs text-slate-100 flex flex-col gap-2.5';

    toast.innerHTML =
      '<div class="flex items-start gap-2.5">' +
        '<span class="material-symbols-outlined text-amber-400 text-lg leading-none mt-0.5">system_update</span>' +
        '<div class="flex-1 min-w-0">' +
          '<div class="font-bold text-amber-300">' + headline + '</div>' +
          '<div id="update-toast-sub" class="text-slate-300 mt-0.5">' + promptLine + '</div>' +
        '</div>' +
      '</div>' +
      '<div id="update-toast-actions" class="flex justify-end gap-2">' +
        '<button id="btn-update-no" type="button" class="px-3 py-1 rounded-md bg-studio-800 hover:bg-studio-700 text-slate-300 font-semibold border border-studio-600 cursor-pointer">No</button>' +
        '<button id="btn-update-yes" type="button" class="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-studio-950 font-bold cursor-pointer">Yes</button>' +
      '</div>';

    container.appendChild(toast);

    var btnNo = toast.querySelector('#btn-update-no');
    var btnYes = toast.querySelector('#btn-update-yes');
    var subText = toast.querySelector('#update-toast-sub');
    var actionsRow = toast.querySelector('#update-toast-actions');

    btnNo.addEventListener('click', function () {
      toast.remove();
    });

    btnYes.addEventListener('click', async function () {
      btnYes.disabled = true;
      btnNo.disabled = true;
      subText.textContent = 'Downloading update from GitHub...';
      actionsRow.classList.add('hidden');

      var res = await ipcRenderer.invoke('update:install', info.installerUrl);
      if (!res || !res.ok) {
        subText.textContent = 'Update failed: ' + ((res && res.error) || 'Unknown error');
        actionsRow.classList.remove('hidden');
        btnYes.disabled = false;
        btnNo.disabled = false;
      } else {
        subText.textContent = 'Launching installer...';
      }
    });
  }

  window.addEventListener('load', function () {
    setTimeout(async function () {
      try {
        var info = await ipcRenderer.invoke('update:check');
        if (info && info.available) {
          showUpdateToast(info);
        }
      } catch (err) {
        console.warn('Update check failed:', err);
      }
    }, 2200);
  });
})();