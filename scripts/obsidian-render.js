'use strict';

const path = require('path');

const OBSIDIAN_UPLOAD_BASE = '/uploads/obsidian/';

function assetUrl(target) {
  const cleanTarget = target.replace(/\\/g, '/').trim();
  const filename = path.posix.basename(cleanTarget);
  return OBSIDIAN_UPLOAD_BASE + encodeURIComponent(filename);
}

function displayText(target, alias) {
  if (alias) return alias.trim();
  const cleanTarget = target.replace(/\\/g, '/').trim();
  return cleanTarget.split('/').pop().replace(/\.md$/i, '');
}

hexo.extend.filter.register('before_post_render', function renderObsidianSyntax(data) {
  if (!data.obsidian || !data.content) return data;

  data.content = data.content
    .replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target, alias) => {
      const alt = displayText(target, alias);
      return `![${alt}](${assetUrl(target)})`;
    })
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_match, target, alias) => {
      return displayText(target, alias);
    });

  return data;
});
