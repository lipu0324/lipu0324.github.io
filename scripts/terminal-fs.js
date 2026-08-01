'use strict';

/**
 * Generates /fs.json — the virtual filesystem consumed by the terminal
 * homepage (themes/cactus/source/js/terminal.js).
 *
 * Every post becomes a .md file with plain-text content (markdown syntax
 * stripped, code blocks kept verbatim) so that `cat` / `grep` / `head`
 * work against real article text on the client side.
 */

const fs = require('fs');

function stripMarkdown(md) {
  if (!md) return '';
  const text = String(md)
    .replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n?/, '') // front matter
    .replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const out = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; continue; }
    if (inFence) { out.push(line.replace(/\s+$/, '')); continue; }
    line = line
      .replace(/!\[\[[^\]|]*(?:\|([^\]]*))?\]\]/g, '$1')          // obsidian image
      .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_m, t, a) => a || t) // wikilink
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')                   // image -> alt
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')                    // link -> text
      .replace(/^\s{0,3}#{1,6}\s+/, '')                           // heading marks
      .replace(/^\s*>\s?\[![^\]]*\][+-]?\s?/, '')                 // obsidian callout marker
      .replace(/^\s*>\s?/, '')                                    // blockquote
      .replace(/^\s*([-*+]|\d+\.)\s+/, '  · ')                    // list markers
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)([^*_]+)\1/g, '$2')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/<[^>]+>/g, '');                                   // html tags
    out.push(line.replace(/\s+$/, ''));
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function getRaw(doc) {
  if (doc.raw) return doc.raw;
  try {
    if (doc.full_source) return fs.readFileSync(doc.full_source, 'utf8');
  } catch (e) { /* ignore */ }
  return '';
}

function relNames(rel) {
  const out = [];
  if (!rel) return out;
  (typeof rel.forEach === 'function' ? rel : []).forEach(function (x) {
    if (x && x.name && out.indexOf(x.name) < 0) out.push(x.name);
  });
  return out;
}

hexo.extend.generator.register('terminal_fs', function (locals) {
  const root = hexo.config.root || '/';

  const usedNames = {};
  const posts = [];
  locals.posts.sort('-date').forEach(function (post) {
    const content = stripMarkdown(getRaw(post));
    let name = (post.slug || 'untitled') + '.md';
    if (usedNames[name]) {
      let i = 2;
      while (usedNames[name.replace(/\.md$/, '-' + i + '.md')]) i++;
      name = name.replace(/\.md$/, '-' + i + '.md');
    }
    usedNames[name] = true;
    posts.push({
      name: name,
      title: post.title || post.slug || 'Untitled',
      url: root + post.path,
      date: post.date ? post.date.format('YYYY-MM-DD') : '',
      categories: relNames(post.categories),
      tags: relNames(post.tags),
      words: content.split(/\s+/).filter(Boolean).length,
      content: content
    });
  });

  let about = null;
  locals.pages.forEach(function (page) {
    if (!about && page.path && page.path.indexOf('about/') === 0) {
      about = {
        name: 'about.md',
        url: root + page.path.replace(/index\.html$/, ''),
        content: stripMarkdown(getRaw(page))
      };
    }
  });

  const payload = {
    generated: new Date().toISOString().slice(0, 10),
    site: {
      title: hexo.config.title || '',
      subtitle: hexo.config.subtitle || '',
      description: hexo.config.description || '',
      author: hexo.config.author || '',
      url: (hexo.config.url || '').replace(/\/$/, '')
    },
    posts: posts,
    about: about
  };

  return { path: 'fs.json', data: JSON.stringify(payload) };
});
