# Terminal Titles and Session State Implementation Plan

> **For implementer:** Use TDD throughout. Write failing test first. Watch it fail. Then implement.

**Goal:** Show article titles in terminal `ls` output and restore the terminal exactly after returning from an article.

**Architecture:** Keep slugs as virtual filesystem keys and change only the post-node presentation label. Persist a versioned, tab-local terminal snapshot in `sessionStorage`, then restore it after `/fs.json` rebuilds the virtual filesystem.

**Tech Stack:** Browser JavaScript, Node.js built-in test runner, jsdom 25, Hexo 7.3.

---

### Task 1: Add browser-level regression tests

**Files:**

- Create: `tests/terminal.test.js`
- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Add the test runtime**

Run `npm install --save-dev jsdom@25.0.1` and add `"test": "node --test tests/*.test.js"` to the package scripts.

**Step 2: Write failing tests**

Build a jsdom fixture containing the terminal elements from `themes/cactus/layout/index.ejs`, inject a two-post `/fs.json` response, execute the real `themes/cactus/source/js/terminal.js`, and provide helpers to submit terminal commands.

Add these independent tests:

```js
test('ls displays article titles while links still target the article URL', async () => {
  const page = await startTerminal();
  submit(page, 'ls posts/');
  assert.match(page.output.textContent, /Readable Article Title/);
  assert.doesNotMatch(page.output.textContent, /obsidian-readable-article\.md/);
  assert.equal(page.output.querySelector('a.t-file').pathname, '/2026/09/09/readable/');
});

test('terminal state survives leaving and returning in the same tab', async () => {
  const first = await startTerminal();
  submit(first, 'cd posts');
  submit(first, 'ls');
  type(first, 'grep -i cuda', 7);
  first.window.scrollTo(0, 321);
  first.window.dispatchEvent(new first.window.PageTransitionEvent('pagehide'));

  const saved = first.window.sessionStorage.getItem('lipu.term.session.v1');
  const restored = await startTerminal(saved);
  assert.equal(restored.prompt.textContent.includes('~/posts'), true);
  assert.equal(restored.input.value, 'grep -i cuda');
  assert.equal(restored.input.selectionStart, 7);
  assert.equal(restored.output.innerHTML, first.output.innerHTML);
  assert.equal(restored.window.scrollY, 321);
});

test('a fresh tab still shows the normal boot screen', async () => {
  const page = await startTerminal();
  assert.match(page.output.textContent, /欢迎来到/);
});
```

**Step 3: Run tests — confirm RED**

Command: `npm test`

Expected: title test fails because the visible label is the slug; state test fails because no session snapshot is saved or restored; fresh boot test passes.

**Step 4: Commit the red tests**

Commit message: `Add terminal interaction regression tests`.

### Task 2: Render post titles without changing paths

**Files:**

- Modify: `themes/cactus/source/js/terminal.js`
- Test: `tests/terminal.test.js`

**Step 1: Implement the minimal label change**

In `lsName`, select the label independently of the virtual filename:

```js
var label = node.t === 'f' && node.p && node.p.title ? node.p.title : name;
```

Use `label` as link text while retaining `fileUrl(node)` as the destination and leaving all path-resolution, sorting, and completion logic untouched.

**Step 2: Run the targeted test — confirm GREEN**

Command: `node --test --test-name-pattern="ls displays" tests/terminal.test.js`

Expected: PASS.

**Step 3: Commit**

Commit message: `Show article titles in terminal listings`.

### Task 3: Persist and restore terminal state

**Files:**

- Modify: `themes/cactus/source/js/terminal.js`
- Test: `tests/terminal.test.js`

**Step 1: Add versioned snapshot helpers**

Add `STATE_KEY`, `STATE_VERSION`, `sessionReady`, `saveSession`, `loadSession`, and `restoreSession`. Validate the version and field types before restoring. Confirm restored `cwd` resolves to a directory after `buildFS(data)`.

The saved schema is:

```js
{
  version: 1,
  output: outEl.innerHTML,
  cwd: cwd.slice(),
  oldpwd: oldpwd ? oldpwd.slice() : null,
  input: inputEl.value,
  selectionStart: inputEl.selectionStart,
  selectionEnd: inputEl.selectionEnd,
  histPos: histPos,
  lastFailed: lastFailed,
  scrollY: window.scrollY || 0
}
```

**Step 2: Save at state boundaries**

Save after command submission and programmatic input/directory changes, on input events, before article-link navigation, and on `pagehide`. Do not save the temporary `booting lipuOS ...` state before `/fs.json` is ready.

**Step 3: Restore after filesystem initialization**

After `DATA` and `FS` are assigned, restore a valid snapshot. If none exists, clear the temporary boot line and run the existing boot sequence. Restore scroll position after layout using a zero-delay callback.

**Step 4: Run tests — confirm GREEN**

Command: `npm test`

Expected: all terminal tests pass.

**Step 5: Commit**

Commit message: `Restore terminal state after article navigation`.

### Task 4: Full verification and release

**Files:**

- Verify: `themes/cactus/source/js/terminal.js`
- Verify: generated `public/index.html`, `public/js/terminal.js`, and a representative article page

**Step 1: Static and unit checks**

Commands:

```powershell
node --check themes/cactus/source/js/terminal.js
npm test
git diff --check
```

Expected: all pass with no errors.

**Step 2: Clean build**

Commands:

```powershell
npm run clean
npm run build
```

Expected: Hexo generation completes successfully.

**Step 3: Local browser verification**

Start the generated site, run `ls posts/`, open an article, return with browser Back and with `q`, and verify title labels plus restored output, directory, unfinished input, cursor, and scroll.

**Step 4: Push and verify deployment**

Push `main`, wait for `Deploy Hexo to GitHub Pages`, then verify the homepage, generated script, and representative article return HTTP 200.
