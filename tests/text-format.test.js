'use strict';

const assert = require('assert');
const tf = require('../public/js/text-format');

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

// A minimal stand-in for a <textarea> that records value + selection state.
function makeTextarea(value, start, end) {
  const el = {
    value,
    selectionStart: start,
    selectionEnd: end
  };
  el.setRangeText = function (replacement, s, e) {
    el.value = el.value.slice(0, s) + replacement + el.value.slice(e);
    el.selectionStart = s + replacement.length;
    el.selectionEnd = el.selectionStart;
  };
  el.setSelectionRange = function (s, e) {
    el.selectionStart = s;
    el.selectionEnd = e;
  };
  el.focus = function () {};
  return el;
}

// ---------- Wrap / unwrap toggle ----------

check('bold wraps selected text', () => {
  const ta = makeTextarea('Some text here', 5, 9); // selects "text"
  tf.wrapSelection(ta, '**', '**');
  assert.strictEqual(ta.value, 'Some **text** here');
  assert.strictEqual(ta.value.slice(ta.selectionStart, ta.selectionEnd), 'text');
});

check('bold unwraps when the markers are part of the selection', () => {
  const ta = makeTextarea('Some **text** here', 5, 13); // selects "**text**"
  tf.wrapSelection(ta, '**', '**');
  assert.strictEqual(ta.value, 'Some text here');
});

check('bold unwraps when pressed again on the same inner selection (regression)', () => {
  const ta = makeTextarea('Some text here', 5, 9);
  tf.wrapSelection(ta, '**', '**');
  assert.strictEqual(ta.value, 'Some **text** here');
  const inner = ta.value.slice(ta.selectionStart, ta.selectionEnd);
  assert.strictEqual(inner, 'text');

  // Press bold again with the asterisks just outside the selection.
  tf.wrapSelection(ta, '**', '**');
  assert.strictEqual(ta.value, 'Some text here');
});

check('bold still wraps text that is only wrapped in italics', () => {
  const ta = makeTextarea('a *b* c', 3, 4); // selects "b"
  tf.wrapSelection(ta, '**', '**');
  assert.strictEqual(ta.value, 'a ***b*** c');
});

check('italic unwraps an inner selection between single stars', () => {
  const ta = makeTextarea('a *b* c', 3, 4);
  tf.wrapSelection(ta, '*', '*');
  assert.strictEqual(ta.value, 'a b c');
});

check('bold with empty selection inserts markers with the cursor inside', () => {
  const ta = makeTextarea('abc', 1, 1);
  tf.wrapSelection(ta, '**', '**');
  assert.strictEqual(ta.value, 'a****bc');
  assert.strictEqual(ta.selectionStart, 3);
  assert.strictEqual(ta.selectionEnd, 3);
});

// ---------- Line-level prefix toggle ----------

check('list prefix applies to the current line', () => {
  const ta = makeTextarea('scramble eggs', 0, 0);
  tf.toggleLinePrefix(ta, '- ');
  assert.strictEqual(ta.value, '- scramble eggs');
});

check('list prefix removes when the line already has it', () => {
  const ta = makeTextarea('- scramble eggs', 0, 0);
  tf.toggleLinePrefix(ta, '- ');
  assert.strictEqual(ta.value, 'scramble eggs');
});

check('list prefix applies to every selected line', () => {
  const ta = makeTextarea('one\ntwo', 0, 7);
  tf.toggleLinePrefix(ta, '- ');
  assert.strictEqual(ta.value, '- one\n- two');
});

// ---------- Link insertion ----------

check('insert link with a selection selects the URL', () => {
  const ta = makeTextarea('chop onions', 0, 11);
  tf.insertLink(ta);
  assert.strictEqual(ta.value, '[chop onions](https://)');
  assert.strictEqual(ta.value.slice(ta.selectionStart, ta.selectionEnd), 'https://');
});

check('insert link without a selection selects the placeholder text', () => {
  const ta = makeTextarea('', 0, 0);
  tf.insertLink(ta);
  assert.strictEqual(ta.value, '[link text](https://)');
  assert.strictEqual(ta.value.slice(ta.selectionStart, ta.selectionEnd), 'link text');
});

if (failures.length > 0) {
  console.error(`\n${failures.length} test(s) failed:\n`);
  failures.forEach((f) => console.error(`  ✗ ${f.name}\n    ${f.message}`));
  process.exit(1);
}

console.log(`\nAll ${passed} text-format tests passed ✓`);