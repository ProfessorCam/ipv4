/* exam.js - CCNA-style multiple-choice questions for the "Exam practice" row.
   One generator per topic. Each returns:
     { topic, stem (HTML), exhibit (HTML or ''), choices: [{ text, correct }], explain (HTML) }
   Numbers are random every time; choices are shuffled by the page. All arithmetic is subnet.js. */

var EXAM = (function () {
  'use strict';
  var S = SUBNET;

  function rnd(n) { return Math.floor(Math.random() * n); }
  function between(a, b) { return a + rnd(b - a + 1); }
  function pick(arr) { return arr[rnd(arr.length)]; }
  function shuffle(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function fmtN(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function ip(s) { return S.parseIp(s); }
  var f = S.fmtIp;
  var LANS = ['192.168.1.0', '192.168.10.0', '192.168.100.0', '10.1.1.0', '10.10.20.0', '172.16.5.0', '172.20.30.0'];

  /* distinct choices: drop duplicates by text, keep the first correct one */
  function choices(list) {
    var seen = {}, out = [];
    list.forEach(function (c) { if (!seen[c.text]) { seen[c.text] = true; out.push(c); } });
    return out;
  }
  function kv(rows) { return '<table class="kv exhibit">' + rows.map(function (r) { return '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>'; }).join('') + '</table>'; }

  var GEN = {
    /* Which mask gives at least N hosts? */
    mask: function () {
      var h = between(2, 7), need = Math.pow(2, h) - 2 - rnd(Math.max(1, Math.pow(2, h - 1) - 2)), p = 32 - h;
      if (need < 2) need = 2;
      var base = pick(LANS);
      return {
        topic: 'mask',
        stem: 'A network engineer must create a subnet from <code>' + base + '/24</code> that supports <b>' + need + ' hosts</b> while wasting as few addresses as possible. Which subnet mask should be used?',
        exhibit: '',
        choices: [
          { text: f(S.maskOf(p)) + ' (/' + p + ')', correct: true },
          { text: f(S.maskOf(p - 1)) + ' (/' + (p - 1) + ')', correct: false },
          { text: f(S.maskOf(p + 1)) + ' (/' + (p + 1) + ')', correct: false },
          { text: f(S.maskOf(p > 26 ? p - 2 : p + 2)) + ' (/' + (p > 26 ? p - 2 : p + 2) + ')', correct: false }
        ],
        explain: need + ' hosts need ' + need + ' + 2 = ' + (need + 2) + ' addresses (network and broadcast). The smallest power of two that fits is 2<sup>' + h + '</sup> = ' + Math.pow(2, h) + ', so ' + h + ' host bits and a /' + p + ' = <code>' + f(S.maskOf(p)) + '</code>, giving ' + S.usable(p) + ' usable hosts. /' + (p + 1) + ' only gives ' + S.usable(p + 1) + '; /' + (p - 1) + ' works but wastes ' + (S.usable(p - 1) - need) + ' addresses.'
      };
    },

    /* Network / broadcast / first / last of a host address */
    addr: function () {
      var p = between(25, 30), base = ip(pick(LANS)), host = (base + 1 + rnd(254)) >>> 0, d = S.describe(host, p);
      var which = pick(['network address', 'broadcast address', 'first usable host address', 'last usable host address']);
      var answers = { 'network address': d.network, 'broadcast address': d.broadcast, 'first usable host address': d.first, 'last usable host address': d.last };
      var correct = answers[which], pool = [d.network, d.broadcast, d.first, d.last, (d.broadcast + 1) >>> 0, (d.network - 1) >>> 0].filter(function (a) { return a !== correct; });
      var wrong = shuffle(pool).slice(0, 3);
      return {
        topic: 'addr',
        stem: 'A host is configured with the IP address <code>' + f(host) + '</code> and subnet mask <code>' + f(d.mask) + '</code>. What is the <b>' + which + '</b> of its subnet?',
        exhibit: '',
        choices: [{ text: f(correct), correct: true }].concat(wrong.map(function (w) { return { text: f(w), correct: false }; })),
        explain: 'Mask /' + p + ', block size ' + S.blockSize(p) + ' in the last octet. ' + f(host) + ' falls in the block starting at ' + (host & 255) + ' − (' + (host & 255) + ' mod ' + S.blockSize(p) + ') = ' + (d.network & 255) + '. Network <code>' + f(d.network) + '</code>, first host <code>' + f(d.first) + '</code>, last host <code>' + f(d.last) + '</code>, broadcast <code>' + f(d.broadcast) + '</code>.'
      };
    },

    /* Which is a valid host address in this subnet? */
    valid: function () {
      var p = between(25, 29), base = ip(pick(LANS)), host = (base + 1 + rnd(254)) >>> 0, d = S.describe(host, p);
      var valid = (d.first + rnd(d.usable)) >>> 0;
      var outside = (d.broadcast + 1 + rnd(3)) >>> 0;
      return {
        topic: 'valid',
        stem: 'Which address can be assigned to a host on the subnet <code>' + f(d.network) + '/' + p + '</code>?',
        exhibit: '',
        choices: [
          { text: f(valid), correct: true },
          { text: f(d.network), correct: false },
          { text: f(d.broadcast), correct: false },
          { text: f(outside), correct: false }
        ],
        explain: 'The subnet runs from <code>' + f(d.network) + '</code> (the network address) to <code>' + f(d.broadcast) + '</code> (the broadcast address); hosts may use <code>' + f(d.first) + '</code> to <code>' + f(d.last) + '</code>. <code>' + f(outside) + '</code> is in the next subnet.'
      };
    },

    /* Two PCs on one switch: why can't they talk? */
    trouble: function () {
      var p = pick([24, 25, 26, 27]), base = ip(pick(LANS)), d = S.describe(base, p);
      var gw = d.first, pc1 = (d.first + 1 + rnd(Math.min(20, d.usable - 3))) >>> 0, pc2 = (d.first + 2 + rnd(Math.min(20, d.usable - 3))) >>> 0;
      if (pc2 === pc1) pc2 = (pc2 + 1) >>> 0;
      var mask = f(d.mask), fault = pick(['gateway', 'mask', 'broadcast', 'subnet']);
      var rows1 = [['IP address', f(pc1)], ['Subnet mask', mask], ['Default gateway', f(gw)]], rows2 = [['IP address', f(pc2)], ['Subnet mask', mask], ['Default gateway', f(gw)]];
      var correct, explain, symptom;
      if (fault === 'gateway') {
        var badGw = (d.broadcast + 1 + rnd(5)) >>> 0; rows1[2][1] = f(badGw);
        symptom = 'PC1 can ping PC2 but cannot reach any device on other networks.';
        correct = 'The default gateway on PC1 is not in PC1\'s subnet.';
        explain = 'PC1 is in <code>' + f(d.network) + '/' + p + '</code> (' + f(d.first) + ' to ' + f(d.last) + '), but its gateway <code>' + f(badGw) + '</code> is outside that range, so PC1 can never ARP for it. Local traffic to PC2 still works because no gateway is needed on the same subnet.';
      } else if (fault === 'mask') {
        var wrongP = p + pick([1, 2, 3]); rows2[1][1] = f(S.maskOf(wrongP));
        var pc2net = S.describe(pc2, wrongP);
        /* PC1 must be inside the real subnet but outside the subnet PC2 wrongly believes in */
        var cands = []; for (var a = d.first; a <= d.last; a++) { if (S.network(a, wrongP) !== pc2net.network && a !== gw) cands.push(a); }
        pc1 = pick(cands); rows1[0][1] = f(pc1);
        symptom = 'PC1 cannot ping PC2. Both can ping the default gateway.';
        correct = 'PC2 has the wrong subnet mask, so it believes PC1 is on a different network.';
        explain = 'With <code>' + f(S.maskOf(wrongP)) + '</code> (/' + wrongP + '), PC2 thinks its subnet is only <code>' + f(pc2net.network) + '</code> to <code>' + f(pc2net.broadcast) + '</code>. PC1 at <code>' + f(pc1) + '</code> is outside that, so PC2 sends replies to the gateway instead of directly, and the conversation breaks. The mask must match on every host in the subnet: <code>' + mask + '</code>.';
      } else if (fault === 'broadcast') {
        rows2[0][1] = f(d.broadcast);
        symptom = 'PC2 reports a configuration error and cannot communicate at all.';
        correct = 'PC2 has been given the broadcast address of the subnet.';
        explain = '<code>' + f(d.broadcast) + '</code> has all host bits set to 1: it is the broadcast address of <code>' + f(d.network) + '/' + p + '</code> and cannot be assigned to a host. The last usable address is <code>' + f(d.last) + '</code>.';
      } else {
        var other = S.describe((d.broadcast + 1) >>> 0, p); pc2 = (other.first + 1 + rnd(5)) >>> 0; rows2[0][1] = f(pc2);
        symptom = 'PC1 cannot ping PC2, although both link lights are on.';
        correct = 'PC1 and PC2 are in different subnets; traffic between them must go through a router.';
        explain = 'With mask <code>' + mask + '</code> the block size is ' + S.blockSize(p) + '. PC1 is in <code>' + f(d.network) + '/' + p + '</code>, PC2 at <code>' + f(pc2) + '</code> is in <code>' + f(other.network) + '/' + p + '</code>. Hosts in different subnets never ARP for each other directly; a router (or a corrected address) is needed.';
      }
      var all = ['The default gateway on PC1 is not in PC1\'s subnet.', 'PC2 has the wrong subnet mask, so it believes PC1 is on a different network.', 'PC2 has been given the broadcast address of the subnet.', 'PC1 and PC2 are in different subnets; traffic between them must go through a router.', 'The switch needs a default gateway configured.', 'PC1 and PC2 must be in the same VLAN and use the same DNS server.'];
      var wrong = shuffle(all.filter(function (t) { return t !== correct; })).slice(0, 3);
      return {
        topic: 'trouble',
        stem: 'Refer to the exhibit. PC1 and PC2 are connected to the same switch in the same VLAN. ' + symptom + ' What is the most likely cause?',
        exhibit: '<div class="exhibit-grid"><div><div class="ex-title">PC1</div>' + kv(rows1) + '</div><div><div class="ex-title">PC2</div>' + kv(rows2) + '</div></div>',
        choices: [{ text: correct, correct: true }].concat(wrong.map(function (t) { return { text: t, correct: false }; })),
        explain: explain
      };
    },

    /* How many subnets and hosts per subnet? */
    count: function () {
      var classful = pick([[ '10.0.0.0', 8 ], [ '172.16.0.0', 16 ], [ '192.168.5.0', 24 ]]), p = classful[1] + between(2, Math.min(8, 30 - classful[1]));
      var subnets = Math.pow(2, p - classful[1]), hosts = S.usable(p);
      return {
        topic: 'count',
        stem: 'The network <code>' + classful[0] + '/' + classful[1] + '</code> is subnetted using the mask <code>' + f(S.maskOf(p)) + '</code>. How many subnets and usable hosts per subnet does this create?',
        exhibit: '',
        choices: choices([
          { text: fmtN(subnets) + ' subnets, ' + fmtN(hosts) + ' hosts each', correct: true },
          { text: fmtN(subnets) + ' subnets, ' + fmtN(hosts + 2) + ' hosts each', correct: false },
          { text: fmtN(subnets / 2) + ' subnets, ' + fmtN(S.usable(p - 1)) + ' hosts each', correct: false },
          { text: fmtN(hosts + 2) + ' subnets, ' + fmtN(subnets - 2) + ' hosts each', correct: false }
        ]),
        explain: 'Borrowed bits: ' + p + ' − ' + classful[1] + ' = ' + (p - classful[1]) + ', so 2<sup>' + (p - classful[1]) + '</sup> = ' + fmtN(subnets) + ' subnets. Host bits: 32 − ' + p + ' = ' + (32 - p) + ', so 2<sup>' + (32 - p) + '</sup> − 2 = ' + fmtN(hosts) + ' usable hosts per subnet.'
      };
    },

    /* Route summarisation */
    summary: function () {
      var k = pick([2, 4, 8, 16]), bits = Math.log2(k), start = rnd(256 / k) * k, second = pick(['168', '10', '20']), first = second === '168' ? '192' : second === '10' ? '10' : '172';
      var netStr = first + '.' + second + '.' + start + '.0', p = 24 - bits;
      var mid = start + 1 + rnd(k - 1);   /* an unaligned start inside the range: a classic wrong answer */
      return {
        topic: 'summary',
        stem: 'A router has the networks <code>' + first + '.' + second + '.' + start + '.0/24</code> through <code>' + first + '.' + second + '.' + (start + k - 1) + '.0/24</code> behind one interface. Which single summary route advertises all of them and nothing more?',
        exhibit: '',
        choices: choices([
          { text: netStr + '/' + p + ' (' + f(S.maskOf(p)) + ')', correct: true },
          { text: netStr + '/' + (p - 1) + ' (' + f(S.maskOf(p - 1)) + ')', correct: false },
          { text: first + '.' + second + '.' + mid + '.0/' + p + ' (' + f(S.maskOf(p)) + ')', correct: false },
          { text: netStr + '/24 (255.255.255.0)', correct: false }
        ]),
        explain: k + ' consecutive /24s need ' + bits + ' extra host bit' + (bits === 1 ? '' : 's') + ': /24 − ' + bits + ' = /' + p + ' (mask ' + f(S.maskOf(p)) + '). The third octet must be a multiple of ' + k + ' for the block to be aligned: ' + start + ' is, so <code>' + netStr + '/' + p + '</code> covers exactly ' + start + ' to ' + (start + k - 1) + '. A /' + (p - 1) + ' would also include networks that are not behind this interface.'
      };
    },

    /* ACL wildcard masks */
    wildcard: function () {
      var p = pick([24, 25, 26, 27, 28, 29, 30]), base = ip(pick(LANS)), d = S.describe((base + rnd(256)) >>> 0, p);
      var net = f(d.network), wc = f(d.wildcard), mask = f(d.mask), wrongWc = f(S.wildcardOf(p - 1));
      return {
        topic: 'wildcard',
        stem: 'Which access-list statement permits traffic from all hosts in the subnet <code>' + net + '/' + p + '</code> and no others?',
        exhibit: '',
        choices: choices([
          { text: 'access-list 10 permit ' + net + ' ' + wc, correct: true },
          { text: 'access-list 10 permit ' + net + ' ' + mask, correct: false },
          { text: 'access-list 10 permit ' + net + ' ' + wrongWc, correct: false },
          { text: 'access-list 10 permit host ' + net, correct: false }
        ]),
        explain: 'ACLs use a <b>wildcard mask</b>, the inverse of the subnet mask: 255.255.255.255 − ' + mask + ' = <code>' + wc + '</code>. A 0 bit means "must match", a 1 bit means "don\'t care", so <code>' + net + ' ' + wc + '</code> matches exactly the ' + S.blockSize(p) + ' addresses of the subnet. Using the subnet mask itself matches almost everything; <code>host</code> matches one address only.'
      };
    },

    /* Longest-prefix match */
    route: function () {
      var routes = [
        { net: '10.0.0.0', p: 8, via: 'Serial0/0/0' },
        { net: '10.1.0.0', p: 16, via: 'GigabitEthernet0/1' },
        { net: '10.1.2.0', p: 24, via: '192.168.100.2' },
        { net: '0.0.0.0', p: 0, via: '203.0.113.1' }
      ];
      var targets = [
        { ip: '10.1.2.' + between(1, 254), best: 2 }, { ip: '10.1.' + between(3, 254) + '.' + between(1, 254), best: 1 },
        { ip: '10.' + between(2, 254) + '.' + between(0, 254) + '.' + between(1, 254), best: 0 }, { ip: '172.16.' + between(0, 254) + '.' + between(1, 254), best: 3 }
      ];
      var t = pick(targets), rows = shuffle(routes);
      return {
        topic: 'route',
        stem: 'Refer to the routing table. A packet arrives with the destination address <code>' + t.ip + '</code>. Which next hop or exit interface will the router use?',
        exhibit: '<table class="lab exhibit-table"><tr><th>Network</th><th>Next hop / interface</th></tr>' + rows.map(function (r) { return '<tr><td>' + r.net + '/' + r.p + '</td><td>' + r.via + '</td></tr>'; }).join('') + '</table>',
        choices: routes.map(function (r, i) { return { text: r.via + (r.p === 0 ? ' (default route)' : ''), correct: i === t.best }; }),
        explain: 'Routers choose the <b>longest matching prefix</b>. ' + t.ip + ' matches ' + routes.filter(function (r) { return S.network(ip(t.ip), r.p) === S.network(ip(r.net), r.p); }).map(function (r) { return r.net + '/' + r.p; }).join(', ') + '; the most specific of those is <code>' + routes[t.best].net + '/' + routes[t.best].p + '</code>, so the packet goes to <b>' + routes[t.best].via + '</b>.'
      };
    },

    /* Private address */
    'private': function () {
      var privs = ['10.' + between(0, 255) + '.' + between(0, 255) + '.' + between(1, 254), '172.' + between(16, 31) + '.' + between(0, 255) + '.' + between(1, 254), '192.168.' + between(0, 255) + '.' + between(1, 254)];
      var pubs = ['172.' + pick([15, 32, 33, 40]) + '.' + between(0, 255) + '.' + between(1, 254), '192.169.' + between(0, 255) + '.' + between(1, 254), '11.' + between(0, 255) + '.' + between(0, 255) + '.' + between(1, 254), '8.8.' + between(0, 255) + '.' + between(1, 254), '100.' + between(128, 200) + '.' + between(0, 255) + '.' + between(1, 254)];
      var answer = pick(privs), wrong = shuffle(pubs).slice(0, 3);
      return {
        topic: 'private',
        stem: 'Which of the following is a <b>private</b> IPv4 address as defined in RFC 1918?',
        exhibit: '',
        choices: [{ text: answer, correct: true }].concat(wrong.map(function (w) { return { text: w, correct: false }; })),
        explain: 'RFC 1918 reserves <code>10.0.0.0/8</code>, <code>172.16.0.0/12</code> (172.16.0.0 to 172.31.255.255) and <code>192.168.0.0/16</code>. ' + answer + ' is in ' + S.classify(ip(answer)).cidr + '. The others are public: note the boundaries at 172.15 / 172.32, 192.169 and 11.x.x.x.'
      };
    },

    /* VLSM: largest first */
    vlsm: function () {
      var base = ip(pick(LANS)), needs = shuffle([pick([100, 120, 60]), pick([50, 40, 28]), pick([20, 12, 10]), 2]);
      var sorted = needs.slice().sort(function (a, b) { return b - a; }), alloc = [], cur = base;
      sorted.forEach(function (n) { var h = Math.ceil(Math.log2(n + 2)), p = 32 - h; alloc.push({ need: n, p: p, net: cur }); cur = (cur + S.blockSize(p)) >>> 0; });
      var askIdx = between(1, 3), a = alloc[askIdx];
      var wrongs = [f(alloc[askIdx - 1].net) + '/' + a.p, f(a.net) + '/' + (a.p - 1), f((a.net + S.blockSize(a.p)) >>> 0) + '/' + a.p];
      return {
        topic: 'vlsm',
        stem: 'The address block <code>' + f(base) + '/24</code> must be divided with VLSM for four LANs needing <b>' + needs.join(', ') + '</b> hosts respectively. Assigning the largest subnet first, which network address and prefix should the LAN with <b>' + a.need + ' hosts</b> receive?',
        exhibit: '',
        choices: choices([{ text: f(a.net) + '/' + a.p, correct: true }].concat(wrongs.map(function (w) { return { text: w, correct: false }; }))),
        explain: 'Largest first: ' + alloc.map(function (x) { return x.need + ' hosts → /' + x.p + ' (' + S.usable(x.p) + ' usable) at <code>' + f(x.net) + '</code>'; }).join('; ') + '. Each subnet starts where the previous one ends, and because they are allocated in size order every start address is aligned to its own block size.'
      };
    }
  };

  var TOPICS = [
    { id: 'mixed', label: 'Mixed' }, { id: 'mask', label: 'Choose a mask' }, { id: 'addr', label: 'Network & broadcast' }, { id: 'valid', label: 'Valid host' },
    { id: 'count', label: 'Subnets & hosts' }, { id: 'vlsm', label: 'VLSM' }, { id: 'summary', label: 'Summarisation' }, { id: 'wildcard', label: 'ACL wildcard' },
    { id: 'route', label: 'Routing table' }, { id: 'trouble', label: 'Troubleshooting' }, { id: 'private', label: 'Private addresses' }
  ];

  function question(topic) {
    if (!topic || topic === 'mixed') topic = pick(Object.keys(GEN));
    var q = GEN[topic]();
    q.choices = shuffle(q.choices);
    return q;
  }

  return { question: question, TOPICS: TOPICS, GENERATORS: Object.keys(GEN) };
})();

if (typeof module !== 'undefined') module.exports = EXAM;
