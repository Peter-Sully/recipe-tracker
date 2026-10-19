/*!
 * RecipeMarkdown — a small, dependency-free Markdown subset renderer.
 *
 * Supported syntax:
 *   #..###### headings, **bold**, *italic*, `inline code`, ```fenced
 *   code blocks```, [links](https://...), bullet/numbered lists,
 *   > blockquotes, --- horizontal rules, and hard line breaks
 *   (two trailing spaces).
 *
 * All input is HTML-escaped first and links are restricted to
 * http/https/mailto/relative URLs, so the output is safe to inject
 * with EJS's <%- %>.
 *
 * Runs in Node (module.exports) and in the browser (window.RecipeMarkdown).
 */
(function (root, factory) {
  if (typeof module === 'object' && module !== null && module.exports) {
    module.exports = factory();
  } else {
    root.RecipeMarkdown = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return HTML_ESCAPES[c];
    });
  }

  // Same idea, but leaves quotes alone: quote characters are harmless in
  // HTML text nodes, and any quotes that end up in attribute values
  // (href/title) are escaped explicitly where the attribute is built.
  function escapeText(text) {
    return String(text).replace(/[&<>]/g, function (c) {
      return c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;';
    });
  }

  // Only http:, https:, mailto: and relative URLs are allowed.
  function isSafeUrl(url) {
    return !/^[a-z][a-z0-9+.\-]*:/i.test(url) || /^(https?|mailto):/i.test(url);
  }

  var CODE_RE = /`([^`\n]+)`/g;
  var LINK_RE = /\[([^\]\n]+)\]\(([^()\s]+)(?:\s+"[^"]*")?\)/g;
  var BOLD_RE = /\*\*([^*]+?)\*\*/g;
  var ITALIC_RE = /\*([^*\n]+?)\*/g;
  var PLACEHOLDER_RE = /\u0000(\d+)\u0000/g;

  // Operates on already-escaped text. Code spans and links are swapped out
  // for placeholders so bold/italic never touch their contents, then
  // restored at the end.
  function inlineEscaped(text) {
    var placeholders = [];

    text = String(text).replace(CODE_RE, function (match, code) {
      placeholders.push('<code>' + code + '</code>');
      return '\u0000' + (placeholders.length - 1) + '\u0000';
    });

    text = text
      .replace(LINK_RE, function (match, label, url) {
        if (!isSafeUrl(url)) {
          return match; // leave unsafe links as plain, escaped text
        }
        var safeHref = url.replace(/"/g, '&quot;');
        var rendered =
          '<a href="' + safeHref + '" rel="noopener noreferrer">' + inlineEscaped(label) + '</a>';
        placeholders.push(rendered);
        return '\u0000' + (placeholders.length - 1) + '\u0000';
      })
      .replace(BOLD_RE, '<strong>$1</strong>')
      .replace(ITALIC_RE, '<em>$1</em>');

    return text.replace(PLACEHOLDER_RE, function (match, index) {
      return placeholders[Number(index)];
    });
  }

  // Public inline API: escapes the input first, then renders inline only.
  function inline(text) {
    return inlineEscaped(escapeText(text));
  }

  function render(markdown) {
    if (typeof markdown !== 'string' || !markdown.trim()) {
      return '';
    }

    var text = escapeText(markdown);
    var lines = text.split(/\r\n|\r|\n/);
    var html = '';
    var i = 0;
    var n = lines.length;

    function isBlank(line) {
      return line.trim() === '';
    }

    while (i < n) {
      var line = lines[i];
      var trimmed = line.trim();

      if (isBlank(line)) {
        i++;
        continue;
      }

      // Fenced code block: ```lang ... ```
      if (/^```/.test(trimmed)) {
        var codeLines = [];
        i++;
        while (i < n && !/^```\s*$/.test(lines[i].trim())) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip the closing fence (or the end of the input)
        html += '<pre><code>' + codeLines.join('\n') + '</code></pre>\n';
        continue;
      }

      // Headings: # .. ######
      var heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        var level = heading[1].length;
        html += '<h' + level + '>' + inlineEscaped(heading[2]) + '</h' + level + '>\n';
        i++;
        continue;
      }

      // Horizontal rule: ---, ***, ___
      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) {
        html += '<hr />\n';
        i++;
        continue;
      }

      // Lists (flat, no nesting)
      var itemU = trimmed.match(/^[-*+]\s+(.*)$/);
      var itemO = trimmed.match(/^\d+\.\s+(.*)$/);
      if (itemU || itemO) {
        var isOrdered = !!itemO;
        var items = [];
        while (i < n) {
          var l = lines[i];
          if (isBlank(l)) {
            break;
          }
          var t = l.trim();
          var mu = t.match(/^[-*+]\s+(.*)$/);
          var mo = t.match(/^\d+\.\s+(.*)$/);
          if (isOrdered && mo) {
            items.push(mo[1]);
            i++;
          } else if (!isOrdered && mu) {
            items.push(mu[1]);
            i++;
          } else if (items.length > 0 && /^\s+\S/.test(l)) {
            // indented continuation of the previous item
            items[items.length - 1] += '\n' + t;
            i++;
          } else {
            break;
          }
        }
        html += '<' + (isOrdered ? 'ol' : 'ul') + '>\n';
        items.forEach(function (item) {
          html += '<li>' + inlineEscaped(item.replace(/\n/g, ' ')) + '</li>\n';
        });
        html += '</' + (isOrdered ? 'ol' : 'ul') + '>\n';
        continue;
      }

      // Blockquote (note: text is already escaped, so '>' reads '&gt;')
      var quote = trimmed.match(/^&gt;\s?(.*)$/);
      if (quote) {
        var quoteLines = [];
        while (i < n) {
          if (isBlank(lines[i])) {
            break;
          }
          var mq = lines[i].trim().match(/^&gt;\s?(.*)$/);
          if (!mq) {
            break;
          }
          quoteLines.push(mq[1]);
          i++;
        }
        html += '<blockquote>\n';
        quoteLines.forEach(function (ql) {
          html += '<p>' + inlineEscaped(ql) + '</p>\n';
        });
        html += '</blockquote>\n';
        continue;
      }

      // Paragraph: consume lines until a blank line or another block construct
      var paraLines = [];
      while (i < n) {
        if (isBlank(lines[i])) {
          break;
        }
        var tp = lines[i].trim();
        if (
          /^(#{1,6})\s/.test(tp) ||
          /^```/.test(tp) ||
          /^&gt;\s?/.test(tp) ||
          /^[-*+]\s+/.test(tp) ||
          /^\d+\.\s+/.test(tp) ||
          /^(-{3,}|\*{3,}|_{3,})\s*$/.test(tp)
        ) {
          break;
        }
        paraLines.push(lines[i]);
        i++;
      }
      var para = paraLines
        .map(function (pl) {
          // two+ trailing spaces = hard line break
          return pl.replace(/ {2,}$/, ' <br>');
        })
        .join(' ');
      html += '<p>' + inlineEscaped(para) + '</p>\n';
    }

    return html;
  }

  return {
    render: render,
    inline: inline,
    escapeHtml: escapeHtml
  };
});