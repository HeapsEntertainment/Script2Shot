
  function resetProjectToDefaults() {
    state.projectTitle = 'Untitled Project';
    state.director = '';
    state.producer = '';
    state.projectFormat = 'live-ff';
    var preset = window.FORMAT_PRESETS['live-ff'];
    state.avgSetupMins = preset.defaultSetupMins;
    state.coverageMode = 'full';
    state.includeSluglineShots = true;
    state.fps = 24;
    state.renderEngine = 'eevee';
    state.renderQuality = '1080p_med';
    state.renderRateSecPerSec = 12;
    state.customResWidth = 2560;
    state.customResHeight = 1440;
    state.targetRuntimeSec = null;
    state.leftPaneWidthPct = 40;
    state.scriptCollapsed = false;
    state.customShotTypes = {};
    state.customMovements = [];
    state.currentFilePath = null;
    state.hasUnsavedChanges = false;
    
    // Clear undo/redo history stack for new project
    undoStack = [];
    redoStack = [];
    updateUndoRedoButtons();
  }

  // Lightweight non-crashing error boundary
  window.onerror = function (message) {
    try {
      var badge = document.getElementById('save-text');
      if (badge) badge.textContent = 'Recovered';
    } catch (_) {}
    console.warn('Script2Shot handled error:', message);
    return true;
  };

  // Native Node / Electron File System Bridge
  var fs = typeof require === 'function' ? require('fs') : null;
  var nodePath = typeof require === 'function' ? require('path') : null;
  var ipcRenderer = typeof require === 'function' ? require('electron').ipcRenderer : null;
  var RECENT_FILES_KEY = 'script2shot_recent_files_v2';

  function getRecentFiles() {
    try {
      var raw = localStorage.getItem(RECENT_FILES_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    try {
      var old = localStorage.getItem(RECENT_FILE_KEY);
      if (old) return [old];
    } catch (e) {}
    return [];
  }

  function addRecentFile(filePath) {
    if (!filePath) return;
    
    // Prevent templates folder files from polluting recent files
    if (nodePath && filePath.includes(nodePath.join(__dirname, 'templates'))) {
      return;
    }

    var list = getRecentFiles();
    list = list.filter(function (p) { return p !== filePath; });
    list.unshift(filePath);
    if (list.length > 10) list = list.slice(0, 10);
    try {
      localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function clearRecentFiles() {
    try {
      localStorage.removeItem(RECENT_FILES_KEY);
      localStorage.removeItem(RECENT_FILE_KEY);
    } catch (e) {}
  }

  function showRecentContextMenu(x, y) {
    var existing = document.getElementById('recent-context-menu');
    if (existing) existing.remove();

    var menu = document.createElement('div');
    menu.id = 'recent-context-menu';
    menu.className = 'fixed bg-studio-900 border border-studio-600 rounded-lg shadow-2xl py-1 z-50 text-xs text-slate-200';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    menu.innerHTML = 
      '<button type="button" id="ctx-view-recents" class="w-full text-left px-4 py-2 hover:bg-studio-800 flex items-center gap-2 cursor-pointer">' +
        '<span class="material-symbols-outlined text-sm text-sky-400">list</span>' +
        '<span>View Recents</span>' +
      '</button>' +
      '<button type="button" id="ctx-clear-recents" class="w-full text-left px-4 py-2 hover:bg-studio-800 text-red-400 flex items-center gap-2 cursor-pointer border-t border-studio-800">' +
        '<span class="material-symbols-outlined text-sm">delete_sweep</span>' +
        '<span>Clear Recents List</span>' +
      '</button>';

    document.body.appendChild(menu);

    document.getElementById('ctx-view-recents').onclick = function () {
      menu.remove();
      openRecentsModal();
    };

    document.getElementById('ctx-clear-recents').onclick = function () {
      menu.remove();
      clearRecentFiles();
      var btnStartRecent = document.getElementById('btn-start-recent');
      if (btnStartRecent) btnStartRecent.classList.add('hidden');
      showToast('Cleared recent files list.', 'info');
    };

    function closeMenu(ev) {
      if (!menu.contains(ev.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    }
    setTimeout(function () {
      document.addEventListener('click', closeMenu);
    }, 10);
  }

  function openRecentsModal() {
    var startupModal = document.getElementById('startup-modal');
    var wasStartupOpen = startupModal && !startupModal.classList.contains('hidden');

    if (startupModal) startupModal.classList.add('hidden');

    var files = getRecentFiles().filter(function (p) { return fs && fs.existsSync(p); });
    if (!files.length) {
      showToast('No valid recent files found on disk.', 'warn');
      if (wasStartupOpen && startupModal) startupModal.classList.remove('hidden');
      return;
    }
    
    var listHtml = files.map(function (filePath) {
      var name = nodePath ? nodePath.basename(filePath) : filePath;
      return '<div class="flex items-center justify-between bg-studio-950 border border-studio-800 rounded-lg p-2.5 hover:border-amber-500 transition cursor-pointer recent-item-row" data-path="' + escapeHTML(filePath) + '">' +
        '<div class="min-w-0 flex-1">' +
          '<div class="font-semibold text-white truncate text-xs">' + escapeHTML(name) + '</div>' +
          '<div class="text-[10px] text-slate-400 truncate font-mono">' + escapeHTML(filePath) + '</div>' +
        '</div>' +
        '<span class="material-symbols-outlined text-amber-400 text-base ml-2">folder_open</span>' +
      '</div>';
    }).join('');

    var html = '<div class="space-y-3 max-h-[60vh] overflow-y-auto pr-1">' +
      '<p class="text-xs text-slate-300">Select a recent project or screenplay to open:</p>' +
      '<div class="space-y-2">' + listHtml + '</div>' +
      '<div class="pt-3 border-t border-studio-800 flex justify-between items-center">' +
        '<button type="button" id="modal-clear-all-recents" class="text-xs text-red-400 hover:text-red-300 underline cursor-pointer font-medium">Clear All Recents</button>' +
      '</div>' +
    '</div>';

    var infoModal = document.getElementById('info-modal');
    var infoTitle = document.getElementById('info-modal-title');
    var infoBody = document.getElementById('info-modal-body');
    var btnOkInfo = document.getElementById('btn-ok-info');

    if (infoModal && infoBody) {
      if (infoTitle) infoTitle.textContent = 'Recent Files (' + files.length + ')';
      infoBody.innerHTML = html;
      if (btnOkInfo) btnOkInfo.classList.add('hidden');
      infoModal.classList.remove('hidden');

      infoBody.onclick = function (e) {
        var row = e.target.closest('.recent-item-row');
        if (row) {
          var p = row.getAttribute('data-path');
          infoModal.classList.add('hidden');
          loadFileFromDiskPath(p);
          return;
        }
        if (e.target.id === 'modal-clear-all-recents') {
          clearRecentFiles();
          infoModal.classList.add('hidden');
          var btnStartRecent = document.getElementById('btn-start-recent');
          if (btnStartRecent) btnStartRecent.classList.add('hidden');
          if (wasStartupOpen && startupModal) startupModal.classList.remove('hidden');
          showToast('Cleared recent files list.', 'info');
          return;
        }
      };
    }

    var btnCloseInfo = document.getElementById('btn-close-info');
    if (btnCloseInfo) {
      btnCloseInfo.onclick = function () {
        infoModal.classList.add('hidden');
        if (wasStartupOpen && startupModal) {
          startupModal.classList.remove('hidden');
        }
      };
    }
  }

  var scriptUndoStack = [];
  var scriptRedoStack = [];
  var isProgrammaticScriptChange = false;

  function pushScriptUndoSnapshot(val) {
    if (isProgrammaticScriptChange) return;
    var last = scriptUndoStack[scriptUndoStack.length - 1];
    if (last !== val) {
      scriptUndoStack.push(val);
      if (scriptUndoStack.length > 50) scriptUndoStack.shift();
      scriptRedoStack = [];
      updateScriptUndoRedoButtons();
    }
  }

  function updateScriptUndoRedoButtons() {
    var bUndo = document.getElementById('btn-script-undo');
    var bRedo = document.getElementById('btn-script-redo');
    if (bUndo) bUndo.disabled = scriptUndoStack.length === 0;
    if (bRedo) bRedo.disabled = scriptRedoStack.length === 0;
  }

  var BASE_SHOT_TYPES = {
    'EWS':      { name: 'Extreme Wide Shot', weight: 1.45, desc: 'Vast environment or exterior architecture; subjects appear small in frame.', why: 'Establishes geography, scale, and atmosphere.' },
    'WS':       { name: 'Wide Shot', weight: 1.35, desc: 'Full head-to-toe subjects and their immediate surroundings.', why: 'Establishes spatial layout and character blocking.' },
    'FS':       { name: 'Full Shot', weight: 1.15, desc: 'Frames character completely from head to toe with tight headroom.', why: 'Highlights full-body posture, wardrobe, or movement.' },
    'MWS':      { name: 'Medium Wide Shot', weight: 1.05, desc: 'Frames subject from roughly knees/mid-thigh up (Cowboy framing).', why: 'Balances body language with facial readability.' },
    'MS':       { name: 'Medium Shot', weight: 1.00, desc: 'Frames subject from waist up; standard conversational framing.', why: 'Neutral, natural coverage for dialogue and gestures.' },
    'MCU':      { name: 'Medium Close-Up', weight: 0.90, desc: 'Frames subject from chest/shoulders up.', why: 'Intimate emotional connection while retaining shoulder posture.' },
    'CU':       { name: 'Close-Up', weight: 0.80, desc: 'Tightly frames the face or key object, filling the frame.', why: 'Captures subtle micro-expressions and dramatic turns.' },
    'ECU':      { name: 'Extreme Close-Up', weight: 0.65, desc: 'Isolates a small detail (eyes, trigger finger, ticking watch).', why: 'Heightens tension and directs attention to vital clues.' },
    'INS':      { name: 'Insert / Cutaway Detail', weight: 0.65, desc: 'Dedicated detail shot of a prop, text, screen, or hand action.', why: 'Clarifies story information and provides clean edit cutaways.' },
    'OTS':      { name: 'Over-The-Shoulder', weight: 0.95, desc: 'Looks past the shoulder/head of one character toward another.', why: 'Connects two speakers spatially in dialogue scenes.' },
    'POV':      { name: 'Point of View', weight: 0.90, desc: 'Camera represents what a character is directly looking at.', why: 'Places audience inside the character\'s subjective perspective.' },
    'TWO-SHOT': { name: 'Two-Shot', weight: 1.10, desc: 'Frames two subjects together in a single balanced composition.', why: 'Shows relationship dynamics and simultaneous reactions.' }
  };

  var BASE_MOVEMENTS = [
    'Static', 'Pan', 'Tilt', 'Dolly', 'Track', 'Handheld', 'Steadicam', 'Crane / Jib', 'Zoom'
  ];

  var CAMERA_ANGLES = [
    'Eye Level', 'High Angle', 'Low Angle', 'Dutch', 'Overhead'
  ];

  var CAMERA_RULES = [
    { regex: /\b(EXTREME CLOSE[- ]?UP|ECU)\b/i, size: 'ECU' },
    { regex: /\b(CLOSE ON|CLOSE[- ]?UP|CU)\b/i, size: 'CU' },
    { regex: /\b(MEDIUM CLOSE[- ]?UP|MCU)\b/i, size: 'MCU' },
    { regex: /\b(MEDIUM WIDE|MWS)\b/i, size: 'MWS' },
    { regex: /\b(MEDIUM SHOT|MS)\b/i, size: 'MS' },
    { regex: /\b(EXTREME WIDE|EWS)\b/i, size: 'EWS' },
    { regex: /\b(WIDE SHOT|ESTABLISHING|WS)\b/i, size: 'WS' },
    { regex: /\b(FULL SHOT|FS)\b/i, size: 'FS' },
    { regex: /\b(INSERT|DETAIL SHOT|INS)\b/i, size: 'INS' },
    { regex: /\b(OVER[- ]THE[- ]SHOULDER|OTS)\b/i, size: 'OTS' },
    { regex: /\b(POV|POINT OF VIEW)\b/i, size: 'POV' },
    { regex: /\b(TWO[- ]?SHOT|2[- ]?SHOT)\b/i, size: 'TWO-SHOT' },
    { regex: /\b(ANGLE ON)\b/i, size: 'MS' },
    { regex: /\b(LOW ANGLE)\b/i, angle: 'Low Angle' },
    { regex: /\b(HIGH ANGLE)\b/i, angle: 'High Angle' },
    { regex: /\b(DUTCH|CANTED)\b/i, angle: 'Dutch' },
    { regex: /\b(OVERHEAD|BIRD'?S EYE|TOP DOWN)\b/i, angle: 'Overhead' },
    { regex: /\b(TRACKING|TRACK)\b/i, movement: 'Track' },
    { regex: /\b(DOLLY|PUSH IN|PULL BACK)\b/i, movement: 'Dolly' },
    { regex: /\b(PAN|PANS)\b/i, movement: 'Pan' },
    { regex: /\b(TILT|TILTS)\b/i, movement: 'Tilt' },
    { regex: /\b(HANDHELD|SHAKY)\b/i, movement: 'Handheld' },
    { regex: /\b(STEADICAM)\b/i, movement: 'Steadicam' },
    { regex: /\b(CRANE|JIB)\b/i, movement: 'Crane / Jib' },
    { regex: /\b(ZOOM|ZOOMS)\b/i, movement: 'Zoom' }
  ];

  var HIGHLIGHT_REGEX = /\b(EXTREME CLOSE[- ]?UP|ECU|CLOSE ON|CLOSE[- ]?UP|CU|MEDIUM CLOSE[- ]?UP|MCU|MEDIUM WIDE|MWS|MEDIUM SHOT|MS|EXTREME WIDE|EWS|WIDE SHOT|ESTABLISHING|WS|FULL SHOT|FS|INSERT|DETAIL SHOT|OVER[- ]THE[- ]SHOULDER|OTS|POV|POINT OF VIEW|TWO[- ]?SHOT|2[- ]?SHOT|ANGLE ON|LOW ANGLE|HIGH ANGLE|DUTCH|OVERHEAD|TRACKING SHOT|TRACKING|DOLLY|PAN|TILT|HANDHELD|STEADICAM|CRANE|JIB|ZOOM)\b/gi;

  var state = {
    projectTitle: 'Untitled Project',
    director: '',
    producer: '',
    projectFormat: 'live-ff',
    currentFilePath: null,
    hasUnsavedChanges: false,
    coverageMode: 'full',
    includeSluglineShots: true,
    avgSetupMins: 15,
    fps: 24,
    renderEngine: 'eevee',
    renderQuality: '1080p_med',
    customResWidth: 2560,
    customResHeight: 1440,
    renderRateSecPerSec: 12,
    targetRuntimeSec: null,
    leftPaneWidthPct: 40,
    scriptCollapsed: false,
    rawScript: 'INT. LOCATION - DAY\n\n',
    customShotTypes: {},
    customMovements: [],
    brandingProfiles: [
      { id: 'b-default', name: 'Default Studio', company: 'Independent Film Group', tagline: 'All Rights Reserved', logoText: 'STUDIO 24' }
    ],
    parsedScenes: [],
    parsedElements: [],
    shots: [],
    selectedScript: null,
    filterScene: 'ALL',
    filterSize: 'ALL',
    searchQuery: '',
    activeLeftTab: 'interactive'
  };

  var undoStack = [];
  var redoStack = [];
  var MAX_STACK = 50;

  function pushUndoSnapshot() {
    undoStack.push(JSON.stringify(state.shots));
    if (undoStack.length > MAX_STACK) undoStack.shift();
    redoStack = [];
    updateUndoRedoButtons();
  }

  function updateUndoRedoButtons() {
    var btnUndo = document.getElementById('btn-undo');
    var btnRedo = document.getElementById('btn-redo');
    if (btnUndo) btnUndo.disabled = undoStack.length === 0;
    if (btnRedo) btnRedo.disabled = redoStack.length === 0;
  }

  function performUndo() {
    if (!undoStack.length) return;
    redoStack.push(JSON.stringify(state.shots));
    var prev = undoStack.pop();
    state.shots = JSON.parse(prev).map(function (s) { return createShot(s); });
    renderShotlistTable();
    queueAutoSave();
    updateUndoRedoButtons();
    showToast('Undo performed.', 'info');
  }

  function performRedo() {
    if (!redoStack.length) return;
    undoStack.push(JSON.stringify(state.shots));
    var next = redoStack.pop();
    state.shots = JSON.parse(next).map(function (s) { return createShot(s); });
    renderShotlistTable();
    queueAutoSave();
    updateUndoRedoButtons();
    showToast('Redo performed.', 'info');
  }

  var autoSaveTimer = null;

  function escapeHTML(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function toTitleCase(str) {
    return String(str || '').toLowerCase().replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    });
  }

  function isRenderMedium() {
    var preset = window.FORMAT_PRESETS[state.projectFormat] || window.FORMAT_PRESETS['live-ff'];
    return Boolean(preset.isRenderMedium);
  }

  function showToast(msg, tone) {
    var container = document.getElementById('toast-container');
    if (!container) return;
    var el = document.createElement('div');
    var palette = {
      success: 'bg-emerald-950/95 border-emerald-500/70 text-emerald-100',
      warn: 'bg-amber-950/95 border-amber-500 text-amber-100',
      info: 'bg-studio-800 border-amber-500/60 text-slate-100'
    };
    el.className = 'pointer-events-auto border px-3.5 py-2 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2 transition-opacity duration-200 ' + (palette[tone] || palette.info);
    el.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span><span>' + escapeHTML(msg) + '</span>';
    container.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 220);
    }, 2600);
  }

  function openConfirm(title, message, onConfirm) {
    var modal = document.getElementById('confirm-modal');
    var titleEl = document.getElementById('confirm-title');
    var msgEl = document.getElementById('confirm-msg');
    var inputWrap = document.getElementById('confirm-input-wrap');
    var okBtn = document.getElementById('btn-confirm-ok');
    var cancelBtn = document.getElementById('btn-confirm-cancel');
    if (!modal || !okBtn || !cancelBtn) return;

    if (inputWrap) inputWrap.classList.add('hidden');
    titleEl.textContent = title;
    msgEl.textContent = message;
    modal.classList.remove('hidden');

    function close() {
      modal.classList.add('hidden');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    }
    okBtn.onclick = function () {
      close();
      if (typeof onConfirm === 'function') onConfirm();
    };
    cancelBtn.onclick = close;
  }

  function openChoiceModal(title, message, yesLabel, noLabel, onYes, onNo) {
    var modal = document.getElementById('confirm-modal');
    var titleEl = document.getElementById('confirm-title');
    var msgEl = document.getElementById('confirm-msg');
    var inputWrap = document.getElementById('confirm-input-wrap');
    var okBtn = document.getElementById('btn-confirm-ok');
    var cancelBtn = document.getElementById('btn-confirm-cancel');
    if (!modal || !okBtn || !cancelBtn) return;

    if (inputWrap) inputWrap.classList.add('hidden');
    var origOkText = okBtn.textContent;
    var origCancelText = cancelBtn.textContent;

    titleEl.textContent = title;
    msgEl.textContent = message;
    okBtn.textContent = yesLabel || 'Yes';
    cancelBtn.textContent = noLabel || 'No';
    modal.classList.remove('hidden');

    function cleanup() {
      modal.classList.add('hidden');
      okBtn.textContent = origOkText;
      cancelBtn.textContent = origCancelText;
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    }

    okBtn.onclick = function () {
      cleanup();
      if (typeof onYes === 'function') onYes();
    };
    cancelBtn.onclick = function () {
      cleanup();
      if (typeof onNo === 'function') onNo();
    };
  }

  function openRuntimePromptModal() {
    var modal = document.getElementById('confirm-modal');
    var titleEl = document.getElementById('confirm-title');
    var msgEl = document.getElementById('confirm-msg');
    var inputWrap = document.getElementById('confirm-input-wrap');
    var textInput = document.getElementById('confirm-text-input');
    var okBtn = document.getElementById('btn-confirm-ok');
    var cancelBtn = document.getElementById('btn-confirm-cancel');
    if (!modal || !inputWrap || !textInput || !okBtn || !cancelBtn) return;

    var currentSec = getTotalProjectScreenSeconds();
    var m = Math.floor(currentSec / 60);
    var s = Math.round(currentSec % 60);

    var origOkText = okBtn.textContent;
    titleEl.textContent = 'Edit Target Screen Runtime';
    msgEl.textContent = 'Set the total finished runtime for this project. All scene and shot Screen (s) durations will scale proportionally.';
    inputWrap.classList.remove('hidden');
    textInput.value = m + ':' + String(s).padStart(2, '0');
    okBtn.textContent = 'Scale & Apply';
    modal.classList.remove('hidden');
    textInput.focus();
    textInput.select();

    function cleanup() {
      modal.classList.add('hidden');
      inputWrap.classList.add('hidden');
      okBtn.textContent = origOkText;
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    }

    okBtn.onclick = function () {
      var raw = textInput.value.trim();
      var parsedSec = 0;
      if (raw.indexOf(':') !== -1) {
        var parts = raw.split(':');
        parsedSec = (parseInt(parts[0], 10) || 0) * 60 + (parseFloat(parts[1]) || 0);
      } else {
        parsedSec = parseFloat(raw) || 0;
      }
      cleanup();
      if (parsedSec <= 0) {
        showToast('Enter a valid runtime greater than 0.', 'warn');
        return;
      }
      scaleProjectToTargetRuntime(parsedSec);
    };
    cancelBtn.onclick = cleanup;
  }

  function openScriptImportModal(fileName, content, filePath) {
    resetProjectToDefaults();
    state.projectTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');

    var modal = document.getElementById('import-options-modal');
    var nameEl = document.getElementById('import-modal-filename');
    var titleEl = document.getElementById('import-modal-title');
    var fmtEl = document.getElementById('import-modal-format');
    var modeEl = document.getElementById('import-modal-mode');
    var slugChk = document.getElementById('import-modal-slugline-shots');
    var btnClose = document.getElementById('btn-close-import-modal');
    var btnCancel = document.getElementById('btn-cancel-import-modal');
    var btnConfirm = document.getElementById('btn-confirm-import-modal');
    
    if (!modal) {
      state.rawScript = content;
      state.currentFilePath = filePath || null;
      state.targetRuntimeSec = null;
      undoStack = [];
      redoStack = [];
      updateUndoRedoButtons();
      syncControlsFromState();
      parseAndRender(false);
      updateSaveBadge(filePath ? 'saved' : 'dirty');
      showToast('Imported screenplay "' + fileName + '".', 'success');
      return;
    }

    if (nameEl) nameEl.textContent = fileName;
    if (titleEl) titleEl.value = state.projectTitle;
    if (fmtEl) fmtEl.value = state.projectFormat;
    if (modeEl) modeEl.value = state.coverageMode;
    if (slugChk) slugChk.checked = state.includeSluglineShots;

    modal.classList.remove('hidden');

    function cleanup() {
      modal.classList.add('hidden');
      if (btnClose) btnClose.onclick = null;
      if (btnCancel) btnCancel.onclick = null;
      if (btnConfirm) btnConfirm.onclick = null;
    }

    if (btnClose) btnClose.onclick = cleanup;
    if (btnCancel) btnCancel.onclick = cleanup;

    if (btnConfirm) {
      btnConfirm.onclick = function () {
        var newTitle = titleEl ? titleEl.value.trim() : state.projectTitle;
        var newFormat = fmtEl ? fmtEl.value : state.projectFormat;
        var newMode = modeEl ? modeEl.value : state.coverageMode;
        var newSlug = slugChk ? slugChk.checked : state.includeSluglineShots;

        cleanup();

        state.projectTitle = newTitle || 'Untitled Project';
        state.projectFormat = newFormat;
        var preset = window.FORMAT_PRESETS[newFormat] || window.FORMAT_PRESETS['live-ff'];
        state.avgSetupMins = preset.defaultSetupMins;
        state.coverageMode = newMode;
        state.includeSluglineShots = newSlug;
        state.rawScript = content;
        state.currentFilePath = filePath || null;
        state.targetRuntimeSec = null;

        syncControlsFromState();
        parseAndRender(false);
        updateSaveBadge(filePath ? 'saved' : 'dirty');
        showToast('Imported screenplay "' + fileName + '" (' + state.shots.length + ' shots).', 'success');
      };
    }
  }

  function getAllShotTypes() {
    var preset = window.FORMAT_PRESETS[state.projectFormat] || window.FORMAT_PRESETS['live-ff'];
    var map = {};
    Object.keys(BASE_SHOT_TYPES).forEach(function (code) {
      var base = BASE_SHOT_TYPES[code];
      var def = preset.defaults[code] || { lens: '50mm', mins: state.avgSetupMins || 15 };
      map[code] = {
        code: code,
        name: base.name,
        weight: base.weight || 1.0,
        desc: base.desc,
        why: base.why,
        lens: def.lens,
        mins: def.mins,
        isCustom: false
      };
    });
    Object.keys(state.customShotTypes || {}).forEach(function (code) {
      var cust = state.customShotTypes[code];
      if (!cust) return;
      map[code] = {
        code: code,
        name: cust.name || code,
        weight: 1.0,
        desc: cust.desc || 'Custom shot framing.',
        why: 'Custom user-defined shot type.',
        lens: cust.lens || '50mm',
        mins: Number(cust.mins) || state.avgSetupMins || 15,
        isCustom: true
      };
    });
    return map;
  }

  function getShotDefaults(code) {
    var all = getAllShotTypes();
    if (all[code]) {
      return { lens: all[code].lens, mins: all[code].mins };
    }
    return { lens: '50mm', mins: Number(state.avgSetupMins) || 15 };
  }

  function getAllMovements() {
    var list = BASE_MOVEMENTS.slice();
    (state.customMovements || []).forEach(function (mv) {
      if (mv && list.indexOf(mv) === -1) list.push(mv);
    });
    return list;
  }

  function getAllLenses(extraLens) {
    var preset = window.FORMAT_PRESETS[state.projectFormat] || window.FORMAT_PRESETS['live-ff'];
    var list = preset.lenses.slice();
    Object.keys(state.customShotTypes || {}).forEach(function (code) {
      var ln = state.customShotTypes[code].lens;
      if (ln && list.indexOf(ln) === -1) list.push(ln);
    });
    if (extraLens && list.indexOf(extraLens) === -1) {
      list.push(extraLens);
    }
    return list;
  }

  function buildProjectPayload() {
    var ta = document.getElementById('textarea-script');
    if (state.activeLeftTab === 'editor' && ta) state.rawScript = ta.value;
    return {
      version: 4,
      savedAt: new Date().toISOString(),
      projectTitle: state.projectTitle,
      director: state.director,
      producer: state.producer,
      projectFormat: state.projectFormat,
      coverageMode: state.coverageMode,
      includeSluglineShots: state.includeSluglineShots,
      avgSetupMins: state.avgSetupMins,
      fps: state.fps,
      renderEngine: state.renderEngine,
      renderQuality: state.renderQuality,
      customResWidth: state.customResWidth,
      customResHeight: state.customResHeight,
      renderRateSecPerSec: state.renderRateSecPerSec,
      targetRuntimeSec: state.targetRuntimeSec,
      leftPaneWidthPct: state.leftPaneWidthPct,
      scriptCollapsed: state.scriptCollapsed,
      rawScript: state.rawScript,
      customShotTypes: state.customShotTypes,
      customMovements: state.customMovements,
      shots: state.shots
    };
  }

  function updateSaveBadge(status) {
    var badge = document.getElementById('save-badge');
    var dot = document.getElementById('save-dot');
    var txt = document.getElementById('save-text');
    if (!dot || !txt || !badge) return;

    if (status === 'saving') {
      dot.className = 'w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse';
      txt.textContent = 'Saving...';
    } else if (status === 'saved') {
      var now = new Date();
      var hh = String(now.getHours()).padStart(2, '0');
      var mm = String(now.getMinutes()).padStart(2, '0');
      dot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400';
      txt.textContent = 'Saved ' + hh + ':' + mm;
      badge.title = state.currentFilePath || 'Saved to disk';
    } else if (status === 'dirty') {
      dot.className = 'w-1.5 h-1.5 rounded-full bg-amber-400';
      txt.textContent = 'Unsaved Project *';
    } else {
      dot.className = 'w-1.5 h-1.5 rounded-full bg-amber-400';
      txt.textContent = 'Unsaved Project';
      badge.title = 'Click File > Save File (Ctrl+S) to link a file on disk';
    }
  }

  function writeProjectToFile(filePath, showNotification) {
    if (!fs || !filePath) return false;
    try {
      var payload = buildProjectPayload();
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
      state.currentFilePath = filePath;
      state.hasUnsavedChanges = false;
      addRecentFile(filePath);
      updateSaveBadge('saved');
      if (showNotification) {
        showToast('Saved to ' + nodePath.basename(filePath), 'success');
      }
      return true;
    } catch (err) {
      showToast('Failed to save file: ' + err.message, 'warn');
      return false;
    }
  }

  async function saveProjectFile(showNotification) {
    if (state.currentFilePath) {
      return writeProjectToFile(state.currentFilePath, showNotification);
    } else {
      return await saveProjectAs();
    }
  }

  async function saveProjectAs() {
    if (!ipcRenderer) {
      showToast('Save As is only supported in desktop app mode.', 'warn');
      return false;
    }
    try {
      var defaultName = (state.projectTitle || 'Untitled Project').replace(/[\\/:*?"<>|]+/g, '').trim() + '.s2s';
      var chosenPath = await ipcRenderer.invoke('dialog:save-project', defaultName);
      if (chosenPath) {
        return writeProjectToFile(chosenPath, true);
      }
    } catch (err) {
      showToast('Failed to save file as: ' + err.message, 'warn');
    }
    return false;
  }

  function queueAutoSave() {
    state.hasUnsavedChanges = true;
    if (!state.currentFilePath) {
      updateSaveBadge('dirty');
      return;
    }
    updateSaveBadge('saving');
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(function () {
      writeProjectToFile(state.currentFilePath, false);
    }, 650);
  }

  function loadFileFromDiskPath(filePath) {
    if (!fs || !filePath || !fs.existsSync(filePath)) {
      showToast('File not found on disk.', 'warn');
      return false;
    }
    try {
      var content = fs.readFileSync(filePath, 'utf8');
      var fileName = nodePath.basename(filePath);

      if (filePath.toLowerCase().endsWith('.json') || filePath.toLowerCase().endsWith('.s2s')) {
        var data = JSON.parse(content);
        if (!Array.isArray(data.shots)) throw new Error('Invalid project JSON.');

        state.projectTitle = data.projectTitle || 'Untitled Project';
        state.director = data.director || '';
        state.producer = data.producer || '';
        state.projectFormat = (data.projectFormat && window.FORMAT_PRESETS[data.projectFormat]) ? data.projectFormat : 'live-ff';
        state.coverageMode = data.coverageMode || 'full';
        state.includeSluglineShots = typeof data.includeSluglineShots === 'boolean' ? data.includeSluglineShots : true;
        state.avgSetupMins = Number(data.avgSetupMins) || 15;
        state.fps = Number(data.fps) || 24;
        state.renderEngine = data.renderEngine || 'eevee';
        state.renderQuality = data.renderQuality || '1080p_med';
        state.renderRateSecPerSec = Number(data.renderRateSecPerSec) || 12;
        state.targetRuntimeSec = data.targetRuntimeSec ? Number(data.targetRuntimeSec) : null;
        state.leftPaneWidthPct = Number(data.leftPaneWidthPct) || 40;
        state.scriptCollapsed = Boolean(data.scriptCollapsed);
        state.customShotTypes = data.customShotTypes || {};
        state.customMovements = Array.isArray(data.customMovements) ? data.customMovements : [];
        state.rawScript = data.rawScript || '';
        state.currentFilePath = filePath;
        state.hasUnsavedChanges = false;

        syncControlsFromState();
        var parsed = parseScreenplay(state.rawScript, state.coverageMode);
        state.parsedScenes = parsed.scenes;
        state.parsedElements = parsed.elements;
        state.shots = data.shots.map(function (s) { return createShot(s); });
        
        undoStack = [];
        redoStack = [];
        updateUndoRedoButtons();

        renderInteractiveScript();
        renderShotlistTable();
        try { localStorage.setItem(RECENT_FILE_KEY, filePath); } catch (e) {}
        addRecentFile(filePath);
        updateSaveBadge('saved');
        showToast('Opened "' + fileName + '" (Auto-save active).', 'success');
      } else {
        openScriptImportModal(fileName, content, null);
      }
      return true;
    } catch (err) {
      showToast('Failed to open file: ' + err.message, 'warn');
      return false;
    }
  }

  async function openProjectDialog() {
    if (!ipcRenderer) return false;
    var chosenPath = await ipcRenderer.invoke('dialog:open-project');
    if (!chosenPath) return false;
    return loadFileFromDiskPath(chosenPath);
  }

  function syncControlsFromState() {
    var titleEl = document.getElementById('input-project-title');
    if (titleEl) titleEl.value = state.projectTitle;
    var fmtEl = document.getElementById('select-format');
    if (fmtEl) fmtEl.value = state.projectFormat;
    var modeEl = document.getElementById('select-mode');
    if (modeEl) modeEl.value = state.coverageMode;
    var slugChk = document.getElementById('chk-slugline-shots');
    if (slugChk) slugChk.checked = state.includeSluglineShots;
    var avgEl = document.getElementById('input-avg-setup');
    if (avgEl) avgEl.value = String(state.avgSetupMins);
    var fpsEl = document.getElementById('input-fps');
    if (fpsEl) fpsEl.value = String(state.fps);
    var engEl = document.getElementById('select-render-engine');
    if (engEl) engEl.value = state.renderEngine;
    var qualEl = document.getElementById('select-render-quality');
    if (qualEl) qualEl.value = state.renderQuality;
    var rateEl = document.getElementById('input-render-rate');
    if (rateEl) rateEl.value = String(state.renderRateSecPerSec);
    var ta = document.getElementById('textarea-script');
    if (ta) ta.value = state.rawScript;
    var dirEl = document.getElementById('input-director');
    if (dirEl) dirEl.value = state.director || '';
    var prodEl = document.getElementById('input-producer');
    if (prodEl) prodEl.value = state.producer || '';
    applyLeftPaneLayout();
  }

  function calculateNaturalScriptSeconds(rawScript, elements) {
    if (!rawScript || !rawScript.trim()) return 0;

    var nonEmptyLines = rawScript.split(/\r?\n/).filter(function (l) {
      var t = l.trim();
      return t.length > 0 && t.charAt(0) !== '#' && t.charAt(0) !== '=';
    });
    var estimatedPages = (nonEmptyLines.length * 1.75) / 55;
    var pageSeconds = estimatedPages * 60;

    var elementSeconds = 0;
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var words = el.text.trim().split(/\s+/).filter(Boolean).length;
      if (el.type === 'dialogue') {
        elementSeconds += words * 0.34 + 0.5;
      } else if (el.type === 'action') {
        elementSeconds += words * 0.42 + 0.9;
      } else if (el.type === 'slugline') {
        elementSeconds += 1.5;
      } else if (el.type === 'transition') {
        elementSeconds += 0.8;
      }
    }

    if (elements.length === 0) return Math.round(pageSeconds);
    return Math.max(1, Math.round(elementSeconds * 0.65 + pageSeconds * 0.35));
  }

  function calculateSceneSecondsMap() {
    var map = {};
    var totalRaw = 0;
    for (var i = 0; i < state.parsedElements.length; i++) {
      var el = state.parsedElements[i];
      var sc = el.sceneNum || '1';
      if (map[sc] == null) map[sc] = 0;
      var words = el.text.trim().split(/\s+/).filter(Boolean).length;
      var add = 0;
      if (el.type === 'dialogue') add = words * 0.34 + 0.5;
      else if (el.type === 'action') add = words * 0.42 + 0.9;
      else if (el.type === 'slugline') add = 1.5;
      else if (el.type === 'transition') add = 0.8;
      map[sc] += add;
      totalRaw += add;
    }

    var targetTotal = state.targetRuntimeSec || calculateNaturalScriptSeconds(state.rawScript, state.parsedElements);
    if (totalRaw > 0 && targetTotal > 0) {
      var scale = targetTotal / totalRaw;
      Object.keys(map).forEach(function (k) {
        map[k] = Math.max(1.0, map[k] * scale);
      });
    }
    return map;
  }

  function computeRenderMinutesForScreenSec(screenSec) {
    var secs = Number(screenSec) || 0;
    var rate = Number(state.renderRateSecPerSec) || 12;
    return Number(((secs * rate) / 60).toFixed(2));
  }

  function syncShotProdMetric(shot) {
    if (isRenderMedium()) {
      shot.estMins = computeRenderMinutesForScreenSec(shot.screenSec);
    } else if (!shot.estMins || shot.estMins < 1) {
      shot.estMins = getShotDefaults(shot.size).mins;
    }
  }

  function retimeAllShots(notify) {
    if (!state.shots.length) return;
    var allTypes = getAllShotTypes();
    var sceneSecs = calculateSceneSecondsMap();
    var byScene = {};

    state.shots.forEach(function (sh) {
      var sc = sh.sceneNum || '1';
      if (!byScene[sc]) byScene[sc] = [];
      byScene[sc].push(sh);
    });

    Object.keys(byScene).forEach(function (sc) {
      var group = byScene[sc];
      var scTotal = sceneSecs[sc] || Math.max(3, group.length * 3);
      var weightSum = 0;
      group.forEach(function (sh) {
        var w = (allTypes[sh.size] && allTypes[sh.size].weight) || 1.0;
        weightSum += w;
      });
      group.forEach(function (sh) {
        var w = (allTypes[sh.size] && allTypes[sh.size].weight) || 1.0;
        var rawSec = (scTotal * w) / (weightSum || 1);
        sh.screenSec = Math.max(0.5, Number(rawSec.toFixed(1)));
        syncShotProdMetric(sh);
      });
    });

    if (notify) {
      renderShotlistTable();
      queueAutoSave();
      showToast('Retimed ' + state.shots.length + ' shots proportionally across ' + Object.keys(byScene).length + ' scenes.', 'success');
    }
  }

  function scaleProjectToTargetRuntime(newTotalSec) {
    state.targetRuntimeSec = newTotalSec;
    var currentSum = state.shots.reduce(function (acc, sh) { return acc + (Number(sh.screenSec) || 0); }, 0);
    if (currentSum > 0 && state.shots.length > 0) {
      var ratio = newTotalSec / currentSum;
      state.shots.forEach(function (sh) {
        sh.screenSec = Math.max(0.5, Number(((Number(sh.screenSec) || 1) * ratio).toFixed(1)));
        syncShotProdMetric(sh);
      });
    } else {
      retimeAllShots(false);
    }
    renderShotlistTable();
    queueAutoSave();
    showToast('Scaled runtime to ' + formatSecondsToMinSec(newTotalSec) + '.', 'success');
  }

  function getTotalProjectScreenSeconds() {
    if (state.shots.length > 0) {
      var sum = state.shots.reduce(function (acc, sh) { return acc + (Number(sh.screenSec) || 0); }, 0);
      if (sum > 0) return sum;
    }
    return state.targetRuntimeSec || calculateNaturalScriptSeconds(state.rawScript, state.parsedElements);
  }

  function formatSecondsToMinSec(totalSec) {
    var s = Math.max(0, Math.round(totalSec));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var rem = s % 60;
    if (h > 0) return h + 'h ' + m + 'm ' + rem + 's';
    return m + 'm ' + rem + 's';
  }

  function formatDurationMinutes(totalMins) {
    var mTotal = Math.max(0, Number(totalMins) || 0);
    var hrs = Math.floor(mTotal / 60);
    var mins = Math.round(mTotal % 60);
    if (mins === 60) {
      hrs += 1;
      mins = 0;
    }
    return hrs + 'h ' + mins + 'm';
  }

function sanitizeFileNamePart(name) {
  var cleaned = String(name || 'Untitled Project')
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Untitled Project';
}

function handleProjectTitleChange(rawTitle, previousTitle) {
  var fallbackTitle = String(previousTitle || state.projectTitle || 'Untitled Project').trim() || 'Untitled Project';
  var nextTitle = String(rawTitle || '').trim() || 'Untitled Project';
  state.projectTitle = nextTitle;

  var titleInput = document.getElementById('input-project-title');
  if (titleInput && titleInput.value !== nextTitle) {
    titleInput.value = nextTitle;
  }

  if (!state.currentFilePath || !fs || !nodePath) {
    queueAutoSave();
    return;
  }

  var currentDir = nodePath.dirname(state.currentFilePath);
  var currentExt = nodePath.extname(state.currentFilePath) || '.s2s';
  var currentBase = nodePath.basename(state.currentFilePath, currentExt);
  var targetBase = sanitizeFileNamePart(nextTitle);
  var targetPath = nodePath.join(currentDir, targetBase + currentExt);

  if (currentBase === targetBase || targetPath === state.currentFilePath) {
    queueAutoSave();
    return;
  }

  clearTimeout(autoSaveTimer);
  state.hasUnsavedChanges = true;
  updateSaveBadge('dirty');

  var modal = document.getElementById('confirm-modal');
  var titleEl = document.getElementById('confirm-title');
  var msgEl = document.getElementById('confirm-msg');
  var inputWrap = document.getElementById('confirm-input-wrap');
  var okBtn = document.getElementById('btn-confirm-ok');
  var cancelBtn = document.getElementById('btn-confirm-cancel');
  if (!modal || !okBtn || !cancelBtn) return;

  if (inputWrap) inputWrap.classList.add('hidden');
  var origOkText = okBtn.textContent;
  var origCancelText = cancelBtn.textContent;

  var newFileBtn = document.createElement('button');
  newFileBtn.id = 'btn-confirm-new-file';
  newFileBtn.type = 'button';
  newFileBtn.className = 'px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer';
  newFileBtn.textContent = 'New File';
  cancelBtn.parentNode.insertBefore(newFileBtn, okBtn);

  titleEl.textContent = 'Update Project File Name?';
  msgEl.textContent = 'You changed the project title to "' + nextTitle + '". Rename "' + nodePath.basename(state.currentFilePath) + '" to "' + targetBase + currentExt + '", create a new file, or cancel?';
  okBtn.textContent = 'Rename File';
  cancelBtn.textContent = 'Cancel';
  modal.classList.remove('hidden');

  function cleanup() {
    modal.classList.add('hidden');
    okBtn.textContent = origOkText;
    cancelBtn.textContent = origCancelText;
    okBtn.onclick = null;
    cancelBtn.onclick = null;
    if (newFileBtn && newFileBtn.parentNode) {
      newFileBtn.parentNode.removeChild(newFileBtn);
    }
  }

  function revertTitle() {
    state.projectTitle = fallbackTitle;
    if (titleInput) titleInput.value = fallbackTitle;
    if (state.currentFilePath && fs && fs.existsSync(state.currentFilePath)) {
      writeProjectToFile(state.currentFilePath, false);
    } else {
      updateSaveBadge(state.currentFilePath ? 'saved' : 'unsaved');
    }
    showToast('Cancelled title change; restored "' + fallbackTitle + '".', 'info');
  }

  okBtn.onclick = function () {
    cleanup();
    try {
      if (targetPath !== state.currentFilePath && fs.existsSync(targetPath)) {
        showToast('A file named "' + targetBase + currentExt + '" already exists in that folder.', 'warn');
        revertTitle();
        return;
      }
      fs.renameSync(state.currentFilePath, targetPath);
      state.currentFilePath = targetPath;
      writeProjectToFile(targetPath, true);
    } catch (err) {
      showToast('Failed to rename file: ' + err.message, 'warn');
      revertTitle();
    }
  };

  newFileBtn.onclick = function () {
    cleanup();
    saveProjectAs();
  };

  cancelBtn.onclick = function () {
    cleanup();
    revertTitle();
  };
}