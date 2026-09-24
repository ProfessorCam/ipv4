/* checks.js - "Check your understanding": three fresh questions at the bottom of every row.
   One generator per row id. Each returns three questions:
     { prompt, type: 'number' | 'ip' | 'bits' | 'text', answer, accept: [...], explain }
   Numbers are drawn at random every time, so no two visits ask the same thing.
   Answers are checked by CHECKS.grade(); prompts and explanations are plain HTML. */

var CHECKS = (function () {
  'use strict';
  var S = SUBNET;

  function rnd(n) { return Math.floor(Math.random() * n); }
  function between(a, b) { return a + rnd(b - a + 1); }
  function pick(arr) { return arr[rnd(arr.length)]; }
  function fmtN(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function ip(s) { return S.parseIp(s); }
  var HOME = ['192.168.0.0', '192.168.1.0', '192.168.10.0', '10.0.0.0', '10.1.1.0', '172.16.0.0', '172.20.5.0'];

  /* the octet values that appear in masks, with their bit counts */
  var MASK_OCTETS = [[128, 1], [192, 2], [224, 3], [240, 4], [248, 5], [252, 6], [254, 7]];

  function bin8(v) { var s = v.toString(2); while (s.length < 8) s = '0' + s; return s; }

  var KIND_WORDS = {
    'private': ['private', 'rfc1918', 'rfc 1918', 'internal'],
    'miracast': ['private', 'rfc1918', 'rfc 1918', 'miracast', 'wi-fi direct', 'wifi direct'],
    'public': ['public', 'global', 'routable'],
    'loopback': ['loopback', 'lo', 'localhost'],
    'apipa': ['apipa', 'link-local', 'link local', 'linklocal', 'autoconf'],
    'multicast': ['multicast', 'group'],
    'broadcast': ['broadcast', 'limited broadcast'],
    'cgnat': ['cgnat', 'cgn', 'carrier-grade nat', 'carrier grade nat', 'shared', 'shared address space'],
    'doc': ['documentation', 'doc', 'docs', 'test-net', 'testnet', 'test net', 'example'],
    'any': ['any', 'unspecified', 'none', 'no address', 'this network', 'this host'],
    'this-net': ['this network', 'this net', 'unspecified', 'any'],
    'reserved': ['reserved', 'class e'],
    'benchmark': ['benchmark', 'benchmarking', 'test', 'testing', 'lab']
  };
  var KIND_LABEL = { 'private': 'private', 'miracast': 'private (the Miracast / Wi-Fi Direct subnet)', 'public': 'public', 'loopback': 'loopback', 'apipa': 'APIPA / link-local', 'multicast': 'multicast', 'broadcast': 'broadcast', 'cgnat': 'carrier-grade NAT shared space', 'doc': 'documentation', 'any': 'the unspecified "any" address', 'this-net': '"this network"', 'reserved': 'reserved', 'benchmark': 'benchmark testing' };

  function randomHostIn(cidr) {
    var c = S.parseCidr(cidr), size = S.blockSize(c.prefix);
    return (c.ip + 1 + rnd(Math.max(1, size - 2))) >>> 0;
  }

  function kindQuestion(addr, wordsHint) {
    var k = S.classify(addr).kind, words = KIND_WORDS[k] || ['public'];
    return {
      prompt: 'What kind of address is <code>' + S.fmtIp(addr) + '</code>? ' + (wordsHint || 'Answer with one word: private, public, loopback, apipa, multicast or broadcast.'),
      type: 'text', answer: words[0], accept: words,
      explain: S.fmtIp(addr) + ' is ' + KIND_LABEL[k] + (S.classify(addr).cidr ? ', inside ' + S.classify(addr).cidr : '') + '.'
    };
  }

  var GEN = {
    bits: function () {
      var v = between(1, 254), b = bin8(between(1, 254)), n = between(2, 12);
      var parts = []; bin8(v).split('').forEach(function (c, i) { if (c === '1') parts.push(1 << (7 - i)); });
      var parts2 = []; b.split('').forEach(function (c, i) { if (c === '1') parts2.push(1 << (7 - i)); });
      return [
        { prompt: 'Write <b>' + v + '</b> as an 8-bit binary number.', type: 'bits', answer: bin8(v), explain: v + ' = ' + parts.join(' + ') + ' = <code>' + bin8(v) + '</code>.' },
        { prompt: 'What is <code>' + b + '</code> in decimal?', type: 'number', answer: parseInt(b, 2), explain: '<code>' + b + '</code> = ' + parts2.join(' + ') + ' = ' + parseInt(b, 2) + '.' },
        { prompt: 'How many different values can <b>' + n + '</b> bits represent?', type: 'number', answer: Math.pow(2, n), explain: '2<sup>' + n + '</sup> = ' + fmtN(Math.pow(2, n)) + '. Each extra bit doubles the count.' }
      ];
    },

    mask: function () {
      var p1 = between(9, 30), p2 = between(9, 30), p3 = between(8, 30);
      var m2 = S.fmtIp(S.maskOf(p2)), roles = S.octetRoles(p2), mixed = roles.indexOf('mixed');
      var explain2 = mixed >= 0
        ? 'Full octets of 255 give ' + (mixed * 8) + ' bits; ' + ((S.maskOf(p2) >>> (24 - mixed * 8)) & 255) + ' has ' + (p2 - mixed * 8) + ' leading ones; ' + (mixed * 8) + ' + ' + (p2 - mixed * 8) + ' = /' + p2 + '.'
        : 'Each 255 is eight ones: ' + (p2 / 8) + ' × 8 = /' + p2 + '.';
      return [
        { prompt: 'What is <b>/' + p1 + '</b> as a dotted subnet mask?', type: 'ip', answer: S.fmtIp(S.maskOf(p1)), explain: p1 + ' ones then ' + (32 - p1) + ' zeros: <code>' + S.fmtIp(S.maskOf(p1)) + '</code>.' },
        { prompt: 'What prefix length is the mask <code>' + m2 + '</code>? Give just the number.', type: 'number', answer: p2, explain: explain2 },
        { prompt: 'How many <b>host bits</b> does a <b>/' + p3 + '</b> leave?', type: 'number', answer: 32 - p3, explain: '32 − ' + p3 + ' = ' + (32 - p3) + '.' }
      ];
    },

    slider: function () {
      var p1 = between(16, 30), p2 = between(20, 30), n = between(2, 14);
      return [
        { prompt: 'How many addresses are in a <b>/' + p1 + '</b> block?', type: 'number', answer: S.blockSize(p1), explain: '32 − ' + p1 + ' = ' + (32 - p1) + ' host bits; 2<sup>' + (32 - p1) + '</sup> = ' + fmtN(S.blockSize(p1)) + '.' },
        { prompt: 'How many <b>usable host</b> addresses does a <b>/' + p2 + '</b> have?', type: 'number', answer: S.usable(p2), explain: fmtN(S.blockSize(p2)) + ' addresses minus network and broadcast = ' + fmtN(S.usable(p2)) + '.' },
        { prompt: 'A block holds exactly <b>' + fmtN(Math.pow(2, n)) + '</b> addresses. What is its prefix length? Give just the number.', type: 'number', answer: 32 - n, explain: fmtN(Math.pow(2, n)) + ' = 2<sup>' + n + '</sup>, so ' + n + ' host bits and 32 − ' + n + ' = /' + (32 - n) + '.' }
      ];
    },

    carve: function () {
      var p = between(16, 26), c = p + between(1, 4);
      var base = ip(pick(HOME)), pp = 24, cc = between(25, 28), k = between(1, Math.pow(2, cc - pp));
      var r = S.subnetsOf(base, pp, cc), kth = r.subnets[k - 1];
      var c3 = between(25, 30);
      return [
        { prompt: 'Splitting a <b>/' + p + '</b> into <b>/' + c + '</b>s gives how many subnets?', type: 'number', answer: Math.pow(2, c - p), explain: c + ' − ' + p + ' = ' + (c - p) + ' bits borrowed; 2<sup>' + (c - p) + '</sup> = ' + Math.pow(2, c - p) + ' subnets.' },
        { prompt: 'Split <code>' + S.fmtIp(base) + '/' + pp + '</code> into /' + cc + 's. What is the <b>network address of subnet ' + k + '</b> (counting from 1)?', type: 'ip', answer: S.fmtIp(kth.network), explain: 'Each /' + cc + ' is ' + S.blockSize(cc) + ' addresses, so subnet ' + k + ' starts at ' + (k - 1) + ' × ' + S.blockSize(cc) + ' = ' + ((k - 1) * S.blockSize(cc)) + ' in the last octet: <code>' + S.fmtIp(kth.network) + '</code>.' },
        { prompt: 'What is the <b>step</b> (block size) between consecutive <b>/' + c3 + '</b> subnets?', type: 'number', answer: S.blockSize(c3), explain: 'Mask <code>' + S.fmtIp(S.maskOf(c3)) + '</code>; 256 − ' + (S.maskOf(c3) & 255) + ' = ' + S.blockSize(c3) + '. Same as 2<sup>' + (32 - c3) + '</sup>.' }
      ];
    },

    'public': function () {
      var pools = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '8.0.0.0/8', '203.0.0.0/8', '100.0.0.0/10', '172.32.0.0/12', '11.0.0.0/8'];
      var a1 = randomHostIn(pick(pools));
      var edge = pick(['172.15.0.0/16', '172.16.0.0/16', '172.31.0.0/16', '172.32.0.0/16', '192.167.0.0/16', '192.168.255.0/24', '192.169.0.0/16', '10.255.255.0/24', '11.0.0.0/16', '9.255.0.0/16']);
      var a3 = randomHostIn(edge);
      var blk = pick([['10.0.0.0/8', 8], ['172.16.0.0/12', 12], ['192.168.0.0/16', 16], ['100.64.0.0/10', 10]]);
      var hint = 'Answer <b>private</b> or <b>public</b>.';
      var q1 = kindQuestion(a1, hint), q3 = kindQuestion(a3, hint + ' Careful with the boundary.');
      return [q1,
        { prompt: 'How many addresses are in the block <code>' + blk[0] + '</code>?', type: 'number', answer: S.blockSize(blk[1]), explain: '/' + blk[1] + ' leaves ' + (32 - blk[1]) + ' host bits; 2<sup>' + (32 - blk[1]) + '</sup> = ' + fmtN(S.blockSize(blk[1])) + '.' },
        q3];
    },

    special: function () {
      var pools = ['127.0.0.0/8', '169.254.0.0/16', '224.0.0.0/8', '239.0.0.0/8', '192.168.0.0/16', '10.0.0.0/8', '8.0.0.0/8', '100.64.0.0/10', '203.0.113.0/24'];
      var a1 = randomHostIn(pick(pools));
      var singles = ['127.0.0.1', '169.254.' + between(1, 254) + '.' + between(1, 254), '239.255.255.250', '224.0.0.251', '255.255.255.255', '192.168.49.1', '0.0.0.0'];
      var a2 = ip(pick(singles));
      var fwdPool = [['224.0.0.' + between(1, 30), false, 'link-local multicast (224.0.0.0/24) is never forwarded'], ['255.255.255.255', false, 'limited broadcast stays on the local link'], ['127.' + between(0, 255) + '.0.' + between(1, 254), false, 'loopback never reaches a network card'], ['169.254.' + between(1, 254) + '.' + between(1, 254), false, 'link-local has no gateway and is not forwardable'], [S.fmtIp(randomHostIn('8.0.0.0/8')), true, 'it is a public address'], [S.fmtIp(randomHostIn('203.0.0.0/8')), true, 'it is a public address'], ['239.255.255.250', false, 'SSDP is administratively scoped; home routers do not forward it upstream']];
      var f = pick(fwdPool);
      var words = 'One word: private, public, loopback, apipa, multicast, broadcast, cgnat, documentation or any.';
      return [kindQuestion(a1, words), kindQuestion(a2, words),
        { prompt: 'Will a router forward a packet addressed to <code>' + f[0] + '</code> to the internet? Answer <b>yes</b> or <b>no</b>.', type: 'text', answer: f[1] ? 'yes' : 'no', accept: f[1] ? ['yes', 'y'] : ['no', 'n'], explain: (f[1] ? 'Yes: ' : 'No: ') + f[2] + '.' }];
    },

    practice: function () {
      var a = S.randomQuestion('size', 'medium'), b = S.randomQuestion('netbc', 'medium'), c = S.randomQuestion('range', 'medium');
      return [
        { prompt: 'How many addresses are in <code>' + a.cidr + '</code>?', type: 'number', answer: a.fields[0].answer, explain: '32 − ' + a.prefix + ' = ' + (32 - a.prefix) + ' host bits; 2<sup>' + (32 - a.prefix) + '</sup> = ' + fmtN(a.info.size) + '.' },
        { prompt: 'What is the <b>network address</b> of the host <code>' + b.cidr + '</code>?', type: 'ip', answer: b.fields[0].answer, explain: 'Mask <code>' + S.fmtIp(b.info.mask) + '</code>; keep the first ' + b.prefix + ' bits, zero the rest: <code>' + b.fields[0].answer + '</code>. Broadcast is ' + b.fields[1].answer + '.' },
        { prompt: 'What is the <b>last usable host</b> in the subnet containing <code>' + c.cidr + '</code>?', type: 'ip', answer: c.fields[1].answer, explain: 'Broadcast ' + S.fmtIp(c.info.broadcast) + (c.prefix >= 31 ? ' (both addresses usable on /' + c.prefix + ')' : ' minus one') + ' = <code>' + c.fields[1].answer + '</code>.' }
      ];
    }
  };

  function questions(rowId) {
    var g = GEN[rowId];
    return g ? g() : null;
  }

  /* true if `text` answers `q` */
  function grade(q, text) {
    var t = String(text || '').trim().toLowerCase();
    if (!t) return false;
    if (q.type === 'number') return S.checkAnswer({ type: 'number', answer: q.answer }, t);
    if (q.type === 'ip') return S.checkAnswer({ type: 'ip', answer: q.answer }, t);
    if (q.type === 'bits') { var b = t.replace(/[\s.]/g, ''); return /^[01]{1,8}$/.test(b) && parseInt(b, 2) === parseInt(q.answer, 2); }
    var norm = t.replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, ' ');
    return (q.accept || [q.answer]).some(function (a) { return norm === a || norm.indexOf(a) === 0; });
  }

  function shown(q) {
    if (q.type === 'text') return q.answer;
    if (q.type === 'number') return fmtN(q.answer);
    return q.answer;
  }

  return { questions: questions, grade: grade, shown: shown, ROWS: Object.keys(GEN) };
})();

if (typeof module !== 'undefined') module.exports = CHECKS;
