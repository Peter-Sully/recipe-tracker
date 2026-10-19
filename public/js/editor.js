/*!
 * Recipe editor helpers: markdown formatting toolbar, keyboard shortcuts,
 * and a Write/Preview toggle. Uses the shared RecipeMarkdown renderer
 * loaded from /js/markdown.js.
 */
(function () {
  'use strict';

  var md = window.RecipeMarkdown;
  var fmt = window.RecipeTextFormat;

  var WRAP_MODES = {
    bold: ['**', '**'],
    italic: ['*', '*'],
    code: ['`', '`']
  };

  var LINE_MODES = {
    h1: '# ',
    h2: '## ',
    ul: '- ',
    ol: '1. ',
    quote: '> '
  };

  function updatePreview(editor) {
    var preview = editor.querySelector('.md-preview');
    var textarea = editor.querySelector('textarea');
    preview.innerHTML = md.render(textarea.value);
  }

  function setView(editor, view) {
    var tabs = editor.querySelectorAll('[data-md-view]');
    var textarea = editor.querySelector('textarea');
    var preview = editor.querySelector('.md-preview');

    var showWrite = view === 'write';
    textarea.hidden = !showWrite;
    preview.hidden = showWrite;

    tabs.forEach(function (tab) {
      var active = tab.getAttribute('data-md-view') === view;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    if (showWrite) {
      textarea.focus();
    }
  }

  function applyFormat(editor, mode) {
    var textarea = editor.querySelector('textarea');

    if (mode === 'link') {
      fmt.insertLink(textarea);
    } else if (WRAP_MODES[mode]) {
      fmt.wrapSelection(textarea, WRAP_MODES[mode][0], WRAP_MODES[mode][1]);
    } else if (LINE_MODES[mode]) {
      fmt.toggleLinePrefix(textarea, LINE_MODES[mode]);
    }

    updatePreview(editor);
  }

  document.querySelectorAll('[data-md-editor]').forEach(function (editor) {
    var textarea = editor.querySelector('textarea');

    editor.querySelectorAll('[data-md]').forEach(function (button) {
      button.addEventListener('click', function (e) {
        e.preventDefault();
        applyFormat(editor, button.getAttribute('data-md'));
      });
    });

    editor.querySelectorAll('[data-md-view]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        setView(editor, tab.getAttribute('data-md-view'));
      });
    });

    textarea.addEventListener('keydown', function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      var key = (e.key || '').toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        fmt.wrapSelection(textarea, '**', '**');
        updatePreview(editor);
      } else if (key === 'i') {
        e.preventDefault();
        fmt.wrapSelection(textarea, '*', '*');
        updatePreview(editor);
      }
    });

    textarea.addEventListener('input', function () {
      updatePreview(editor);
    });

    updatePreview(editor);
  });
})();