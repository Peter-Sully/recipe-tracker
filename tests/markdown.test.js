'use strict';

const assert = require('assert');
const md = require('../public/js/markdown');

let passed = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    failures.push({ name, message: err.message });
  }
}

// ---------- Block-level rendering ----------

check('empty string renders empty', () => {
  assert.strictEqual(md.render(''), '');
});

check('non-strings render empty', () => {
  assert.strictEqual(md.render(undefined), '');
  assert.strictEqual(md.render(null), '');
  assert.strictEqual(md.render('   '), '');
});

check('single line becomes one paragraph', () => {
  assert.strictEqual(md.render('Hello'), '<p>Hello</p>\n');
});

check('soft line break joins with a space', () => {
  assert.strictEqual(md.render('first line\nsecond line'), '<p>first line second line</p>\n');
});

check('heading renders', () => {
  assert.strictEqual(md.render('## Scrambled Eggs'), '<h2>Scrambled Eggs</h2>\n');
});

check('horizontal rule renders', () => {
  assert.strictEqual(md.render('---'), '<hr />\n');
});

check('unordered list renders', () => {
  assert.strictEqual(
    md.render('- boil water\n- add pasta'),
    '<ul>\n<li>boil water</li>\n<li>add pasta</li>\n</ul>\n'
  );
});

check('ordered list renders', () => {
  assert.strictEqual(
    md.render('1. crack eggs\n2. whisk'),
    '<ol>\n<li>crack eggs</li>\n<li>whisk</li>\n</ol>\n'
  );
});

check('blockquote renders', () => {
  assert.strictEqual(
    md.render('> Patience is key'),
    '<blockquote>\n<p>Patience is key</p>\n</blockquote>\n'
  );
});

check('fenced code block keeps content verbatim (escaped)', () => {
  const out = md.render('```js\nconst hot = temp > 100;\n```');
  assert.ok(out.startsWith('<pre><code>'));
  assert.ok(out.includes('const hot = temp &gt; 100;'));
  assert.ok(out.endsWith('</code></pre>\n'));
});

check('mixed heading + paragraph', () => {
  assert.strictEqual(
    md.render('# Title\n\nSome **bold** text.'),
    '<h1>Title</h1>\n<p>Some <strong>bold</strong> text.</p>\n'
  );
});

// ---------- Inline formatting ----------

check('bold renders', () => {
  assert.strictEqual(md.render('This is **bold**.'), '<p>This is <strong>bold</strong>.</p>\n');
});

check('italic renders', () => {
  assert.strictEqual(md.render('This is *italic*.'), '<p>This is <em>italic</em>.</p>\n');
});

check('bold + italic nest', () => {
  assert.strictEqual(md.render('***fancy***'), '<p><em><strong>fancy</strong></em></p>\n');
});

check('inline code protects markdown inside backticks', () => {
  assert.strictEqual(
    md.render('Use `**literal**` here'),
    '<p>Use <code>**literal**</code> here</p>\n'
  );
});

// ---------- Links & safety ----------

check('https links render', () => {
  assert.strictEqual(
    md.render('[Source](https://example.com)'),
    '<p><a href="https://example.com" rel="noopener noreferrer">Source</a></p>\n'
  );
});

check('mailto links render', () => {
  assert.ok(md.render('[email](mailto:me@example.com)').includes('href="mailto:me@example.com"'));
});

check('links with a title render', () => {
  assert.ok(md.render('[x](https://example.com "home")').includes('href="https://example.com"'));
});

check('javascript: links are not rendered as links', () => {
  const out = md.render('[click](javascript:alert(1))');
  assert.ok(!out.includes('<a'));
  assert.ok(out.includes('javascript:alert(1)'));
});

check('raw HTML is escaped (XSS-safe)', () => {
  assert.strictEqual(
    md.render('<script>alert("x")</script>'),
    '<p>&lt;script&gt;alert("x")&lt;/script&gt;</p>\n'
  );
});

check('inline mode does not emit paragraph tags', () => {
  assert.strictEqual(md.inline('so *creamy*!'), 'so <em>creamy</em>!');
});

check('escapeHtml escapes the five HTML entities', () => {
  assert.strictEqual(md.escapeHtml('<&>"\''), '&lt;&amp;&gt;&quot;&#39;');
});

if (failures.length > 0) {
  console.error(`\n${failures.length} test(s) failed:\n`);
  failures.forEach((f) => console.error(`  ✗ ${f.name}\n    ${f.message}`));
  process.exit(1);
}

console.log(`\nAll ${passed} markdown tests passed ✓`);