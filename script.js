(function () {
  'use strict';

  var fs = typeof require === 'function' ? require('fs') : null;
  var path = typeof require === 'function' ? require('path') : null;

  var sections = [
    'js/core.js',
    'js/parser.js',
    'js/ui.js',
    'js/exporters.js',
    'js/app.js'
  ];

  var pulledCode = sections.map(function (relPath) {
    if (fs && path) {
      var fullPath = path.join(__dirname, relPath);
      return fs.readFileSync(fullPath, 'utf8');
    }
    return '';
  }).join('\n');

  var runSections = new Function(pulledCode);
  runSections();
})();