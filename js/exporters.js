  function exportCSV() {
    if (!state.shots.length) {
      showToast('No shots to export.', 'warn');
      return;
    }
    var prodColName = isRenderMedium() ? 'Render Mins' : 'Shoot Mins';
    var header = ['Scene', 'Shot #', 'Size', 'Angle', 'Movement', 'Lens / Field', 'Subject / Cast', 'Description / Action', 'Audio / V.O. Notes', 'Screen (s)', prodColName];
    var lines = [header.join(',')];
    state.shots.forEach(function (s) {
      var row = [s.sceneNum, s.shotNum, s.size, s.angle, s.movement, s.lens, s.subject, s.description, s.audioNotes, s.screenSec, s.estMins].map(function (v) {
        return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      });
      lines.push(row.join(','));
    });
    var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var slug = (state.projectTitle || 'shotlist').replace(/[\\/:*?"<>|]+/g, '').trim();
    a.href = url;
    a.download = slug + '_shotlist.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV shotlist downloaded.', 'success');
  }

  function exportExcel() {
    if (!state.shots.length) {
      showToast('No shots to export.', 'warn');
      return;
    }
    var branding = getSelectedBranding();
    var prodColName = isRenderMedium() ? 'Render (m)' : 'Shoot (m)';
    var headers = ['Scene', 'Shot #', 'Size', 'Angle', 'Movement', 'Lens / Field', 'Subject / Cast', 'Description / Action', 'Audio / V.O. Notes', 'Screen (s)', prodColName];
    var fmtLabel = (window.FORMAT_PRESETS[state.projectFormat] || window.FORMAT_PRESETS['live-ff']).label;
    var directorVal = (state.director && state.director.trim()) ? escapeHTML(state.director.trim()) : '—';
    var producerVal = (state.producer && state.producer.trim()) ? escapeHTML(state.producer.trim()) : '—';
    var exportDate = escapeHTML(new Date().toLocaleDateString());

    var topHeaderRows = 
      '<tr><td colspan="11" style="font-size:13pt;font-weight:bold;color:#111;padding:8px;background:#fef3c7;border:1px solid #ccc;">PRODUCTION SHOTLIST — ' + escapeHTML(state.projectTitle || 'Untitled Project') + (branding.logoText ? ' (' + escapeHTML(branding.logoText) + ')' : '') + '</td></tr>' +
      '<tr><td colspan="11" style="font-size:9.5pt;color:#333;padding:6px;background:#fff;border:1px solid #ccc;">' +
        (branding.company ? '<strong>Studio:</strong> ' + escapeHTML(branding.company) + ' &nbsp;|&nbsp; ' : '') +
        (branding.tagline ? '<em>' + escapeHTML(branding.tagline) + '</em> &nbsp;|&nbsp; ' : '') +
        'Format: ' + escapeHTML(fmtLabel) +
      '</td></tr>' +
      '<tr><td colspan="11" style="font-size:9pt;color:#475569;padding:6px;background:#f8fafc;border:1px solid #ccc;">Director: ' + escapeHTML(directorVal) + ' &nbsp;|&nbsp; Producer: ' + escapeHTML(producerVal) + ' &nbsp;|&nbsp; Scenes: ' + state.parsedScenes.length + ' &nbsp;|&nbsp; Shots: ' + state.shots.length + ' &nbsp;|&nbsp; Exported: ' + exportDate + '</td></tr>' +
      '<tr><td colspan="11" style="height:8px;background:#fff;border:none;"></td></tr>';

    var tableHeaderRow = '<tr>' + headers.map(function (h) {
      return '<th style="background:#25252a;color:#fbbf24;font-weight:bold;border:1px solid #444;padding:6px;">' + escapeHTML(h) + '</th>';
    }).join('') + '</tr>';

    var tableRows = topHeaderRows + tableHeaderRow;

    state.shots.forEach(function (s) {
      var cells = [s.sceneNum, s.shotNum, s.size, s.angle, s.movement, s.lens, s.subject, s.description, s.audioNotes, s.screenSec, s.estMins];
      tableRows += '<tr>' + cells.map(function (val) {
        return '<td style="border:1px solid #ccc;padding:5px;color:#000;">' + escapeHTML(val) + '</td>';
      }).join('') + '</tr>';
    });

    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' +
      '<head><meta charset="UTF-8"></head><body><table>' + tableRows + '</table></body></html>';

    var blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var slug = (state.projectTitle || 'shotlist').replace(/[\\/:*?"<>|]+/g, '').trim();
    a.href = url;
    a.download = slug + '_shotlist.xls';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Excel shotlist downloaded.', 'success');
  }

  function exportJSON() {
    var payload = buildProjectPayload();
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var slug = (state.projectTitle || 'shotlist').replace(/[\\/:*?"<>|]+/g, '').trim();
    a.href = url;
    a.download = slug + '.s2s';
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON project backup downloaded.', 'success');
  }

  async function exportPDF() {
    if (!state.shots.length) {
      showToast('No shots to export.', 'warn');
      return;
    }

    var branding = getSelectedBranding();
    var fmtLabel = (window.FORMAT_PRESETS[state.projectFormat] || window.FORMAT_PRESETS['live-ff']).label;
    var dirText = (state.director && state.director.trim()) ? state.director.trim() : '—';
    var prodText = (state.producer && state.producer.trim()) ? state.producer.trim() : '—';

    var lastScene = null;
    var rowsHTML = '';

    state.shots.forEach(function (sh) {
      if (sh.sceneNum !== lastScene) {
        lastScene = sh.sceneNum;
        var scMeta = state.parsedScenes.find(function (s) { return s.sceneNum === sh.sceneNum; });
        var scTitle = scMeta ? scMeta.heading : ('SCENE ' + sh.sceneNum);
        rowsHTML += '<tr class="scene-header"><td colspan="11">SCENE ' + escapeHTML(sh.sceneNum) + ' — ' + escapeHTML(scTitle) + '</td></tr>';
      }

      rowsHTML += '<tr>' +
        '<td class="center">' + escapeHTML(sh.sceneNum) + '</td>' +
        '<td><strong>' + escapeHTML(sh.shotNum) + '</strong></td>' +
        '<td>' + escapeHTML(sh.size) + '</td>' +
        '<td>' + escapeHTML(sh.angle) + '</td>' +
        '<td>' + escapeHTML(sh.movement) + '</td>' +
        '<td>' + escapeHTML(sh.lens) + '</td>' +
        '<td>' + escapeHTML(sh.subject) + '</td>' +
        '<td>' + escapeHTML(sh.description) + '</td>' +
        '<td>' + escapeHTML(sh.audioNotes) + '</td>' +
        '<td class="center">' + escapeHTML(sh.screenSec) + 's</td>' +
        '<td class="center">' + escapeHTML(sh.estMins) + 'm</td>' +
      '</tr>';
    });

    if (ipcRenderer) {
      var slug = (state.projectTitle || 'shotlist').replace(/[\\/:*?"<>|]+/g, '').trim();
      var payload = {
        defaultFileName: slug + '_shotlist.pdf',
        projectTitle: escapeHTML(state.projectTitle || 'Untitled Project'),
        formatLabel: escapeHTML(fmtLabel),
        director: escapeHTML(dirText),
        producer: escapeHTML(prodText),
        sceneCount: state.parsedScenes.length,
        shotCount: state.shots.length,
        exportDate: new Date().toLocaleDateString(),
        branding: branding,
        tableRowsHTML: rowsHTML
      };

      var res = await ipcRenderer.invoke('dialog:export-pdf', payload);
      if (res && !res.canceled) {
        if (res.error) {
          showToast('PDF export failed: ' + res.error, 'warn');
        } else {
          showToast('Exported PDF to ' + (nodePath ? nodePath.basename(res.filePath) : res.filePath), 'success');
        }
      }
      return;
    }

    window.print();
  }

  async function loadAndRenderWipDocumentation() {
    var docEntries = [];

    if (ipcRenderer) {
      try {
        var syncedDocs = await ipcRenderer.invoke('load-docs');
        if (Array.isArray(syncedDocs)) {
          docEntries = syncedDocs.filter(function (entry) {
            return entry && entry.relPath && typeof entry.content === 'string' && entry.content.trim().length > 0;
          });
        }
      } catch (err) {
        console.warn('Failed to load synced docs via IPC:', err.message);
      }
    }

    if (!docEntries.length && fs && nodePath) {
      var fallbackPaths = [
        'README.md',
        'docs/01-tutorials.md',
        'docs/02-tools.md',
        'docs/03-file management.md',
        'docs/04-app integrations.md'
      ];

      fallbackPaths.forEach(function (relPath) {
        var fullPath = nodePath.join(__dirname, relPath);
        if (fs.existsSync(fullPath)) {
          docEntries.push({
            relPath: relPath,
            content: fs.readFileSync(fullPath, 'utf8')
          });
        }
      });
    }

    var fileSections = [];

    if (docEntries.length > 0) {
      docEntries.forEach(function (entry) {
        var baseName = entry.relPath.split('/').pop();
        var groupLabel = baseName.toLowerCase() === 'readme.md'
          ? 'Overview'
          : baseName
              .replace(/\.[^/.]+$/, '')
              .replace(/^[0-9]+[-_]*/, '')
              .replace(/[-_]/g, ' ')
              .replace(/^\w/, function (c) { return c.toUpperCase(); });

        var content = entry.content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (match, alt, src) {
          return '![' + alt + '](' + src.replace(/\\/g, '/') + ')';
        });

        var rawSections = content.split(/^#\s+/m).filter(function (s) { return s.trim().length > 0; });
        var subTabs = [];

        rawSections.forEach(function (secText, sIdx) {
          var lines = secText.split('\n');
          var rawTitle = lines[0].trim();
          var title = rawTitle.replace(/^Script2Shot\s*/i, '').trim();
          var body = lines.slice(1).join('\n');

          subTabs.push({
            id: 'doc-' + groupLabel.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + sIdx,
            title: title || ('Section ' + (sIdx + 1)),
            content: body
          });
        });

        if (subTabs.length > 0) {
          fileSections.push({
            groupLabel: groupLabel,
            tabs: subTabs
          });
        }
      });
    } else {
      fileSections.push({
        groupLabel: 'Overview',
        tabs: [{
          id: 'doc-overview-0',
          title: 'Official Documentation',
          content: '# Official Documentation\nWelcome to Script2Shot.'
        }]
      });
    }

    renderHierarchicalDocSidebar(fileSections);
  }

  function renderHierarchicalDocSidebar(fileSections) {
    var sidebar = document.getElementById('docs-sidebar-tabs');
    var contentPane = document.getElementById('docs-content-pane');
    var docsModal = document.getElementById('docs-modal');

    var subTitle = document.getElementById('docs-modal-subtitle');
    if (subTitle) subTitle.style.display = 'none';

    if (!sidebar || !contentPane) {
      showToast('Opened Documentation viewer.', 'info');
      return;
    }

    if (docsModal) docsModal.classList.remove('hidden');

    var allTabsMap = {};
    var sidebarHtml = '';

    fileSections.forEach(function (sec) {
      sidebarHtml += '<div class="text-[10px] uppercase tracking-wider text-amber-400 font-extrabold px-2 pt-3 pb-1 select-none opacity-90">' + escapeHTML(sec.groupLabel) + '</div>';
      
      sec.tabs.forEach(function (tab, i) {
        allTabsMap[tab.id] = tab;
        var activeClass = (fileSections[0] === sec && i === 0) ? ' doc-sidebar-btn active' : ' doc-sidebar-btn';
        sidebarHtml += '<button type="button" data-doc-target="' + tab.id + '" class="' + activeClass + ' pl-4">' + escapeHTML(tab.title) + '</button>';
      });
    });

    sidebar.innerHTML = sidebarHtml;

    function showTabContent(targetId) {
      var activeTab = allTabsMap[targetId];
      if (!activeTab) return;
      
      var renderedBody = window.parseMarkdown ? window.parseMarkdown(activeTab.content) : escapeHTML(activeTab.content);
      
      contentPane.innerHTML = '<div class="space-y-3">' +
        '<h2 class="text-lg font-bold text-amber-400 mb-4">' + escapeHTML(activeTab.title) + '</h2>' +
        '<div class="text-slate-300 space-y-2 leading-relaxed">' + renderedBody + '</div>' +
      '</div>';
    }

    var firstTabGroup = fileSections[0];
    if (firstTabGroup && firstTabGroup.tabs.length > 0) {
      showTabContent(firstTabGroup.tabs[0].id);
    }

    sidebar.onclick = function (e) {
      var btn = e.target.closest('.doc-sidebar-btn');
      if (!btn) return;
      var targetId = btn.getAttribute('data-doc-target');
      
      sidebar.querySelectorAll('.doc-sidebar-btn').forEach(function (b) {
        b.className = b.className.replace(' active', '');
      });
      btn.className += ' active';
      showTabContent(targetId);
    };
  }

