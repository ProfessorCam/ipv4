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
    var bits = S.octetBits(ip), h = ['<div class="bitstrip" aria-label="' + esc(S.fmtIp(ip)) + ' as 32 bits, ' + prefix + ' network bits">'];
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

  /* ---------- widget: the address anatomy strip (colour-coded octets) ---------- */

  function anatomyHtml(a) {
    var ip = S.parseIp(a.value), roles = S.octetRoles(a.prefix), h = [];
    h.push('<div class="anatomy" aria-label="IPv4 address ' + esc(a.value) + ' with a /' + a.prefix + ' mask">');
    a.value.split('.').forEach(function (x, i) { h.push('<span class="byte wide ' + roles[i] + '">' + esc(x) + '</span>'); });
    h.push('<span class="byte slash">/' + a.prefix + '</span></div>');
    var legend = [['net', 'Network', a.left], ['host', 'Host', a.right]];
    if (roles.indexOf('mixed') >= 0) legend.splice(1, 0, ['mixed', 'Split octet', 'the /' + a.prefix + ' line falls inside this octet: some bits network, some host']);
    h.push('<div class="anatomy-legend">' + legend.map(function (l) { return '<span><i class="sw ' + l[0] + '"></i><b>' + esc(l[1]) + ':</b> ' + esc(l[2]) + '</span>'; }).join('') + '</div>');
    h.push('<p class="hint">The same address as bits, with the mask <code>' + S.fmtIp(S.maskOf(a.prefix)) + '</code> drawn as the colour change:</p>');
    h.push(bitStripHtml(ip, a.prefix));
    return h.join('');
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
      '<div class="cidr-strip"></div>' +
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
    var min = +range.min, max = +range.max;
    function apply() {
      var p = +range.value, d = S.describe(ip, p);
      sliderMemory[el.dataset.ip] = p;
      readout.textContent = '/' + p;
      n.textContent = fmtN(d.size);
      range.setAttribute('aria-valuetext', '/' + p + ', ' + fmtN(d.size) + ' addresses, mask ' + S.fmtIp(d.mask));
      tilesEl.innerHTML = tiles(d);
      strip.innerHTML = bitStripHtml(ip, p);
      /* log scale: the bar is full at /min and empty at /max */
      var frac = (max - p) / (max - min);
      bar.style.width = Math.max(0.6, frac * 100) + '%';
      note.textContent = p < max ? 'each step to the left doubles it' : '';
      cap.innerHTML = caption ? fillTemplate(lv(caption), d) : '';
    }
    range.addEventListener('input', apply);
    apply();
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
    Array.prototype.forEach.call(main.querySelectorAll('.cidr'), wireCidr);
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
