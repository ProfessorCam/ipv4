/* subnet.js - IPv4 arithmetic with no DOM in it.
   Every number the site shows comes from here. Addresses are handled as
   unsigned 32-bit integers; >>> 0 keeps JavaScript from turning them negative.
   Loaded in the browser as window.SUBNET, and by node for the smoke tests. */

var SUBNET = (function () {
  'use strict';

  function parseIp(str) {
    if (typeof str !== 'string') return null;
    var parts = str.trim().split('.');
    if (parts.length !== 4) return null;
    var n = 0;
    for (var i = 0; i < 4; i++) {
      if (!/^\d{1,3}$/.test(parts[i])) return null;
      var v = parseInt(parts[i], 10);
      if (v > 255) return null;
      n = ((n << 8) | v) >>> 0;
    }
    return n;
  }

  function fmtIp(n) {
    n = n >>> 0;
    return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }

  /* '192.168.1.0/24' -> { ip, prefix } or null */
  function parseCidr(str) {
    if (typeof str !== 'string') return null;
    var m = /^\s*([\d.]+)\s*\/\s*(\d{1,2})\s*$/.exec(str);
    if (!m) return null;
    var ip = parseIp(m[1]), p = parseInt(m[2], 10);
    if (ip === null || p > 32) return null;
    return { ip: ip, prefix: p };
  }

  function maskOf(prefix) {
    if (prefix <= 0) return 0;
    if (prefix >= 32) return 0xffffffff;
    return (0xffffffff << (32 - prefix)) >>> 0;
  }

  function wildcardOf(prefix) { return (~maskOf(prefix)) >>> 0; }

  function network(ip, prefix) { return (ip & maskOf(prefix)) >>> 0; }
  function broadcast(ip, prefix) { return (network(ip, prefix) | wildcardOf(prefix)) >>> 0; }

  function blockSize(prefix) { return Math.pow(2, 32 - prefix); }
  function hostBits(prefix) { return 32 - prefix; }

  /* Usable host addresses. /31 is a two-address point-to-point link (RFC 3021)
     and /32 is a single host, so neither loses a network or broadcast address. */
  function usable(prefix) {
    if (prefix >= 32) return 1;
    if (prefix === 31) return 2;
    return blockSize(prefix) - 2;
  }

  function firstHost(ip, prefix) {
    var net = network(ip, prefix);
    return prefix >= 31 ? net : (net + 1) >>> 0;
  }

  function lastHost(ip, prefix) {
    var bc = broadcast(ip, prefix);
    return prefix >= 31 ? bc : (bc - 1) >>> 0;
  }

  function toBits(n) {
    var s = (n >>> 0).toString(2);
    while (s.length < 32) s = '0' + s;
    return s;
  }

  function octetBits(n) {
    var b = toBits(n);
    return [b.slice(0, 8), b.slice(8, 16), b.slice(16, 24), b.slice(24, 32)];
  }

  /* Which of the four octets are all network bits, all host bits, or split by the prefix. */
  function octetRoles(prefix) {
    var out = [];
    for (var i = 0; i < 4; i++) {
      var lo = i * 8, hi = lo + 8;
      out.push(prefix >= hi ? 'net' : prefix <= lo ? 'host' : 'mixed');
    }
    return out;
  }

  /* Everything about one address and prefix, ready to print. */
  function describe(ip, prefix) {
    return {
      ip: ip, prefix: prefix,
      mask: maskOf(prefix), wildcard: wildcardOf(prefix),
      network: network(ip, prefix), broadcast: broadcast(ip, prefix),
      first: firstHost(ip, prefix), last: lastHost(ip, prefix),
      size: blockSize(prefix), usable: usable(prefix), hostBits: hostBits(prefix)
    };
  }

  /* ---------- special and private ranges ---------- */

  /* Most specific first, so 192.168.49.0/24 (Miracast) wins over 192.168.0.0/16.
     kind is a short code the page turns into a colour and a sentence. */
  var RANGES = [
    { cidr: '0.0.0.0/32',         kind: 'any',       name: '"Any" address',                  rfc: 'RFC 1122' },
    { cidr: '0.0.0.0/8',          kind: 'this-net',  name: '"This network"',                 rfc: 'RFC 1122' },
    { cidr: '127.0.0.0/8',        kind: 'loopback',  name: 'Loopback',                       rfc: 'RFC 1122' },
    { cidr: '169.254.0.0/16',     kind: 'apipa',     name: 'Link-local (APIPA)',             rfc: 'RFC 3927' },
    { cidr: '192.168.49.0/24',    kind: 'miracast',  name: 'Private: Miracast / Wi-Fi Direct group', rfc: 'RFC 1918 range, Wi-Fi Alliance convention' },
    { cidr: '10.0.0.0/8',         kind: 'private',   name: 'Private (Class A block)',        rfc: 'RFC 1918' },
    { cidr: '172.16.0.0/12',      kind: 'private',   name: 'Private (16 Class B blocks)',    rfc: 'RFC 1918' },
    { cidr: '192.168.0.0/16',     kind: 'private',   name: 'Private (256 Class C blocks)',   rfc: 'RFC 1918' },
    { cidr: '100.64.0.0/10',      kind: 'cgnat',     name: 'Carrier-grade NAT shared space', rfc: 'RFC 6598' },
    { cidr: '192.0.0.0/24',       kind: 'reserved',  name: 'IETF protocol assignments',      rfc: 'RFC 6890' },
    { cidr: '192.0.2.0/24',       kind: 'doc',       name: 'Documentation (TEST-NET-1)',     rfc: 'RFC 5737' },
    { cidr: '198.51.100.0/24',    kind: 'doc',       name: 'Documentation (TEST-NET-2)',     rfc: 'RFC 5737' },
    { cidr: '203.0.113.0/24',     kind: 'doc',       name: 'Documentation (TEST-NET-3)',     rfc: 'RFC 5737' },
    { cidr: '198.18.0.0/15',      kind: 'benchmark', name: 'Benchmark testing',              rfc: 'RFC 2544' },
    { cidr: '239.255.255.250/32', kind: 'multicast', name: 'Multicast: SSDP / UPnP discovery', rfc: 'UPnP' },
    { cidr: '224.0.0.251/32',     kind: 'multicast', name: 'Multicast: mDNS (Bonjour, Avahi)', rfc: 'RFC 6762' },
    { cidr: '224.0.0.0/24',       kind: 'multicast', name: 'Multicast: local network control (never routed)', rfc: 'RFC 5771' },
    { cidr: '224.0.0.0/4',        kind: 'multicast', name: 'Multicast (Class D)',            rfc: 'RFC 5771' },
    { cidr: '255.255.255.255/32', kind: 'broadcast', name: 'Limited broadcast',              rfc: 'RFC 919' },
    { cidr: '240.0.0.0/4',        kind: 'reserved',  name: 'Reserved (Class E)',             rfc: 'RFC 1112' }
  ];

  RANGES.forEach(function (r) {
    var c = parseCidr(r.cidr);
    r.ip = c.ip; r.prefix = c.prefix;
  });

  function inRange(ip, r) { return network(ip, r.prefix) === r.ip; }

  /* Returns { kind, name, cidr, rfc, routable } for any address. Public addresses get kind 'public'. */
  function classify(ip) {
    for (var i = 0; i < RANGES.length; i++) {
      if (inRange(ip, RANGES[i])) {
        var r = RANGES[i];
        return { kind: r.kind, name: r.name, cidr: r.cidr, rfc: r.rfc, routable: false };
      }
    }
    return { kind: 'public', name: 'Public (globally routable)', cidr: null, rfc: 'IANA / your RIR', routable: true };
  }

  /* The old classful letter, still asked about in exams. */
  function classOf(ip) {
    var o = ip >>> 24;
    if (o < 128) return 'A';
    if (o < 192) return 'B';
    if (o < 224) return 'C';
    if (o < 240) return 'D';
    return 'E';
  }

  /* ---------- carving one block into smaller ones ---------- */

  function subnetsOf(ip, parentPrefix, childPrefix, limit) {
    limit = limit || 64;
    var out = [], count = Math.pow(2, childPrefix - parentPrefix), step = blockSize(childPrefix);
    var base = network(ip, parentPrefix);
    for (var i = 0; i < count && i < limit; i++) {
      var net = (base + i * step) >>> 0;
      out.push(describe(net, childPrefix));
    }
    return { total: count, shown: out.length, subnets: out };
  }

  /* ---------- practice questions ---------- */

  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[rnd(arr.length)]; }

  var HOME_BLOCKS = ['192.168.0.0', '192.168.1.0', '192.168.10.0', '192.168.100.0', '10.0.0.0', '10.1.1.0', '10.10.20.0', '172.16.0.0', '172.16.5.0', '172.20.30.0'];

  /* difficulty: 'easy' = /24../30 on a .0 network; 'medium' = /16../30 on any host
     address; 'hard' = /8../32 on any address, so /31 and /32 come up too. */
  function randomTarget(difficulty, kind) {
    var ip, prefix, base;
    if (difficulty === 'hard') {
      prefix = 8 + rnd(25);
      ip = ((rnd(224) << 24) | (rnd(256) << 16) | (rnd(256) << 8) | rnd(256)) >>> 0;
      if (rnd(2)) ip = (parseIp(pick(HOME_BLOCKS)) | (rnd(256) << 8) | rnd(256)) >>> 0;
    } else if (difficulty === 'medium') {
      prefix = 16 + rnd(15);
      ip = (parseIp(pick(HOME_BLOCKS)) | (rnd(256) << 8) | rnd(256)) >>> 0;
    } else {
      /* easy: a familiar /24, split /24../30. Size questions show the block's own network
         address (192.168.1.64/28); address questions show a host inside it, or there
         would be nothing to work out. */
      prefix = 24 + rnd(7);
      base = parseIp(pick(HOME_BLOCKS));
      var step = blockSize(prefix), count = 256 / step;
      ip = (base + rnd(count) * step) >>> 0;
      if (kind === 'netbc' || kind === 'range') ip = (ip + 1 + rnd(Math.max(1, step - 2))) >>> 0;
    }
    return describe(ip, prefix);
  }

  /* kind: 'size' | 'usable' | 'netbc' | 'range' | 'mixed'
     Returns { kind, ip, prefix, cidr, fields: [{ id, label, answer, type }] } */
  function randomQuestion(kind, difficulty) {
    if (kind === 'mixed' || !kind) kind = pick(['size', 'usable', 'netbc', 'range']);
    var d = randomTarget(difficulty, kind);
    var q = { kind: kind, ip: d.ip, prefix: d.prefix, cidr: fmtIp(d.ip) + '/' + d.prefix, info: d, fields: [] };
    if (kind === 'size') q.fields.push({ id: 'size', label: 'Addresses in the block', answer: d.size, type: 'number' });
    else if (kind === 'usable') q.fields.push({ id: 'usable', label: 'Usable host addresses', answer: d.usable, type: 'number' });
    else if (kind === 'netbc') {
      q.fields.push({ id: 'network', label: 'Network address', answer: fmtIp(d.network), type: 'ip' });
      q.fields.push({ id: 'broadcast', label: 'Broadcast address', answer: fmtIp(d.broadcast), type: 'ip' });
    } else {
      q.fields.push({ id: 'first', label: 'First usable host', answer: fmtIp(d.first), type: 'ip' });
      q.fields.push({ id: 'last', label: 'Last usable host', answer: fmtIp(d.last), type: 'ip' });
      q.fields.push({ id: 'mask', label: 'Subnet mask (dotted)', answer: fmtIp(d.mask), type: 'ip' });
    }
    return q;
  }

  /* Lenient answer check: '16', '16 addresses', '1,024', ' 192.168.1.15 ' all work. */
  function checkAnswer(field, text) {
    var t = String(text || '').trim().toLowerCase();
    if (field.type === 'number') {
      var m = /^([\d,\s]+)/.exec(t);
      if (!m) return false;
      return parseInt(m[1].replace(/[,\s]/g, ''), 10) === field.answer;
    }
    var ip = parseIp(t.replace(/\s+/g, ''));
    return ip !== null && fmtIp(ip) === field.answer;
  }

  return {
    parseIp: parseIp, fmtIp: fmtIp, parseCidr: parseCidr,
    maskOf: maskOf, wildcardOf: wildcardOf, network: network, broadcast: broadcast,
    blockSize: blockSize, hostBits: hostBits, usable: usable, firstHost: firstHost, lastHost: lastHost,
    toBits: toBits, octetBits: octetBits, octetRoles: octetRoles, describe: describe,
    RANGES: RANGES, classify: classify, classOf: classOf, subnetsOf: subnetsOf,
    randomQuestion: randomQuestion, checkAnswer: checkAnswer
  };
})();

if (typeof module !== 'undefined') module.exports = SUBNET;
