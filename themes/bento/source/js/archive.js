(() => {
  'use strict';

  const page = document.querySelector('[data-archive-page]');
  if (!page) return;
  const input = page.querySelector('[data-archive-search]');
  const buttons = Array.from(page.querySelectorAll('[data-archive-topic]'));
  const list = page.querySelector('[data-archive-list]');
  const count = page.querySelector('[data-archive-count]');
  const empty = page.querySelector('[data-archive-empty]');
  const pagination = page.querySelector('[data-archive-pagination]');
  const initialRows = Array.from(list.children).map(row => row.cloneNode(true));
  const initialCount = count.textContent;
  const availableTopics = new Set(buttons.map(button => button.dataset.archiveTopic));
  let selectedTopic = 'all';
  let indexPromise;
  let revision = 0;
  let inputTimer;

  const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/\s+/g, ' ').trim();
  const matches = (value, query) => query.split(' ').filter(Boolean).every(term => normalize(value).includes(term));

  function belongsToScope(entry) {
    const scope = page.dataset;
    if (scope.archiveCategory && !(entry.categories || []).includes(scope.archiveCategory)) return false;
    if (scope.archiveTag && !(entry.tags || []).includes(scope.archiveTag)) return false;
    if (scope.archiveYear && entry.date.slice(0, 4) !== scope.archiveYear) return false;
    if (scope.archiveMonth && entry.date.slice(5, 7) !== scope.archiveMonth.padStart(2, '0')) return false;
    if (scope.archiveDay && entry.date.slice(8, 10) !== scope.archiveDay.padStart(2, '0')) return false;
    return true;
  }

  function getIndex() {
    if (!indexPromise) {
      indexPromise = fetch(page.dataset.searchIndex, { credentials: 'same-origin' })
        .then(response => {
          if (!response.ok) throw new Error('Unable to load the article index');
          return response.json();
        })
        .then(entries => {
          if (!Array.isArray(entries)) throw new Error('Invalid article index');
          return entries.filter(belongsToScope);
        })
        .catch(error => {
          indexPromise = null;
          throw error;
        });
    }
    return indexPromise;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function searchText(entry) {
    return [entry.title, entry.topicLabel, ...(entry.tags || []), ...(entry.categories || []), entry.excerpt].join(' ');
  }

  function createRow(entry) {
    const row = element('li', 'archive-item');
    row.dataset.entry = '';
    row.dataset.topic = entry.topic;
    row.dataset.search = searchText(entry);
    const link = element('a', 'archive-item-link');
    link.href = entry.path;
    const body = element('div', 'archive-item-body');
    const meta = element('div', 'archive-meta');
    meta.append(element('span', 'topic-label topic-' + entry.topic, entry.topicLabel));
    const separator = element('span', '', '·');
    separator.setAttribute('aria-hidden', 'true');
    meta.append(separator, element('span', '', entry.minutes + ' 分钟阅读'));
    body.append(meta, element('h2', 'archive-item-title', entry.title), element('p', 'archive-excerpt', entry.excerpt));
    const end = element('div', 'archive-item-end');
    const date = element('time', 'archive-date', entry.date.replace(/-/g, '.'));
    date.dateTime = entry.date;
    const arrow = element('span', 'archive-arrow', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    end.append(date, arrow);
    link.append(body, end);
    row.append(link);
    return row;
  }

  function setControls() {
    buttons.forEach(button => {
      const active = button.dataset.archiveTopic === selectedTopic;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function writeUrl(query) {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', input.value.trim());
    else url.searchParams.delete('q');
    if (selectedTopic !== 'all') url.searchParams.set('topic', selectedTopic);
    else url.searchParams.delete('topic');
    window.history.replaceState(null, '', url);
  }

  async function update() {
    const ownRevision = ++revision;
    const query = normalize(input.value);
    const filtering = Boolean(query || selectedTopic !== 'all');
    setControls();
    writeUrl(query);

    if (!filtering) {
      list.replaceChildren(...initialRows.map(row => row.cloneNode(true)));
      list.removeAttribute('aria-busy');
      count.textContent = initialCount;
      empty.hidden = initialRows.length > 0;
      if (pagination) pagination.hidden = false;
      return;
    }

    list.setAttribute('aria-busy', 'true');
    count.textContent = '正在搜索文章…';
    try {
      const entries = await getIndex();
      if (revision !== ownRevision) return;
      const filtered = entries.filter(entry => (selectedTopic === 'all' || entry.topic === selectedTopic) && matches(searchText(entry), query));
      list.replaceChildren(...filtered.map(createRow));
      count.textContent = '找到 ' + filtered.length + ' 篇文章';
      empty.hidden = filtered.length > 0;
      if (pagination) pagination.hidden = true;
    } catch (error) {
      if (revision !== ownRevision) return;
      const filtered = initialRows.filter(row => (selectedTopic === 'all' || row.dataset.topic === selectedTopic) && matches(row.dataset.search, query));
      list.replaceChildren(...filtered.map(row => row.cloneNode(true)));
      count.textContent = '本页找到 ' + filtered.length + ' 篇文章 · 全站索引暂时无法加载';
      empty.hidden = filtered.length > 0;
      if (pagination) pagination.hidden = false;
    } finally {
      if (revision === ownRevision) list.removeAttribute('aria-busy');
    }
  }

  input.addEventListener('input', () => {
    window.clearTimeout(inputTimer);
    inputTimer = window.setTimeout(update, 120);
  });
  buttons.forEach(button => button.addEventListener('click', () => {
    selectedTopic = button.dataset.archiveTopic;
    window.clearTimeout(inputTimer);
    update();
  }));

  const params = new URLSearchParams(window.location.search);
  input.value = params.get('q') || '';
  if (availableTopics.has(params.get('topic'))) selectedTopic = params.get('topic');
  if (input.value || selectedTopic !== 'all') update();
})();
