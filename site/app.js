/* app.js - wires the left column to the right column. No frameworks.
   The shell (site menu, nav, lesson layout, reading level) is the same as the other
   Packet Lessons sites. What is new here are the widgets: the binary strip, the CIDR
   slider, the subnet splitter, the address classifier and the practice quiz. All of
   their numbers come from subnet.js. */
(function () {
  'use strict';

  var S = SUBNET;
  var nav = document.getElementById('nav');
  var main = document.getElementById('main');
  var content = document.getElementById('content');

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* lv() flattens nested arrays, which is right for paragraphs but wrong for a table
     written as { s: [[row], [row]], m: [...] }. This picks the level without recursing. */
  function pickLevel(x) {
    if (x !== null && typeof x === 'object' && !Array.isArray(x) && ('s' in x || 'm' in x || 'e' in x)) {
      if (LEVEL in x) return x[LEVEL];
      if ('m' in x) return x.m;
      return ('e' in x) ? x.e : x.s;
    }
    return x;
  }

  /* Paragraph lists may resolve to '', a string or an array. Always hand back an array. */
  function paras(x) {
    var r = lv(x);
    if (r === null || r === undefined || r === '') return [];
    return Array.isArray(r) ? r : [r];
  }

  function fmtN(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* ---------- expanding site menu (the whole left rail is the button) ---------- */

  function buildMenu() {
    var panel = document.getElementById('sitemenu'), btn = document.getElementById('menu-btn');
    if (!panel || !btn || !SITE.menu) return;
    panel.innerHTML = '<div class="sitemenu-title">Sites</div>' + SITE.menu.map(function (m) {
      if (!m.href) return '<span class="menu-item soon"><span>' + esc(m.label) + '</span><small>coming soon</small></span>';
      return '<a class="menu-item' + (m.current ? ' current' : '') + '" href="' + esc(m.href) + '"' + (m.current ? ' aria-current="page"' : '') + '>' + esc(m.label) + (m.current ? '<small>you are here</small>' : '') + '</a>';
    }).join('') + '<div class="sitemenu-foot">Click anywhere else, or press Escape, to close.</div>';

    var leaveTimer = null;
    function setOpen(open) {
      panel.classList.toggle('open', open);
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close site menu' : 'Open site menu');
      if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
    }
    function isOpen() { return panel.classList.contains('open'); }

    btn.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!isOpen()); });
    panel.addEventListener('click', function (e) {
      e.stopPropagation();
      if (e.target.closest('a.menu-item')) setOpen(false);
    });
    document.addEventListener('click', function () { if (isOpen()) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) { setOpen(false); btn.focus(); } });
    panel.addEventListener('mouseleave', function () { if (isOpen()) leaveTimer = setTimeout(function () { setOpen(false); }, 1200); });
    panel.addEventListener('mouseenter', function () { if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; } });
    panel.addEventListener('focusout', function (e) { if (!panel.contains(e.relatedTarget) && e.relatedTarget !== btn) setOpen(false); });
  }

  /* ---------- left column ---------- */

  var STACK_GROUPS = { basics: 'Foundations', cidr: 'Subnets', kinds: 'Kinds of address', practice: 'Practice' };

  /* ---------- which rows the student has finished the check questions on ---------- */

  var DONE_KEY = 'ipv4-checks-done';
  var doneRows = (function () {
    try { return JSON.parse(localStorage.getItem(DONE_KEY) || '{}') || {}; } catch (e) { return {}; }
  })();
  function saveDone() { try { localStorage.setItem(DONE_KEY, JSON.stringify(doneRows)); } catch (e) { /* no storage */ } }
  function markNavDone() {
    Array.prototype.forEach.call(nav.querySelectorAll('.row'), function (b) {
      var d = !!doneRows[b.dataset.id];
      b.classList.toggle('done', d);
      var t = b.querySelector('.tick');
      if (t) t.hidden = !d;
      if (d) b.setAttribute('aria-description', 'check questions all correct');
      else b.removeAttribute('aria-description');
    });
  }

  function buildNav() {
    var last = null, section = nav;
    LESSONS.forEach(function (l) {
      if (l.stack !== undefined && l.stack !== last) {
        section = document.createElement('div');
        section.className = 'nav-section s-' + String(l.stack);
        var g = document.createElement('div');
        g.className = 'nav-group';
        g.textContent = STACK_GROUPS[l.stack] || String(l.stack);
        section.appendChild(g);
        nav.appendChild(section);
        last = l.stack;
      }
      var b = document.createElement('button');
      b.className = 'row';
      b.type = 'button';
      b.dataset.id = l.id;
      b.title = l.subtitle;
      b.innerHTML = '<span class="text"><span class="title">' + esc(l.title) + '</span></span>' + (l.chip ? '<span class="lay">' + esc(l.chip) + '</span>' : '') + '<span class="tick" hidden>✓</span>';
      b.addEventListener('click', function () { location.hash = l.id; });
      section.appendChild(b);
    });
  }

  function setActive(id) {
    Array.prototype.forEach.call(nav.querySelectorAll('.row'), function (b) {
      b.classList.toggle('active', b.dataset.id === id);
    });
  }

  /* ---------- shared drawing helpers ---------- */

  /* 32 bit cells in four octets. The first `prefix` cells are network, the rest host. */
  function bitStripHtml(ip, prefix, opts) {
    opts = opts || {};
    var bits = S.octetBits(ip), h = ['<div class="bitstrip" aria-label="' + esc(opts.label || S.fmtIp(ip)) + ' as 32 bits, ' + prefix + ' network bits">'];
    for (var o = 0; o < 4; o++) {
      h.push('<span class="octet"><span class="cells">');
      for (var i = 0; i < 8; i++) {
        var idx = o * 8 + i, role = idx < prefix ? 'net' : 'host', v = 1 << (7 - i);
        h.push('<i class="bit ' + role + (bits[o][i] === '1' ? ' on' : '') + '" title="bit ' + (idx + 1) + ' of 32: ' + role + ' bit, place value ' + v + '">' + bits[o][i] + '</i>');
      }
      h.push('</span><span class="octet-val">' + ((ip >>> (24 - o * 8)) & 255) + '</span></span>');
    }
    h.push('</div>');
    if (opts.legend !== false) {
      h.push('<div class="anatomy-legend"><span><i class="sw net"></i><b>Network bits:</b> ' + prefix + '</span><span><i class="sw host"></i><b>Host bits:</b> ' + (32 - prefix) + '</span></div>');
    }
    return h.join('');
  }

  function tiles(d) {
    var t = [
      ['Addresses in block', '<b>' + fmtN(d.size) + '</b>'],
      ['Usable hosts', '<b>' + fmtN(d.usable) + '</b>'],
      ['Subnet mask', S.fmtIp(d.mask)],
      ['Network address', S.fmtIp(d.network)],
      ['Broadcast address', d.prefix >= 31 ? '<span class="dim">none (/' + d.prefix + ')</span>' : S.fmtIp(d.broadcast)],
      ['Host bits', d.hostBits + ' <span class="dim">(2<sup>' + d.hostBits + '</sup>)</span>']
    ];
    return '<div class="facts netfacts tiles">' + t.map(function (f) { return '<div><span class="k">' + f[0] + '</span><span class="v">' + f[1] + '</span></div>'; }).join('') + '</div>';
  }

  /* ---------- widget: address in binary ---------- */

  function binaryHtml(b) {
    var ip = S.parseIp(b.ip);
    return '<div class="binary" data-ip="' + esc(b.ip) + '">' +
      (b.edit ? '<div class="widget-row"><label>Address <input class="ip-input mono" type="text" value="' + esc(b.ip) + '" size="15" spellcheck="false" autocomplete="off" aria-label="IPv4 address to show in binary"></label><span class="widget-err" hidden>That is not a valid IPv4 address: four numbers from 0 to 255.</span></div>' : '') +
      '<div class="binary-body">' + binaryBody(ip) + '</div></div>';
  }

  function binaryBody(ip) {
    var bits = S.octetBits(ip), h = ['<div class="octets">'];
    for (var o = 0; o < 4; o++) {
      var val = (ip >>> (24 - o * 8)) & 255, parts = [];
      h.push('<div class="octet-box"><div class="cells big">');
      for (var i = 0; i < 8; i++) {
        var v = 1 << (7 - i), on = bits[o][i] === '1';
        if (on) parts.push(v);
        h.push('<span class="bit' + (on ? ' on' : '') + '" title="place value ' + v + (on ? ', on' : ', off') + '"><b>' + bits[o][i] + '</b><small>' + v + '</small></span>');
      }
      h.push('</div><div class="octet-sum">' + (parts.length ? esc(parts.join(' + ')) + ' = ' : '') + '<b>' + val + '</b></div></div>');
    }
    h.push('</div>');
    return h.join('');
  }

  function wireBinary(el) {
    var input = el.querySelector('.ip-input'), err = el.querySelector('.widget-err'), body = el.querySelector('.binary-body');
    if (!input) return;
    input.addEventListener('input', function () {
      var ip = S.parseIp(input.value);
      err.hidden = ip !== null || input.value.trim() === '';
      if (ip !== null) { body.innerHTML = binaryBody(ip); el.dataset.ip = S.fmtIp(ip); }
    });
  }

  /* ---------- widget: the address anatomy strip, with the line you can move ---------- */

  var anatMemory = {};   /* start value -> last prefix, so a reading-level change does not reset it */

  function anatomyHtml(a) {
    var prefix = anatMemory[a.value] !== undefined ? anatMemory[a.value] : a.prefix;
    var min = a.min === undefined ? 8 : a.min, max = a.max === undefined ? 32 : a.max;
    return '<div class="anatomy-widget" data-ip="' + esc(a.value) + '" data-left="' + esc(a.left || '') + '" data-right="' + esc(a.right || '') + '" data-start="' + esc(a.value) + '">' +
      '<div class="widget-row"><label>Address <input class="ip-input mono" type="text" value="' + esc(a.value) + '" size="15" spellcheck="false" autocomplete="off" aria-label="IPv4 address"></label>' +
      '<label class="anat-prefix">Prefix <b class="anat-readout">/' + prefix + '</b></label>' +
      '<span class="widget-err" hidden>That is not a valid IPv4 address: four numbers from 0 to 255.</span></div>' +
      '<input class="cidr-range anat-range" type="range" min="' + min + '" max="' + max + '" value="' + prefix + '" step="1" aria-label="Prefix length: where the line falls">' +
      '<div class="cidr-ticks">' + tickHtml(min, max) + '</div>' +
      '<div class="anat-body">' + anatomyBody(S.parseIp(a.value), prefix, a.left, a.right) + '</div></div>';
  }

  function anatomyBody(ip, prefix, left, right) {
    var roles = S.octetRoles(prefix), h = [], parts = S.fmtIp(ip).split('.');
    h.push('<div class="anatomy" aria-label="IPv4 address ' + esc(S.fmtIp(ip)) + ' with a /' + prefix + ' mask">');
    parts.forEach(function (x, i) { h.push('<span class="byte wide ' + roles[i] + '">' + esc(x) + '</span>'); });
    h.push('<span class="byte slash">/' + prefix + '</span></div>');
    var legend = [['net', 'Network', left || 'the network part, the same on every machine in this subnet'], ['host', 'Host', right || 'the host part, different on every machine in this subnet']];
    if (roles.indexOf('mixed') >= 0) legend.splice(1, 0, ['mixed', 'Split octet', 'the /' + prefix + ' line falls inside this octet: some bits network, some host']);
    h.push('<div class="anatomy-legend">' + legend.map(function (l) { return '<span><i class="sw ' + l[0] + '"></i><b>' + esc(l[1]) + ':</b> ' + esc(l[2]) + '</span>'; }).join('') + '</div>');
    var whole = prefix % 8 === 0;
    h.push('<p class="hint">Mask <code>' + S.fmtIp(S.maskOf(prefix)) + '</code>. ' +
      (whole ? 'The line falls on a dot: ' + (prefix / 8) + ' whole octet' + (prefix === 8 ? '' : 's') + ' to the network, ' + (4 - prefix / 8) + ' to the host.'
             : 'The line falls inside octet ' + (Math.floor(prefix / 8) + 1) + ', so that octet is split: ' + (prefix % 8) + ' network bits and ' + (8 - prefix % 8) + ' host bits.') +
      ' The same address as bits, with the mask drawn as the colour change:</p>');
    h.push(bitStripHtml(ip, prefix));
    return h.join('');
  }

  function wireAnatomy(el) {
    var input = el.querySelector('.ip-input'), err = el.querySelector('.widget-err');
    var range = el.querySelector('.anat-range'), readout = el.querySelector('.anat-readout'), body = el.querySelector('.anat-body');
    var left = el.dataset.left, right = el.dataset.right, key = el.dataset.start;
    function apply() {
      var ip = S.parseIp(el.dataset.ip), prefix = +range.value;
      anatMemory[key] = prefix;
      readout.textContent = '/' + prefix;
      range.setAttribute('aria-valuetext', '/' + prefix + ', mask ' + S.fmtIp(S.maskOf(prefix)) + ', ' + (32 - prefix) + ' host bits');
      body.innerHTML = anatomyBody(ip, prefix, left, right);
    }
    input.addEventListener('input', function () {
      var ip = S.parseIp(input.value);
      err.hidden = ip !== null || input.value.trim() === '';
      if (ip !== null) { el.dataset.ip = S.fmtIp(ip); apply(); }
    });
    range.addEventListener('input', apply);
    apply();
  }

  /* ---------- widget: the CIDR slider ---------- */

  var sliderMemory = {};   /* ip -> last prefix, so a reading-level change does not reset the slider */

  function cidrHtml(c) {
    var start = sliderMemory[c.ip] !== undefined ? sliderMemory[c.ip] : c.start;
    return '<div class="cidr" data-ip="' + esc(c.ip) + '" data-caption="' + esc(JSON.stringify(c.caption || '')) + '">' +
      '<div class="cidr-head"><div class="cidr-ip">' + esc(c.ip) + '<span class="cidr-readout">/' + start + '</span></div>' +
      '<div class="cidr-size"><b class="cidr-n"></b> addresses</div></div>' +
      '<input class="cidr-range" type="range" min="' + c.min + '" max="' + c.max + '" value="' + start + '" step="1" aria-label="Prefix length">' +
      '<div class="cidr-ticks">' + tickHtml(c.min, c.max) + '</div>' +
      '<div class="cidr-tiles"></div>' +
      '<div class="sizebar-wrap"><div class="sizebar"><i></i></div><div class="sizebar-labels"><span>1 address</span><span class="sizebar-note"></span><span>/' + c.min + ' = ' + fmtN(S.blockSize(c.min)) + '</span></div></div>' +
      '<p class="hint cidr-maskline"></p><div class="cidr-strip"></div>' +
      '<p class="cidr-caption"></p></div>';
  }

  function tickHtml(min, max) {
    var h = [];
    for (var p = min; p <= max; p++) h.push('<span' + (p % 4 === 0 || p === max ? ' class="major"' : '') + '>' + (p % 4 === 0 || p === max ? '/' + p : '') + '</span>');
    return h.join('');
  }

  function fillTemplate(t, d) {
    var next = (d.broadcast + 1) >>> 0;
    var map = {
      p: d.prefix, hb: d.hostBits, size: fmtN(d.size), usable: fmtN(d.usable), mask: S.fmtIp(d.mask), wild: S.fmtIp(d.wildcard),
      net: S.fmtIp(d.network), bc: S.fmtIp(d.broadcast), first: S.fmtIp(d.first), last: S.fmtIp(d.last),
      next: d.broadcast === 0xffffffff ? 'nothing: this is the top of the address space' : S.fmtIp(next)
    };
    return String(t).replace(/\{(\w+)\}/g, function (all, k) { return k in map ? map[k] : all; });
  }

  function wireCidr(el) {
    var ip = S.parseIp(el.dataset.ip), caption = JSON.parse(el.dataset.caption || '""');
    var range = el.querySelector('.cidr-range'), readout = el.querySelector('.cidr-readout'), n = el.querySelector('.cidr-n');
    var tilesEl = el.querySelector('.cidr-tiles'), strip = el.querySelector('.cidr-strip'), cap = el.querySelector('.cidr-caption');
    var bar = el.querySelector('.sizebar i'), note = el.querySelector('.sizebar-note');
    var maskline = el.querySelector('.cidr-maskline');
    var min = +range.min, max = +range.max;
    function apply() {
      var p = +range.value, d = S.describe(ip, p);
      sliderMemory[el.dataset.ip] = p;
      readout.textContent = '/' + p;
      n.textContent = fmtN(d.size);
      range.setAttribute('aria-valuetext', '/' + p + ', ' + fmtN(d.size) + ' addresses, mask ' + S.fmtIp(d.mask));
      tilesEl.innerHTML = tiles(d);
      maskline.innerHTML = 'The subnet mask <code>' + S.fmtIp(d.mask) + '</code> as 32 bits: a solid run of ' + p + ' one' + (p === 1 ? '' : 's') + ' over the network part, then ' + d.hostBits + ' zero' + (d.hostBits === 1 ? '' : 's') + ' over the host part.';
      strip.innerHTML = bitStripHtml(d.mask, p, { label: 'subnet mask ' + S.fmtIp(d.mask) });
      /* log scale: the bar is full at /min and empty at /max */
      var frac = (max - p) / (max - min);
      bar.style.width = Math.max(0.6, frac * 100) + '%';
      note.textContent = p < max ? 'each step to the left doubles it' : '';
      cap.innerHTML = caption ? fillTemplate(lv(caption), d) : '';
    }
    range.addEventListener('input', apply);
    apply();
  }

  /* ---------- widget: powers of two, drawn as one block per address ---------- */

  var pow2Memory = {};

  function pow2Html(c) {
    var min = c.min === undefined ? 0 : c.min, max = c.max === undefined ? 10 : c.max;
    var start = pow2Memory.bits !== undefined ? pow2Memory.bits : (c.start === undefined ? 3 : c.start);
    start = Math.min(max, Math.max(min, start));
    var ticks = [];
    for (var b = min; b <= max; b++) ticks.push('<span>' + b + '</span>');
    return '<div class="pow2">' +
      '<div class="pow2-head"><div class="pow2-sum"><b class="pow2-bits"></b> bits<span class="pow2-eq">=</span>2<sup class="pow2-exp"></sup><span class="pow2-eq">=</span><b class="pow2-n"></b> addresses</div>' +
      '<div class="pow2-note"></div></div>' +
      '<input class="pow2-range" type="range" min="' + min + '" max="' + max + '" value="' + start + '" step="1" aria-label="Number of bits">' +
      '<div class="pow2-ticks">' + ticks.join('') + '</div>' +
      '<div class="pow2-blocks" aria-hidden="true"></div>' +
      '<p class="pow2-caption"></p></div>';
  }

  function wirePow2(el) {
    var range = el.querySelector('.pow2-range');
    var bitsEl = el.querySelector('.pow2-bits'), expEl = el.querySelector('.pow2-exp'), nEl = el.querySelector('.pow2-n');
    var noteEl = el.querySelector('.pow2-note'), blocks = el.querySelector('.pow2-blocks'), cap = el.querySelector('.pow2-caption');
    function sizeClass(n) { return n <= 4 ? 'sz-xl' : n <= 16 ? 'sz-lg' : n <= 64 ? 'sz-md' : n <= 256 ? 'sz-sm' : 'sz-xs'; }
    function apply() {
      var b = +range.value, n = Math.pow(2, b), p = 32 - b;
      var usable = b >= 2 ? n - 2 : n;   /* /31 gives 2, /32 gives 1 */
      pow2Memory.bits = b;
      bitsEl.textContent = b;
      expEl.textContent = b;
      nEl.textContent = fmtN(n);
      range.setAttribute('aria-valuetext', b + ' bits, ' + fmtN(n) + ' addresses');
      noteEl.textContent = 'values 0 to ' + fmtN(n - 1) + (b === 8 ? ', one whole octet' : b === 16 ? ', two octets' : '');
      var cls = sizeClass(n), cell = '<span class="ipb">IP</span>';
      blocks.className = 'pow2-blocks ' + cls;
      blocks.innerHTML = new Array(n + 1).join(cell);
      cap.innerHTML = fillPow2(lv({
        s: 'With <b>{b}</b> switches you can make <b>{n}</b> different patterns, so <b>{b}</b> host bits give you <b>{n}</b> addresses. One more bit and it doubles to {n2}.',
        m: '<b>{b}</b> host bits hold <b>{n}</b> addresses, which is a <code>/{p}</code> block. Every bit you add doubles the block; every bit you take away halves it.',
        e: '2<sup>{b}</sup> = {n}. Host bits {b} means prefix <code>/{p}</code>, usable {u}.'
      }), { b: b, n: fmtN(n), n2: fmtN(n * 2), p: p, u: fmtN(usable) });
    }
    range.addEventListener('input', apply);
    apply();
  }

  function fillPow2(t, map) {
    return String(t).replace(/\{(\w+)\}/g, function (m, k) { return map[k] !== undefined ? map[k] : m; });
  }

  /* ---------- widget: the binary game (a clone of Cisco's Binary Game) ---------- */

  function bgRange(a, b) { var r = []; for (var i = a; i <= b; i++) r.push(i); return r; }
  /* Which octet values appear, grouped from easy to nasty; the original game's groups and per-level weights. */
  var BG_GROUPS = [
    [0, 1, 2, 4, 8, 16, 32, 64, 128, 255],
    [3, 5, 6, 7, 9, 10, 11, 12, 13, 15, 17, 24, 31, 33, 34, 35, 36, 37, 63, 65, 127, 129, 130, 131, 132, 192, 224, 240, 248, 252, 254],
    [14].concat(bgRange(18, 23), bgRange(25, 30), bgRange(38, 62), bgRange(66, 74), [76, 80, 96, 97, 98, 193, 225, 251, 253]),
    [75, 77, 78, 79].concat(bgRange(81, 95), bgRange(99, 126), bgRange(133, 191), [232, 233, 247, 249, 250]),
    bgRange(194, 223),
    [226, 227, 228, 229, 230, 231, 234, 235, 236, 237, 238, 239, 241, 242, 243, 244, 245, 246]
  ];
  var BG_STAGES = [
    [[0, .75], [1, .25]],
    [[0, .25], [1, .75]],
    [[0, .25], [1, .5], [2, .25]],
    [[0, .1], [1, .3], [2, .6]],
    [[0, .1], [1, .1], [2, .4], [3, .4]],
    [[0, .1], [1, .1], [2, .1], [3, .2], [4, .2], [5, .3]]
  ];
  var BG_MAX = 7, BG_GUIDE_STAGE = 2, BG_TOP = 5, BG_WARN_EVERY = 3000;
  var BG_SCORES_KEY = 'ipv4-binary-game-scores', BG_INTRO_KEY = 'ipv4-binary-game-intro', BG_MUTE_KEY = 'ipv4-binary-game-muted';
  /* Sound effects are synthesised below. To use recorded files instead, set this to a folder (e.g. 'sounds/')
     holding bit_on, bit_off, problem_complete, board_clear, game_over, warning, click_button,
     calculator_open and calculator_close as .mp3. */
  var BG_SOUND_DIR = '';

  function bgLoadScores() { try { var s = JSON.parse(localStorage.getItem(BG_SCORES_KEY) || '[]'); return Array.isArray(s) ? s : []; } catch (e) { return []; } }
  function bgIntroSeen() { try { return !!localStorage.getItem(BG_INTRO_KEY); } catch (e) { return false; } }
  function bgLoadMuted() { try { return localStorage.getItem(BG_MUTE_KEY) === '1'; } catch (e) { return false; } }
  function bgLinesNeeded(stage) { return 15 + stage * 5; }
  function bgDelay(stage) { return Math.max((6.2 - stage * 0.8) * 2, 6) * 1000; }
  function bgBits(n) { var s = ''; for (var i = 7; i >= 0; i--) s += (n >> i) & 1; return s; }

  /* One game lives across re-renders: the level toggle rebuilds the DOM, the state stays here. */
  var bg = { mode: 'idle', modal: '', paused: false, ending: false, stage: 0, score: 0, lines: 0, rows: [], nextId: 1,
    elapsed: 0, last: 0, timer: null, warnTimer: null, intro: '', toast: '', toastTimer: null, rank: -1, wipe: false,
    calcId: null, calcVal: '', scores: bgLoadScores(), introDone: bgIntroSeen(), muted: bgLoadMuted() };

  /* ---- sound: short synthesised effects, pitched and timed from the original's ---- */
  var bgAudioCtx = null, bgAudioFiles = {};
  /* [start s, Hz, length s, wave, gain] */
  var BG_SFX = {
    bit_on: [[0, 1620, 0.05, 'square', 0.16]],
    bit_off: [[0, 1170, 0.06, 'square', 0.16]],
    click_button: [[0, 3300, 0.03, 'square', 0.08]],
    calculator_open: [[0, 2600, 0.04, 'square', 0.1]],
    calculator_close: [[0, 1900, 0.04, 'square', 0.1]],
    problem_complete: [[0, 1136, 0.04, 'square', 0.14], [0.02, 1034, 0.04, 'square', 0.14], [0.04, 2081, 0.04, 'square', 0.14], [0.08, 1163, 0.04, 'square', 0.16], [0.14, 1750, 0.1, 'square', 0.2]],
    board_clear: [[0, 1381, 0.05, 'square', 0.16], [0.04, 2775, 0.05, 'square', 0.16], [0.12, 1550, 0.08, 'square', 0.16], [0.24, 2336, 0.14, 'square', 0.2]],
    game_over: [[0, 690, 0.14, 'sawtooth', 0.2], [0.2, 660, 0.22, 'sawtooth', 0.2]],
    warning: [[0, 86, 0.16, 'sine', 0.7], [0.18, 86, 0.16, 'sine', 0.7], [0.36, 86, 0.14, 'sine', 0.6]]
  };
  function bgSound(name) {
    if (bg.muted) return;
    if (BG_SOUND_DIR) {
      try { var a = bgAudioFiles[name] || (bgAudioFiles[name] = new Audio(BG_SOUND_DIR + name + '.mp3')); a.currentTime = 0; a.play(); } catch (e) { /* no audio */ }
      return;
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext, r = BG_SFX[name];
      if (!AC || !r) return;
      if (!bgAudioCtx) bgAudioCtx = new AC();
      if (bgAudioCtx.state === 'suspended') bgAudioCtx.resume();
      var t = bgAudioCtx.currentTime;
      r.forEach(function (n) {
        var o = bgAudioCtx.createOscillator(), g = bgAudioCtx.createGain(), at = t + n[0];
        o.type = n[3]; o.frequency.setValueAtTime(n[1], at);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.linearRampToValueAtTime(n[4], at + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, at + n[2]);
        o.connect(g); g.connect(bgAudioCtx.destination);
        o.start(at); o.stop(at + n[2] + 0.02);
      });
    } catch (e) { /* no audio */ }
  }
  function bgToggleSound() {
    bg.muted = !bg.muted;
    try { localStorage.setItem(BG_MUTE_KEY, bg.muted ? '1' : '0'); } catch (e) { /* no storage */ }
    bgSound('click_button');
  }

  function bgPick() {
    var st = BG_STAGES[Math.min(bg.stage, BG_STAGES.length - 1)], r = Math.random(), gi = st[0][0];
    for (var i = 0; i < st.length; i++) { if (r < st[i][1]) { gi = st[i][0]; break; } r -= st[i][1]; }
    var pool = BG_GROUPS[gi].slice(), used = {};
    bg.rows.forEach(function (row) { used[row.answer] = true; });
    for (var j = pool.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)), t = pool[j]; pool[j] = pool[k]; pool[k] = t; }
    var ai = 0;
    for (i = 0; i < pool.length; i++) if (!used[pool[i]]) { ai = i; break; }
    var dec = Math.random() <= 0.25;
    /* a binary row starts on a decoy pattern: another value from the same group */
    return { id: bg.nextId++, answer: pool[ai], guess: dec ? -1 : pool[(ai + 1) % pool.length], dec: dec };
  }
  function bgRow(id) { for (var i = 0; i < bg.rows.length; i++) if (bg.rows[i].id === id) return bg.rows[i]; return null; }

  /* ---- the clock and the seven-row warning ---- */
  function bgStartClock() { bgStopClock(); bg.last = Date.now(); bg.timer = setInterval(bgTick, 100); }
  function bgStopClock() { if (bg.timer) { clearInterval(bg.timer); bg.timer = null; } }
  function bgTick() {
    var el = main.querySelector('.bgame');
    if (!el || document.hidden) { bgPause(); return; }
    var now = Date.now();
    bg.elapsed += now - bg.last; bg.last = now;
    var d = bgDelay(bg.stage);
    if (bg.elapsed >= d) { bg.elapsed -= d; bgAddRow(); bgRefresh(el); }
  }
  function bgWarnSync() {
    var on = bg.mode === 'play' && !bg.paused && bg.rows.length >= BG_MAX;
    if (on && !bg.warnTimer) { bgSound('warning'); bg.warnTimer = setInterval(function () { bgSound('warning'); }, BG_WARN_EVERY); }
    if (!on && bg.warnTimer) { clearInterval(bg.warnTimer); bg.warnTimer = null; }
  }
  function bgPause() {
    if (bg.mode !== 'play' || bg.paused) return;
    bg.paused = true; bgStopClock(); bgWarnSync(); bgCloseCalc(true); bgRefresh();
  }
  function bgResume() {
    if (bg.mode !== 'play' || !bg.paused) return;
    bg.paused = false; bg.ending = false; bgStartClock(); bgWarnSync(); bgRefresh(); bgFocusFirst();
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) bgPause(); });

  /* ---- game flow ---- */
  function bgAddRow() {
    if (bg.rows.length >= BG_MAX) { bgGameOver(); return; }
    bg.rows.push(bgPick());
    bgWarnSync();
  }
  function bgGameOver() {
    if (bg.mode !== 'play') return;
    bgStopClock(); bg.mode = 'over'; bg.paused = false; bg.ending = false; bgWarnSync(); bgCloseCalc(true);
    var entry = { score: bg.score, level: bg.stage + 1 }, list = bg.scores.slice(), idx = -1;
    for (var i = 0; i < list.length; i++) if (list[i].score <= entry.score) { idx = i; break; }
    if (idx >= 0) { list.splice(idx, 0, entry); if (list.length > BG_TOP) list.pop(); }
    else if (list.length < BG_TOP) { list.push(entry); idx = list.length - 1; }
    bg.scores = list; bg.rank = idx;
    try { localStorage.setItem(BG_SCORES_KEY, JSON.stringify(list)); } catch (e) { /* no storage */ }
    bgSound('game_over');
    bgRefresh();
  }
  function bgReset() {
    bgStopClock(); bgCloseCalc(true);
    bg.score = 0; bg.stage = 0; bg.lines = 0; bg.rows = []; bg.elapsed = 0; bg.paused = false; bg.ending = false; bg.toast = ''; bg.rank = -1; bg.wipe = true; bg.modal = '';
  }
  function bgStart(withIntro) {
    bgReset();
    if (withIntro) { bg.mode = 'intro'; bgIntroStep('binary'); }
    else { bg.mode = 'play'; bgBeginStage(); }
    bgRefresh(); bgFocusFirst();
  }
  function bgQuit() {  /* End Game, confirmed: back to the start screen, like the original */
    bgReset(); bg.mode = 'idle'; bgWarnSync(); bgRefresh();
  }
  function bgIntroStep(step) {
    bg.intro = step; bg.rows = []; bg.wipe = true;
    if (step === 'binary') bg.rows.push({ id: bg.nextId++, answer: 2, guess: 4, dec: false }, { id: bg.nextId++, answer: 5, guess: 1, dec: false });
    else bg.rows.push({ id: bg.nextId++, answer: 16, guess: -1, dec: true }, { id: bg.nextId++, answer: 3, guess: -1, dec: true });
  }
  function bgFinishIntro() {
    bg.introDone = true;
    try { localStorage.setItem(BG_INTRO_KEY, '1'); } catch (e) { /* no storage */ }
    bgCloseCalc(true);
    bg.mode = 'play'; bgBeginStage(); bgRefresh(); bgFocusFirst();
  }
  function bgBeginStage() {
    bg.rows = []; bg.elapsed = 0; bg.paused = false; bg.wipe = true;
    bgAddRow(); bgAddRow(); bgAddRow();
    bgStartClock();
  }
  function bgNextLevel() { bgSound('click_button'); bg.stage++; bg.lines = 0; bg.mode = 'play'; bgBeginStage(); bgRefresh(); bgFocusFirst(); }
  function bgToast(t) {
    bg.toast = t; clearTimeout(bg.toastTimer);
    bg.toastTimer = setTimeout(function () { bg.toast = ''; bgRefresh(); }, 2000);
  }
  function bgSolve(row) {
    bg.rows = bg.rows.filter(function (r) { return r !== row; });
    bgWarnSync();
    if (bg.mode === 'play') {
      bg.lines++; bg.score += 100 + bg.stage * 25;
      if (!bg.rows.length) { bg.score += 250; bgSound('board_clear'); bgToast('Board Clear!'); }
      else bgSound('problem_complete');
      if (bg.lines >= bgLinesNeeded(bg.stage)) { bgStopClock(); bg.mode = 'levelup'; bg.paused = false; bgCloseCalc(true); }
    } else if (bg.mode === 'intro') {
      bgSound('problem_complete');
      if (bg.rows.length) { /* one more to go */ }
      else if (bg.intro === 'binary') bgIntroStep('decimal');
      else { bgFinishIntro(); return; }
    }
    bgRefresh();
    if (bg.mode === 'intro') bgFocusFirst();
  }
  function bgFocusFirst() {
    var el = main.querySelector('.bgame'); if (!el) return;
    var t = el.querySelector('.bg-rows .bg-row:not(.out) button.bg-bit, .bg-rows .bg-row:not(.out) button.bg-digits');
    if (t) t.focus({ preventScroll: true });
  }

  /* ---- the number pad on a decimal row ---- */
  function bgOpenCalc(id) {
    if (bg.calcId === id) return;
    bg.calcId = id; bg.calcVal = '';
    bgSound('calculator_open'); bgRefresh();
  }
  function bgCloseCalc(silent) {
    if (bg.calcId === null) return;
    bg.calcId = null; bg.calcVal = '';
    if (!silent) bgSound('calculator_close');
  }
  function bgCalcKey(k) {
    var row = bgRow(bg.calcId); if (!row) return;
    if (k === 'del') { bg.calcVal = bg.calcVal.slice(0, -1); bgSound('bit_off'); bgRefresh(); return; }
    if (k === 'ok') {
      var v = bg.calcVal;
      bgCloseCalc(true);
      if (v !== '' && +v === row.answer) { bgSolve(row); return; }
      row.guess = v === '' ? -1 : +v;   /* the wrong number stays in the box, as in the original */
      bgRefresh();
      var node = main.querySelector('.bg-row[data-id="' + row.id + '"]');
      if (node) { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake'); }
      return;
    }
    if (bg.calcVal.length < 3) { bg.calcVal += k; bgSound('bit_on'); bgRefresh(); }
  }
  document.addEventListener('keydown', function (e) {
    if (bg.calcId === null || !main.querySelector('.bgame')) return;
    if (/^[0-9]$/.test(e.key)) { bgCalcKey(e.key); e.preventDefault(); }
    else if (e.key === 'Backspace') { bgCalcKey('del'); e.preventDefault(); }
    else if (e.key === 'Enter') { bgCalcKey('ok'); e.preventDefault(); }
    else if (e.key === 'Escape') { bgCloseCalc(); bgRefresh(); }
  });

  /* ---- markup ---- */
  function bgGuideHtml() {
    var h = '<div class="bg-guide" aria-hidden="true"><div class="bg-guide-nums">';
    for (var i = 7; i >= 0; i--) h += '<span>' + (1 << i) + '</span>';
    return h + '</div></div>';
  }
  function bgameHtml() {
    return '<div class="bgame" role="region" aria-label="The binary game">' +
      '<div class="bg-window">' +
      '<div class="bg-board">' + bgGuideHtml() +
      '<div class="bg-problems"><div class="bg-cols" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
      '<div class="bg-rows"></div><div class="bg-help" hidden></div><div class="bg-toast" aria-live="polite"></div></div>' +
      bgGuideHtml() + '</div>' +
      '<div class="bg-menu"><div class="bg-stats">' +
      '<div class="bg-item"><span class="label">Score</span><span class="value bg-score">0</span></div>' +
      '<div class="bg-item"><span class="label">Level</span><span class="value bg-level">1</span></div>' +
      '<div class="bg-item"><span class="label">Lines left</span><span class="value bg-left">15</span></div></div>' +
      '<div class="bg-buttons"><button type="button" class="bg-btn bg-pause">Pause</button>' +
      '<button type="button" class="bg-btn bg-sound" aria-pressed="false">Sound off</button>' +
      '<button type="button" class="bg-btn bg-end">End game</button></div></div>' +
      '<div class="bg-modal-wrap"><div class="bg-modal" role="dialog" aria-live="polite"></div></div>' +
      '</div>' +
      '<p class="hint bg-credit">A clone of the <a href="https://learningcontent.cisco.com/games/binary/index.html" target="_blank" rel="noopener">Binary Game</a> from the Cisco Learning Network: same rules, levels and scoring.</p></div>';
  }
  function bgRowHtml(row) {
    var v = row.dec ? row.answer : row.guess, h = [];
    h.push('<div class="bg-row' + (row.dec ? ' dec' : '') + '" data-id="' + row.id + '" role="group" aria-label="' +
      (row.dec ? 'Decimal puzzle: what is ' + bgBits(row.answer) + ' in decimal?' : 'Binary puzzle: set the bits to make ' + row.answer) + '"><div class="bg-bits">');
    for (var i = 0; i < 8; i++) {
      var on = (v >> (7 - i)) & 1, w = 1 << (7 - i);
      h.push(row.dec ? '<span class="bg-bit fixed' + (on ? ' on' : '') + '" title="worth ' + w + '">' + on + '</span>'
        : '<button type="button" class="bg-bit' + (on ? ' on' : '') + '" data-i="' + i + '" title="worth ' + w + '" aria-label="bit worth ' + w + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + on + '</button>');
    }
    h.push('</div><span class="bg-eq">=</span>');
    if (row.dec) {
      h.push('<button type="button" class="bg-digits isProblem" aria-label="Decimal value: press to open the number pad">?</button>' +
        '<div class="bg-calc" hidden>' + ['7', '8', '9', '4', '5', '6', '1', '2', '3'].map(function (k) { return '<button type="button" data-k="' + k + '">' + k + '</button>'; }).join('') +
        '<button type="button" data-k="del" aria-label="Delete">&#9003;</button><button type="button" data-k="0">0</button><button type="button" data-k="ok" aria-label="Enter">&#10003;</button></div>');
    } else h.push('<span class="bg-digits">' + row.answer + '</span>');
    h.push('</div>');
    return h.join('');
  }
  function bgSyncBits(node, guess) {
    Array.prototype.forEach.call(node.querySelectorAll('button.bg-bit'), function (b) {
      var on = (guess >> (7 - +b.dataset.i)) & 1;
      b.classList.toggle('on', !!on);
      b.textContent = on;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function bgSyncRowState(node, row, index) {
    var open = bg.calcId === row.id;
    node.classList.toggle('dim', bg.calcId !== null && !open);
    node.classList.toggle('flipped', index > 3);
    if (!row.dec) { bgSyncBits(node, row.guess); return; }
    var dg = node.querySelector('.bg-digits'), calc = node.querySelector('.bg-calc');
    dg.classList.toggle('calculating', open);
    dg.classList.toggle('isProblem', !open);
    dg.textContent = open ? bg.calcVal : (row.guess >= 0 ? row.guess : '?');
    calc.hidden = !open;
  }
  function bgSyncRows(el) {
    var wrap = el.querySelector('.bg-rows'), have = {}, want = {};
    if (bg.wipe) { wrap.innerHTML = ''; bg.wipe = false; }
    bg.rows.forEach(function (r) { want[r.id] = r; });
    Array.prototype.forEach.call(wrap.querySelectorAll('.bg-row'), function (node) {
      var id = +node.dataset.id; have[id] = true;
      if (!want[id] && !node.classList.contains('out')) {
        node.classList.add('out');
        setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 400);
      }
    });
    bg.rows.forEach(function (r) { if (!have[r.id]) wrap.insertAdjacentHTML('beforeend', bgRowHtml(r)); });
    bg.rows.forEach(function (r, i) { var node = wrap.querySelector('.bg-row[data-id="' + r.id + '"]'); if (node) bgSyncRowState(node, r, i); });
    wrap.classList.toggle('paused', bg.mode === 'play' && bg.paused);
    el.querySelector('.bg-problems').classList.toggle('danger', bg.mode === 'play' && !bg.paused && bg.rows.length >= BG_MAX);
    var toast = el.querySelector('.bg-toast');
    toast.textContent = bg.toast;
    toast.classList.toggle('show', !!bg.toast);
  }
  function bgSyncHud(el) {
    var playing = bg.mode === 'play';
    el.querySelector('.bg-score').textContent = fmtN(bg.score);
    el.querySelector('.bg-level').textContent = bg.stage + 1;
    el.querySelector('.bg-left').textContent = bg.mode === 'intro' ? '–' : Math.max(0, bgLinesNeeded(bg.stage) - bg.lines);
    var pause = el.querySelector('.bg-pause'), end = el.querySelector('.bg-end'), snd = el.querySelector('.bg-sound');
    pause.disabled = !playing || bg.paused;
    end.disabled = !(playing || bg.mode === 'intro');
    snd.textContent = bg.muted ? 'Sound on' : 'Sound off';
    snd.setAttribute('aria-pressed', bg.muted ? 'true' : 'false');
    var off = (playing || bg.mode === 'levelup') && bg.stage > BG_GUIDE_STAGE;
    Array.prototype.forEach.call(el.querySelectorAll('.bg-guide'), function (g) { g.classList.toggle('off', off); });
  }
  function bgExample(row) { return '<div class="bg-example" aria-hidden="true">' + bgRowHtml(row) + '</div>'; }
  function bgModalHtml() {
    var t = '', b = '';
    if (bg.mode === 'idle') {
      if (bg.modal === 'help') {
        t = 'Instructions';
        b = '<h2>Welcome to the Binary Game</h2><p>Use your binary math skills to quickly solve as many puzzles as you can!</p><p>Puzzles come in two flavors:</p>' +
          '<button type="button" class="bg-link bg-help-bin">Binary Puzzles</button><button type="button" class="bg-link bg-help-dec">Decimal Puzzles</button>' +
          '<button type="button" class="bg-btn bg-help-back">Back to Menu</button>';
      } else if (bg.modal === 'help-binary') {
        t = 'Instructions';
        b = '<h2>Binary Puzzles</h2><p>This is what a binary puzzle looks like</p>' + bgExample({ id: 'x1', answer: 37, guess: 12, dec: false }) +
          '<p>To solve binary puzzles, toggle the bits on the left to equal the number on the right.</p><button type="button" class="bg-btn bg-help-menu">Back</button>';
      } else if (bg.modal === 'help-decimal') {
        t = 'Instructions';
        b = '<h2>Decimal Puzzles</h2><p>This is what a decimal puzzle looks like</p>' + bgExample({ id: 'x2', answer: 37, guess: -1, dec: true }) +
          '<p>To solve decimal puzzles, click the question mark and use the number pad to input the decimal number that equals the binary number on the left.</p><button type="button" class="bg-btn bg-help-menu">Back</button>';
      } else {
        t = 'Binary Game';
        b = '<button type="button" class="bg-btn bg-play">Play Game</button><button type="button" class="bg-btn bg-howto">Instructions</button>' +
          (bg.scores.length ? '<p class="center bg-best">Best so far: ' + fmtN(bg.scores[0].score) + ' (level ' + bg.scores[0].level + ')</p>' : '');
      }
    } else if (bg.mode === 'play' && bg.paused) {
      if (bg.ending) { t = 'End Game'; b = '<p class="center">Are you sure you want to end the game?</p><button type="button" class="bg-btn inline bg-end-yes">Yes</button><button type="button" class="bg-btn inline bg-end-no">No</button>'; }
      else { t = 'Paused'; b = '<button type="button" class="bg-btn bg-resume">Resume</button>'; }
    } else if (bg.mode === 'levelup') {
      t = 'Level ' + (bg.stage + 1) + ' Complete!';
      b = (bg.stage === BG_GUIDE_STAGE ? '<h2 class="bg-warn">Warning</h2><p class="center">Guide numbers are deactivated from now on</p>' : '') +
        '<button type="button" class="bg-btn bg-next">Next Level</button>';
    } else if (bg.mode === 'over') {
      t = 'Game Over';
      var rows = bg.scores.map(function (s, i) {
        return '<tr' + (i === bg.rank ? ' class="me"' : '') + '><td>' + (i + 1) + '.</td><td>' + fmtN(s.score) + '</td><td>' + s.level + '</td></tr>';
      }).join('');
      b = '<div class="bg-final"><div><span>Score</span><b>' + fmtN(bg.score) + '</b></div><div><span>Level</span><b>' + (bg.stage + 1) + '</b></div></div>' +
        (rows ? '<table class="bg-scores"><thead><tr><td>Rank</td><td>Score</td><td>Level</td></tr></thead><tbody>' + rows + '</tbody></table>' : '') +
        '<button type="button" class="bg-btn bg-play">Play Again</button>';
    }
    return t ? '<h1>' + t + '</h1><div class="bg-modal-body">' + b + '</div>' : '';
  }
  function bgSyncModal(el) {
    var wrap = el.querySelector('.bg-modal-wrap'), h = bgModalHtml();
    if (el._bgModal !== h) { wrap.querySelector('.bg-modal').innerHTML = h; el._bgModal = h; }
    wrap.hidden = !h;
    var help = el.querySelector('.bg-help'), n = '';
    if (bg.mode === 'intro') {
      n = '<b>Warm-up: no clock, no score.</b> ' + (bg.intro === 'binary'
        ? lv({ s: 'Click the switches so they add up to the number on the right. The values are on the blue bar above.', m: 'Toggle the bits until they add up to the number on the right. The place values are on the blue bar above.', e: 'Toggle the bits to match the target; the starting pattern is a decoy.' })
        : lv({ s: 'Now the switches are fixed. Add up the ones that are on, click the ? and type the total.', m: 'Now the bits are fixed: add up the place values of the 1s, click the ? and type the total on the number pad.', e: 'Decimal rows: click the ?, type the value of the fixed bits, press Enter.' })) +
        ' <button type="button" class="bg-btn bg-skip">Skip warm-up</button>';
    }
    if (el._bgHelp !== n) { help.innerHTML = n; el._bgHelp = n; }
    help.hidden = !n;
  }
  function bgRefresh(el) {
    el = el || main.querySelector('.bgame');
    if (!el) return;
    bgSyncRows(el); bgSyncHud(el); bgSyncModal(el);
  }

  function wireGame(el) {
    el.addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t || t.disabled) return;
      var inRows = !!t.closest('.bg-rows'), live = (bg.mode === 'play' || bg.mode === 'intro') && !bg.paused;
      if (inRows && t.classList.contains('bg-bit')) {
        if (!live) return;
        var node = t.closest('.bg-row'), row = bgRow(+node.dataset.id);
        if (!row || row.dec || (bg.calcId !== null && bg.calcId !== row.id)) return;
        var bit = 1 << (7 - +t.dataset.i), on = !(row.guess & bit);
        row.guess ^= bit;
        bgSound(on ? 'bit_on' : 'bit_off');
        if (row.guess === row.answer) bgSolve(row); else bgSyncBits(node, row.guess);
      }
      else if (inRows && t.classList.contains('bg-digits')) {
        if (!live) return;
        var r2 = bgRow(+t.closest('.bg-row').dataset.id);
        if (r2 && r2.dec && bg.calcId === null) bgOpenCalc(r2.id);
        else if (r2 && bg.calcId === r2.id) { bgCloseCalc(); bgRefresh(); }
      }
      else if (inRows && t.dataset.k) { if (live) bgCalcKey(t.dataset.k); }
      else if (t.classList.contains('bg-play')) { bgSound('click_button'); bgStart(!bg.introDone); }
      else if (t.classList.contains('bg-howto')) { bgSound('click_button'); bg.modal = 'help'; bgRefresh(); }
      else if (t.classList.contains('bg-help-bin')) { bgSound('click_button'); bg.modal = 'help-binary'; bgRefresh(); }
      else if (t.classList.contains('bg-help-dec')) { bgSound('click_button'); bg.modal = 'help-decimal'; bgRefresh(); }
      else if (t.classList.contains('bg-help-menu')) { bgSound('click_button'); bg.modal = 'help'; bgRefresh(); }
      else if (t.classList.contains('bg-help-back')) { bgSound('click_button'); bg.modal = ''; bgRefresh(); }
      else if (t.classList.contains('bg-skip')) { bgSound('click_button'); bgFinishIntro(); }
      else if (t.classList.contains('bg-pause')) { bgSound('click_button'); bgPause(); }
      else if (t.classList.contains('bg-resume')) { bgSound('click_button'); bgResume(); }
      else if (t.classList.contains('bg-sound')) { bgToggleSound(); bgRefresh(); }
      else if (t.classList.contains('bg-end')) {
        bgSound('click_button');
        if (bg.mode === 'intro') { bgQuit(); return; }
        bg.ending = true; if (bg.paused) bgRefresh(); else bgPause();
      }
      else if (t.classList.contains('bg-end-yes')) { bgSound('click_button'); bgQuit(); }
      else if (t.classList.contains('bg-end-no')) { bgSound('click_button'); bgResume(); }
      else if (t.classList.contains('bg-next')) bgNextLevel();
    });
    bgRefresh(el);
    if (bg.mode === 'play' && !bg.paused && !bg.timer) bgStartClock();
  }

  /* ---------- widget: split one block into equal subnets ---------- */

  function splitHtml(s) {
    function opts(from, to, sel) { var h = []; for (var p = from; p <= to; p++) h.push('<option value="' + p + '"' + (p === sel ? ' selected' : '') + '>/' + p + '</option>'); return h.join(''); }
    return '<div class="split" data-ip="' + esc(s.ip) + '">' +
      '<div class="widget-row">' +
      '<label>Parent network <input class="ip-input mono" type="text" value="' + esc(s.ip) + '" size="15" spellcheck="false" autocomplete="off" aria-label="Parent network address"></label>' +
      '<label>Parent prefix <select class="split-parent">' + opts(8, 30, s.parent) + '</select></label>' +
      '<label>Split into <select class="split-child">' + opts(s.parent, 32, s.child) + '</select></label>' +
      '<span class="widget-err" hidden>That is not a valid IPv4 address.</span></div>' +
      '<p class="split-summary"></p><div class="split-table"></div></div>';
  }

  function wireSplit(el) {
    var ipIn = el.querySelector('.ip-input'), parent = el.querySelector('.split-parent'), child = el.querySelector('.split-child');
    var err = el.querySelector('.widget-err'), summary = el.querySelector('.split-summary'), table = el.querySelector('.split-table');
    function apply() {
      var ip = S.parseIp(ipIn.value), pp = +parent.value, cp = +child.value;
      err.hidden = ip !== null;
      if (ip === null) return;
      if (cp < pp) { cp = pp; child.value = cp; }
      /* keep the child list starting at the parent prefix */
      var keep = cp, h = [];
      for (var p = pp; p <= 32; p++) h.push('<option value="' + p + '"' + (p === keep ? ' selected' : '') + '>/' + p + '</option>');
      child.innerHTML = h.join('');
      var net = S.network(ip, pp);
      if (net !== ip) ipIn.value = S.fmtIp(net);
      var r = S.subnetsOf(net, pp, cp), b = cp - pp;
      summary.innerHTML = '<code>' + S.fmtIp(net) + '/' + pp + '</code> (' + fmtN(S.blockSize(pp)) + ' addresses) split into <b>' + fmtN(r.total) + '</b> subnet' + (r.total === 1 ? '' : 's') +
        ' of <code>/' + cp + '</code>, ' + fmtN(S.blockSize(cp)) + ' addresses each' + (b ? ': ' + b + ' bit' + (b === 1 ? '' : 's') + ' borrowed, 2<sup>' + b + '</sup> = ' + fmtN(r.total) : '') +
        '. Mask <code>' + S.fmtIp(S.maskOf(cp)) + '</code>, step ' + fmtN(S.blockSize(cp)) + '.' +
        (r.shown < r.total ? ' <span class="dim">Showing the first ' + r.shown + '.</span>' : '');
      var t = ['<div class="table-wrap"><table class="lab hosts split-rows"><tr><th>#</th><th>Network</th><th>First host</th><th>Last host</th><th>Broadcast</th><th>Usable</th></tr>'];
      r.subnets.forEach(function (d, i) {
        t.push('<tr><td>' + (i + 1) + '</td><td>' + S.fmtIp(d.network) + '/' + cp + '</td><td>' + S.fmtIp(d.first) + '</td><td>' + S.fmtIp(d.last) + '</td><td>' + (cp >= 31 ? '—' : S.fmtIp(d.broadcast)) + '</td><td>' + fmtN(d.usable) + '</td></tr>');
      });
      t.push('</table></div>');
      table.innerHTML = t.join('');
    }
    ipIn.addEventListener('change', apply);
    parent.addEventListener('change', apply);
    child.addEventListener('change', apply);
    apply();
  }

  /* ---------- widget: which kind of address is this? ---------- */

  var KIND_TEXT = {
    'public': { cls: '', s: 'A <b>public</b> address. Somebody on the internet owns it and the whole world can reach it.', m: 'A <b>public</b>, globally routable address, allocated through IANA and a regional registry to some organisation. Reachable from anywhere on the internet.', e: 'Global unicast. Allocated via IANA → RIR → LIR; routable and expected in the DFZ. Look it up with <code>whois</code> or an RIR database.' },
    'private': { cls: 'ok', s: 'A <b>private</b> address (RFC 1918). Fine indoors, never seen on the internet. Millions of networks use this same address.', m: 'A <b>private</b> address (RFC 1918). Usable in any internal network without registration; dropped at internet borders, so it reaches the internet only through NAT.', e: 'RFC 1918 private-use space. Non-unique, bogon-filtered at borders, reaches the internet via NAPT. Overlaps are the classic VPN and merger headache.' },
    'miracast': { cls: 'ok', s: 'A <b>private</b> address, and the one Miracast screens and Wi-Fi Direct printers use for their own tiny network. 192.168.49.1 is usually the screen itself.', m: 'A <b>private</b> address (RFC 1918) in the /24 that Wi-Fi Direct group owners use by convention. A Miracast display or dongle takes 192.168.49.1 and hands out the rest to whoever connects.', e: 'RFC 1918 space, by Wi-Fi Alliance P2P convention the Group Owner subnet: GO at .1 running DHCP; Miracast (Wi-Fi Display) RTSP/RTP rides over it. Separate interface from the infrastructure WLAN.' },
    'cgnat': { cls: 'warn', s: 'A <b>shared</b> address that internet companies use between their equipment and your router. It is not yours and not public.', m: '<b>Carrier-grade NAT shared space</b> (RFC 6598). Used between an ISP\'s NAT and customer routers. If this is your router\'s WAN address, you have no public IPv4 of your own.', e: 'RFC 6598 shared address space, 100.64/10. Valid only inside one ISP\'s CGN domain; must not be treated as RFC 1918 or announced globally.' },
    'loopback': { cls: 'warn', s: '<b>Loopback</b>: this computer talking to itself. It never goes out onto the network.', m: '<b>Loopback</b> (127.0.0.0/8). Delivered inside the host by the IP stack; never appears on a network card. <code>ping 127.0.0.1</code> tests the stack, not the network.', e: 'Loopback, RFC 1122 §3.2.1.3. The whole /8 terminates on the host; packets with a 127/8 destination arriving on a wire are discarded.' },
    'apipa': { cls: 'warn', s: '<b>APIPA</b>: the machine asked for an address and nobody answered, so it made one up. Something is wrong: cable, Wi-Fi, or the DHCP server.', m: '<b>Link-local / APIPA</b> (169.254.0.0/16, RFC 3927). Self-assigned when DHCP gets no reply. Works only on the local link, with no gateway. The classic sign of a broken DHCP path.', e: 'IPv4 link-local, RFC 3927. Pseudo-random from 169.254.1.0 to 169.254.254.255, ARP-probed, no default route, not forwardable. Diagnosis: DHCP unreachable (link, VLAN, relay, or server).' },
    'multicast': { cls: 'warn', s: '<b>Multicast</b>: not one machine but a group. Devices use these to find each other.', m: '<b>Multicast</b> (224.0.0.0/4). A group address: one packet is delivered to every host that joined. 224.0.0.x stays on the local link; 239.x.x.x is site-local.', e: 'Class D multicast, RFC 5771. 224.0.0/24 link-local control (never forwarded), 232/8 SSM, 239/8 administratively scoped. Delivery via IGMP snooping on switches and PIM between routers.' },
    'broadcast': { cls: 'warn', s: '<b>Broadcast</b>: everyone on this network. This is how a new machine shouts "is there a DHCP server?"', m: '<b>Limited broadcast</b>. Reaches every host on the local link; routers never forward it. Used by DHCP Discover and anything else that has no address to ask.', e: 'Limited broadcast, RFC 919/922. Link-scoped, never forwarded. Distinct from a subnet\'s directed broadcast (host bits all one), which RFC 2644 says routers should not forward by default either.' },
    'any': { cls: 'warn', s: '<b>No address at all</b>, or "any address": what a machine uses before it has one, and what a program listens on to accept anyone.', m: '<b>Unspecified / any</b>. As a source it means "I have no address yet" (DHCP Discover). In a server it means "listen on every interface". As 0.0.0.0/0 it is the default route.', e: '0.0.0.0/32: unspecified source (RFC 1122), INADDR_ANY in bind(), and the default route as 0.0.0.0/0. Never a valid destination.' },
    'this-net': { cls: 'warn', s: 'A special address meaning "this network". Machines only use it while they are starting up.', m: '<b>"This network"</b> (0.0.0.0/8). Only valid as a source address during start-up; never a destination.', e: 'RFC 1122 §3.2.1.3, 0.0.0.0/8: "this host on this network". Source-only, not forwardable.' },
    'doc': { cls: 'warn', s: 'An <b>example</b> address, reserved for books and manuals so that examples never hit a real computer.', m: '<b>Documentation</b> space (RFC 5737: TEST-NET-1, -2, -3). Reserved for examples; should never appear on a live network.', e: 'RFC 5737 documentation prefix. Not routable, filter at borders. Use in docs instead of someone\'s real space.' },
    'benchmark': { cls: 'warn', s: 'Reserved for <b>testing equipment</b> in a lab. It should never appear on a real network.', m: '<b>Benchmark testing</b> (198.18.0.0/15, RFC 2544). For measuring network devices in a lab; never on production networks.', e: 'RFC 2544 benchmarking space. Lab only; must not be announced or routed outside the test bed.' },
    'reserved': { cls: 'warn', s: '<b>Reserved</b>: set aside and never handed out. Most computers refuse to use it.', m: '<b>Reserved</b>. Never allocated to anyone; most operating systems will not accept it as an address.', e: 'IANA special-purpose reserved (Class E 240/4 or 192.0.0.0/24 protocol assignments). Rejected by most stacks; see RFC 6890.' }
  };

  function classifyHtml(c) {
    return '<div class="classify">' +
      '<div class="widget-row"><label>Address <input class="ip-input mono" type="text" placeholder="e.g. 172.20.1.9" size="15" spellcheck="false" autocomplete="off" aria-label="IPv4 address to classify"></label>' +
      '<button type="button" class="btn classify-go">Check</button></div>' +
      '<div class="presets">' + (c.presets || []).map(function (p) { return '<button type="button" class="fold-btn preset" data-ip="' + esc(p) + '">' + esc(p) + '</button>'; }).join('') + '</div>' +
      '<div class="classify-out" aria-live="polite"></div></div>';
  }

  function classifyResult(ip) {
    var k = S.classify(ip), t = KIND_TEXT[k.kind] || KIND_TEXT.reserved;
    var h = ['<div class="banner ' + t.cls + '"><div class="cls-head"><span class="mono">' + S.fmtIp(ip) + '</span> <span class="tag' + (k.routable ? '' : ' off') + '">' + esc(k.name) + '</span></div>'];
    h.push('<p>' + lv({ s: t.s, m: t.m, e: t.e }) + '</p>');
    var facts = [];
    if (k.cidr) facts.push('Range <code>' + k.cidr + '</code>');
    facts.push(k.rfc ? esc(k.rfc) : '');
    if (LEVEL !== 's') facts.push('Classful letter: ' + S.classOf(ip));
    facts.push(k.routable ? 'Routable on the internet' : 'Not routable on the internet');
    h.push('<p class="cls-facts">' + facts.filter(Boolean).join(' · ') + '</p></div>');
    return h.join('');
  }

  function wireClassify(el) {
    var input = el.querySelector('.ip-input'), out = el.querySelector('.classify-out');
    function run(v) {
      var ip = S.parseIp(v);
      if (ip === null) { out.innerHTML = v.trim() ? '<div class="banner warn">That is not a valid IPv4 address: four numbers from 0 to 255, separated by dots.</div>' : ''; return; }
      out.innerHTML = classifyResult(ip);
    }
    el.querySelector('.classify-go').addEventListener('click', function () { run(input.value); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(input.value); });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('.preset');
      if (!b) return;
      input.value = b.dataset.ip;
      run(b.dataset.ip);
    });
  }

  /* ---------- widget: the practice quiz ---------- */

  var QUIZ_KINDS = [
    { id: 'size', label: 'Total addresses' },
    { id: 'usable', label: 'Usable hosts' },
    { id: 'netbc', label: 'Network and broadcast' },
    { id: 'range', label: 'First, last and mask' },
    { id: 'mixed', label: 'Mixed' }
  ];
  var QUIZ_LEVELS = [
    { id: 'easy', label: 'Easy' }, { id: 'medium', label: 'Medium' }, { id: 'hard', label: 'Hard' }
  ];
  var quizState = { kind: 'size', difficulty: 'easy', q: null, answered: false, correct: 0, total: 0 };
  try {
    var saved = JSON.parse(sessionStorage.getItem('ipv4-quiz-score') || 'null');
    if (saved && typeof saved.correct === 'number') { quizState.correct = saved.correct; quizState.total = saved.total; }
  } catch (e) { /* no storage: score lasts while the page is open */ }

  function saveScore() {
    try { sessionStorage.setItem('ipv4-quiz-score', JSON.stringify({ correct: quizState.correct, total: quizState.total })); } catch (e) { /* ignore */ }
  }

  function quizHtml(q) {
    var kinds = q.kinds ? QUIZ_KINDS.filter(function (k) { return k.id === 'mixed' || q.kinds.indexOf(k.id) >= 0; }) : QUIZ_KINDS;
    return '<div class="quiz">' +
      '<div class="quiz-bar"><div class="quiz-chips" role="group" aria-label="Question type">' + kinds.map(function (k) { return '<button type="button" class="chip" data-kind="' + k.id + '" aria-pressed="' + (k.id === quizState.kind) + '">' + k.label + '</button>'; }).join('') + '</div>' +
      '<div class="quiz-chips" role="group" aria-label="Difficulty">' + QUIZ_LEVELS.map(function (l) { return '<button type="button" class="chip diff" data-diff="' + l.id + '" aria-pressed="' + (l.id === quizState.difficulty) + '">' + l.label + '</button>'; }).join('') + '</div></div>' +
      '<div class="quiz-card"></div>' +
      '<div class="quiz-foot"><span class="quiz-score"></span><button type="button" class="btn ghost quiz-reset" title="Reset the score">Reset score</button></div></div>';
  }

  function questionPrompt(q) {
    var c = '<code class="q-cidr">' + q.cidr + '</code>';
    switch (q.kind) {
      case 'size': return lv({ s: 'How many addresses are in ' + c + '?', m: 'How many addresses (including network and broadcast) are in the block ' + c + '?', e: 'Block size of ' + c + '?' });
      case 'usable': return lv({ s: 'How many machines can have an address in ' + c + '?', m: 'How many usable host addresses does ' + c + ' have?', e: 'Assignable host addresses in ' + c + '?' });
      case 'netbc': return lv({ s: 'The machine ' + c + ' is on a network. What is the network\'s address, and what is its broadcast address?', m: 'For the host ' + c + ', what are the network address and the broadcast address?', e: 'Network and directed broadcast for ' + c + '?' });
      default: return lv({ s: 'For ' + c + ', what is the first address a machine can use, the last one, and the mask written the long way?', m: 'For ' + c + ', give the first usable host, the last usable host, and the subnet mask in dotted form.', e: 'First host, last host and dotted mask for ' + c + '?' });
    }
  }

  function worked(q) {
    var d = q.info, p = d.prefix, hb = d.hostBits, size = fmtN(d.size), mask = S.fmtIp(d.mask);
    var lastOct = d.ip & 255, maskOct = d.mask & 255;
    var interesting = S.octetRoles(p).indexOf('mixed'), step, octVal, octName;
    if (interesting >= 0) {
      octVal = (d.ip >>> (24 - interesting * 8)) & 255;
      step = 256 - ((d.mask >>> (24 - interesting * 8)) & 255);
      octName = ['first', 'second', 'third', 'fourth'][interesting];
    }
    var lines = [];
    var sizeLine = lv({
      s: '32 − ' + p + ' = <b>' + hb + '</b> host switches. Double 1 that many times: 2<sup>' + hb + '</sup> = <b>' + size + '</b> addresses.',
      m: 'Host bits: 32 − ' + p + ' = ' + hb + '. Addresses: 2<sup>' + hb + '</sup> = <b>' + size + '</b>. Mask: <code>' + mask + '</code>.',
      e: 'h = 32 − ' + p + ' = ' + hb + '; 2<sup>' + hb + '</sup> = <b>' + size + '</b>. Mask <code>' + mask + '</code>, wildcard <code>' + S.fmtIp(d.wildcard) + '</code>.'
    });
    var usableLine = p >= 31
      ? lv({ s: '/' + p + ' is one of the two odd ones: ' + (p === 32 ? 'a single machine, so 1 usable.' : 'a two-router link, so both addresses are usable: 2.'), m: '/' + p + ' is special: ' + (p === 32 ? 'a single host route, 1 usable address.' : 'a point-to-point link (RFC 3021), both addresses usable: 2.'), e: p === 32 ? '/32 host route: usable = 1.' : '/31, RFC 3021: no network/broadcast, usable = 2.' })
      : lv({ s: 'Take away 2 (the network\'s own name and the broadcast): <b>' + fmtN(d.usable) + '</b> usable.', m: 'Usable: ' + size + ' − 2 = <b>' + fmtN(d.usable) + '</b> (minus network and broadcast).', e: 'Usable = 2<sup>' + hb + '</sup> − 2 = <b>' + fmtN(d.usable) + '</b>.' });
    var netLine;
    if (p === 32) netLine = lv({ s: 'With /32 the network is just this one address.', m: '/32: network = broadcast = the address itself, <code>' + S.fmtIp(d.network) + '</code>.', e: '/32: net = bcast = <code>' + S.fmtIp(d.network) + '</code>.' });
    else if (interesting >= 0) netLine = lv({
      s: 'The line falls in the ' + octName + ' number. Blocks there are ' + step + ' apart (256 − ' + (256 - step) + '). ' + octVal + ' rounds down to ' + (Math.floor(octVal / step) * step) + ', so the network is <b>' + S.fmtIp(d.network) + '</b> and it ends at <b>' + S.fmtIp(d.broadcast) + '</b>.',
      m: 'Interesting octet: the ' + octName + ' (mask ' + (256 - step) + '). Block size 256 − ' + (256 - step) + ' = ' + step + '. ' + octVal + ' falls in the block starting at ' + (Math.floor(octVal / step) * step) + '. Network <b>' + S.fmtIp(d.network) + '</b>, broadcast <b>' + S.fmtIp(d.broadcast) + '</b>' + (p < 31 ? ', hosts ' + S.fmtIp(d.first) + ' to ' + S.fmtIp(d.last) : '') + '.',
      e: 'Octet ' + (interesting + 1) + ': ' + octVal + ' = ' + S.octetBits(d.ip)[interesting] + ' AND ' + S.octetBits(d.mask)[interesting] + ' = ' + (Math.floor(octVal / step) * step) + '. net <b>' + S.fmtIp(d.network) + '</b>, bcast <b>' + S.fmtIp(d.broadcast) + '</b>' + (p < 31 ? ', hosts ' + S.fmtIp(d.first) + '–' + S.fmtIp(d.last) : '') + '.'
    });
    else netLine = lv({
      s: 'The line falls exactly on a dot, so the network is the address with the host numbers set to 0: <b>' + S.fmtIp(d.network) + '</b>. The broadcast has them all at 255: <b>' + S.fmtIp(d.broadcast) + '</b>.',
      m: 'The prefix ends on an octet boundary. Network: host octets to 0, <b>' + S.fmtIp(d.network) + '</b>. Broadcast: host octets to 255, <b>' + S.fmtIp(d.broadcast) + '</b>. Hosts ' + S.fmtIp(d.first) + ' to ' + S.fmtIp(d.last) + '.',
      e: 'Octet-aligned prefix. net <b>' + S.fmtIp(d.network) + '</b>, bcast <b>' + S.fmtIp(d.broadcast) + '</b>, hosts ' + S.fmtIp(d.first) + '–' + S.fmtIp(d.last) + '.'
    });
    lines.push(sizeLine);
    if (q.kind === 'usable' || q.kind === 'range') lines.push(usableLine);
    if (q.kind === 'netbc' || q.kind === 'range') lines.push(netLine);
    void lastOct; void maskOct;
    return lines.map(function (l) { return '<p>' + l + '</p>'; }).join('');
  }

  function renderQuestion(el) {
    var card = el.querySelector('.quiz-card'), q = quizState.q;
    var h = ['<p class="q-prompt">' + questionPrompt(q) + '</p><form class="q-form">'];
    q.fields.forEach(function (f, i) {
      h.push('<label class="q-field"><span>' + esc(f.label) + '</span><input class="quiz-input mono" type="text" inputmode="' + (f.type === 'number' ? 'numeric' : 'decimal') + '" data-i="' + i + '" autocomplete="off" spellcheck="false" placeholder="' + (f.type === 'number' ? 'number' : 'a.b.c.d') + '"' + (quizState.answered ? ' disabled' : '') + '></label>');
    });
    h.push('<div class="q-actions"><button type="submit" class="btn q-check"' + (quizState.answered ? ' disabled' : '') + '>Check</button>' +
      '<button type="button" class="btn ghost q-how" aria-expanded="false">Show me how</button>' +
      '<button type="button" class="btn ghost q-next">Next question</button></div></form>' +
      '<div class="q-feedback" aria-live="polite"></div><div class="q-how-box" hidden></div>');
    card.innerHTML = h.join('');
    var first = card.querySelector('.quiz-input');
    if (first && !quizState.answered) first.focus({ preventScroll: true });
    el.querySelector('.quiz-score').innerHTML = quizState.total ? 'Correct <b>' + quizState.correct + '</b> of ' + quizState.total : 'No answers yet';
  }

  function newQuestion(el) {
    quizState.q = S.randomQuestion(quizState.kind, quizState.difficulty);
    quizState.answered = false;
    renderQuestion(el);
  }

  function wireQuiz(el) {
    if (!quizState.q) quizState.q = S.randomQuestion(quizState.kind, quizState.difficulty);
    renderQuestion(el);
    el.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (chip) {
        if (chip.dataset.kind) quizState.kind = chip.dataset.kind; else quizState.difficulty = chip.dataset.diff;
        Array.prototype.forEach.call(el.querySelectorAll('.chip'), function (c) {
          if (c.dataset.kind) c.setAttribute('aria-pressed', c.dataset.kind === quizState.kind);
          else c.setAttribute('aria-pressed', c.dataset.diff === quizState.difficulty);
        });
        newQuestion(el);
        return;
      }
      if (e.target.closest('.q-next')) { newQuestion(el); return; }
      if (e.target.closest('.quiz-reset')) { quizState.correct = 0; quizState.total = 0; saveScore(); el.querySelector('.quiz-score').textContent = 'No answers yet'; return; }
      var how = e.target.closest('.q-how');
      if (how) {
        var box = el.querySelector('.q-how-box'), q = quizState.q;
        box.hidden = !box.hidden;
        how.setAttribute('aria-expanded', String(!box.hidden));
        if (!box.hidden) box.innerHTML = '<p class="hint">' + q.cidr + ' as bits. Blue bits are fixed by the /' + q.prefix + '; the pink ones are free to count through the block. Mask <code>' + S.fmtIp(q.info.mask) + '</code>.</p>' + bitStripHtml(q.ip, q.prefix) + '<div class="how-tiles">' + tiles(q.info) + '</div>';
      }
    });
    el.addEventListener('submit', function (e) {
      e.preventDefault();
      if (quizState.answered) return;
      var q = quizState.q, inputs = el.querySelectorAll('.quiz-input'), allOk = true, anyText = false, rows = [];
      Array.prototype.forEach.call(inputs, function (inp) {
        var f = q.fields[+inp.dataset.i], ok = S.checkAnswer(f, inp.value);
        if (inp.value.trim()) anyText = true;
        inp.classList.toggle('ok', ok);
        inp.classList.toggle('bad', !ok);
        if (!ok) allOk = false;
        rows.push('<tr><th>' + esc(f.label) + '</th><td class="' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓ ' : '✗ ') + esc(inp.value.trim() || '(blank)') + '</td><td>' + (ok ? '' : 'answer: <b>' + esc(f.type === 'number' ? fmtN(f.answer) : f.answer) + '</b>') + '</td></tr>');
      });
      if (!anyText) { el.querySelector('.q-feedback').innerHTML = '<div class="banner warn">Type an answer first.</div>'; return; }
      quizState.answered = true;
      quizState.total++;
      if (allOk) quizState.correct++;
      saveScore();
      Array.prototype.forEach.call(inputs, function (inp) { inp.disabled = true; });
      el.querySelector('.q-check').disabled = true;
      el.querySelector('.quiz-score').innerHTML = 'Correct <b>' + quizState.correct + '</b> of ' + quizState.total;
      el.querySelector('.q-feedback').innerHTML =
        '<div class="banner ' + (allOk ? 'ok' : 'warn') + '"><p class="q-verdict"><b>' + (allOk ? 'Correct.' : 'Not quite.') + '</b></p>' +
        (q.fields.length > 1 || !allOk ? '<table class="kv q-table">' + rows.join('') + '</table>' : '') +
        '<div class="q-worked">' + worked(q) + '</div></div>';
      el.querySelector('.q-next').focus({ preventScroll: true });
    });
    el.addEventListener('keydown', function (e) {
      /* Enter in a (now disabled) answer box after answering moves on; buttons handle their own Enter. */
      if (e.key === 'Enter' && quizState.answered && !e.target.closest('button')) { e.preventDefault(); newQuestion(el); }
    });
  }

  /* ---------- welcome page ---------- */

  function renderWelcome() {
    var ref = [16, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32].map(function (p) {
      var d = S.describe(0, p);
      return '<tr><td>/' + p + '</td><td>' + S.fmtIp(d.mask) + '</td><td>' + d.hostBits + '</td><td>' + fmtN(d.size) + '</td><td>' + fmtN(d.usable) + '</td></tr>';
    }).join('');
    content.innerHTML =
      '<article class="welcome">' +
      '<h1>' + esc(SITE.title) + '</h1>' +
      '<p class="lead">' + lv({
        s: 'An IP address is 32 switches. Subnetting is deciding where to draw a line through them: the switches on the left name the network, the ones on the right name a machine. Everything on this site is that one idea.',
        m: 'An IPv4 address is 32 bits split by a mask into a network part and a host part. Subnetting is choosing where that split falls, which decides how many addresses a network has and where it starts and ends. Every row here is that idea from a different angle.',
        e: 'IPv4 subnetting is prefix arithmetic on a 32-bit integer: the prefix length fixes the network bits, the remainder enumerates 2<sup>32−p</sup> addresses. This site makes the arithmetic visible and drills it.'
      }) + '</p>' +
      '<h2>How to use this page</h2>' +
      '<ol>' +
      '<li><b>Bits and octets.</b> Why 192.168.1.10 is really 32 ones and zeros, and the powers of two that everything else depends on.</li>' +
      '<li><b>The binary game.</b> A clone of Cisco\'s Binary Game: octets to bits and back against the clock, with the original\'s levels, scoring and sounds.</li>' +
      '<li><b>Mask and CIDR.</b> The line through the address: <code>255.255.255.0</code> and <code>/24</code> are the same thing, and why "usable" is two less.</li>' +
      '<li><b>The CIDR slider.</b> Drag from /16 to /32 and watch the block halve and double: /23 = 512, /24 = 256, /25 = 128.</li>' +
      '<li><b>Splitting a network.</b> One /24 into two /25s, four /26s or sixty-four /30s, with every resulting range listed.</li>' +
      '<li><b>Private vs public.</b> The three RFC 1918 ranges, why every home is 192.168.x.x, and what NAT does at the door.</li>' +
      '<li><b>Special addresses.</b> Loopback, APIPA, multicast, SSDP, Miracast, broadcast, 0.0.0.0 and the documentation ranges: what each means when you see it.</li>' +
      '<li><b>Try it yourself.</b> Random questions like "how many addresses are in 192.168.1.0/28?", checked as you go, with the working shown.</li>' +
      '</ol>' +
      '<p class="hint"><b>Reading level.</b> The <b>Simple</b>, <b>Moderate</b> and <b>Engineer</b> buttons at the top right change how deep every explanation goes. Simple is the big idea in plain words, Moderate is CCNA-student depth, Engineer is the full technical detail kept short. Your choice is remembered on this browser, and a link with <code>?level=simple</code> (or moderate, engineer) opens the site at that level.</p>' +
      '<p>Every widget on this site is live: type a different address into any of them and every number is recomputed on the spot. Nothing is looked up in a table.</p>' +
      '<h2>Quick reference</h2>' +
      '<div class="table-wrap"><table class="lab hosts"><tr><th>Prefix</th><th>Mask</th><th>Host bits</th><th>Addresses</th><th>Usable hosts</th></tr>' + ref + '</table></div>' +
      '<p class="hint">Generated from the same arithmetic the widgets use (<code>subnet.js</code>). /31 and /32 follow RFC 3021 and host-route rules: no addresses lost to network and broadcast.</p>' +
      '<h2>Run it on your own machine</h2>' +
      '<p class="hint">The site is plain HTML, CSS and JavaScript with no server-side code; open <code>site/index.html</code> straight from disk, or run the Docker image:</p>' +
      '<pre class="cmd">docker run --rm -it --name ipv4 -p ' + SITE.port + ':' + SITE.port + ' ' + esc(SITE.image) + '</pre>' +
      '<p class="hint">Then open <a href="http://127.0.0.1:' + SITE.port + '/">http://127.0.0.1:' + SITE.port + '/</a>. The container runs in the foreground; press Ctrl+C to stop it, and it removes itself.</p>' +
      '</article>';
  }

  /* ---------- lesson sections ---------- */

  function columnsHtml(cols) {
    return '<div class="cols">' + cols.map(function (c) {
      var after = lv(c.after);
      return '<div class="col"><h3>' + esc(c.h) + '</h3>' + paras(c.p).map(function (p) { return '<p>' + p + '</p>'; }).join('') +
        (c.cmd ? '<pre class="cmd">' + esc(c.cmd) + '</pre>' : '') + (after ? '<p>' + after + '</p>' : '') + '</div>';
    }).join('') + '</div>';
  }

  function tableHtml(table, cls) {
    var rows = pickLevel(table);
    if (!rows || !rows.length) return '';
    var h = ['<div class="table-wrap"><table class="lab ' + (cls || 'compare') + '">'];
    rows.forEach(function (row, i) {
      h.push('<tr>' + lv(row).map(function (c, j) { return (i === 0 || j === 0 ? '<th>' : '<td>') + c + (i === 0 || j === 0 ? '</th>' : '</td>'); }).join('') + '</tr>');
    });
    h.push('</table></div>');
    return h.join('');
  }

  function sectionHtml(s) {
    var h = ['<section>' + (s.h ? '<h2>' + esc(s.h) + '</h2>' : '')];
    paras(s.p).forEach(function (p) { h.push('<p>' + p + '</p>'); });
    if (s.binary) h.push(binaryHtml(s.binary));
    if (s.anatomy) h.push(anatomyHtml(s.anatomy));
    if (s.cidr) h.push(cidrHtml(s.cidr));
    if (s.pow2) h.push(pow2Html(s.pow2));
    if (s.bgame) h.push(bgameHtml(s.bgame));
    if (s.split) h.push(splitHtml(s.split));
    if (s.classify) h.push(classifyHtml(s.classify));
    if (s.quiz) h.push(quizHtml(s.quiz));
    if (s.exam) h.push(examHtml(s.exam));
    if (s.steps) { h.push('<ol class="steps">'); paras(s.steps).forEach(function (t) { h.push('<li>' + t + '</li>'); }); h.push('</ol>'); }
    if (s.columns) h.push(columnsHtml(s.columns));
    if (s.table) h.push(tableHtml(s.table, s.tableClass));
    paras(s.after).forEach(function (p) { h.push('<p>' + p + '</p>'); });
    h.push('</section>');
    return h.join('');
  }

  /* ---------- widget: CCNA-style exam questions ---------- */

  var examState = { topic: 'mixed', q: null, answered: false, correct: 0, total: 0, streak: 0 };
  try { var savedEx = JSON.parse(sessionStorage.getItem('ipv4-exam-score') || 'null'); if (savedEx && typeof savedEx.correct === 'number') { examState.correct = savedEx.correct; examState.total = savedEx.total; examState.streak = savedEx.streak || 0; } } catch (e) { /* no storage */ }
  function saveExam() { try { sessionStorage.setItem('ipv4-exam-score', JSON.stringify({ correct: examState.correct, total: examState.total, streak: examState.streak })); } catch (e) { /* ignore */ } }

  function examHtml() {
    return '<div class="exam quiz">' +
      '<div class="quiz-bar"><div class="quiz-chips" role="group" aria-label="Topic">' + EXAM.TOPICS.map(function (t) { return '<button type="button" class="chip" data-topic="' + t.id + '" aria-pressed="' + (t.id === examState.topic) + '">' + t.label + '</button>'; }).join('') + '</div></div>' +
      '<div class="quiz-card"></div>' +
      '<div class="quiz-foot"><span class="quiz-score"></span><button type="button" class="btn ghost quiz-reset" title="Reset the score">Reset score</button></div></div>';
  }

  function examScore(el) {
    el.querySelector('.quiz-score').innerHTML = examState.total ? 'Correct <b>' + examState.correct + '</b> of ' + examState.total + (examState.streak >= 3 ? ' · streak ' + examState.streak : '') : 'No answers yet';
  }

  function renderExam(el) {
    var q = examState.q, card = el.querySelector('.quiz-card'), letters = 'ABCD';
    var h = ['<p class="q-prompt ex-stem">' + q.stem + '</p>'];
    if (q.exhibit) h.push('<div class="exhibit">' + q.exhibit + '</div>');
    h.push('<form class="q-form ex-form"><div class="ex-choices" role="radiogroup" aria-label="Answers">');
    q.choices.forEach(function (c, i) {
      h.push('<label class="ex-choice"><input type="radio" name="ex" value="' + i + '"' + (examState.answered ? ' disabled' : '') + '><span class="ex-letter">' + letters[i] + '</span><span class="ex-text">' + c.text + '</span></label>');
    });
    h.push('</div><div class="q-actions"><button type="submit" class="btn q-check"' + (examState.answered ? ' disabled' : '') + '>Check</button><button type="button" class="btn ghost q-next">Next question</button></div></form><div class="q-feedback" aria-live="polite"></div>');
    card.innerHTML = h.join('');
    examScore(el);
  }

  function newExam(el) { examState.q = EXAM.question(examState.topic); examState.answered = false; renderExam(el); }

  function wireExam(el) {
    if (!examState.q) examState.q = EXAM.question(examState.topic);
    renderExam(el);
    el.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (chip) { examState.topic = chip.dataset.topic; Array.prototype.forEach.call(el.querySelectorAll('.chip'), function (c) { c.setAttribute('aria-pressed', c.dataset.topic === examState.topic); }); newExam(el); return; }
      if (e.target.closest('.q-next')) { newExam(el); return; }
      if (e.target.closest('.quiz-reset')) { examState.correct = 0; examState.total = 0; examState.streak = 0; saveExam(); examScore(el); }
    });
    el.addEventListener('submit', function (e) {
      e.preventDefault();
      if (examState.answered) return;
      var picked = el.querySelector('input[name="ex"]:checked');
      if (!picked) { el.querySelector('.q-feedback').innerHTML = '<div class="banner warn">Choose an answer first.</div>'; return; }
      var q = examState.q, i = +picked.value, ok = !!q.choices[i].correct, letters = 'ABCD', right = 0;
      q.choices.forEach(function (c, j) { if (c.correct) right = j; });
      examState.answered = true; examState.total++; if (ok) { examState.correct++; examState.streak++; } else examState.streak = 0; saveExam();
      Array.prototype.forEach.call(el.querySelectorAll('input[name="ex"]'), function (inp) { inp.disabled = true; });
      Array.prototype.forEach.call(el.querySelectorAll('.ex-choice'), function (lab, j) { lab.classList.toggle('right', j === right); lab.classList.toggle('wrong', j === i && !ok); });
      el.querySelector('.q-check').disabled = true;
      examScore(el);
      el.querySelector('.q-feedback').innerHTML = '<div class="banner ' + (ok ? 'ok' : 'warn') + '"><p class="q-verdict"><b>' + (ok ? 'Correct.' : 'Not quite. The answer is ' + letters[right] + '.') + '</b></p><div class="q-worked"><p>' + q.explain + '</p></div></div>';
      el.querySelector('.q-next').focus({ preventScroll: true });
    });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' && examState.answered && !e.target.closest('button')) { e.preventDefault(); newExam(el); } });
  }

  /* ---------- check your understanding: three fresh questions under every row ---------- */

  var checkMemory = {};   /* row id -> { qs, answers, graded }, so a level change keeps the same questions */

  function checkHtml(rowId) {
    var st = checkMemory[rowId];
    if (!st) { st = checkMemory[rowId] = { qs: CHECKS.questions(rowId), answers: ['', '', ''], graded: false }; }
    if (!st.qs) return '';
    var h = ['<section class="check-sec"><h2>Check your understanding' + (doneRows[rowId] ? ' <span class="done-badge">✓ Completed</span>' : '') + '</h2>' +
      '<p class="hint">' + lv({ s: 'Three quick questions on this row. Type each answer and press Check. New numbers every time.', m: 'Three questions on this row, with fresh numbers each time. Type your answers and press Check; the working is shown for any you miss.', e: 'Three generated questions on this row. Answers are lenient about spacing and thousands separators.' }) + '</p>' +
      '<div class="check" data-row="' + esc(rowId) + '"><ol>'];
    st.qs.forEach(function (q, i) {
      h.push('<li><p class="cq">' + q.prompt + '</p><div class="ca"><input class="quiz-input" type="text" data-i="' + i + '" autocomplete="off" spellcheck="false" value="' + esc(st.answers[i]) + '" placeholder="' + (q.type === 'ip' ? 'a.b.c.d' : q.type === 'number' ? 'number' : q.type === 'bits' ? '8 bits' : 'one word') + '" aria-label="Answer ' + (i + 1) + '"></div><p class="cf" hidden></p></li>');
    });
    h.push('</ol><div class="check-foot"><span class="check-result"></span><div class="check-actions">' +
      '<button type="button" class="btn check-go">Check</button><button type="button" class="btn ghost check-new">New questions</button></div></div></div></section>');
    return h.join('');
  }

  function wireCheck(el) {
    var rowId = el.dataset.row, st = checkMemory[rowId];
    var inputs = el.querySelectorAll('.quiz-input'), fbs = el.querySelectorAll('.cf'), result = el.querySelector('.check-result');
    function grade() {
      var right = 0, any = false;
      Array.prototype.forEach.call(inputs, function (inp, i) {
        var q = st.qs[i], v = inp.value; st.answers[i] = v;
        if (v.trim()) any = true;
        var ok = CHECKS.grade(q, v);
        if (ok) right++;
        inp.classList.toggle('ok', ok); inp.classList.toggle('bad', !ok);
        fbs[i].hidden = false;
        fbs[i].className = 'cf ' + (ok ? 'ok' : 'bad');
        fbs[i].innerHTML = ok ? '✓ Correct. <span class="why">' + q.explain + '</span>' : '✗ ' + (v.trim() ? 'Not quite.' : 'No answer.') + ' The answer is <b>' + esc(CHECKS.shown(q)) + '</b>. <span class="why">' + q.explain + '</span>';
      });
      if (!any) { result.className = 'check-result'; el.classList.remove('done'); result.innerHTML = 'Type at least one answer first.'; Array.prototype.forEach.call(fbs, function (f) { f.hidden = true; }); Array.prototype.forEach.call(inputs, function (inp) { inp.classList.remove('ok', 'bad'); }); return; }
      st.graded = true;
      var all = right === st.qs.length;
      el.classList.toggle('done', all);
      result.className = 'check-result' + (all ? ' done' : '');
      result.innerHTML = all
        ? '<span class="done-badge">✓ Completed</span> <b>' + right + ' of ' + st.qs.length + '</b> correct — every answer on this row is right.'
        : '<b>' + right + ' of ' + st.qs.length + '</b> correct. Look at the working above, or press New questions for another go.';
      if (all) {
        if (!doneRows[rowId]) { doneRows[rowId] = true; saveDone(); }
        markNavDone();
        var head = el.closest('.check-sec').querySelector('h2');
        if (head && !head.querySelector('.done-badge')) head.innerHTML += ' <span class="done-badge">✓ Completed</span>';
      }
    }
    el.querySelector('.check-go').addEventListener('click', grade);
    el.querySelector('.check-new').addEventListener('click', function () {
      checkMemory[rowId] = null;
      var sec = el.closest('.check-sec'), tmp = document.createElement('div');
      tmp.innerHTML = checkHtml(rowId);
      sec.replaceWith(tmp.firstChild);
      var fresh = main.querySelector('.check[data-row="' + rowId + '"]');
      wireCheck(fresh);
      fresh.querySelector('.quiz-input').focus({ preventScroll: true });
    });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.classList.contains('quiz-input')) { e.preventDefault(); grade(); } });
    Array.prototype.forEach.call(inputs, function (inp) { inp.addEventListener('input', function () { st.answers[+inp.dataset.i] = inp.value; }); });
    if (st.graded) grade();
  }

  /* ---------- collapsible sidebar: click empty space to hide, click the strip to show ---------- */

  var NAV_KEY = 'packet-lessons-nav';
  function wireSideCollapse() {
    var app = document.querySelector('.app'), side = document.querySelector('.side');
    if (!side) return;
    var saved = null;
    try { saved = localStorage.getItem(NAV_KEY); } catch (e) { /* no storage */ }
    if (saved === 'collapsed') app.classList.add('nav-collapsed');
    var strip = document.createElement('button');
    strip.type = 'button'; strip.className = 'side-strip'; strip.title = 'Show the lesson list';
    strip.setAttribute('aria-label', 'Show the lesson list');
    strip.innerHTML = '<span>Lessons</span>';
    side.appendChild(strip);
    side.title = 'Click an empty part of this list to hide it';
    function set(collapsed) {
      app.classList.toggle('nav-collapsed', collapsed);
      side.title = collapsed ? '' : 'Click an empty part of this list to hide it';
      try { localStorage.setItem(NAV_KEY, collapsed ? 'collapsed' : 'open'); } catch (e) { /* ignore */ }
    }
    side.addEventListener('click', function (e) {
      if (app.classList.contains('nav-collapsed')) { set(false); return; }
      /* only empty space: not a lesson row, link, button or the brand */
      if (e.target.closest('.row, a, button, input, select')) return;
      set(true);
    });
  }

  /* ---------- light / dark ---------- */

  var THEME_KEY = 'packet-lessons-theme';
  function currentTheme() { return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'; }
  function paintThemeBtn(btn) {
    var dark = currentTheme() === 'dark';
    btn.innerHTML = dark ? '&#9788;' : '&#9790;';
    btn.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    btn.setAttribute('aria-label', btn.title);
    btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
  }
  function wireThemeBtn(wrap) {
    if (!wrap) return;
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'theme-btn';
    paintThemeBtn(btn);
    btn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* private mode: lasts for this page only */ }
      paintThemeBtn(btn);
    });
    wrap.appendChild(btn);
  }

  function wireWidgets() {
    Array.prototype.forEach.call(main.querySelectorAll('.check'), wireCheck);
    Array.prototype.forEach.call(main.querySelectorAll('.binary'), wireBinary);
    Array.prototype.forEach.call(main.querySelectorAll('.anatomy-widget'), wireAnatomy);
    Array.prototype.forEach.call(main.querySelectorAll('.cidr'), wireCidr);
    Array.prototype.forEach.call(main.querySelectorAll('.pow2'), wirePow2);
    Array.prototype.forEach.call(main.querySelectorAll('.bgame'), wireGame);
    Array.prototype.forEach.call(main.querySelectorAll('.split'), wireSplit);
    Array.prototype.forEach.call(main.querySelectorAll('.classify'), wireClassify);
    Array.prototype.forEach.call(main.querySelectorAll('.quiz:not(.exam)'), wireQuiz);
    Array.prototype.forEach.call(main.querySelectorAll('.exam'), wireExam);
  }

  function renderLesson(lesson) {
    var h = [];
    h.push('<article class="lesson" id="lesson-' + lesson.id + '">');
    h.push('<p class="crumb">' + esc(STACK_GROUPS[lesson.stack] || 'Lesson') + '</p>');
    h.push('<h1>' + esc(lesson.title) + '</h1>');
    var lead = lv(lesson.oneLiner);
    if (lead) h.push('<p class="lead">' + lead + '</p>');
    if (lesson.facts) h.push('<div class="facts">' + lesson.facts.map(function (f) { return '<div><span class="k">' + esc(f[0]) + '</span><span class="v">' + lv(f[1]) + '</span></div>'; }).join('') + '</div>');
    lesson.sections.forEach(function (s) { h.push(sectionHtml(s)); });
    if (lesson.check !== false) h.push(checkHtml(lesson.id));
    h.push('</article>');
    content.innerHTML = h.join('');
    main.scrollTop = 0;
    wireWidgets();
  }

  /* ---------- routing ---------- */

  function route() {
    var id = location.hash.replace('#', '');
    var idx = -1;
    LESSONS.forEach(function (l, i) { if (l.id === id) idx = i; });
    setActive(idx >= 0 ? id : null);
    if (idx >= 0) renderLesson(LESSONS[idx]);
    else renderWelcome();
    document.title = (idx >= 0 ? LESSONS[idx].title + ' - ' : '') + SITE.title;
  }

  buildMenu();
  buildNav();
  markNavDone();
  window.rerender = function () { var y = main.scrollTop; route(); main.scrollTop = y; };
  wireLevelBar(document.getElementById('level-bar'));
  wireThemeBtn(document.getElementById('level-bar'));
  wireSideCollapse();
  window.addEventListener('hashchange', route);
  route();
})();
