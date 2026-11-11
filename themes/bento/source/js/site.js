(() => {
  'use strict';
  const root = document.documentElement;
  const themeButton = document.querySelector('[data-toggle-theme]');
  const syncThemeLabel = () => {
    if (!themeButton) return;
    const dark = root.dataset.theme === 'dark';
    themeButton.setAttribute('aria-label', `切换到${dark ? '浅' : '深'}色模式`);
    themeButton.title = dark ? '切换到浅色模式' : '切换到深色模式';
  };
  syncThemeLabel();
  themeButton?.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('lipu-theme', root.dataset.theme); } catch (_) {}
    syncThemeLabel();
  });
  const isApple = /Mac|iPhone|iPad/.test(navigator.platform || '');
  document.querySelectorAll('.shortcut-hint').forEach(el => { el.textContent = isApple ? '⌘ K' : 'Ctrl K'; });

  const dialog = document.querySelector('#search-dialog');
  const input = document.querySelector('#site-search');
  const results = document.querySelector('[data-search-results]');
  const status = document.querySelector('[data-search-status]');
  let searchData;
  let loading;
  let opener;
  const loadSearch = async () => {
    if (searchData) return searchData;
    if (!loading) {
      loading = fetch(document.body.dataset.searchIndex).then(res => {
        if (!res.ok) throw new Error('Search index unavailable');
        return res.json();
      }).then(data => {
        searchData = Array.isArray(data) ? data : (data.posts || []);
        return searchData;
      }).catch(error => { loading = null; throw error; });
    }
    return loading;
  };
  const appendResult = item => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.className = 'search-result';
    link.href = item.path;
    const title = document.createElement('strong'); title.textContent = item.title;
    const meta = document.createElement('span'); meta.textContent = `${item.date} · ${item.topicLabel || '笔记'} · ${item.minutes || 1} 分钟`;
    link.append(title, meta);
    if (item.excerpt) { const excerpt = document.createElement('p'); excerpt.textContent = item.excerpt; link.append(excerpt); }
    li.append(link); results.append(li);
  };
  const renderSearch = async () => {
    const query = input.value.trim().toLocaleLowerCase();
    results.replaceChildren();
    if (!query) { status.textContent = '输入关键词，寻找一篇笔记。'; return; }
    status.textContent = '正在查找…';
    try {
      const data = await loadSearch();
      if (query !== input.value.trim().toLocaleLowerCase()) return;
      const words = query.split(/\s+/);
      const matches = data.filter(item => {
        const searchable = `${item.title} ${(item.tags || []).join(' ')} ${item.topicLabel || ''} ${item.excerpt || ''}`.toLocaleLowerCase();
        return words.every(word => searchable.includes(word));
      });
      results.replaceChildren();
      matches.slice(0, 30).forEach(appendResult);
      status.textContent = matches.length ? `找到 ${matches.length} 篇笔记${matches.length > 30 ? '，显示前 30 篇' : ''}` : '还没有找到，换一个关键词试试。';
    } catch (_) { status.textContent = '搜索暂时不可用，可以从「文章」页浏览笔记。'; }
  };
  const openSearch = async () => {
    if (!dialog || typeof dialog.showModal !== 'function' || dialog.open) return;
    opener = document.activeElement;
    dialog.showModal(); input.focus();
    try { await loadSearch(); } catch (_) { status.textContent = '搜索暂时不可用，可以从「文章」页浏览笔记。'; }
    if (input.value) renderSearch();
  };
  document.querySelectorAll('[data-open-search]').forEach(button => button.addEventListener('click', openSearch));
  document.querySelector('[data-close-search]')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('close', () => opener?.focus());
  dialog?.addEventListener('click', event => { if (event.target === dialog && event.clientX !== 0 && !event.target.closest('button')) {
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  } });
  input?.addEventListener('input', renderSearch);
  input?.addEventListener('keydown', event => { if (event.key === 'Enter') results.querySelector('a')?.click(); });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
  });

  const copyText = async text => {
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(text); return; } catch (_) {}
    }
    const previousFocus = document.activeElement;
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.append(field); field.select();
    const copied = document.execCommand('copy');
    field.remove(); previousFocus?.focus({ preventScroll: true });
    if (!copied) throw new Error('Copy unavailable');
  };
  document.querySelectorAll('.article-body figure.highlight, .article-body pre').forEach(block => {
    if (block.matches('pre') && block.closest('figure.highlight')) return;
    const button = document.createElement('button');
    button.className = 'code-copy'; button.type = 'button'; button.textContent = '复制'; button.setAttribute('aria-label', '复制代码');
    button.addEventListener('click', async () => {
      const code = block.querySelector('td.code pre') || block.querySelector('code') || block;
      const clone = code.cloneNode(true);
      clone.querySelectorAll('.code-copy').forEach(node => node.remove());
      clone.querySelectorAll('br').forEach(node => node.replaceWith(document.createTextNode('\n')));
      const content = clone.textContent;
      try {
        await copyText(content);
        button.textContent = '已复制';
      } catch (_) { button.textContent = '请选中复制'; }
      setTimeout(() => { button.textContent = '复制'; }, 1800);
    });
    block.append(button);
  });
  const tocLinks = Array.from(document.querySelectorAll('.article-toc .toc-link'));
  const headings = tocLinks.map(link => {
    try { return document.getElementById(decodeURIComponent(link.hash.slice(1))); } catch (_) { return null; }
  }).filter(Boolean);
  if (headings.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(() => {
      let current = headings[0];
      for (const heading of headings) { if (heading.getBoundingClientRect().top <= 150) current = heading; }
      tocLinks.forEach(link => {
        let active = false;
        try { active = decodeURIComponent(link.hash.slice(1)) === current.id; } catch (_) {}
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-100px 0px -65% 0px', threshold: 0 });
    headings.forEach(heading => observer.observe(heading));
  }
  const imageDialog = document.querySelector('#image-dialog');
  let imageOpener;
  document.querySelectorAll('.article-body img').forEach(img => {
    img.loading = 'lazy'; img.decoding = 'async';
    if (img.closest('a')) return;
    img.tabIndex = 0; img.setAttribute('role', 'button'); img.setAttribute('aria-label', `${img.alt || '文章插图'}，点击放大`);
    const open = () => {
      if (!imageDialog || typeof imageDialog.showModal !== 'function') return;
      imageOpener = img;
      imageDialog.querySelector('img').src = img.currentSrc || img.src;
      imageDialog.querySelector('img').alt = img.alt;
      imageDialog.querySelector('p').textContent = img.alt;
      imageDialog.showModal();
    };
    img.addEventListener('click', open);
    img.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
  });
  document.querySelector('[data-close-image]')?.addEventListener('click', () => imageDialog.close());
  imageDialog?.addEventListener('close', () => imageOpener?.focus());
  imageDialog?.addEventListener('click', event => { if (event.target === imageDialog) imageDialog.close(); });
})();
