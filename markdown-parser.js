(function () {
  'use strict';

  var GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/HeapsEntertainment/Script2Shot/main/';

  function escapeHTML(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return escapeHTML(str).replace(/'/g, '&#39;');
  }

  function formatInlineMarkdown(text) {
    return escapeHTML(text)
      // Parse Markdown Images: ![Alt text](url) or ![Alt text](<url>)
      .replace(/!\[([^\]]*?)\]\(<?([^)>]+?)>?\)/g, function (_match, alt, src) {
        var cleanSrc = src.trim().replace(/&amp;/g, '&');
        var isExternal = /^(https?:\/\/|data:|blob:)/i.test(cleanSrc);

        // Normalize relative paths like "./assets/pic.png" or "../assets/pic.png" -> "assets/pic.png"
        var normalizedPath = cleanSrc
          .replace(/^(?:\.\/|\.\.\/)+/, '')
          .replace(/^\/+/, '');

        var fallbackUrl = GITHUB_RAW_BASE + normalizedPath;
        var safeAlt = escapeAttr(alt);
        var safeSrc = escapeAttr(cleanSrc);
        var safeFallback = escapeAttr(fallbackUrl);

        var onErrorAttr = isExternal
          ? ''
          : " onerror=\"if(!this.dataset.fb){this.dataset.fb='1';this.src='" + safeFallback + "';}\"";

        return "<img src='" + safeSrc + "' alt='" + safeAlt + "'" + onErrorAttr + " class='max-w-full h-auto rounded-lg my-3 border border-studio-700 shadow-md mx-auto block' />";
      })
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/__(.*?)__/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/_(.*?)_/g, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-studio-950 px-1 py-0.5 rounded text-amber-300 font-mono text-xs">$1</code>');
  }

  function parseMarkdown(md) {
    if (!md) return '';
    var lines = md.split('\n');
    var html = [];
    var inList = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();

      var isBlockquote = false;
      if (trimmed.startsWith('>')) {
        isBlockquote = true;
        trimmed = trimmed.substring(1).trim();
      }

      var lineHtml = '';

      // Headers (Checked before blockquote wrapping so #### works inside >)
      if (trimmed.startsWith('#### ')) {
        if (inList) { html.push('</ul>'); inList = false; }
        lineHtml = '<h4 class="text-sm font-bold text-amber-400 mt-3 mb-2">' + formatInlineMarkdown(trimmed.substring(5)) + '</h4>';
      } else if (trimmed.startsWith('### ')) {
        if (inList) { html.push('</ul>'); inList = false; }
        lineHtml = '<h3 class="text-base font-bold text-amber-400 mt-4 mb-2">' + formatInlineMarkdown(trimmed.substring(4)) + '</h3>';
      } else if (trimmed.startsWith('## ')) {
        if (inList) { html.push('</ul>'); inList = false; }
        lineHtml = '<h2 class="text-lg font-bold text-amber-400 mt-5 mb-3">' + formatInlineMarkdown(trimmed.substring(3)) + '</h2>';
      } else if (trimmed.startsWith('# ')) {
        if (inList) { html.push('</ul>'); inList = false; }
        lineHtml = '<h1 class="text-xl font-bold text-amber-400 mt-6 mb-3">' + formatInlineMarkdown(trimmed.substring(2)) + '</h1>';
      } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        if (!inList) {
          html.push('<ul class="list-disc list-inside space-y-1 my-2 text-slate-300">');
          inList = true;
        }
        var liText = formatInlineMarkdown(trimmed.substring(2).trim());
        lineHtml = '<li>' + liText + '</li>';
      } else if (!trimmed) {
        if (inList) { html.push('</ul>'); inList = false; }
        lineHtml = '<div class="h-2"></div>';
      } else {
        if (inList) { html.push('</ul>'); inList = false; }
        lineHtml = '<p class="text-slate-300 leading-relaxed mb-2">' + formatInlineMarkdown(trimmed) + '</p>';
      }

      // Wrap in blockquote if it started with '>'
      if (isBlockquote) {
        html.push('<blockquote class="border-l-2 border-amber-500 pl-3 my-2 text-slate-300 italic">' + lineHtml + '</blockquote>');
      } else {
        html.push(lineHtml);
      }
    }

    if (inList) {
      html.push('</ul>');
    }

    return html.join('');
  }

  // Expose globally
  window.parseMarkdown = parseMarkdown;
})();