/*
 * Cursor-tracking mascot: a plain-JS port of the MIT-licensed `page-mascot`
 * React component by Kamran Ahmed (https://github.com/nilbuild/page-mascot).
 *
 * Each character is two 3x3 sprite sheets (head directions + reactions); the
 * head turns by moving background-position. No dependencies, no network calls
 * beyond the two images.
 *
 * Mount points:
 *   - the sidebar avatar (#avatar) is replaced by the mascot
 *   - any element with [data-mascot] gets one (used in the home intro on phones)
 */
(function () {
  'use strict';

  var SHEETS = {
    directions: '/assets/img/mascot/fox-pixel-directions.webp',
    reactions: '/assets/img/mascot/fox-pixel-reactions.webp'
  };
  var LABEL = 'pixel fox';

  var DIRECTIONS = ['up-left', 'up', 'up-right', 'left', 'center', 'right', 'down-left', 'down', 'down-right'];
  var REACTIONS = ['blink', 'heart', 'sparkle', 'surprised', 'wink', 'bashful', 'sleepy', 'dizzy', 'delighted'];
  // Clockwise from the right, matching atan2 with y pointing down.
  var CLOCKWISE = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];
  var SECTOR = (Math.PI * 2) / CLOCKWISE.length;
  var HYSTERESIS = 0.12;
  var DEAD_ZONE = 70;

  var PAYOFFS = ['heart', 'sparkle', 'delighted'];
  var BOOP_PAYOFF = 120;
  var BOOP_END = 560;
  var SQUASH_MS = 420;
  var DIZZY_AFTER = 4;
  var DIZZY_WINDOW = 1600;
  var DIZZY_END = 1100;
  var SQUASH = [
    { transform: 'scale(1, 1)', easing: 'ease-in' },
    { transform: 'scale(1.10, 0.86)', offset: 0.18, easing: 'ease-out' },
    { transform: 'scale(0.95, 1.08)', offset: 0.45, easing: 'ease-in-out' },
    { transform: 'scale(1.03, 0.97)', offset: 0.72, easing: 'ease-in-out' },
    { transform: 'scale(1, 1)' }
  ];

  function cellPos(index) {
    return (index % 3) * 50 + '% ' + Math.floor(index / 3) * 50 + '%';
  }

  function wrap(a) {
    return Math.atan2(Math.sin(a), Math.cos(a));
  }

  function build(button) {
    button.type = 'button';
    button.setAttribute('aria-label', 'Boop the ' + LABEL);
    button.classList.add('mascot');
    button.innerHTML =
      '<span class="mascot-squash">' +
      '<span class="mascot-layer mascot-dir"></span>' +
      '<span class="mascot-layer mascot-react"></span>' +
      '</span>';

    var squash = button.firstChild;
    var dir = squash.children[0];
    var react = squash.children[1];
    dir.style.backgroundImage = 'url(' + SHEETS.directions + ')';
    react.style.backgroundImage = 'url(' + SHEETS.reactions + ')';

    var timers = [];
    var boops = { count: 0, at: 0 };

    function setDirection(d) {
      dir.style.backgroundPosition = cellPos(DIRECTIONS.indexOf(d));
    }

    function setReaction(r) {
      react.style.backgroundPosition = cellPos(REACTIONS.indexOf(r || 'blink'));
      react.style.opacity = r ? '1' : '0';
      dir.style.opacity = r ? '0' : '1';
    }

    setDirection('center');
    setReaction(null);

    button.addEventListener('click', function () {
      timers.forEach(clearTimeout);
      timers = [];
      function later(ms, next) {
        timers.push(setTimeout(function () { setReaction(next); }, ms));
      }

      var now = Date.now();
      boops.count = now - boops.at < DIZZY_WINDOW ? boops.count + 1 : 1;
      boops.at = now;

      if (boops.count >= DIZZY_AFTER) {
        boops.count = 0;
        setReaction('dizzy');
        later(DIZZY_END, null);
      } else {
        setReaction('blink');
        later(BOOP_PAYOFF, PAYOFFS[(boops.count - 1) % PAYOFFS.length]);
        later(BOOP_END, null);
      }

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !squash.animate) return;
      squash.animate(SQUASH, { duration: SQUASH_MS, easing: 'linear' });
    });

    return { el: button, setDirection: setDirection, sector: -1 };
  }

  function init() {
    var mascots = [];

    // Sidebar: swap the avatar link for the mascot (the site title below still links home).
    var avatar = document.getElementById('avatar');
    if (avatar) {
      var b = document.createElement('button');
      b.id = 'avatar';
      b.className = avatar.className;
      avatar.replaceWith(b);
      mascots.push(build(b));
    }

    document.querySelectorAll('[data-mascot]').forEach(function (host) {
      var b = document.createElement('button');
      host.appendChild(b);
      mascots.push(build(b));
    });

    // Head tracking only for a real mouse/trackpad; touch devices still get boops.
    if (!mascots.length || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var pointer = null;
    function aim() {
      if (!pointer) return;
      mascots.forEach(function (m) {
        var box = m.el.getBoundingClientRect();
        if (!box.width) return; // hidden (e.g. the phone-only copy on desktop)
        var dx = pointer.x - (box.left + box.width / 2);
        var dy = pointer.y - (box.top + box.height / 2);

        if (Math.hypot(dx, dy) < DEAD_ZONE) {
          m.sector = -1;
          m.setDirection('center');
          return;
        }
        // Hold the current sector until the pointer is well past its edge.
        var angle = Math.atan2(dy, dx);
        if (m.sector !== -1 && Math.abs(wrap(angle - m.sector * SECTOR)) < SECTOR / 2 + HYSTERESIS) return;
        m.sector = (Math.round(angle / SECTOR) + CLOCKWISE.length) % CLOCKWISE.length;
        m.setDirection(CLOCKWISE[m.sector]);
      });
    }

    window.addEventListener('pointermove', function (e) {
      pointer = { x: e.clientX, y: e.clientY };
      aim();
    }, { passive: true });
    window.addEventListener('scroll', aim, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
