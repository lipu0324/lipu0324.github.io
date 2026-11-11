(function () {
  'use strict';

  var fabric = document.querySelector('[data-fabric]');
  if (!fabric) return;

  var scene = fabric.querySelector('[data-fabric-scene]');
  var motionButton = fabric.querySelector('[data-fabric-motion]');
  var status = fabric.querySelector('[data-fabric-status]');
  var nodes = Array.prototype.slice.call(fabric.querySelectorAll('[data-fabric-node]'));
  var motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  var running = !motionPreference.matches;
  var userSelectedMotion = false;

  function syncAnimation() {
    var shouldAnimate = running && !document.hidden;
    if (typeof scene.pauseAnimations === 'function') {
      if (shouldAnimate) scene.unpauseAnimations();
      else scene.pauseAnimations();
    }
    fabric.dataset.running = String(running);
    motionButton.setAttribute('aria-pressed', String(!running));
    motionButton.setAttribute('aria-label', running ? '暂停数据流动画' : '播放数据流动画');
    motionButton.setAttribute('title', running ? '暂停动画' : '播放动画');
  }

  function selectNode(node) {
    var selected = node.dataset.fabricNode;
    fabric.dataset.active = selected;
    nodes.forEach(function (item) {
      item.setAttribute('aria-pressed', String(item === node));
    });
    status.textContent = 'NODE ' + selected + ' → FABRIC';
  }

  nodes.forEach(function (node, index) {
    node.addEventListener('click', function () { selectNode(node); });
    node.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectNode(node);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        var step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
        var next = nodes[(index + step + nodes.length) % nodes.length];
        next.focus();
        selectNode(next);
      }
    });
  });

  motionButton.addEventListener('click', function () {
    running = !running;
    userSelectedMotion = true;
    fabric.dataset.userMotion = String(running);
    syncAnimation();
  });

  function onMotionPreferenceChange(event) {
    if (userSelectedMotion) return;
    running = !event.matches;
    syncAnimation();
  }

  if (typeof motionPreference.addEventListener === 'function') {
    motionPreference.addEventListener('change', onMotionPreferenceChange);
  } else if (typeof motionPreference.addListener === 'function') {
    motionPreference.addListener(onMotionPreferenceChange);
  }
  document.addEventListener('visibilitychange', syncAnimation);
  syncAnimation();
})();
