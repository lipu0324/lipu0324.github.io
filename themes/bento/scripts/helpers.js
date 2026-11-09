'use strict';

const { stripHTML, unescapeHTML, url_for: urlFor } = require('hexo-util');

const TOPICS = [
  { key: 'network', label: '网络与互连' },
  { key: 'ai', label: 'AI Infra' },
  { key: 'hardware', label: 'FPGA 与硬件' },
  { key: 'code', label: '编程与系统' },
  { key: 'notes', label: '随笔' }
];

function toArray(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection.slice();
  if (typeof collection.toArray === 'function') return collection.toArray();
  if (typeof collection.forEach === 'function') {
    const result = [];
    collection.forEach(item => result.push(item));
    return result;
  }
  return [];
}

function names(collection) {
  return toArray(collection).map(item => typeof item === 'string' ? item : item.name).filter(Boolean);
}

function posts(view) {
  const collection = view && view.site ? view.site.posts : hexo.locals.get('posts');
  return toArray(collection)
    .filter(post => post.published !== false)
    .sort((a, b) => Number(b.date) - Number(a.date) || String(a.title).localeCompare(String(b.title), 'zh-CN'));
}

function plainText(value, omitCode = true) {
  let text = String(value || '')
    .replace(/^---\s*\n[\s\S]*?\n---\s*(?:\n|$)/, '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|svg|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<sup\b[^>]*(?:id|class)=["'][^"']*(?:fnref|footnote)[^"']*["'][^>]*>[\s\S]*?<\/sup\s*>/gi, '')
    .replace(/<(section|div)\b[^>]*(?:class|role)=["'][^"']*(?:footnotes|doc-endnotes)[^"']*["'][^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/^\s{0,3}\[\^[^\]]+\]:[^\n]*(?:\n(?:[ \t]{2,}[^\n]*|[ \t]*$))*/gm, '')
    .replace(/\[\^[^\]]+\]/g, '')
    .replace(/!\[\[[^\]]+\]\]/g, '')
    .replace(/!\[[^\]]*\]\([^\n]*?\)/g, '')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1');

  if (omitCode) {
    text = text
      .replace(/<figure\b[^>]*class=["'][^"']*\bhighlight\b[^"']*["'][^>]*>[\s\S]*?<\/figure\s*>/gi, ' ')
      .replace(/<pre\b[^>]*>[\s\S]*?<\/pre\s*>/gi, ' ')
      .replace(/^\s*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\1\s*$/gm, ' ');
  }

  text = text
    .replace(/<\/?(?:p|div|section|article|h[1-6]|li|ul|ol|table|tr|td|th|blockquote|br|hr)\b[^>]*>/gi, ' ')
    .replace(/\[([^\]]+)\]\([^\n]*?\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/^\s{0,3}\[[^\]]+\]:\s*\S+.*$/gm, '')
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s*|[-+*]\s+|\d+[.)]\s+)/gm, '')
    .replace(/^\s*(?:[-*_]\s*){3,}$/gm, '')
    .replace(/(`+)([\s\S]*?)\1/g, '$2')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1');

  return unescapeHTML(stripHTML(text)).replace(/\s+/g, ' ').trim();
}

function excerpt(post, limit = 100) {
  const source = typeof post === 'string'
    ? post
    : post.description || post.excerpt || post.content || post.raw || post._content || '';
  const text = plainText(source);
  const length = Number.isFinite(Number(limit)) ? Math.max(0, Math.floor(Number(limit))) : 100;
  const characters = Array.from(text);
  return characters.length > length ? characters.slice(0, length).join('').trimEnd() + '…' : text;
}

function minutes(post) {
  const source = typeof post === 'string' ? post : post.content || post.raw || post._content || post.excerpt || '';
  const text = plainText(source, false);
  const cjk = (text.match(/[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  const words = (text.replace(/[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/g, ' ').match(/[A-Za-z0-9]+(?:['’_-][A-Za-z0-9]+)*/g) || []).length;
  return Math.max(1, Math.ceil(cjk / 350 + words / 200));
}

function topic(post) {
  const categories = names(post.categories).join(' ');
  const text = [post.title || '', categories, ...names(post.tags)].join(' ');
  let key = 'notes';

  // Existing editorial categories take precedence over incidental keywords.
  if (/思考随笔|生活|随笔/.test(categories)) {
    key = 'notes';
  } else if (/\b(?:llm(?:-agent)?|cuda|gpu|cncl|allreduce|horovod|pytorch|attention|transformer|bf16|fp(?:4|8|16|32)|autograd|mlu)\b|大模型|分布式训练|集合通信|深度学习|自动求导|AI\s*训练|AI\s*Infra/i.test(text)) {
    key = 'ai';
  } else if (/FPGA|一生一芯/.test(categories) || /\b(?:verilog|chisel|vivado|verilator|ysyx)\b/i.test(text)) {
    key = 'hardware';
  } else if (/\b(?:uec|uet|pds|pdc|rdma|roce|infiniband|iwarp|sdn|falcon|ethernet|tcp|udp|ipv6)\b|网络|路由|互连/i.test(text)) {
    key = 'network';
  } else if (/技能学习|日常学习/.test(categories) || /C\+\+|\b(?:cpp|leetcode|scala|linux|git)\b|操作系统|编程|算法|指针|链表|内存|同步|系统调用/i.test(text)) {
    key = 'code';
  }

  return TOPICS.find(item => item.key === key);
}

function dateString(post) {
  if (post.date && typeof post.date.format === 'function') return post.date.format('YYYY-MM-DD');
  const date = new Date(post.date);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function archivePosts(page, view) {
  return posts(view).filter(post => {
    if (page.category && !names(post.categories).includes(page.category)) return false;
    if (page.tag && !names(post.tags).includes(page.tag)) return false;
    const date = dateString(post);
    if (page.year && date.slice(0, 4) !== String(page.year)) return false;
    if (page.month && date.slice(5, 7) !== String(page.month).padStart(2, '0')) return false;
    if (page.day && date.slice(8, 10) !== String(page.day).padStart(2, '0')) return false;
    return true;
  });
}

hexo.extend.helper.register('bento_posts', function () {
  return posts(this);
});

hexo.extend.helper.register('bento_text', excerpt);
hexo.extend.helper.register('bento_minutes', minutes);
hexo.extend.helper.register('bento_topic', topic);
hexo.extend.helper.register('bento_names', names);

hexo.extend.helper.register('bento_topics', function () {
  const all = posts(this);
  return TOPICS.map(item => {
    const matches = all.filter(post => topic(post).key === item.key);
    return { ...item, posts: matches, count: matches.length };
  });
});

hexo.extend.helper.register('bento_archive_posts', function (page) {
  return archivePosts(page || this.page || {}, this);
});

hexo.extend.generator.register('bento-search', function (locals) {
  const index = posts({ site: locals }).map(post => {
    const category = topic(post);
    return {
      title: post.title || '未命名文章',
      path: urlFor.call(hexo, post.path, { relative: false }),
      date: dateString(post),
      tags: names(post.tags),
      categories: names(post.categories),
      excerpt: excerpt(post, 140),
      topic: category.key,
      topicLabel: category.label,
      minutes: minutes(post)
    };
  });
  return { path: 'bento-search.json', data: JSON.stringify(index) };
});
