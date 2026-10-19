/*!
 * RecipeTextFormat — pure textarea editing helpers shared by the browser
 * editor (/js/editor.js) and unit tests. Works on any object shaped like
 * a textarea: value, selectionStart, selectionEnd, setRangeText,
 * setSelectionRange, focus.
 *
 * Runs in Node (module.exports) and in the browser (window.RecipeTextFormat).
 */
(function (root, factory) {
  if (typeof module === 'object' && module !== null && module.exports) {
    module.exports = factory();
  } else {
    root.RecipeTextFormat = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function getLineRange(textarea) {
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var value = textarea.value;
    var lineStart = value.lastIndexOf('\n', start - 1) + 1;
    var lineEnd = value.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = value.length;
    return { lineStart: lineStart, lineEnd: lineEnd };
  }

  // Wrap the selection in markdown markers; pressing the same button again
  // unwraps. The markers may already be part of the selection (**text**),
  // or they may sit just outside it (only the inner text is selected) —
  // both cases are detected and unwrap.
  function wrapSelection(textarea, before, after) {
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var value = textarea.value;
    var selected = value.slice(start, end);

    // If the selection is exactly the text between a pair of markers,
    // expand the affected region to include the markers so a repeated
    // press unwraps instead of layering another set of asterisks.
    var expandedStart = start;
    var expandedEnd = end;
    var markerBefore =
      start >= before.length && value.slice(start - before.length, start) === before;
    var markerAfter = value.slice(end, end + after.length) === after;
    if (markerBefore && markerAfter) {
      expandedStart = start - before.length;
      expandedEnd = end + after.length;
    }

    var region = value.slice(expandedStart, expandedEnd);
    var isWrapped =
      region.length >= before.length + after.length &&
      region.slice(0, before.length) === before &&
      region.slice(region.length - after.length) === after;

    if (isWrapped) {
      var inner = region.slice(before.length, region.length - after.length);
      textarea.setRangeText(inner, expandedStart, expandedEnd, 'end');
      textarea.setSelectionRange(expandedStart, expandedStart + inner.length);
    } else {
      textarea.setRangeText(before + selected + after, start, end, 'end');
      if (selected) {
        textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
      } else {
        var caret = start + before.length;
        textarea.setSelectionRange(caret, caret);
      }
    }
    textarea.focus();
  }

  // Toggle a line-level prefix (heading, list marker, quote) across the
  // selected lines. Removes the prefix when every line already has it.
  function toggleLinePrefix(textarea, prefix) {
    var range = getLineRange(textarea);
    var block = textarea.value.slice(range.lineStart, range.lineEnd);
    var lines = block.split('\n');
    var allAlreadyPrefixed =
      lines.length > 0 &&
      lines.every(function (l) {
        return l.slice(0, prefix.length) === prefix;
      });

    var rewritten = lines
      .map(function (l) {
        return allAlreadyPrefixed ? l.slice(prefix.length) : prefix + l;
      })
      .join('\n');

    textarea.setRangeText(rewritten, range.lineStart, range.lineEnd, 'end');
    textarea.setSelectionRange(range.lineStart, range.lineStart + rewritten.length);
    textarea.focus();
  }

  function insertLink(textarea) {
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var selected = textarea.value.slice(start, end);

    if (selected) {
      var complete = '[' + selected + '](https://)';
      textarea.setRangeText(complete, start, end, 'end');
      var urlStart = start + selected.length + 3; // '[' + text + ']('
      textarea.setSelectionRange(urlStart, urlStart + 'https://'.length);
    } else {
      var placeholder = '[link text](https://)';
      textarea.setRangeText(placeholder, start, end, 'end');
      textarea.setSelectionRange(start + 1, start + 'link text'.length + 1);
    }
    textarea.focus();
  }

  return {
    wrapSelection: wrapSelection,
    toggleLinePrefix: toggleLinePrefix,
    insertLink: insertLink
  };
});