/**
 * less-style pager for post pages.
 * Bottom status bar shows filename + scroll percentage; keys:
 * q quit · / search · n/N next/prev match · g/G top/bottom · j/k/d/u scroll
 */
(function () {
  'use strict';

  var CFG = window.__LIPU_PAGER__ || {};
  var statusBar = document.getElementById('pager-status');
  if (!statusBar) return;
  var posEl = document.getElementById('pager-pos');
  var searchInput = document.getElementById('pager-search');
  var article = document.querySelector('.pager .e-content') || document.querySelector('.pager article');
  var marks = [];
  var markIdx = -1;
  var searching = false;

  /* ---------------- scroll percentage ---------------- */
  var ticking = false;
  function updateStatus() {
    if (searching) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 2 || window.scrollY >= max - 2) posEl.textContent = ' (END)';
    else if (window.scrollY <= 0) posEl.textContent = '';
    else posEl.textContent = ' (' + Math.round(window.scrollY / max * 100) + '%)';
  }
  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(function () { updateStatus(); ticking = false; });
    }
  }, { passive: true });
  updateStatus();

  /* ---------------- search highlight ---------------- */
  function clearMarks() {
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      if (m.parentNode) m.parentNode.replaceChild(document.createTextNode(m.textContent), m);
    }
    marks = [];
    markIdx = -1;
    article.normalize();
  }
  function highlight(q) {
    clearMarks();
    if (!q) return 0;
    var needle = q.toLowerCase();
    var walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || node.nodeValue.toLowerCase().indexOf(needle) < 0) {
          return NodeFilter.FILTER_REJECT;
        }
        var p = node.parentNode;
        if (!p || /^(SCRIPT|STYLE|MARK)$/.test(p.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var text = node.nodeValue;
      var lower = text.toLowerCase();
      var frag = document.createDocumentFragment();
      var i = 0, idx;
      while ((idx = lower.indexOf(needle, i)) >= 0) {
        if (idx > i) frag.appendChild(document.createTextNode(text.slice(i, idx)));
        var m = document.createElement('mark');
        m.className = 'pager-mark';
        m.textContent = text.substr(idx, q.length);
        frag.appendChild(m);
        marks.push(m);
        i = idx + q.length;
      }
      frag.appendChild(document.createTextNode(text.slice(i)));
      node.parentNode.replaceChild(frag, node);
    });
    return marks.length;
  }
  function jump(d) {
    if (!marks.length) return;
    markIdx = (markIdx + d + marks.length) % marks.length;
    for (var i = 0; i < marks.length; i++) marks[i].classList.remove('current');
    var m = marks[markIdx];
    m.classList.add('current');
    m.scrollIntoView({ block: 'center' });
    posEl.textContent = ' (' + (markIdx + 1) + '/' + marks.length + ')';
  }

  /* ---------------- search prompt ---------------- */
  function openSearch() {
    searching = true;
    statusBar.classList.add('searching');
    searchInput.value = '';
    searchInput.focus();
  }
  function closeSearch(run) {
    searching = false;
    statusBar.classList.remove('searching');
    searchInput.blur();
    if (run) {
      var n = highlight(searchInput.value.trim());
      if (n) jump(1);
      else posEl.textContent = ' (找不到)';
    } else {
      updateStatus();
    }
  }
  searchInput.addEventListener('keydown', function (e) {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); closeSearch(true); }
    else if (e.key === 'Escape') { e.preventDefault(); closeSearch(false); }
  });
  searchInput.addEventListener('blur', function () {
    if (searching) closeSearch(false);
  });

  /* ---------------- keys ---------------- */
  document.addEventListener('keydown', function (e) {
    if (searching || e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = (e.target && e.target.tagName) || '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
    switch (e.key) {
      case 'q': {
        var sameOrigin = false;
        try { sameOrigin = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (err) { /* ignore */ }
        if (sameOrigin) history.back();
        else location.href = CFG.home || '/';
        break;
      }
      case 'g': window.scrollTo(0, 0); break;
      case 'G': window.scrollTo(0, document.documentElement.scrollHeight); break;
      case 'j': e.preventDefault(); window.scrollBy(0, 32); break;
      case 'k': e.preventDefault(); window.scrollBy(0, -32); break;
      case 'd': window.scrollBy(0, Math.round(window.innerHeight / 2)); break;
      case 'u': window.scrollBy(0, -Math.round(window.innerHeight / 2)); break;
      case '/': e.preventDefault(); openSearch(); break;
      case 'n': jump(1); break;
      case 'N': jump(-1); break;
    }
  });
})();
