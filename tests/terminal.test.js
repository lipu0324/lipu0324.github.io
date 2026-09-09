'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

const SCRIPT = fs.readFileSync(
  path.join(__dirname, '..', 'themes', 'cactus', 'source', 'js', 'terminal.js'),
  'utf8'
);
const STATE_KEY = 'lipu.term.session.v1';

const DATA = {
  generated: '2026-09-09',
  site: {
    title: 'Test Blog',
    subtitle: 'notes from the shell',
    description: '',
    author: 'tester',
    url: 'https://example.test'
  },
  posts: [
    {
      name: 'obsidian-readable-article.md',
      title: 'Readable Article Title',
      url: '/2026/09/09/readable/',
      date: '2026-09-09',
      timestamp: 1788912000000,
      categories: ['Test'],
      tags: ['terminal'],
      words: 10,
      content: 'Article body'
    },
    {
      name: 'obsidian-older-article.md',
      title: 'Older Article',
      url: '/2026/09/08/older/',
      date: '2026-09-08',
      timestamp: 1788825600000,
      categories: ['Test'],
      tags: [],
      words: 5,
      content: 'Older body'
    }
  ],
  about: null
};

const TERMINAL_HTML = `<!doctype html><html><body>
  <div id="lipu-term" class="term">
    <div id="term-screen">
      <div id="term-output"></div>
      <div id="term-inputline">
        <span id="term-prompt"></span>
        <span id="term-before"></span>
        <span id="term-cursor"></span>
        <span id="term-after"></span>
      </div>
    </div>
    <input id="term-input" />
  </div>
</body></html>`;

async function waitFor(predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('terminal did not finish initializing');
}

async function startTerminal(savedState) {
  const dom = new JSDOM(TERMINAL_HTML, {
    url: 'https://example.test/',
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const { window } = dom;

  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    writable: true,
    value: 0
  });
  window.scrollTo = (_x, y) => { window.scrollY = y; };
  window.fetch = async () => ({ ok: true, json: async () => DATA });
  window.__LIPU_TERM__ = { fs: '/fs.json' };
  if (savedState !== undefined && savedState !== null) {
    window.sessionStorage.setItem(STATE_KEY, savedState);
  }

  window.eval(SCRIPT);
  const output = window.document.getElementById('term-output');
  await waitFor(() => !output.textContent.includes('booting lipuOS'));
  await new Promise((resolve) => setTimeout(resolve, 0));

  return {
    dom,
    window,
    output,
    input: window.document.getElementById('term-input'),
    prompt: window.document.getElementById('term-prompt')
  };
}

function submit(page, command) {
  page.input.value = command;
  page.input.selectionStart = page.input.selectionEnd = command.length;
  page.input.dispatchEvent(new page.window.Event('input', { bubbles: true }));
  page.input.dispatchEvent(new page.window.KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true
  }));
}

function type(page, value, selection) {
  page.input.value = value;
  page.input.selectionStart = page.input.selectionEnd = selection;
  page.input.dispatchEvent(new page.window.Event('input', { bubbles: true }));
}

test('ls displays article titles while links still target the article URL', async () => {
  const page = await startTerminal();
  submit(page, 'ls posts/');

  assert.match(page.output.textContent, /Readable Article Title/);
  assert.doesNotMatch(page.output.textContent, /obsidian-readable-article\.md/);
  assert.equal(page.output.querySelector('a.t-file').pathname, '/2026/09/09/readable/');
  page.dom.window.close();
});

test('terminal state survives leaving and returning in the same tab', async () => {
  const first = await startTerminal();
  submit(first, 'cd posts');
  submit(first, 'ls');
  type(first, 'grep -i cuda', 7);
  first.window.scrollTo(0, 321);
  first.window.dispatchEvent(new first.window.Event('pagehide'));

  const saved = first.window.sessionStorage.getItem(STATE_KEY);
  const expectedOutput = first.output.innerHTML;
  first.dom.window.close();

  const restored = await startTerminal(saved);
  assert.equal(restored.prompt.textContent.includes('~/posts'), true);
  assert.equal(restored.input.value, 'grep -i cuda');
  assert.equal(restored.input.selectionStart, 7);
  assert.equal(restored.output.innerHTML, expectedOutput);
  assert.equal(restored.window.scrollY, 321);
  restored.dom.window.close();
});

test('a fresh tab still shows the normal boot screen', async () => {
  const page = await startTerminal();
  assert.match(page.output.textContent, /欢迎来到/);
  page.dom.window.close();
});
