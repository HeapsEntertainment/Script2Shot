function populateSoftwareDropdown() {
    var engineSelect = document.getElementById('select-render-engine');
    if (!engineSelect || !window.SOFTWARE_PROFILES) return;

    var matching = Object.keys(window.SOFTWARE_PROFILES)
      .map(function (k) { return window.SOFTWARE_PROFILES[k]; })
      .filter(function (p) { return p.medium === state.projectFormat; });

    if (!matching.length) return;

    var validCurrent = matching.some(function (p) { return p.id === state.renderEngine; });
    if (!validCurrent) {
      var preset = FORMAT_PRESETS[state.projectFormat];
      state.renderEngine = (preset && preset.defaultEngine) || matching[0].id;
    }

    engineSelect.innerHTML = matching.map(function (p) {
      return '<option value="' + escapeHTML(p.id) + '"' + (p.id === state.renderEngine ? ' selected' : '') + '>' + escapeHTML(p.label) + '</option>';
    }).join('');
  }

  function syncMediumUI() {
    var renderMode = isRenderMedium();
    var kpiProdLabel = document.getElementById('kpi-prod-label');
    var kpiFramesWrap = document.getElementById('kpi-frames-wrap');
    var liveControls = document.getElementById('live-rate-controls');
    var renderControls = document.getElementById('render-rate-controls');
    var engineWrap = document.getElementById('engine-select-wrap');
    var thProdCol = document.getElementById('th-prod-col');
    var qualitySelect = document.getElementById('select-render-quality');
    var customWrap = document.getElementById('custom-quality-wrap');
    var retimeBtn = document.getElementById('btn-retime-shots');

    if (renderMode) {
      if (kpiProdLabel) kpiProdLabel.textContent = 'Est. Render Time';
      if (kpiFramesWrap) kpiFramesWrap.classList.remove('hidden');
      if (liveControls) liveControls.classList.add('hidden');
      if (renderControls) renderControls.classList.remove('hidden');
      if (engineWrap) {
        engineWrap.classList.remove('hidden');
        populateSoftwareDropdown();
      }
      if (thProdCol) thProdCol.textContent = 'Render (m)';

      var activeQuality = (qualitySelect && qualitySelect.value) || state.renderQuality || '1080p_med';
      var isCustomQuality = activeQuality === 'custom';
      if (customWrap) customWrap.classList.toggle('hidden', !isCustomQuality);
      if (retimeBtn) retimeBtn.classList.toggle('hidden', isCustomQuality);
    } else {
      if (kpiProdLabel) kpiProdLabel.textContent = 'Est. Shoot Time';
      if (kpiFramesWrap) kpiFramesWrap.classList.add('hidden');
      if (liveControls) liveControls.classList.remove('hidden');
      if (renderControls) renderControls.classList.add('hidden');
      if (customWrap) customWrap.classList.add('hidden');
      if (retimeBtn) retimeBtn.classList.remove('hidden');
      if (thProdCol) thProdCol.textContent = 'Shoot (m)';
    }
  }

  function applyLeftPaneLayout() {
    var leftPane = document.getElementById('left-pane');
    var expandBtn = document.getElementById('btn-expand-script');
    var resizer = document.getElementById('pane-resizer');
    if (!leftPane) return;

    leftPane.style.setProperty('--left-pane-width', state.leftPaneWidthPct + '%');
    if (state.scriptCollapsed) {
      leftPane.classList.add('is-collapsed');
      if (expandBtn) expandBtn.classList.remove('hidden');
      if (resizer) resizer.classList.add('lg:hidden');
    } else {
      leftPane.classList.remove('is-collapsed');
      if (expandBtn) expandBtn.classList.add('hidden');
      if (resizer) resizer.classList.remove('lg:hidden');
    }
  }

  function renderInteractiveScript() {
    var container = document.getElementById('view-interactive');
    if (!container) return;

    if (!state.parsedElements.length) {
      container.innerHTML = '<div class="text-slate-500 italic text-center py-12">No screenplay lines found. Switch to Script Editor or click Sample Script.</div>';
      return;
    }

    var html = state.parsedElements.map(function (el, index) {
      var safeText = escapeHTML(el.text);
      if (el.type === 'action' || el.type === 'slugline') {
        safeText = safeText.replace(HIGHLIGHT_REGEX, function (m) {
          return '<span class="cue-highlight">' + m + '</span>';
        });
      }

      var attrs = 'data-scene="' + escapeHTML(el.sceneNum) + '" data-etype="' + escapeHTML(el.type) + '" data-el-index="' + index + '"';
      if (el.type === 'section') {
        return '<div ' + attrs + ' class="sp-section">' + safeText + '</div>';
      }
      if (el.type === 'synopsis') {
        return '<div ' + attrs + ' class="sp-synopsis">' + safeText + '</div>';
      }
      if (el.type === 'slugline') {
        return '<div ' + attrs + ' class="sp-slugline flex justify-between items-center gap-2"><span>' + safeText + '</span><span class="text-[10px] font-sans uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 shrink-0">SC ' + escapeHTML(el.sceneNum) + '</span></div>';
      }
      if (el.type === 'character') {
        var badge = el.isNarrator
          ? '<span class="ml-2 text-[10px] font-sans uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 cursor-pointer hover:bg-purple-500/40 shrink-0" title="Click to remove V.O. tag">V.O. (Click to remove)</span>'
          : '<span class="ml-2 text-[10px] font-sans uppercase tracking-wider px-1.5 py-0.5 rounded bg-studio-800 text-slate-400 border border-studio-700 cursor-pointer hover:text-white hover:border-amber-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title="Click to add V.O. tag">+ V.O. Tag</span>';
        return '<div ' + attrs + ' class="sp-character cursor-pointer group inline-flex items-center" title="Click to toggle V.O. status"><span>' + safeText + '</span>' + badge + '</div>';
      }
      if (el.type === 'parenthetical') {
        return '<div ' + attrs + ' class="sp-parenthetical">' + safeText + '</div>';
      }
      if (el.type === 'dialogue') {
        var voStyle = el.isNarrator ? ' italic text-slate-300 border-l-2 border-purple-500/40 pl-3' : '';
        return '<div ' + attrs + ' class="sp-dialogue' + voStyle + '">' + safeText + '</div>';
      }
      if (el.type === 'transition') {
        return '<div ' + attrs + ' class="sp-transition">' + safeText + '</div>';
      }
      return '<div ' + attrs + ' class="sp-action">' + safeText + '</div>';
    }).join('');

    container.innerHTML = html;
  }

  function updateKPIs() {
    syncMediumUI();

    var sceneSet = new Set();
    state.parsedScenes.forEach(function (s) { sceneSet.add(s.sceneNum); });
    state.shots.forEach(function (sh) { sceneSet.add(sh.sceneNum); });

    var kpiScenes = document.getElementById('kpi-scenes');
    var kpiShots = document.getElementById('kpi-shots');
    var kpiRuntime = document.getElementById('kpi-runtime');
    var kpiShootTime = document.getElementById('kpi-shoot-time');
    var kpiFrames = document.getElementById('kpi-frames');
    var kpiPills = document.getElementById('kpi-pills');

    if (kpiScenes) kpiScenes.textContent = String(sceneSet.size);
    if (kpiShots) kpiShots.textContent = String(state.shots.length);

    var runtimeSec = getTotalProjectScreenSeconds();
    if (kpiRuntime) kpiRuntime.textContent = formatSecondsToMinSec(runtimeSec);

    if (kpiFrames) {
      var totalFrames = Math.round(runtimeSec * (Number(state.fps) || 24));
      kpiFrames.textContent = totalFrames.toLocaleString();
    }

    var totalProdMins = state.shots.reduce(function (sum, sh) {
      return sum + (Number(sh.estMins) || 0);
    }, 0);
    if (kpiShootTime) kpiShootTime.textContent = formatDurationMinutes(totalProdMins);

    if (kpiPills) {
      var counts = {};
      state.shots.forEach(function (sh) {
        counts[sh.size] = (counts[sh.size] || 0) + 1;
      });
      var entries = Object.entries(counts).sort(function (a, b) { return b[1] - a[1]; });
      if (!entries.length) {
        kpiPills.innerHTML = '<span class="text-zinc-500 italic">No shots scheduled</span>';
      } else {
        kpiPills.innerHTML = entries.map(function (pair) {
          var code = pair[0];
          var count = pair[1];
          return '<span data-tip-code="' + escapeHTML(code) + '" class="cursor-help inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-studio-950 hover:bg-studio-800 border border-studio-700 text-[11px] font-mono transition"><span class="font-semibold text-amber-400">' + escapeHTML(code) + '</span><span class="text-zinc-300">' + count + '</span></span>';
        }).join('');
      }
    }
  }

  function syncFilterDropdowns() {
    var sceneSelect = document.getElementById('filter-scene');
    var sizeSelect = document.getElementById('filter-size');
    var allTypes = getAllShotTypes();

    if (sceneSelect) {
      var sceneMap = new Map();
      state.parsedScenes.forEach(function (s) { sceneMap.set(s.sceneNum, s.heading); });
      state.shots.forEach(function (sh) {
        if (!sceneMap.has(sh.sceneNum)) sceneMap.set(sh.sceneNum, 'Scene ' + sh.sceneNum);
      });
      var sOpts = ['<option value="ALL">All Scenes (' + sceneMap.size + ')</option>'];
      sceneMap.forEach(function (heading, num) {
        var shortH = heading.length > 32 ? heading.substring(0, 29) + '...' : heading;
        sOpts.push('<option value="' + escapeHTML(num) + '">Sc ' + escapeHTML(num) + ' — ' + escapeHTML(shortH) + '</option>');
      });
      sceneSelect.innerHTML = sOpts.join('');
      if (sceneMap.has(state.filterScene)) {
        sceneSelect.value = state.filterScene;
      } else {
        state.filterScene = 'ALL';
        sceneSelect.value = 'ALL';
      }
    }

    if (sizeSelect) {
      var szOpts = ['<option value="ALL">All Sizes</option>'];
      Object.keys(allTypes).forEach(function (code) {
        var info = allTypes[code];
        szOpts.push('<option value="' + escapeHTML(code) + '">' + escapeHTML(code) + ' — ' + escapeHTML(info.name) + '</option>');
      });
      sizeSelect.innerHTML = szOpts.join('');
      if (allTypes[state.filterSize]) {
        sizeSelect.value = state.filterSize;
      } else {
        state.filterSize = 'ALL';
        sizeSelect.value = 'ALL';
      }
    }
  }

  function renderShotlistTable() {
    var tbody = document.getElementById('shotlist-tbody');
    var emptyState = document.getElementById('empty-state');
    if (!tbody || !emptyState) return;

    var q = state.searchQuery.toLowerCase().trim();
    var filtered = state.shots.filter(function (sh) {
      if (state.filterScene !== 'ALL' && sh.sceneNum !== state.filterScene) return false;
      if (state.filterSize !== 'ALL' && sh.size !== state.filterSize) return false;
      if (q) {
        var hay = (sh.sceneNum + ' ' + sh.shotNum + ' ' + sh.size + ' ' + sh.angle + ' ' + sh.movement + ' ' + sh.lens + ' ' + sh.subject + ' ' + sh.description + ' ' + sh.audioNotes).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    if (!filtered.length) {
      tbody.innerHTML = '';
      emptyState.classList.remove('hidden');
      emptyState.classList.add('flex');
    } else {
      emptyState.classList.add('hidden');
      emptyState.classList.remove('flex');

      var allTypes = getAllShotTypes();
      var allCodes = Object.keys(allTypes);
      var allMoves = getAllMovements();
      var lastScene = null;
      var rows = [];

      filtered.forEach(function (sh) {
        if (sh.sceneNum !== lastScene) {
          lastScene = sh.sceneNum;
          var scMeta = state.parsedScenes.find(function (s) { return s.sceneNum === sh.sceneNum; });
          var scTitle = scMeta ? scMeta.heading : ('SCENE ' + sh.sceneNum);
          var actBadge = (scMeta && scMeta.section)
            ? '<span class="ml-2 px-1.5 py-0.5 rounded bg-studio-800 border border-studio-600 text-[10px] text-slate-300 font-sans uppercase">' + escapeHTML(scMeta.section) + '</span>'
            : '';
          rows.push(
            '<tr class="bg-studio-900/95 border-y border-studio-700">' +
              '<td colspan="12" class="py-1.5 px-3 font-script text-xs font-bold text-amber-400">SCENE ' + escapeHTML(sh.sceneNum) + ' — ' + escapeHTML(scTitle) + actBadge + '</td>' +
            '</tr>'
          );
        }

        var codes = allCodes.indexOf(sh.size) !== -1 ? allCodes : [sh.size].concat(allCodes);
        var sizeOpts = codes.map(function (c) {
          var label = allTypes[c] ? (c + ' — ' + allTypes[c].name) : c;
          return '<option value="' + escapeHTML(c) + '"' + (sh.size === c ? ' selected' : '') + '>' + escapeHTML(label) + '</option>';
        }).join('');

        var angleOpts = CAMERA_ANGLES.map(function (a) {
          return '<option value="' + escapeHTML(a) + '"' + (sh.angle === a ? ' selected' : '') + '>' + escapeHTML(a) + '</option>';
        }).join('');

        var moves = allMoves.indexOf(sh.movement) !== -1 ? allMoves : [sh.movement].concat(allMoves);
        var moveOpts = moves.map(function (m) {
          return '<option value="' + escapeHTML(m) + '"' + (sh.movement === m ? ' selected' : '') + '>' + escapeHTML(m) + '</option>';
        }).join('');

        var lenses = getAllLenses(sh.lens);
        var lensOpts = lenses.map(function (ln) {
          return '<option value="' + escapeHTML(ln) + '"' + (sh.lens === ln ? ' selected' : '') + '>' + escapeHTML(ln) + '</option>';
        }).join('');

        rows.push(
          '<tr data-id="' + escapeHTML(sh.id) + '" class="hover:bg-studio-900/60 transition-colors">' +
            '<td class="py-1.5 px-1 text-center"><input type="text" data-field="sceneNum" value="' + escapeHTML(sh.sceneNum) + '" class="w-10 text-center bg-studio-900 border border-studio-700 focus:border-amber-500 rounded px-1 py-1 text-slate-200 font-semibold focus:outline-none" /></td>' +
            '<td class="py-1.5 px-1"><input type="text" data-field="shotNum" value="' + escapeHTML(sh.shotNum) + '" class="w-14 bg-studio-900 border border-studio-700 focus:border-amber-500 rounded px-1.5 py-1 text-amber-400 font-bold focus:outline-none" /></td>' +
            '<td class="py-1.5 px-1" data-tip-code="' + escapeHTML(sh.size) + '"><select data-field="size" class="w-full bg-studio-900 border border-studio-700 focus:border-amber-500 rounded px-1.5 py-1 text-white font-semibold focus:outline-none cursor-pointer">' + sizeOpts + '</select></td>' +
            '<td class="py-1.5 px-1"><select data-field="angle" class="w-full bg-studio-900 border border-studio-700 focus:border-amber-500 rounded px-1.5 py-1 text-slate-200 focus:outline-none cursor-pointer">' + angleOpts + '</select></td>' +
            '<td class="py-1.5 px-1"><select data-field="movement" class="w-full bg-studio-900 border border-studio-700 focus:border-amber-500 rounded px-1.5 py-1 text-slate-200 focus:outline-none cursor-pointer">' + moveOpts + '</select></td>' +
            '<td class="py-1.5 px-1"><select data-field="lens" class="w-full bg-studio-900 border border-studio-700 focus:border-amber-500 rounded px-1.5 py-1 text-sky-300 font-medium focus:outline-none cursor-pointer">' + lensOpts + '</select></td>' +
            '<td class="py-1.5 px-1"><input type="text" data-field="subject" value="' + escapeHTML(sh.subject) + '" placeholder="Subject" class="w-full bg-studio-900 border border-studio-700 focus:border-amber-500 rounded px-2 py-1 text-slate-100 focus:outline-none" /></td>' +
            '<td class="py-1.5 px-1"><input type="text" data-field="description" value="' + escapeHTML(sh.description) + '" placeholder="Action / Framing..." class="w-full bg-studio-900 border border-studio-700 focus:border-amber-500 rounded px-2 py-1 text-slate-200 focus:outline-none" /></td>' +
            '<td class="py-1.5 px-1"><input type="text" data-field="audioNotes" value="' + escapeHTML(sh.audioNotes) + '" placeholder="Dialogue / V.O." class="w-full bg-studio-900 border border-studio-700 focus:border-purple-400 rounded px-2 py-1 text-purple-200 focus:outline-none" /></td>' +
            '<td class="py-1.5 px-1 text-center"><input type="number" step="0.5" min="0.5" max="3600" data-field="screenSec" value="' + escapeHTML(sh.screenSec) + '" class="w-14 text-center bg-studio-900 border border-studio-700 focus:border-sky-400 rounded px-1 py-1 text-sky-300 font-semibold focus:outline-none" /></td>' +
            '<td class="py-1.5 px-1 text-center"><input type="number" step="0.1" min="0.1" max="9999" data-field="estMins" value="' + escapeHTML(sh.estMins) + '" class="w-14 text-center bg-studio-900 border border-studio-700 focus:border-amber-500 rounded px-1 py-1 text-emerald-300 font-semibold focus:outline-none" /></td>' +
            '<td class="col-actions py-1.5 px-1 text-right whitespace-nowrap">' +
              '<div class="inline-flex items-center gap-0.5">' +
                '<button type="button" data-act="up" title="Move Up" class="p-1 rounded bg-studio-850 hover:bg-studio-700 text-slate-300 border border-studio-700 cursor-pointer">&uarr;</button>' +
                '<button type="button" data-act="down" title="Move Down" class="p-1 rounded bg-studio-850 hover:bg-studio-700 text-slate-300 border border-studio-700 cursor-pointer">&darr;</button>' +
                '<button type="button" data-act="dup" title="Duplicate" class="p-1 rounded bg-studio-850 hover:bg-studio-700 text-sky-300 border border-studio-700 cursor-pointer">+</button>' +
                '<button type="button" data-act="del" title="Delete" class="p-1 rounded bg-studio-950 text-red-400 border border-studio-700 cursor-pointer">&times;</button>' +
              '</div>' +
            '</td>' +
          '</tr>'
        );
      });

      tbody.innerHTML = rows.join('');
    }

    updateKPIs();
    syncFilterDropdowns();
  }

  function renderPresetsModal() {
    var preset = window.FORMAT_PRESETS[state.projectFormat] || window.FORMAT_PRESETS['live-ff'];
    var titleEl = document.getElementById('modal-format-title');
    var descEl = document.getElementById('modal-format-desc');
    if (titleEl) titleEl.textContent = preset.label;
    if (descEl) descEl.textContent = preset.description;

    var allTypes = getAllShotTypes();
    var guideTbody = document.getElementById('modal-guide-tbody');
    if (guideTbody) {
      guideTbody.innerHTML = Object.keys(allTypes).map(function (code) {
        var st = allTypes[code];
        return '<tr class="hover:bg-studio-900/50">' +
          '<td class="py-2 px-3 font-bold text-amber-400">' + escapeHTML(st.code) + '</td>' +
          '<td class="py-2 px-3"><div class="font-semibold text-white">' + escapeHTML(st.name) + '</div><div class="text-[11px] text-slate-400">' + escapeHTML(st.desc) + '</div></td>' +
          '<td class="py-2 px-3 font-semibold text-sky-300">' + escapeHTML(st.lens) + '</td>' +
          '<td class="py-2 px-3 text-center text-emerald-300 font-semibold">' + st.mins + 'm</td>' +
          '<td class="py-2 px-3 text-slate-300">' + escapeHTML(st.why) + '</td>' +
        '</tr>';
      }).join('');
    }

    var typesList = document.getElementById('modal-shot-types-list');
    if (typesList) {
      typesList.innerHTML = Object.keys(allTypes).map(function (code) {
        var st = allTypes[code];
        var badge = st.isCustom
          ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">Custom</span>'
          : '';
        var delBtn = st.isCustom
          ? '<button type="button" data-del-shot-type="' + escapeHTML(st.code) + '" class="text-red-400 hover:text-red-300 text-[11px] font-semibold px-2 py-1 rounded bg-studio-850 border border-studio-700 cursor-pointer shrink-0">Delete</button>'
          : '';
        return '<div class="bg-studio-900 border border-studio-700 rounded-lg p-2.5 flex items-start justify-between gap-2">' +
          '<div>' +
            '<div class="flex items-center gap-2"><span class="font-bold text-amber-400">' + escapeHTML(st.code) + '</span><span class="font-semibold text-white">' + escapeHTML(st.name) + '</span>' + badge + '</div>' +
            '<p class="text-[11px] text-slate-400 mt-0.5">' + escapeHTML(st.desc) + '</p>' +
            '<p class="text-[11px] text-sky-300 mt-1">Default: ' + escapeHTML(st.lens) + ' • ' + st.mins + ' mins</p>' +
          '</div>' + delBtn +
        '</div>';
      }).join('');
    }

    var movesList = document.getElementById('modal-moves-list');
    if (movesList) {
      var customMoves = state.customMovements || [];
      movesList.innerHTML = getAllMovements().map(function (mv) {
        var isCust = customMoves.indexOf(mv) !== -1;
        var rm = isCust
          ? '<button type="button" data-del-move="' + escapeHTML(mv) + '" class="text-red-400 hover:text-red-300 font-bold ml-1 cursor-pointer">&times;</button>'
          : '';
        return '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ' + (isCust ? 'bg-sky-950/60 border-sky-500/40 text-sky-200' : 'bg-studio-900 border-studio-700 text-slate-300') + '"><span>' + escapeHTML(mv) + '</span>' + rm + '</span>';
      }).join('');
    }
  }

  function parseAndRender(keepExistingShots) {
    var result = parseScreenplay(state.rawScript, state.coverageMode);
    state.parsedScenes = result.scenes;
    state.parsedElements = result.elements;
    if (!keepExistingShots) {
      state.shots = result.shots;
      retimeAllShots(false);
    }
    renderInteractiveScript();
    renderShotlistTable();
    queueAutoSave();
  }