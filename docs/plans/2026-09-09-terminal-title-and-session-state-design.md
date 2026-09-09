# Terminal Article Titles and Session State Design

## Goal

Make terminal article listings show human-readable post titles while preserving the existing filename-based command paths, and restore the terminal session after a reader returns from an article page.

## Root Cause

`lsName(name, node)` always renders the virtual filesystem key, so post nodes display slugs such as `obsidian-*.md` even though `node.p.title` is available. Article links and `less`/`vim` navigation perform a full-page navigation. On return, `terminal.js` runs its boot sequence again; only command history is stored, so output, directories, unfinished input, cursor position, failure state, and scroll position are lost.

## Design

### Article labels

Keep the virtual filesystem key as the canonical command path. For a post node, render `node.p.title` as the clickable `ls` label. Directories and non-post text files retain their existing names. Sorting remains based on post timestamps and is not affected by the display label.

### Terminal session snapshots

Store one snapshot per browser tab in `sessionStorage`. A snapshot contains:

- rendered terminal output HTML;
- current and previous working-directory arrays;
- unfinished input and selection range;
- command-history cursor position;
- last-command failure state;
- window scroll position.

Save the snapshot on terminal input changes, directory changes, command completion, link activation, and `pagehide`. After `/fs.json` has loaded and the virtual filesystem has been rebuilt, restore a valid snapshot instead of running the boot sequence. Invalid, incompatible, or quota-exceeding snapshots are ignored safely.

Use a versioned snapshot schema so future terminal changes can invalidate old state without migration logic. Command history remains in its existing `localStorage` entry because it is intentionally shared across tabs; transient terminal state stays tab-local in `sessionStorage`.

### Navigation

Both direct article links in terminal output and command-driven article navigation save a snapshot before leaving. The article pager continues to use browser history when the referrer is same-origin. If there is no usable history entry, it falls back to the homepage, where the tab-local snapshot is still available.

## Error Handling

All storage reads, parsing, validation, and writes are wrapped in guarded paths. A malformed snapshot is removed. Storage denial or quota exhaustion falls back to a fresh terminal without breaking commands or article navigation.

## Testing

Use Node's built-in test runner with a small browser fixture to execute the real `terminal.js`. Tests cover:

1. `ls posts/` renders article titles and does not expose the Obsidian slug as the visible label.
2. After navigating away and reloading the terminal script in the same session, prior output, current directory, unfinished input, selection, and scroll position are restored.
3. A fresh session still displays the normal boot output.

Finally run JavaScript syntax checks, the full Node test suite, and a clean Hexo build, then verify the behavior in a local browser before pushing.
