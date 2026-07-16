// Custom pull-to-refresh gesture for the installed (standalone) home-screen app,
// where the OS/browser's native pull-to-refresh chrome isn't available.
// Reloads with a cache-busting query param so pushed trip updates are picked up.
(function () {
  var THRESHOLD = 70;
  var MAX_PULL = 110;

  var indicator = document.createElement('div');
  indicator.setAttribute('aria-hidden', 'true');
  indicator.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:9999',
    'display:flex', 'align-items:center', 'justify-content:center',
    'height:56px', 'margin-top:-56px',
    'font-family:ui-monospace,Menlo,Consolas,monospace',
    'font-size:11px', 'letter-spacing:1px', 'text-transform:uppercase',
    'color:var(--teal,var(--gold,#2DD4BF))',
    'pointer-events:none', 'transition:transform .15s ease, opacity .15s ease',
    'opacity:0'
  ].join(';');

  var spinner = document.createElement('div');
  spinner.style.cssText = [
    'width:18px', 'height:18px', 'border-radius:50%',
    'border:2px solid currentColor', 'border-top-color:transparent',
    'margin-right:8px', 'flex-shrink:0'
  ].join(';');

  var label = document.createElement('span');
  label.textContent = 'Pull to refresh';

  indicator.appendChild(spinner);
  indicator.appendChild(label);

  var mount = function () {
    document.body.appendChild(indicator);
  };
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);

  var startY = null;
  var pulling = false;
  var refreshing = false;

  function atTop() {
    return (window.scrollY || document.documentElement.scrollTop || 0) <= 0;
  }

  function reset() {
    startY = null;
    pulling = false;
    indicator.style.transform = 'translateY(0)';
    indicator.style.opacity = '0';
    spinner.style.animation = '';
    label.textContent = 'Pull to refresh';
  }

  function doRefresh() {
    refreshing = true;
    label.textContent = 'Refreshing…';
    spinner.style.animation = 'ptr-spin .6s linear infinite';
    indicator.style.transform = 'translateY(' + (56 + 8) + 'px)';
    indicator.style.opacity = '1';
    var url = new URL(window.location.href);
    url.searchParams.set('_r', Date.now());
    window.location.replace(url.toString());
  }

  document.addEventListener('touchstart', function (e) {
    if (refreshing || !atTop() || e.touches.length !== 1) return;
    startY = e.touches[0].clientY;
    pulling = true;
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!pulling || startY === null || refreshing) return;
    var diff = e.touches[0].clientY - startY;
    if (diff <= 0 || !atTop()) {
      reset();
      return;
    }
    e.preventDefault();
    var pull = Math.min(diff * 0.5, MAX_PULL);
    indicator.style.opacity = String(Math.min(pull / THRESHOLD, 1));
    indicator.style.transform = 'translateY(' + (56 + pull) + 'px)';
    label.textContent = pull >= THRESHOLD ? 'Release to refresh' : 'Pull to refresh';
  }, { passive: false });

  document.addEventListener('touchend', function () {
    if (!pulling || refreshing) return;
    var rect = indicator.getBoundingClientRect();
    var pulled = rect.top + 56;
    if (pulled >= THRESHOLD) {
      doRefresh();
    } else {
      reset();
    }
  }, { passive: true });

  document.addEventListener('touchcancel', reset, { passive: true });

  var style = document.createElement('style');
  style.textContent = '@keyframes ptr-spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(style);
})();
