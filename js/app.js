  var DEFAULT_SHORTCUTS = {
    save: { label: 'Save Project', combo: 'Ctrl + S' },
    saveAs: { label: 'Save Project As', combo: 'Ctrl + Shift + S' },
    newProj: { label: 'New Project', combo: 'Ctrl + N' },
    openProj: { label: 'Open Project', combo: 'Ctrl + O' },
    undo: { label: 'Undo (Shotlist / Script)', combo: 'Ctrl + Z' },
    redo: { label: 'Redo (Shotlist / Script)', combo: 'Ctrl + Y / Ctrl + Shift + Z' }
  };

  function getShortcutsMap() {
    try {
      var raw = localStorage.getItem('script2shot_shortcuts_v1');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS));
  }

  function renderShortcutsModal() {
    var listEl = document.getElementById('shortcuts-list');
    if (!listEl) return;
    var map = getShortcutsMap();

    listEl.innerHTML = Object.keys(map).map(function (key) {
      var item = map[key];
      return '<div class="bg-studio-950 border border-studio-800 rounded-lg p-3 flex items-center justify-between gap-3">' +
        '<div>' +
          '<div class="font-semibold text-white text-xs">' + escapeHTML(item.label) + '</div>' +
          '<div class="text-[10px] text-slate-400 font-mono">Action ID: ' + escapeHTML(key) + '</div>' +
        '</div>' +
        '<div class="flex items-center gap-2">' +
          '<input type="text" data-shortcut-key="' + escapeHTML(key) + '" value="' + escapeHTML(item.combo) + '" class="bg-studio-900 border border-studio-700 rounded px-2 py-1 text-amber-400 font-mono text-xs w-36 text-center focus:border-amber-500 focus:outline-none" />' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function bindEvents() {
    var tooltip = document.getElementById('acronym-tooltip');
    var ttTitle = document.getElementById('tt-title');
    var ttDesc = document.getElementById('tt-desc');
    var ttMeta = document.getElementById('tt-meta');

    document.addEventListener('mouseover', function (e) {
      if (!tooltip) return;
      var holder = e.target.closest('[data-tip-code]');
      if (!holder) {
        tooltip.classList.add('hidden');
        return;
      }
      var code = holder.getAttribute('data-tip-code');
      var info = getAllShotTypes()[code];
      if (!info) return;
      if (ttTitle) ttTitle.textContent = code + ' — ' + info.name;
      if (ttDesc) ttDesc.textContent = info.desc;
      if (ttMeta) ttMeta.textContent = 'Preset: ' + info.lens + ' • Est. ' + info.mins + ' mins';
      tooltip.classList.remove('hidden');
    });

    document.addEventListener('mousemove', function (e) {
      if (!tooltip || tooltip.classList.contains('hidden')) return;
      var x = e.clientX + 14;
      var y = e.clientY + 14;
      if (x + 295 > window.innerWidth) x = e.clientX - 295;
      if (y + 100 > window.innerHeight) y = e.clientY - 100;
      tooltip.style.left = Math.max(8, x) + 'px';
      tooltip.style.top = Math.max(8, y) + 'px';
    });

    document.addEventListener('mouseout', function (e) {
      if (!tooltip) return;
      if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('[data-tip-code]')) {
        tooltip.classList.add('hidden');
      }
    });

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (e.shiftKey) saveProjectAs();
        else saveProjectFile(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createNewProject();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        openProjectDialog();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (state.activeLeftTab === 'editor') {
          var btnScriptUndo = document.getElementById('btn-script-undo');
          if (btnScriptUndo && !btnScriptUndo.disabled) btnScriptUndo.click();
        } else {
          performUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        if (state.activeLeftTab === 'editor') {
          var btnScriptRedo = document.getElementById('btn-script-redo');
          if (btnScriptRedo && !btnScriptRedo.disabled) btnScriptRedo.click();
        } else {
          performRedo();
        }
      }
    });

    var btnUndo = document.getElementById('btn-undo');
    var btnRedo = document.getElementById('btn-redo');
    if (btnUndo) btnUndo.onclick = performUndo;
    if (btnRedo) btnRedo.onclick = performRedo;

    var resizer = document.getElementById('pane-resizer');
    var workspace = document.getElementById('workspace-main');
    var isDraggingPane = false;

    if (resizer && workspace) {
      resizer.addEventListener('mousedown', function (e) {
        isDraggingPane = true;
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
      });
      window.addEventListener('mousemove', function (e) {
        if (!isDraggingPane) return;
        var rect = workspace.getBoundingClientRect();
        var pct = ((e.clientX - rect.left) / rect.width) * 100;
        pct = Math.max(20, Math.min(68, pct));
        state.leftPaneWidthPct = Number(pct.toFixed(1));
        applyLeftPaneLayout();
      });
      window.addEventListener('mouseup', function () {
        if (isDraggingPane) {
          isDraggingPane = false;
          document.body.style.cursor = '';
          queueAutoSave();
        }
      });
    }

    var btnCollapse = document.getElementById('btn-collapse-script');
    var btnExpand = document.getElementById('btn-expand-script');
    if (btnCollapse) {
      btnCollapse.addEventListener('click', function () {
        state.scriptCollapsed = true;
        applyLeftPaneLayout();
        queueAutoSave();
      });
    }
    if (btnExpand) {
      btnExpand.addEventListener('click', function () {
        state.scriptCollapsed = false;
        applyLeftPaneLayout();
        queueAutoSave();
      });
    }

    var btnEditRuntime = document.getElementById('btn-edit-runtime');
    if (btnEditRuntime) {
      btnEditRuntime.addEventListener('click', openRuntimePromptModal);
    }

    var btnRetime = document.getElementById('btn-retime-shots');
    if (btnRetime) {
      btnRetime.addEventListener('click', function () {
        pushUndoSnapshot();
        retimeAllShots(true);
      });
    }

    var engineSelect = document.getElementById('select-render-engine');
    var qualitySelect = document.getElementById('select-render-quality');
    var fpsInput = document.getElementById('input-fps');
    var renderRateInput = document.getElementById('input-render-rate');

    var customWrap = document.getElementById('custom-quality-wrap');
var resWInput = document.getElementById('input-custom-res-w');
var resHInput = document.getElementById('input-custom-res-h');

function recalcFromRenderProfile() {
  populateSoftwareDropdown();
  var eng = (engineSelect && engineSelect.value) || state.renderEngine || 'eevee';
  var qual = (qualitySelect && qualitySelect.value) || state.renderQuality || '1080p_med';
  state.renderEngine = eng;
  state.renderQuality = qual;

  if (customWrap) {
    customWrap.classList.toggle('hidden', qual !== 'custom');
  }

  var swProfile = window.SOFTWARE_PROFILES && window.SOFTWARE_PROFILES[eng];
  var newRate;

  if (qual === 'custom') {
    var w = Math.max(16, parseInt(resWInput && resWInput.value, 10) || state.customResWidth || 1920);
    var h = Math.max(16, parseInt(resHInput && resHInput.value, 10) || state.customResHeight || 1080);
    state.customResWidth = w;
    state.customResHeight = h;
    if (resWInput) resWInput.value = String(w);
    if (resHInput) resHInput.value = String(h);

    var base1080Rate = (swProfile && swProfile.rates && swProfile.rates['1080p_med']) || 12;
    var pixelScale = (w * h) / (1920 * 1080);
    newRate = Number(Math.max(0.1, base1080Rate * pixelScale).toFixed(2));
  } else {
    newRate = (swProfile && swProfile.rates && swProfile.rates[qual]) || 12;
  }

  state.renderRateSecPerSec = newRate;
  if (renderRateInput) renderRateInput.value = String(newRate);

  state.shots.forEach(syncShotProdMetric);
  renderShotlistTable();
  queueAutoSave();
}

if (resWInput) resWInput.addEventListener('change', recalcFromRenderProfile);
if (resHInput) resHInput.addEventListener('change', recalcFromRenderProfile);

    if (engineSelect) engineSelect.addEventListener('change', recalcFromRenderProfile);
    if (qualitySelect) qualitySelect.addEventListener('change', recalcFromRenderProfile);
    if (fpsInput) {
      fpsInput.addEventListener('change', function (e) {
        state.fps = Math.max(1, parseInt(e.target.value, 10) || 24);
        updateKPIs();
        queueAutoSave();
      });
    }
    if (renderRateInput) {
      renderRateInput.addEventListener('change', function (e) {
        state.renderRateSecPerSec = Math.max(0.1, parseFloat(e.target.value) || 12);
        state.shots.forEach(syncShotProdMetric);
        renderShotlistTable();
        queueAutoSave();
      });
    }

    var titleInput = document.getElementById('input-project-title');
    if (titleInput) {
      var titleBeforeEdit = state.projectTitle;
      titleInput.addEventListener('focus', function (e) {
        titleBeforeEdit = e.target.value;
      });
      titleInput.addEventListener('input', function (e) {
        state.projectTitle = e.target.value;
        queueAutoSave();
      });
      titleInput.addEventListener('change', function (e) {
        var prev = titleBeforeEdit;
        titleBeforeEdit = e.target.value;
        handleProjectTitleChange(e.target.value, prev);
      });
    }

    var formatSelect = document.getElementById('select-format');
    var avgSetupInput = document.getElementById('input-avg-setup');

    if (formatSelect) {
      formatSelect.addEventListener('change', function (e) {
        var newFormat = e.target.value;
        var preset = window.FORMAT_PRESETS[newFormat] || window.FORMAT_PRESETS['live-ff'];
        state.projectFormat = newFormat;
        state.avgSetupMins = preset.defaultSetupMins;
        if (avgSetupInput) avgSetupInput.value = String(state.avgSetupMins);
        if (preset.isRenderMedium) {
          recalcFromRenderProfile();
        }
        renderPresetsModal();

        if (state.shots.length > 0) {
          openChoiceModal(
            'Update Existing Lenses & Durations?',
            'Update existing shot lenses/fields and time estimates to match ' + preset.label + '?',
            'Yes, Update Existing Shots',
            'No, Keep Current Lenses',
            function () {
              state.shots.forEach(function (s) {
                var def = getShotDefaults(s.size);
                s.lens = def.lens;
                if (preset.isRenderMedium) {
                  syncShotProdMetric(s);
                } else {
                  s.estMins = def.mins;
                }
              });
              renderShotlistTable();
              queueAutoSave();
              showToast('Updated existing shots to ' + preset.label + '.', 'success');
            },
            function () {
              if (preset.isRenderMedium) state.shots.forEach(syncShotProdMetric);
              renderShotlistTable();
              queueAutoSave();
              showToast('Format set to ' + preset.label + ' (existing lenses kept).', 'info');
            }
          );
        } else {
          renderShotlistTable();
          queueAutoSave();
          showToast('Format set to ' + preset.label + '.', 'info');
        }
      });
    }

    var modeSelect = document.getElementById('select-mode');
    if (modeSelect) {
      modeSelect.addEventListener('change', function (e) {
        state.coverageMode = e.target.value;
        if (state.coverageMode === 'manual') {
          queueAutoSave();
          showToast('Manual Mode: highlight text in Interactive Script to add shots.', 'info');
        } else {
          parseAndRender(false);
          showToast('Coverage updated (' + state.shots.length + ' shots).', 'success');
        }
      });
    }

    var sluglineChk = document.getElementById('chk-slugline-shots');
    if (sluglineChk) {
      sluglineChk.addEventListener('change', function (e) {
        state.includeSluglineShots = Boolean(e.target.checked);
        if (state.coverageMode !== 'manual') {
          parseAndRender(false);
          showToast(
            state.includeSluglineShots
              ? 'Enabled master establishing shots for scene headings.'
              : 'Disabled automatic shots for scene headings.',
            'info'
          );
        } else {
          queueAutoSave();
        }
      });
    }

    if (avgSetupInput) {
      avgSetupInput.addEventListener('change', function (e) {
        state.avgSetupMins = Math.max(0.5, parseFloat(e.target.value) || 15);
        queueAutoSave();
      });
    }

    var btnGenerate = document.getElementById('btn-generate');
    if (btnGenerate) {
      btnGenerate.addEventListener('click', function () {
        var ta = document.getElementById('textarea-script');
        if (state.activeLeftTab === 'editor' && ta) state.rawScript = ta.value;
        if (state.coverageMode === 'manual') {
          state.coverageMode = 'full';
          if (modeSelect) modeSelect.value = 'full';
        }

        if (state.filterScene !== 'ALL') {
          pushUndoSnapshot();
          var targetScNum = state.filterScene;
          var res = parseScreenplay(state.rawScript, state.coverageMode);
          state.parsedScenes = res.scenes;
          state.parsedElements = res.elements;
          
          var newSceneShots = res.shots.filter(function (s) { return s.sceneNum === targetScNum; });
          
          state.shots = state.shots.filter(function (s) { return s.sceneNum !== targetScNum; });
          state.shots.push.apply(state.shots, newSceneShots);
          
          assignShotNumbers(state.shots);
          retimeAllShots(false);
          renderInteractiveScript();
          renderShotlistTable();
          queueAutoSave();
          showToast('Regenerated shots for Scene ' + targetScNum + ' (' + newSceneShots.length + ' shots).', 'success');
        } else {
          parseAndRender(false);
          showToast('Generated ' + state.shots.length + ' shots across ' + state.parsedScenes.length + ' scenes.', 'success');
        }
      });
    }

    var allMenuPanels = document.querySelectorAll('.dropdown-menu-left');
    function closeAllMenus() {
      allMenuPanels.forEach(function (panel) { panel.classList.remove('show'); });
    }

    document.querySelectorAll('.menu-trigger').forEach(function (trigger) {
      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        var targetId = trigger.getAttribute('data-menu-target');
        var panel = document.getElementById(targetId);
        var isOpen = panel && panel.classList.contains('show');
        closeAllMenus();
        if (panel && !isOpen) panel.classList.add('show');
      });

      trigger.addEventListener('mouseenter', function () {
        var anyOpen = Array.from(allMenuPanels).some(function (p) { return p.classList.contains('show'); });
        if (!anyOpen) return;
        var targetId = trigger.getAttribute('data-menu-target');
        var panel = document.getElementById(targetId);
        closeAllMenus();
        if (panel) panel.classList.add('show');
      });
    });

    allMenuPanels.forEach(function (panel) {
      panel.addEventListener('click', function (e) {
        if (!e.target.closest('button') && !e.target.closest('label')) {
          e.stopPropagation();
        }
      });
    });
    document.addEventListener('click', closeAllMenus);

    function createNewProject() {
      openConfirm('Create New Project?', 'Clear the current script and shotlist to start a blank project?', function () {
          resetProjectToDefaults();
          syncControlsFromState();
          state.rawScript = 'INT. LOCATION - DAY\n\n';
          state.shots = [];
          parseAndRender(false);
          updateSaveBadge('unsaved');
          showToast('Started new blank project.', 'info');
      });
    }

    var btnMenuNew = document.getElementById('btn-menu-new');
    if (btnMenuNew) btnMenuNew.addEventListener('click', createNewProject);

    var btnMenuOpen = document.getElementById('btn-menu-open');
    if (btnMenuOpen) {
      btnMenuOpen.addEventListener('click', function () {
        openProjectDialog();
      });
    }

    var btnMenuOpenRecent = document.getElementById('btn-menu-open-recent');
    if (btnMenuOpenRecent) {
      btnMenuOpenRecent.addEventListener('click', function () {
        openRecentsModal();
      });
    }

    var btnSaveNow = document.getElementById('btn-save-now');
    if (btnSaveNow) {
      btnSaveNow.addEventListener('click', function () {
        saveProjectFile(true);
      });
    }

    var btnSaveAs = document.getElementById('btn-save-as');
    if (btnSaveAs) {
      btnSaveAs.addEventListener('click', function () {
        saveProjectAs();
      });
    }

    // --- STRIPBOARD GENERATOR & EXPORTER ---

    function getSortedStripboardScenes() {
      var sceneMap = {};
      var locationFirstAppearance = {};
      var appearanceCounter = 0;

      // Track first appearance order of locations in the parsed script
      state.parsedScenes.forEach(function (sc) {
        var locKey = (sc.intExt || 'INT.') + ' ' + (sc.location || 'UNKNOWN').toUpperCase().trim();
        if (locationFirstAppearance[locKey] == null) {
          locationFirstAppearance[locKey] = appearanceCounter++;
        }
      });

      state.shots.forEach(function (sh) {
        var scNum = sh.sceneNum;
        if (!sceneMap[scNum]) {
          var scMeta = state.parsedScenes.find(function (s) { return s.sceneNum === scNum; });
          var intExt = 'INT.';
          var location = 'UNKNOWN LOCATION';
          var timeOfDay = 'DAY';

          if (scMeta && scMeta.heading) {
            intExt = scMeta.intExt || 'INT.';
            location = scMeta.location || 'UNKNOWN';
            timeOfDay = scMeta.timeOfDay || 'DAY';
          }

          sceneMap[scNum] = {
            sceneNum: scNum,
            intExt: intExt.toUpperCase().trim(),
            location: location.toUpperCase().trim(),
            timeOfDay: timeOfDay.toUpperCase().trim(),
            shots: []
          };
        }
        sceneMap[scNum].shots.push(sh);
      });

      var sceneArray = Object.keys(sceneMap).map(function (k) { return sceneMap[k]; });

      function getTimePriority(timeStr) {
        var t = String(timeStr || '').toUpperCase();
        if (t.includes('DAWN') || t.includes('SUNRISE')) return 0;
        if (t.includes('MORNING')) return 1;
        if (t.includes('DAY')) return 2;
        if (t.includes('AFTERNOON')) return 3;
        if (t.includes('EVENING') || t.includes('DUSK') || t.includes('TWILIGHT')) return 4;
        if (t.includes('NIGHT')) return 5;
        return 3;
      }

      // Sort by location appearance order in script first, then time of day
      sceneArray.sort(function (a, b) {
        var locA = a.intExt + ' ' + a.location;
        var locB = b.intExt + ' ' + b.location;
        var orderA = locationFirstAppearance[locA] != null ? locationFirstAppearance[locA] : 999;
        var orderB = locationFirstAppearance[locB] != null ? locationFirstAppearance[locB] : 999;

        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return getTimePriority(a.timeOfDay) - getTimePriority(b.timeOfDay);
      });

      return sceneArray;
    }

    function populateExportStripboardBrandingSelect() {
      var sel = document.getElementById('export-stripboard-branding-select');
      if (!sel) return;
      var profiles = state.brandingProfiles || [];
      sel.innerHTML = profiles.map(function (p, idx) {
        var suffix = idx === 0 ? ' (Default)' : '';
        return '<option value="' + escapeHTML(p.id) + '">' + escapeHTML(p.name + suffix) + ' — ' + escapeHTML(p.company || '') + '</option>';
      }).join('');
    }

    function getSelectedStripboardBranding() {
      var sel = document.getElementById('export-stripboard-branding-select');
      var profiles = state.brandingProfiles || [];
      if (sel && sel.value) {
        var found = profiles.find(function (p) { return p.id === sel.value; });
        if (found) return found;
      }
      return profiles[0] || { name: 'Default', company: '', tagline: '', logoText: '' };
    }

    function formatStripboardCsvRow(values) {
      return values.map(function (v) {
        return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      }).join(',');
    }

    async function exportStripboardCSVNative() {
      var sortedScenes = getSortedStripboardScenes();
      if (!sortedScenes.length) {
        showToast('No scenes available to export stripboard.', 'warn');
        return;
      }

      var includeShotsChk = document.getElementById('chk-stripboard-include-shots');
      var includeShots = Boolean(includeShotsChk && includeShotsChk.checked);
      var prodColName = isRenderMedium() ? 'Render Mins' : 'Shoot Mins';

      var headers = includeShots
        ? ['Strip Order', 'Scene #', 'Shot #', 'Int/Ext', 'Location', 'Time', 'Size', 'Angle', 'Movement', 'Lens', 'Subject', 'Description', prodColName]
        : ['Strip Order', 'Scene #', 'Int/Ext', 'Location', 'Time', 'Total Shots', prodColName];

      var lines = [headers.join(',')];
      var stripOrder = 1;

      if (includeShots) {
        sortedScenes.forEach(function (sc) {
          sc.shots.forEach(function (sh) {
            lines.push(formatStripboardCsvRow([
              stripOrder++,
              sc.sceneNum,
              sh.shotNum,
              sc.intExt,
              sc.location,
              sc.timeOfDay,
              sh.size,
              sh.angle,
              sh.movement,
              sh.lens,
              sh.subject,
              sh.description,
              sh.estMins
            ]));
          });
        });
      } else {
        sortedScenes.forEach(function (sc) {
          var totalMins = sc.shots.reduce(function (sum, sh) {
            return sum + (Number(sh.estMins) || 0);
          }, 0);
          lines.push(formatStripboardCsvRow([
            stripOrder++,
            sc.sceneNum,
            sc.intExt,
            sc.location,
            sc.timeOfDay,
            sc.shots.length,
            totalMins.toFixed(1)
          ]));
        });
      }

      var csvContent = lines.join('\n');
      var slug = (state.projectTitle || 'stripboard').replace(/[\\/:*?"<>|]+/g, '').trim() || 'stripboard';
      var defaultFileName = slug + '_stripboard.csv';

      if (ipcRenderer) {
        var res = await ipcRenderer.invoke('dialog:export-stripboard', {
          defaultFileName: defaultFileName,
          fileContent: csvContent
        });
        if (res && !res.canceled) {
          if (res.error) {
            showToast('Stripboard export failed: ' + res.error, 'warn');
          } else {
            showToast('Exported stripboard to ' + (nodePath ? nodePath.basename(res.filePath) : res.filePath), 'success');
          }
        }
      }
    }

    async function exportStripboardExcelNative() {
      var sortedScenes = getSortedStripboardScenes();
      if (!sortedScenes.length) {
        showToast('No scenes available to export stripboard.', 'warn');
        return;
      }

      var branding = getSelectedStripboardBranding();
      var includeShotsChk = document.getElementById('chk-stripboard-include-shots');
      var includeShots = Boolean(includeShotsChk && includeShotsChk.checked);
      var prodColName = isRenderMedium() ? 'Render (m)' : 'Shoot (m)';

      var headers = includeShots
        ? ['Strip Order', 'Scene #', 'Shot #', 'Int/Ext', 'Location', 'Time', 'Size', 'Angle', 'Movement', 'Lens', 'Subject', 'Description', prodColName]
        : ['Strip Order', 'Scene #', 'Int/Ext', 'Location', 'Time', 'Total Shots', prodColName];

      var colSpan = headers.length;
      var titleSuffix = branding.logoText ? ' (' + escapeHTML(branding.logoText) + ')' : '';
      var metaParts = [];
      if (branding.company) metaParts.push('<strong>Studio:</strong> ' + escapeHTML(branding.company));
      if (branding.tagline) metaParts.push('<em>' + escapeHTML(branding.tagline) + '</em>');

      var topHeaderRows =
        '<tr><td colspan="' + colSpan + '" style="font-size:13pt;font-weight:bold;color:#111;padding:8px;background:#fef3c7;border:1px solid #ccc;">PRODUCTION STRIPBOARD — ' + escapeHTML(state.projectTitle || 'Untitled Project') + titleSuffix + '</td></tr>' +
        (metaParts.length
          ? '<tr><td colspan="' + colSpan + '" style="font-size:9.5pt;color:#333;padding:6px;background:#fff;border:1px solid #ccc;">' + metaParts.join(' &nbsp;|&nbsp; ') + '</td></tr>'
          : '') +
        '<tr><td colspan="' + colSpan + '" style="height:8px;background:#fff;border:none;"></td></tr>';

      var tableHeaderRow = '<tr>' + headers.map(function (h) {
        return '<th style="background:#25252a;color:#fbbf24;font-weight:bold;border:1px solid #444;padding:6px;">' + escapeHTML(h) + '</th>';
      }).join('') + '</tr>';

      var tableRows = topHeaderRows + tableHeaderRow;
      var stripOrder = 1;

      if (includeShots) {
        sortedScenes.forEach(function (sc) {
          sc.shots.forEach(function (sh) {
            var cells = [
              stripOrder++,
              sc.sceneNum,
              sh.shotNum,
              sc.intExt,
              sc.location,
              sc.timeOfDay,
              sh.size,
              sh.angle,
              sh.movement,
              sh.lens,
              sh.subject,
              sh.description,
              sh.estMins
            ];
            tableRows += '<tr>' + cells.map(function (val) {
              return '<td style="border:1px solid #ccc;padding:5px;color:#000;">' + escapeHTML(val) + '</td>';
            }).join('') + '</tr>';
          });
        });
      } else {
        sortedScenes.forEach(function (sc) {
          var totalMins = sc.shots.reduce(function (sum, sh) {
            return sum + (Number(sh.estMins) || 0);
          }, 0);
          var cells = [
            stripOrder++,
            sc.sceneNum,
            sc.intExt,
            sc.location,
            sc.timeOfDay,
            sc.shots.length,
            totalMins.toFixed(1)
          ];
          tableRows += '<tr>' + cells.map(function (val) {
            return '<td style="border:1px solid #ccc;padding:5px;color:#000;">' + escapeHTML(val) + '</td>';
          }).join('') + '</tr>';
        });
      }

      var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' +
        '<head><meta charset="UTF-8"></head><body><table>' + tableRows + '</table></body></html>';

      var slug = (state.projectTitle || 'stripboard').replace(/[\\/:*?"<>|]+/g, '').trim() || 'stripboard';
      var defaultFileName = slug + '_stripboard.xls';

      if (ipcRenderer) {
        var res = await ipcRenderer.invoke('dialog:export-stripboard', {
          defaultFileName: defaultFileName,
          fileContent: html
        });
        if (res && !res.canceled) {
          if (res.error) {
            showToast('Stripboard export failed: ' + res.error, 'warn');
          } else {
            showToast('Exported stripboard XLS to ' + (nodePath ? nodePath.basename(res.filePath) : res.filePath), 'success');
          }
        }
      }
    }

    var btnExportStripboard = document.getElementById('btn-export-stripboard');
    var sbModal = document.getElementById('stripboard-export-modal');
    var btnCloseSb = document.getElementById('btn-close-stripboard-modal');
    var btnCancelSb = document.getElementById('btn-cancel-stripboard-modal');
    var isExportingStripboard = false;

    if (btnExportStripboard && sbModal) {
      btnExportStripboard.addEventListener('click', function () {
        populateExportStripboardBrandingSelect();
        sbModal.classList.remove('hidden');
      });
    }

    if (btnCloseSb && sbModal) {
      btnCloseSb.addEventListener('click', function () {
        sbModal.classList.add('hidden');
      });
    }

    if (btnCancelSb && sbModal) {
      btnCancelSb.addEventListener('click', function () {
        sbModal.classList.add('hidden');
      });
    }

    document.querySelectorAll('.stripboard-choice-btn').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (isExportingStripboard) return;
        isExportingStripboard = true;
        try {
          var format = btn.getAttribute('data-stripboard-format');
          if (sbModal) sbModal.classList.add('hidden');

          if (format === 'csv') {
            await exportStripboardCSVNative();
          } else if (format === 'xls') {
            await exportStripboardExcelNative();
          }
        } finally {
          isExportingStripboard = false;
        }
      });
    });

    var uploadInput = document.getElementById('input-script-upload');
    if (uploadInput) {
      uploadInput.addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (!file) return;

        if (fs && file.path) {
          try {
            var content = fs.readFileSync(file.path, 'utf8');
            openScriptImportModal(file.name, content, null);
          } catch (err) {
            showToast('Failed to read file: ' + err.message, 'warn');
          }
        } else {
          var reader = new FileReader();
          reader.onload = function (ev) {
            openScriptImportModal(file.name, ev.target.result, null);
          };
          reader.readAsText(file);
        }
        e.target.value = '';
      });
    }

    var exportModal = document.getElementById('export-modal');
    var btnOpenExport = document.getElementById('btn-open-export');
    var btnCloseExport = document.getElementById('btn-close-export');
    var btnCancelExport = document.getElementById('btn-cancel-export');

    if (btnOpenExport && exportModal) {
      btnOpenExport.addEventListener('click', function () {
        var nameSpan = document.getElementById('export-project-name');
        if (nameSpan) nameSpan.textContent = state.projectTitle || 'Untitled Project';
        
        populateExportBrandingSelect();
        
        exportModal.classList.remove('hidden');
      });
    }
    if (btnCloseExport && exportModal) {
      btnCloseExport.addEventListener('click', function () { exportModal.classList.add('hidden'); });
    }
    if (btnCancelExport && exportModal) {
      btnCancelExport.addEventListener('click', function () { exportModal.classList.add('hidden'); });
    }

    document.querySelectorAll('.export-choice-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var fmt = btn.getAttribute('data-export-format');
        if (exportModal) exportModal.classList.add('hidden');
        if (fmt === 'pdf') exportPDF();
        else if (fmt === 'xlsx') exportExcel();
        else if (fmt === 'csv') exportCSV();
        else if (fmt === 'json') exportJSON();
      });
    });

    var btnAdvRetime = document.getElementById('btn-adv-retime');
    if (btnAdvRetime) btnAdvRetime.addEventListener('click', function () { retimeAllShots(true); });

    var btnAdvRenumber = document.getElementById('btn-adv-renumber');
    if (btnAdvRenumber) {
      btnAdvRenumber.addEventListener('click', function () {
        assignShotNumbers(state.shots);
        renderShotlistTable();
        queueAutoSave();
        showToast('Re-numbered shots cleanly per scene.', 'info');
      });
    }

    var shortcutsModal = document.getElementById('shortcuts-modal');
    var btnMenuShortcuts = document.getElementById('btn-menu-shortcuts');
    var btnCloseShortcuts = document.getElementById('btn-close-shortcuts');
    var btnDoneShortcuts = document.getElementById('btn-done-shortcuts');
    var btnResetShortcuts = document.getElementById('btn-reset-shortcuts');

    if (btnMenuShortcuts && shortcutsModal) {
      btnMenuShortcuts.addEventListener('click', function () {
        renderShortcutsModal();
        shortcutsModal.classList.remove('hidden');
      });
    }
    if (btnCloseShortcuts && shortcutsModal) {
      btnCloseShortcuts.addEventListener('click', function () { shortcutsModal.classList.add('hidden'); });
    }
    if (btnDoneShortcuts && shortcutsModal) {
      btnDoneShortcuts.addEventListener('click', function () {
        var map = getShortcutsMap();
        shortcutsModal.querySelectorAll('[data-shortcut-key]').forEach(function (inp) {
          var k = inp.getAttribute('data-shortcut-key');
          if (map[k]) map[k].combo = inp.value.trim();
        });
        try {
          localStorage.setItem('script2shot_shortcuts_v1', JSON.stringify(map));
        } catch (e) {}
        shortcutsModal.classList.add('hidden');
        showToast('Saved keyboard shortcut bindings.', 'success');
      });
    }
    if (btnResetShortcuts) {
      btnResetShortcuts.addEventListener('click', function () {
        try {
          localStorage.removeItem('script2shot_shortcuts_v1');
        } catch (e) {}
        renderShortcutsModal();
        showToast('Reset shortcuts to default bindings.', 'info');
      });
    }

    var docsModal = document.getElementById('docs-modal');
    var btnMenuHelp = document.getElementById('btn-menu-help');
    var btnCloseDocs = document.getElementById('btn-close-docs');
    var btnDoneDocs = document.getElementById('btn-done-docs');

    if (btnMenuHelp) {
      btnMenuHelp.addEventListener('click', function () {
        loadAndRenderWipDocumentation();
      });
    }

    function closeDocsModal() {
      if (docsModal) docsModal.classList.add('hidden');
    }

    if (btnCloseDocs) btnCloseDocs.addEventListener('click', closeDocsModal);
    if (btnDoneDocs) btnDoneDocs.addEventListener('click', closeDocsModal);

    var presetsModal = document.getElementById('presets-modal');
    var btnOpenPresets = document.getElementById('btn-presets-modal');
    var btnClosePresets = document.getElementById('btn-close-presets');
    var btnDonePresets = document.getElementById('btn-done-presets');

    if (btnOpenPresets && presetsModal) {
      btnOpenPresets.addEventListener('click', function () {
        renderPresetsModal();
        presetsModal.classList.remove('hidden');
      });
    }
    if (btnClosePresets && presetsModal) {
      btnClosePresets.addEventListener('click', function () { presetsModal.classList.add('hidden'); });
    }
    if (btnDonePresets && presetsModal) {
      btnDonePresets.addEventListener('click', function () { presetsModal.classList.add('hidden'); });
    }

    document.querySelectorAll('.mtab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = btn.getAttribute('data-mtab');
        document.querySelectorAll('.mtab-btn').forEach(function (b) {
          b.className = 'mtab-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-studio-800 text-slate-300 hover:text-white cursor-pointer';
        });
        btn.className = 'mtab-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-studio-950 cursor-pointer';
        var pGuide = document.getElementById('mpanel-guide');
        var pShots = document.getElementById('mpanel-shots');
        var pMoves = document.getElementById('mpanel-moves');
        if (pGuide) pGuide.classList.toggle('hidden', tab !== 'guide');
        if (pShots) pShots.classList.toggle('hidden', tab !== 'shots');
        if (pMoves) pMoves.classList.toggle('hidden', tab !== 'moves');
      });
    });

    var btnApplyPresetLenses = document.getElementById('btn-apply-preset-lenses');
    if (btnApplyPresetLenses) {
      btnApplyPresetLenses.addEventListener('click', function () {
        state.shots.forEach(function (s) {
          var def = getShotDefaults(s.size);
          s.lens = def.lens;
          if (isRenderMedium()) syncShotProdMetric(s);
          else s.estMins = def.mins;
        });
        renderShotlistTable();
        queueAutoSave();
        showToast('Applied format preset lenses & times to all shots.', 'success');
      });
    }

    var btnSaveCustomShot = document.getElementById('btn-save-custom-shot');
    if (btnSaveCustomShot) {
      btnSaveCustomShot.addEventListener('click', function () {
        var codeEl = document.getElementById('input-custom-code');
        var nameEl = document.getElementById('input-custom-name');
        var lensEl = document.getElementById('input-custom-lens');
        var minsEl = document.getElementById('input-custom-mins');
        var descEl = document.getElementById('input-custom-desc');
        if (!codeEl || !nameEl) return;

        var code = codeEl.value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        var name = nameEl.value.trim();
        if (!code || !name) {
          showToast('Please enter both a Shot Code and Full Name.', 'warn');
          return;
        }
        state.customShotTypes[code] = {
          name: name,
          desc: (descEl && descEl.value.trim()) || (name + ' framing.'),
          lens: (lensEl && lensEl.value.trim()) || '50mm',
          mins: Math.max(1, parseInt(minsEl && minsEl.value, 10) || 15)
        };
        codeEl.value = '';
        nameEl.value = '';
        if (descEl) descEl.value = '';

        renderPresetsModal();
        renderShotlistTable();
        queueAutoSave();
        showToast('Saved custom shot type "' + code + '".', 'success');
      });
    }

    var modalTypesList = document.getElementById('modal-shot-types-list');
    if (modalTypesList) {
      modalTypesList.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-del-shot-type]');
        if (!btn) return;
        var code = btn.getAttribute('data-del-shot-type');
        delete state.customShotTypes[code];
        renderPresetsModal();
        renderShotlistTable();
        queueAutoSave();
        showToast('Removed custom shot type "' + code + '".', 'info');
      });
    }

    var btnAddMove = document.getElementById('btn-add-custom-move');
    if (btnAddMove) {
      btnAddMove.addEventListener('click', function () {
        var mvInput = document.getElementById('input-custom-move');
        if (!mvInput) return;
        var mv = mvInput.value.trim();
        if (!mv) return;
        var exists = getAllMovements().some(function (m) { return m.toLowerCase() === mv.toLowerCase(); });
        if (exists) {
          showToast('Movement "' + mv + '" already exists.', 'warn');
          return;
        }
        state.customMovements.push(mv);
        mvInput.value = '';
        renderPresetsModal();
        renderShotlistTable();
        queueAutoSave();
        showToast('Added movement "' + mv + '".', 'success');
      });
    }

    var modalMovesList = document.getElementById('modal-moves-list');
    if (modalMovesList) {
      modalMovesList.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-del-move]');
        if (!btn) return;
        var mv = btn.getAttribute('data-del-move');
        state.customMovements = state.customMovements.filter(function (m) { return m !== mv; });
        renderPresetsModal();
        renderShotlistTable();
        queueAutoSave();
        showToast('Removed movement "' + mv + '".', 'info');
      });
    }

    var btnResetPresets = document.getElementById('btn-reset-presets');
    if (btnResetPresets) {
      btnResetPresets.addEventListener('click', function () {
        state.customShotTypes = {};
        state.customMovements = [];
        renderPresetsModal();
        renderShotlistTable();
        queueAutoSave();
        showToast('Custom shot types and movements cleared.', 'info');
      });
    }

    var tabInteractive = document.getElementById('tab-interactive');
    var tabEditor = document.getElementById('tab-editor');
    var viewInteractive = document.getElementById('view-interactive');
    var viewEditor = document.getElementById('view-editor');
    var textarea = document.getElementById('textarea-script');

    if (textarea) {
      textarea.addEventListener('input', function () {
        state.rawScript = textarea.value;
        queueAutoSave();
      });
    }

    function showInteractiveTab() {
      if (textarea) state.rawScript = textarea.value;
      state.activeLeftTab = 'interactive';
      if (tabInteractive) tabInteractive.className = 'px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500 text-studio-950 transition cursor-pointer';
      if (tabEditor) tabEditor.className = 'px-2.5 py-1 rounded-md text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer';
      if (viewEditor) viewEditor.classList.add('hidden');
      if (viewInteractive) viewInteractive.classList.remove('hidden');
      parseAndRender(true);
    }

    function showEditorTab() {
      state.activeLeftTab = 'editor';
      if (textarea) textarea.value = state.rawScript;
      if (tabEditor) tabEditor.className = 'px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500 text-studio-950 transition cursor-pointer';
      if (tabInteractive) tabInteractive.className = 'px-2.5 py-1 rounded-md text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer';
      if (viewInteractive) viewInteractive.classList.add('hidden');
      if (viewEditor) viewEditor.classList.remove('hidden');
      if (textarea) textarea.focus();
    }

    if (tabInteractive) tabInteractive.addEventListener('click', showInteractiveTab);
    if (tabEditor) tabEditor.addEventListener('click', showEditorTab);
    var btnApplyScript = document.getElementById('btn-apply-script');
    if (btnApplyScript) btnApplyScript.addEventListener('click', showInteractiveTab);

    var selLabel = document.getElementById('selection-label');
    var btnAddSel = document.getElementById('btn-add-selection');

    function handleScriptSelection() {
      if (!viewInteractive || !btnAddSel || !selLabel) return;
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        state.selectedScript = null;
        btnAddSel.disabled = true;
        selLabel.textContent = 'Highlight any text in Interactive Script to add a shot.';
        return;
      }
      var txt = sel.toString().trim();
      if (!txt) return;
      var node = sel.anchorNode && sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
      if (!node || !viewInteractive.contains(node)) return;

      var block = node.closest('[data-scene]');
      var sceneNum = block ? block.getAttribute('data-scene') : '1';
      var elType = block ? block.getAttribute('data-etype') : 'action';
      state.selectedScript = { text: txt, sceneNum: sceneNum, elType: elType };
      btnAddSel.disabled = false;
      var shortTxt = txt.length > 40 ? txt.substring(0, 37) + '...' : txt;
      selLabel.innerHTML = '<span class="text-amber-400 font-semibold">Sc ' + escapeHTML(sceneNum) + ':</span> "' + escapeHTML(shortTxt) + '"';
    }

    if (viewInteractive) {
      viewInteractive.addEventListener('mouseup', handleScriptSelection);
      viewInteractive.addEventListener('keyup', handleScriptSelection);
    }

    if (btnAddSel) {
      btnAddSel.addEventListener('click', function () {
        if (!state.selectedScript) return;
        var info = state.selectedScript;
        var cue = analyzeCameraCues(info.text);
        var size = cue.size || (info.elType === 'dialogue' ? 'MCU' : 'MS');
        var defs = getShotDefaults(size);

        var shot = createShot({
          sceneNum: info.sceneNum,
          size: size,
          angle: cue.angle || 'Eye Level',
          movement: cue.movement || 'Static',
          lens: defs.lens,
          subject: info.elType === 'character' ? toTitleCase(info.text) : 'Selected Beat',
          description: info.elType === 'dialogue' ? 'Dialogue coverage beat' : info.text,
          audioNotes: info.elType === 'dialogue' ? ('"' + info.text + '"') : '',
          screenSec: 3.5,
          estMins: defs.mins
        });

        var insertAt = state.shots.length;
        for (var i = state.shots.length - 1; i >= 0; i--) {
          if (state.shots[i].sceneNum === info.sceneNum) {
            insertAt = i + 1;
            break;
          }
        }
        state.shots.splice(insertAt, 0, shot);
        assignShotNumbers(state.shots);
        retimeAllShots(false);
        renderShotlistTable();
        queueAutoSave();
        window.getSelection().removeAllRanges();
        handleScriptSelection();
        showToast('Added Shot ' + shot.shotNum + ' to Scene ' + info.sceneNum + '.', 'success');
      });
    }

    var filterSceneEl = document.getElementById('filter-scene');
    if (filterSceneEl) {
      filterSceneEl.addEventListener('change', function (e) {
        state.filterScene = e.target.value;
        renderShotlistTable();
      });
    }

    var filterSizeEl = document.getElementById('filter-size');
    if (filterSizeEl) {
      filterSizeEl.addEventListener('change', function (e) {
        state.filterSize = e.target.value;
        renderShotlistTable();
      });
    }

    var searchEl = document.getElementById('input-search');
    if (searchEl) {
      searchEl.addEventListener('input', function (e) {
        state.searchQuery = e.target.value;
        renderShotlistTable();
      });
    }

    var btnAddShot = document.getElementById('btn-add-shot');
    if (btnAddShot) {
      btnAddShot.onclick = function () {
        pushUndoSnapshot();
        var sc = state.filterScene !== 'ALL'
          ? state.filterScene
          : (state.shots.length ? state.shots[state.shots.length - 1].sceneNum : '1');
        var defs = getShotDefaults('MS');
        var shot = createShot({
          sceneNum: sc,
          size: 'MS',
          angle: 'Eye Level',
          movement: 'Static',
          lens: defs.lens,
          subject: '',
          description: 'New custom shot setup',
          audioNotes: '',
          screenSec: 3.5,
          estMins: defs.mins
        });
        state.shots.push(shot);
        assignShotNumbers(state.shots);
        retimeAllShots(false);
        renderShotlistTable();
        queueAutoSave();
        showToast('Added Shot ' + shot.shotNum + '.', 'success');
      };
    }

    var btnRenumber = document.getElementById('btn-renumber');
    if (btnRenumber) {
      btnRenumber.onclick = function () {
        pushUndoSnapshot();
        assignShotNumbers(state.shots);
        renderShotlistTable();
        queueAutoSave();
        showToast('Re-numbered shots cleanly per scene.', 'info');
      };
    }

    var tbody = document.getElementById('shotlist-tbody');
    if (tbody) {
      tbody.onclick = function (e) {
        var btn = e.target.closest('button[data-act]');
        if (!btn) return;
        var act = btn.getAttribute('data-act');
        var tr = btn.closest('tr[data-id]');
        if (!tr) return;
        var id = tr.getAttribute('data-id');
        var idx = state.shots.findIndex(function (item) { return item.id === id; });
        if (idx === -1) return;

        if (act === 'up' && idx > 0) {
          pushUndoSnapshot();
          var prev = state.shots[idx - 1];
          state.shots[idx - 1] = state.shots[idx];
          state.shots[idx] = prev;
          renderShotlistTable();
          queueAutoSave();
        } else if (act === 'down' && idx < state.shots.length - 1) {
          pushUndoSnapshot();
          var next = state.shots[idx + 1];
          state.shots[idx + 1] = state.shots[idx];
          state.shots[idx] = next;
          renderShotlistTable();
          queueAutoSave();
        } else if (act === 'dup') {
          pushUndoSnapshot();
          var orig = state.shots[idx];
          var copy = createShot({
            sceneNum: orig.sceneNum,
            shotNum: orig.shotNum + 'b',
            size: orig.size,
            angle: orig.angle,
            movement: orig.movement,
            lens: orig.lens,
            subject: orig.subject,
            description: orig.description,
            audioNotes: orig.audioNotes,
            screenSec: orig.screenSec,
            estMins: orig.estMins
          });
          state.shots.splice(idx + 1, 0, copy);
          retimeAllShots(false);
          renderShotlistTable();
          queueAutoSave();
          showToast('Duplicated Shot ' + orig.shotNum + '.', 'info');
        } else if (act === 'del') {
          pushUndoSnapshot();
          var removed = state.shots.splice(idx, 1)[0];
          retimeAllShots(false);
          renderShotlistTable();
          queueAutoSave();
          showToast('Deleted Shot ' + removed.shotNum + '.', 'warn');
        }
      };

      tbody.onchange = function (e) {
        var field = e.target.getAttribute('data-field');
        if (!field) return;
        var tr = e.target.closest('tr[data-id]');
        if (!tr) return;
        var sh = state.shots.find(function (item) { return item.id === tr.getAttribute('data-id'); });
        if (!sh) return;

        pushUndoSnapshot();

        if (field === 'screenSec') {
          sh.screenSec = Math.max(0.5, parseFloat(e.target.value) || 1);
          if (isRenderMedium()) {
            syncShotProdMetric(sh);
            renderShotlistTable();
          } else {
            updateKPIs();
          }
        } else if (field === 'estMins') {
          sh.estMins = Math.max(0.1, parseFloat(e.target.value) || 1);
          updateKPIs();
        } else if (field === 'size') {
          sh.size = e.target.value;
          var defs = getShotDefaults(sh.size);
          sh.lens = defs.lens;
          if (isRenderMedium()) syncShotProdMetric(sh);
          else sh.estMins = defs.mins;
          renderShotlistTable();
        } else {
          sh[field] = e.target.value;
          if (field === 'sceneNum') renderShotlistTable();
        }
        queueAutoSave();
      };
    }

    var dirInput = document.getElementById('input-director');
    if (dirInput) {
      dirInput.addEventListener('input', function (e) {
        state.director = e.target.value;
        queueAutoSave();
      });
    }

    var prodInput = document.getElementById('input-producer');
    if (prodInput) {
      prodInput.addEventListener('input', function (e) {
        state.producer = e.target.value;
        queueAutoSave();
      });
    }

    var brandingModal = document.getElementById('branding-modal');
    var btnOpenBranding = document.getElementById('btn-branding-modal');
    var btnCloseBranding = document.getElementById('btn-close-branding');
    var btnDoneBranding = document.getElementById('btn-done-branding');
    var btnSaveBranding = document.getElementById('btn-save-branding');
    var btnCancelBrandingEdit = document.getElementById('btn-cancel-branding-edit');

    if (btnOpenBranding && brandingModal) {
      btnOpenBranding.addEventListener('click', function () {
        renderBrandingModal();
        brandingModal.classList.remove('hidden');
      });
    }
    if (btnCloseBranding && brandingModal) {
      btnCloseBranding.addEventListener('click', function () { brandingModal.classList.add('hidden'); });
    }
    if (btnDoneBranding && brandingModal) {
      btnDoneBranding.addEventListener('click', function () { brandingModal.classList.add('hidden'); });
    }

    if (btnSaveBranding) {
      btnSaveBranding.addEventListener('click', function () {
        var idEl = document.getElementById('input-branding-id');
        var nameEl = document.getElementById('input-branding-name');
        var compEl = document.getElementById('input-branding-company');
        var tagEl = document.getElementById('input-branding-tagline');
        var logoEl = document.getElementById('input-branding-logo');
        if (!nameEl) return;

        var name = nameEl.value.trim();
        if (!name) {
          showToast('Please enter a profile name.', 'warn');
          return;
        }

        var editId = idEl ? idEl.value : '';
        if (editId) {
          var p = state.brandingProfiles.find(function (item) { return item.id === editId; });
          if (p) {
            p.name = name;
            p.company = compEl ? compEl.value.trim() : '';
            p.tagline = tagEl ? tagEl.value.trim() : '';
            p.logoText = logoEl ? logoEl.value.trim() : '';
          }
          if (idEl) idEl.value = '';
          if (btnCancelBrandingEdit) btnCancelBrandingEdit.classList.add('hidden');
          btnSaveBranding.textContent = '+ Save Profile';
          showToast('Updated branding profile "' + name + '".', 'success');
        } else {
          var newProfile = {
            id: 'b-' + Math.random().toString(36).substring(2, 8),
            name: name,
            company: compEl ? compEl.value.trim() : '',
            tagline: tagEl ? tagEl.value.trim() : '',
            logoText: logoEl ? logoEl.value.trim() : ''
          };
          state.brandingProfiles.push(newProfile);
          showToast('Created branding profile "' + name + '".', 'success');
        }

        nameEl.value = '';
        if (compEl) compEl.value = '';
        if (tagEl) tagEl.value = '';
        if (logoEl) logoEl.value = '';

        renderBrandingModal();
        queueAutoSave();
      });
    }

    if (btnCancelBrandingEdit) {
      btnCancelBrandingEdit.addEventListener('click', function () {
        var idEl = document.getElementById('input-branding-id');
        var nameEl = document.getElementById('input-branding-name');
        var compEl = document.getElementById('input-branding-company');
        var tagEl = document.getElementById('input-branding-tagline');
        var logoEl = document.getElementById('input-branding-logo');
        if (idEl) idEl.value = '';
        if (nameEl) nameEl.value = '';
        if (compEl) compEl.value = '';
        if (tagEl) tagEl.value = '';
        if (logoEl) logoEl.value = '';
        btnCancelBrandingEdit.classList.add('hidden');
        if (btnSaveBranding) btnSaveBranding.textContent = '+ Save Profile';
      });
    }

    var brandingListContainer = document.getElementById('branding-profiles-list');
    if (brandingListContainer) {
      brandingListContainer.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-brand-act]');
        if (!btn) return;
        var act = btn.getAttribute('data-brand-act');
        var idx = parseInt(btn.getAttribute('data-index'), 10);
        var profiles = state.brandingProfiles;

        if (act === 'up' && idx > 0) {
          var item = profiles.splice(idx, 1)[0];
          profiles.splice(idx - 1, 0, item);
          renderBrandingModal();
          queueAutoSave();
        } else if (act === 'down' && idx < profiles.length - 1) {
          var item = profiles.splice(idx, 1)[0];
          profiles.splice(idx + 1, 0, item);
          renderBrandingModal();
          queueAutoSave();
        } else if (act === 'edit') {
          var p = profiles[idx];
          var idEl = document.getElementById('input-branding-id');
          var nameEl = document.getElementById('input-branding-name');
          var compEl = document.getElementById('input-branding-company');
          var tagEl = document.getElementById('input-branding-tagline');
          var logoEl = document.getElementById('input-branding-logo');
          if (idEl) idEl.value = p.id;
          if (nameEl) nameEl.value = p.name;
          if (compEl) compEl.value = p.company || '';
          if (tagEl) tagEl.value = p.tagline || '';
          if (logoEl) logoEl.value = p.logoText || '';
          if (btnCancelBrandingEdit) btnCancelBrandingEdit.classList.remove('hidden');
          if (btnSaveBranding) btnSaveBranding.textContent = 'Update Profile';
        } else if (act === 'del' && profiles.length > 1) {
          profiles.splice(idx, 1);
          renderBrandingModal();
          queueAutoSave();
          showToast('Deleted branding profile.', 'info');
        }
      });
    }

    var btnResetBranding = document.getElementById('btn-reset-branding');
    if (btnResetBranding) {
      btnResetBranding.addEventListener('click', function () {
        openConfirm(
          'Reset Branding Profiles?',
          'This will clear all custom branding profiles and reset back to the default studio profile.',
          function () {
            state.brandingProfiles = [
              { id: 'b-default', name: 'Default Studio', company: 'Independent Film Group', tagline: 'All Rights Reserved', logoText: 'STUDIO 24' }
            ];
            
            var idEl = document.getElementById('input-branding-id');
            var nameEl = document.getElementById('input-branding-name');
            var compEl = document.getElementById('input-branding-company');
            var tagEl = document.getElementById('input-branding-tagline');
            var logoEl = document.getElementById('input-branding-logo');
            if (idEl) idEl.value = '';
            if (nameEl) nameEl.value = '';
            if (compEl) compEl.value = '';
            if (tagEl) tagEl.value = '';
            if (logoEl) logoEl.value = '';
            if (btnCancelBrandingEdit) btnCancelBrandingEdit.classList.add('hidden');
            if (btnSaveBranding) btnSaveBranding.textContent = '+ Save Profile';

            renderBrandingModal();
            queueAutoSave();
            showToast('Reset branding profiles to default.', 'info');
          }
        );
      });
    }

    if (viewInteractive) {
      viewInteractive.addEventListener('click', function (e) {
        var charEl = e.target.closest('[data-etype="character"]');
        if (!charEl) return;
        var idx = parseInt(charEl.getAttribute('data-el-index'), 10);
        if (isNaN(idx) || !state.parsedElements[idx]) return;

        var targetEl = state.parsedElements[idx];
        targetEl.isNarrator = !targetEl.isNarrator;

        renderInteractiveScript();
        queueAutoSave();
        showToast('Toggled V.O. for ' + targetEl.character, 'success');
      });
    }

    if (textarea) {
      textarea.addEventListener('focus', function () {
        if (scriptUndoStack.length === 0) {
          scriptUndoStack.push(textarea.value);
          updateScriptUndoRedoButtons();
        }
      });

      textarea.addEventListener('input', function () {
        if (isProgrammaticScriptChange) return;
        pushScriptUndoSnapshot(textarea.value);
        state.rawScript = textarea.value;
        queueAutoSave();
      });
    }

    var btnScriptUndo = document.getElementById('btn-script-undo');
    var btnScriptRedo = document.getElementById('btn-script-redo');
    if (btnScriptUndo) {
      btnScriptUndo.onclick = function () {
        if (scriptUndoStack.length <= 1) return;
        isProgrammaticScriptChange = true;
        
        scriptRedoStack.push(textarea.value);
        scriptUndoStack.pop();
        var prev = scriptUndoStack[scriptUndoStack.length - 1];
        
        textarea.value = prev;
        state.rawScript = prev;
        isProgrammaticScriptChange = false;
        
        updateScriptUndoRedoButtons();
        parseAndRender(false);
        showToast('Undo script edit.', 'info');
      };
    }
    if (btnScriptRedo) {
      btnScriptRedo.onclick = function () {
        if (!scriptRedoStack.length) return;
        isProgrammaticScriptChange = true;
        
        var next = scriptRedoStack.pop();
        scriptUndoStack.push(next);
        
        textarea.value = next;
        state.rawScript = next;
        isProgrammaticScriptChange = false;
        
        updateScriptUndoRedoButtons();
        parseAndRender(false);
        showToast('Redo script edit.', 'info');
      };
    }

    if (tbody) {
      tbody.addEventListener('click', function (e) {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
        var tr = e.target.closest('tr[data-id]');
        if (!tr) return;
        var shId = tr.getAttribute('data-id');
        var shot = state.shots.find(function (s) { return s.id === shId; });
        if (!shot) return;

        var tabInteractive = document.getElementById('tab-interactive');
        if (tabInteractive) tabInteractive.click();

        var matchIdx = -1;
        for (var i = 0; i < state.parsedElements.length; i++) {
          var el = state.parsedElements[i];
          if (el.sceneNum !== shot.sceneNum) continue;
          
          var descSnippet = (shot.description || '').toLowerCase().trim();
          var audioSnippet = (shot.audioNotes || '').replace(/["[\]]/g, '').toLowerCase().trim();
          var elText = el.text.toLowerCase();

          if ((descSnippet && elText.indexOf(descSnippet.substring(0, 12)) !== -1) ||
              (audioSnippet && elText.indexOf(audioSnippet.substring(0, 12)) !== -1)) {
            matchIdx = i;
            break;
          }
        }

        if (matchIdx === -1) {
          matchIdx = state.parsedElements.findIndex(function (el) { return el.sceneNum === shot.sceneNum; });
        }

        if (matchIdx !== -1) {
          var domNode = viewInteractive.querySelector('[data-el-index="' + matchIdx + '"]');
          if (domNode) {
            domNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
            domNode.classList.add('bg-amber-500/30', 'transition-colors', 'duration-500');
            setTimeout(function () {
              domNode.classList.remove('bg-amber-500/30');
            }, 1800);
            showToast('Jumped to shot beat in Scene ' + shot.sceneNum, 'info');
          }
        }
      });
    }

    var btnMenuTemplate = document.getElementById('btn-menu-template');
    if (btnMenuTemplate) {
      btnMenuTemplate.addEventListener('click', function () {
        openTemplatesModal();
      });
    }

    var btnCloseInfo = document.getElementById('btn-close-info');
    var infoModal = document.getElementById('info-modal');
    if (btnCloseInfo && infoModal) {
      btnCloseInfo.addEventListener('click', function () {
        infoModal.classList.add('hidden');
      });
    }
  }

  function openTemplatesModal() {
    var modal = document.getElementById('templates-modal');
    var listEl = document.getElementById('templates-list');
    if (!modal || !listEl) return;

    var templatesDir = nodePath ? nodePath.join(__dirname, 'templates') : null;
    var templateFiles = [];

    if (fs && templatesDir && fs.existsSync(templatesDir)) {
      templateFiles = fs.readdirSync(templatesDir)
        .filter(function (f) { return f.toLowerCase().endsWith('.json'); });
    }

    if (!templateFiles.length) {
      listEl.innerHTML = '<div class="text-slate-500 italic text-center py-6">No template files found in the <code>templates/</code> folder.</div>';
    } else {
      listEl.innerHTML = templateFiles.map(function (fileName) {
        var displayName = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
        return '<div class="flex items-center justify-between bg-studio-950 border border-studio-800 rounded-lg p-3 hover:border-amber-500 transition cursor-pointer template-item-row" data-filename="' + escapeHTML(fileName) + '">' +
          '<div class="min-w-0 flex-1">' +
            '<div class="font-semibold text-white text-xs">' + escapeHTML(displayName) + '</div>' +
            '<div class="text-[10px] text-slate-400 font-mono">templates/' + escapeHTML(fileName) + '</div>' +
          '</div>' +
          '<span class="material-symbols-outlined text-amber-400 text-base ml-2">download</span>' +
        '</div>';
      }).join('');
    }

    modal.classList.remove('hidden');

    listEl.onclick = function (e) {
      var row = e.target.closest('.template-item-row');
      if (!row || !fs || !nodePath) return;
      var fileName = row.getAttribute('data-filename');
      var fullPath = nodePath.join(templatesDir, fileName);
      
      modal.classList.add('hidden');
      loadFileFromDiskPath(fullPath);
      
      state.currentFilePath = null;
      updateSaveBadge('unsaved');
      
      showToast('Loaded template "' + fileName + '".', 'success');
    };

    var btnClose = document.getElementById('btn-close-templates');
    var btnCancel = document.getElementById('btn-cancel-templates');
    if (btnClose) btnClose.onclick = function () { modal.classList.add('hidden'); };
    if (btnCancel) btnCancel.onclick = function () { modal.classList.add('hidden'); };
  }

  function renderBrandingModal() {
    var listEl = document.getElementById('branding-profiles-list');
    if (!listEl) return;

    var profiles = state.brandingProfiles || [];
    if (!profiles.length) {
      listEl.innerHTML = '<div class="text-slate-500 italic text-center py-4">No branding profiles configured.</div>';
      return;
    }

    listEl.innerHTML = profiles.map(function (p, idx) {
      var isDefault = idx === 0;
      var badge = isDefault ? '<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">Default</span>' : '';
      return '<div draggable="true" data-index="' + idx + '" class="branding-row bg-studio-900 border border-studio-700 rounded-lg p-3 flex items-center justify-between gap-3 cursor-grab hover:border-amber-500/50 transition">' +
        '<div class="flex items-center gap-2.5 min-w-0 flex-1">' +
          '<span class="material-symbols-outlined text-slate-500 text-base">drag_indicator</span>' +
          '<div class="min-w-0 flex-1">' +
            '<div class="flex items-center gap-2"><span class="font-bold text-white text-xs">' + escapeHTML(p.name) + '</span>' + badge + '</div>' +
            '<div class="text-[11px] text-slate-400 truncate">' + escapeHTML(p.company || 'No Company') + ' • <code class="text-amber-300">' + escapeHTML(p.logoText || '') + '</code></div>' +
          '</div>' +
        '</div>' +
        '<div class="flex items-center gap-1 shrink-0">' +
          '<button type="button" data-brand-act="up" data-index="' + idx + '" class="p-1 rounded bg-studio-850 hover:bg-studio-700 text-slate-300 border border-studio-700 cursor-pointer" title="Move Up">&uarr;</button>' +
          '<button type="button" data-brand-act="down" data-index="' + idx + '" class="p-1 rounded bg-studio-850 hover:bg-studio-700 text-slate-300 border border-studio-700 cursor-pointer" title="Move Down">&darr;</button>' +
          '<button type="button" data-brand-act="edit" data-index="' + idx + '" class="px-2 py-1 rounded bg-studio-850 hover:bg-studio-700 text-sky-300 border border-studio-700 cursor-pointer text-[11px]">Edit</button>' +
          (profiles.length > 1 ? '<button type="button" data-brand-act="del" data-index="' + idx + '" class="px-2 py-1 rounded bg-studio-950 hover:bg-red-950 text-red-400 border border-studio-700 cursor-pointer text-[11px]">Delete</button>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    var rows = listEl.querySelectorAll('.branding-row');
    var dragSrcIdx = null;

    rows.forEach(function (row) {
      row.addEventListener('dragstart', function (e) {
        dragSrcIdx = parseInt(row.getAttribute('data-index'), 10);
        e.dataTransfer.effectAllowed = 'move';
      });
      row.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      row.addEventListener('drop', function (e) {
        e.preventDefault();
        var dropIdx = parseInt(row.getAttribute('data-index'), 10);
        if (dragSrcIdx !== null && dragSrcIdx !== dropIdx) {
          var item = state.brandingProfiles.splice(dragSrcIdx, 1)[0];
          state.brandingProfiles.splice(dropIdx, 0, item);
          renderBrandingModal();
          queueAutoSave();
          showToast('Reordered branding profiles.', 'success');
        }
      });
    });
  }

  function populateExportBrandingSelect() {
    var sel = document.getElementById('export-branding-select');
    if (!sel) return;
    var profiles = state.brandingProfiles || [];
    sel.innerHTML = profiles.map(function (p, idx) {
      var suffix = idx === 0 ? ' (Default)' : '';
      return '<option value="' + escapeHTML(p.id) + '">' + escapeHTML(p.name + suffix) + ' — ' + escapeHTML(p.company || '') + '</option>';
    }).join('');
  }

  function getSelectedBranding() {
    var sel = document.getElementById('export-branding-select');
    var profiles = state.brandingProfiles || [];
    if (sel && sel.value) {
      var found = profiles.find(function (p) { return p.id === sel.value; });
      if (found) return found;
    }
    return profiles[0] || { name: 'Default', company: '', tagline: '', logoText: '' };
  }

  document.addEventListener('DOMContentLoaded', function () {
    syncControlsFromState();
    parseAndRender(false);
    bindEvents();
    updateSaveBadge('unsaved');

    var startupModal = document.getElementById('startup-modal');
    var btnStartNew = document.getElementById('btn-start-new');
    var btnStartOpen = document.getElementById('btn-start-open');
    var btnStartTemplates = document.getElementById('btn-start-templates');
    var btnStartRecent = document.getElementById('btn-start-recent');
    var recentLabel = document.getElementById('recent-file-label');

    var recentFiles = getRecentFiles();
    var validRecent = recentFiles.find(function (p) { return fs && fs.existsSync(p); });

    if (validRecent && btnStartRecent && recentLabel) {
      recentLabel.textContent = validRecent;
      btnStartRecent.classList.remove('hidden');
      
      btnStartRecent.onclick = function () {
        if (loadFileFromDiskPath(validRecent) && startupModal) {
          startupModal.classList.add('hidden');
        }
      };

      btnStartRecent.oncontextmenu = function (e) {
        e.preventDefault();
        showRecentContextMenu(e.clientX, e.clientY);
      };
    }

    if (btnStartNew) {
      btnStartNew.addEventListener('click', function () {
        resetProjectToDefaults();
        state.rawScript = 'INT. LOCATION - DAY\n\n';
        syncControlsFromState();
        parseAndRender(false);
        updateSaveBadge('unsaved');
        if (startupModal) startupModal.classList.add('hidden');
      });
    }

    if (btnStartOpen) {
      btnStartOpen.addEventListener('click', async function () {
        var loaded = await openProjectDialog();
        if (loaded && startupModal) {
          startupModal.classList.add('hidden');
        }
      });
    }

    if (btnStartTemplates) {
      btnStartTemplates.addEventListener('click', function () {
        if (startupModal) startupModal.classList.add('hidden');
        openTemplatesModal();
      });
    }
  });

  function getSortedStripboardScenes() {
    var sceneMap = {};

    state.shots.forEach(function (sh) {
      var scNum = sh.sceneNum;
      if (!sceneMap[scNum]) {
        var scMeta = state.parsedScenes.find(function (s) { return s.sceneNum === scNum; });
        var intExt = 'INT.';
        var location = 'UNKNOWN LOCATION';
        var timeOfDay = 'DAY';

        if (scMeta && scMeta.heading) {
          intExt = scMeta.intExt || 'INT.';
          location = scMeta.location || 'UNKNOWN';
          timeOfDay = scMeta.timeOfDay || 'DAY';
        }

        sceneMap[scNum] = {
          sceneNum: scNum,
          intExt: intExt.toUpperCase().trim(),
          location: location.toUpperCase().trim(),
          timeOfDay: timeOfDay.toUpperCase().trim(),
          shots: []
        };
      }
      sceneMap[scNum].shots.push(sh);
    });

    var sceneArray = Object.keys(sceneMap).map(function (k) { return sceneMap[k]; });

    function getTimePriority(timeStr) {
      var t = timeStr.toUpperCase();
      if (t.includes('MORNING')) return 1;
      if (t.includes('DAY')) return 2;
      if (t.includes('AFTERNOON')) return 3;
      if (t.includes('EVENING')) return 4;
      if (t.includes('NIGHT')) return 5;
      if (t.includes('DAWN') || t.includes('SUNRISE')) return 0;
      if (t.includes('DUSK') || t.includes('TWILIGHT')) return 4;
      return 3;
    }

    sceneArray.sort(function (a, b) {
      if (a.intExt !== b.intExt) {
        return a.intExt.localeCompare(b.intExt);
      }
      if (a.location !== b.location) {
        return a.location.localeCompare(b.location);
      }
      return getTimePriority(a.timeOfDay) - getTimePriority(b.timeOfDay);
    });

    return sceneArray;
  }