/*
 * lessons.js - the teaching content, one object per row in the left column.
 *
 *   id        short word used in the URL hash (#slider)
 *   stack     'basics' | 'cidr' | 'kinds' | 'practice': groups the left column and sets the chip
 *   chip      the small chip text on the row
 *   title     big label in the left column
 *   subtitle  one line under the title
 *   facts     [[label, text], ...] the two-column facts box under the title
 *   oneLiner  the whole idea in one sentence
 *   sections  [{ h: heading, p: [paragraphs, may contain <b> <code>], ... }]
 *     binary   - { ip, edit }: an address as four octets of bit boxes, with place values
 *     anatomy  - { kind: 'ip4', value, prefix, left, right }: colour-coded octet strip
 *     pow2     - { min, max, start }: bits-to-addresses slider drawn as blocks
 *     bgame    - true: the binary game (a clone of Cisco's), rows of bits against the clock
 *     cidr     - { ip, min, max, start }: the interactive prefix slider
 *     split    - { ip, parent, child }: carve one block into equal subnets
 *     classify - { presets: [...] }: type an address, learn which kind it is
 *     quiz     - { kinds: [...] }: the practice questions
 *     table    - [[cells...], ...] a small table (first row is the header)
 *     steps    - [text...] a numbered list
 *     columns  - [{ h, p: [...], cmd, after }] side-by-side boxes
 *     after    - paragraphs shown below all of the above
 *
 * Reading levels: any prose may be a plain string (the same at every level) or
 * { s: ..., m: ..., e: ... } for Simple / Moderate / Engineer. A missing key falls back
 * to m; '' leaves that paragraph out at that level. Refer to other rows as {{row:id}}.
 * See level.js. All numbers in the widgets come from subnet.js, not from this file.
 */
var SITE = {
  title: 'IPv4 Subnetting',
  image: 'professorcryan/ipv4',      /* Docker Hub image of this site */
  port: 8082,
  /* Top menu. href null = not built yet; current: true marks the site you are on. */
  menu: [
    { label: 'Frames & Packets', href: 'https://professorcam.github.io/frames/' },
    { label: 'Protocols', href: 'https://professorcam.github.io/pcap/' },
    { label: 'Encryption and Protocols', href: 'https://professorcam.github.io/encryption/' },
    { label: 'Packet Forensics', href: 'https://professorcam.github.io/forensics/' },
    { label: 'Server Basics', href: 'https://professorcam.github.io/servers/' },
    { label: 'IPv4 Subnetting', href: '#', current: true },
    { label: 'IPv6 Subnetting', href: 'https://professorcam.github.io/ipv6/' }
  ]
};

var LESSONS = [
  /* ------------------------------------------------------------------ bits */
  {
    id: 'bits',
    stack: 'basics',
    chip: 'bits',
    title: 'Bits and octets',
    subtitle: 'What the four numbers really are',
    facts: [
      ['How long', {
        s: '32 tiny switches, each on or off. We write them as four numbers from 0 to 255 with dots between.',
        m: '32 bits, written as four decimal numbers from 0 to 255 separated by dots. Each number is one byte, called an octet.',
        e: '32 bits, dotted-decimal: four octets, each 0 to 255. On the wire it is one big-endian 32-bit field in the IPv4 header.'
      }],
      ['Why 255', {
        s: 'Eight switches can be set 256 different ways, and we count from 0, so the biggest number is 255.',
        m: 'Eight bits have 2<sup>8</sup> = 256 combinations. Counting from 0, the highest value is 255.',
        e: '2<sup>8</sup> = 256 values per octet, 0x00 to 0xFF. Any octet above 255 is not an address.'
      }]
    ],
    oneLiner: {
      s: 'An IPv4 address is 32 on-or-off switches. The dots and the numbers are just a friendly way of writing them.',
      m: 'An IPv4 address is 32 bits. The dotted numbers you type are a shorthand for those bits, and every subnetting question is a question about which bits are which.',
      e: 'An IPv4 address is a 32-bit unsigned integer. Dotted-decimal is display notation; masks, prefixes and subnet boundaries are all defined on the bits.'
    },
    sections: [
      { h: 'Four numbers, thirty-two bits', p: {
        s: [
          'A computer address like <code>192.168.1.10</code> looks like four numbers. Underneath, each of the four is really eight switches that are on (1) or off (0). Four groups of eight makes 32 switches, and that is the whole address.',
          'Hover over any box below to see what it is worth. The boxes on the left of each group are worth more, the same way the left digit of 192 is worth more than the right one.'
        ],
        m: [
          'An IPv4 address is 32 bits long. We write it as four decimal numbers separated by dots because 32 ones and zeros are hard to read, but the dots are only for people. Each number is one <b>octet</b> (eight bits, one byte) and runs from 0 to 255.',
          'Inside an octet the bits have place values, exactly like decimal digits: 128, 64, 32, 16, 8, 4, 2, 1 from left to right. An octet\'s value is the sum of the place values of the bits that are 1. Hover over a bit below to see its value.'
        ],
        e: [
          'IPv4 addresses are 32-bit unsigned integers. Dotted-decimal splits the integer into four octets (most significant first) for display; the header carries the raw 32-bit field. Every subnetting operation, mask, prefix, network and broadcast, is a bitwise AND or OR on that integer.',
          'Bit weights within an octet are 2<sup>7</sup> to 2<sup>0</sup>: 128, 64, 32, 16, 8, 4, 2, 1. Type an address below to see it in binary.'
        ]
      }, binary: { ip: '192.168.1.10', edit: true }, after: {
        s: [
          'So <code>192</code> is <code>11000000</code>: the 128 switch and the 64 switch are on, 128 + 64 = 192. And <code>10</code> is <code>00001010</code>: 8 + 2.'
        ],
        m: [
          '<code>192</code> = 128 + 64 = <code>11000000</code>. <code>168</code> = 128 + 32 + 8 = <code>10101000</code>. <code>1</code> = <code>00000001</code>. <code>10</code> = 8 + 2 = <code>00001010</code>. Being able to do this quickly for the numbers 0, 128, 192, 224, 240, 248, 252, 254 and 255 is most of subnetting, because those are the only numbers that ever appear in a subnet mask.'
        ],
        e: [
          '<code>192.168.1.10</code> = <code>0xC0A8010A</code> = 3232235786. The mask octets you will meet are the eight values with a contiguous run of leading ones: 128, 192, 224, 240, 248, 252, 254, 255. Memorise them with their bit counts (1 to 8) and mask-to-prefix conversion becomes mental arithmetic.'
        ]
      }},
      { h: 'Powers of two', p: {
        s: [
          'Every time you add one more switch, the number of possible values doubles. Drag the slider and count the blocks: each block is one address.'
        ],
        m: [
          'Each extra bit doubles the number of values. Subnetting is nothing but this applied to the host bits: <i>n</i> host bits means 2<sup><i>n</i></sup> addresses in the block. Drag the slider and watch the block double and halve.'
        ],
        e: [
          '2<sup><i>n</i></sup> for <i>n</i> = 0 to 8 covers a single octet; beyond that keep doubling (2<sup>9</sup> = 512, 2<sup>10</sup> = 1024, 2<sup>16</sup> = 65,536, 2<sup>24</sup> = 16,777,216).'
        ]
      }, pow2: { min: 0, max: 10, start: 3 } }
    ]
  },

  /* ------------------------------------------------------------------ game */
  {
    id: 'game',
    stack: 'basics',
    chip: 'game',
    title: 'The binary game',
    subtitle: 'Octets to bits and back, against the clock',
    check: false,
    oneLiner: {
      s: 'A game for practising the switches. Rows pile up; make the switches add up to the number, or type what the switches make, before the board fills.',
      m: 'A clone of the classic Cisco Binary Game: rows of eight bits arrive on a clock, and you either toggle the bits to match a number or type the number the bits make. Same rules, levels and scoring as the original.',
      e: 'Cisco\'s Binary Game, rebuilt: 8-bit rows on a clock, toggle-to-match or type-the-value, seven rows on the board and the eighth ends it. Fluency here makes mask-to-prefix and block boundaries instant later.'
    },
    sections: [
      { h: 'How to play', p: {
        s: [
          'Press <b>Play Game</b>. Rows of eight switches pile up from the bottom. On most rows, flip the switches so their values add up to the number on the right. On some rows the switches are green and fixed: click the <b>?</b> and type the number they make. A solved row disappears. If eight rows pile up, the game ends.',
          'Start with the warm-up if this is your first go. The blue bar above the board tells you what each switch is worth: 128, 64, 32, 16, 8, 4, 2, 1.'
        ],
        m: [
          'Press <b>Play Game</b>. Rows arrive on a clock. In a <b>binary puzzle</b> the target is on the right and you toggle the amber bits until they add up to it. In a <b>decimal puzzle</b> the bits are fixed (green) and you click the <b>?</b> and type their value on the number pad, or on your keyboard. A solved row vanishes; with seven rows on the board, the next one ends the game.',
          'Each level needs more rows and the clock runs faster. From level 4 the guide numbers on the blue bar disappear, so get them into your head: 128, 64, 32, 16, 8, 4, 2, 1. Tip: work from the left. Is the number 128 or more? Turn on the 128 bit and subtract it. Do the same with 64, 32 and so on down to 1.'
        ],
        e: [
          'Binary rows: toggle bits to hit the target octet value (the starting pattern is a decoy from the same difficulty group). Decimal rows: click the <b>?</b>, type the value, Enter. 100 + 25 &times; (level &minus; 1) points per row, 250 for clearing the board, 15 + 5 &times; (level &minus; 1) rows per level, a new row every 12.4 s at level 1 down to 6 s. Level 1 is mostly single-bit values and 255; the mask octets 128, 192, 224, 240, 248, 252, 254 come in at level 2; the awkward 190s and 230s from level 5. Guide numbers vanish after level 3.',
          'Sound can be switched off on the panel; the effects are synthesised in the browser, nothing is downloaded.'
        ]
      }, bgame: true }
    ]
  },

  /* ------------------------------------------------------------------ mask */
  {
    id: 'mask',
    stack: 'basics',
    chip: 'mask',
    title: 'Mask and CIDR',
    subtitle: 'Which bits name the network, which bits name the host',
    facts: [
      ['Two ways to write it', {
        s: 'The long way, <code>255.255.255.0</code>, and the short way, <code>/24</code>. They mean exactly the same thing.',
        m: 'Dotted mask <code>255.255.255.0</code> or CIDR prefix <code>/24</code>. Both say "the first 24 bits are the network part".',
        e: 'Dotted-decimal mask or CIDR prefix length (RFC 4632). <code>/24</code> = <code>255.255.255.0</code> = 24 leading ones. Cisco ACLs and OSPF use the inverted wildcard mask, <code>0.0.0.255</code>.'
      }],
      ['What it decides', {
        s: 'Whether another computer is on your own network (talk directly) or somewhere else (send it to the router).',
        m: 'Whether a destination is on-link (deliver by MAC address) or remote (send to the default gateway). Every host applies its mask to every packet it sends.',
        e: 'The on-link test: (dst AND mask) == (own address AND mask). Match: resolve by ARP and deliver directly. No match: forward to the gateway. Also every routing table lookup is a longest-prefix match on the same idea.'
      }]
    ],
    oneLiner: {
      s: 'The mask draws a line through the 32 switches: everything to the left names the network, everything to the right names one machine on it.',
      m: 'The subnet mask splits the 32 bits into a network part and a host part. Machines with the same network part are on the same subnet; the host part tells them apart.',
      e: 'A prefix length partitions the 32-bit address into network bits (fixed across the subnet) and host bits (unique within it). The mask is those network bits as ones.'
    },
    sections: [
      { h: 'A line through the address', p: {
        s: [
          'Look at <code>192.168.1.10</code> with the usual home mask, <code>/24</code>. The first three numbers, coloured blue, are the network: they are the same on every machine in your house. The last number, coloured pink, is the host: it is different on each machine. Drag the slider to move the line, or type a different address, and watch the colours follow it.'
        ],
        m: [
          'Take <code>192.168.1.10</code> with a <code>/24</code> mask. The first 24 bits (three octets) are the <b>network portion</b>: identical on every host in the subnet. The last 8 bits are the <b>host portion</b>: unique to each machine. The mask does not travel in the packet; each host is configured with it and uses it locally. Move the slider to put the line anywhere from /8 to /32, and type any address you like: the octets, the mask and the bits all follow.'
        ],
        e: [
          '<code>192.168.1.10/24</code>: bits 0 to 23 are the network prefix, bits 24 to 31 the host identifier. The prefix is not carried in the IPv4 header; it is per-interface configuration (static, DHCP option 1, or derived from routing) and is only ever applied locally. Move the line: whenever <i>p</i> is not a multiple of 8 an octet is split, which is the case worth practising.'
        ]
      }, anatomy: { kind: 'ip4', value: '192.168.1.10', prefix: 24, left: 'the network part, the same on every machine in this subnet', right: 'the host part, different on every machine in this subnet' }, after: {
        s: [
          'Written as switches, the mask is a run of ones then a run of zeros: <code>11111111.11111111.11111111.00000000</code>. That is <code>255.255.255.0</code>, or "24 ones", which is why we can also just write <code>/24</code>.'
        ],
        m: [
          'The mask is that same line written as bits: ones over the network part, zeros over the host part. <code>11111111.11111111.11111111.00000000</code> is <code>255.255.255.0</code>. Because a valid mask is always a solid run of ones followed by zeros, you can describe it with a single number, the count of ones: <code>/24</code>. That is <b>CIDR notation</b> (Classless Inter-Domain Routing).',
          'When the line does not fall on a dot, one octet is split. <code>/20</code> is <code>11111111.11111111.11110000.00000000</code> = <code>255.255.240.0</code>: the third octet gives four bits to the network and four to the host. {{Row:slider}} shows that happening as you move the slider.'
        ],
        e: [
          'A valid mask is contiguous: <i>p</i> ones followed by 32 − <i>p</i> zeros. Prefix length <i>p</i> therefore encodes it completely (CIDR, RFC 4632; non-contiguous masks were legal in classful days and are rejected by modern stacks). Mask = 0xFFFFFFFF << (32 − <i>p</i>); wildcard = ~mask.',
          'When <i>p</i> is not a multiple of 8, one octet is split, and its mask value is one of 128, 192, 224, 240, 248, 252, 254. <code>/20</code> → <code>255.255.240.0</code>; <code>/27</code> → <code>255.255.255.224</code>. The old classful boundaries (/8, /16, /24 for A, B, C) are just the three cases where the split falls on a dot.'
        ]
      }},
      { h: 'The masks you will meet', p: {
        s: [
          'You do not have to memorise all of these. The pattern is what matters: each step to the right adds one switch to the network side and takes one away from the host side.'
        ],
        m: [
          'The full set for one octet. Each extra prefix bit halves the number of host addresses. The dotted form is what you type into a Windows or Linux network setting; the prefix is what routers, <code>ip addr</code> and every modern tool show.'
        ],
        e: [
          'Reference table. Wildcard masks (inverse) are what Cisco IOS ACLs and OSPF <code>network</code> statements take.'
        ]
      }, table: {
        s: [
          ['Prefix', 'Dotted mask', 'Addresses'],
          ['/8', '255.0.0.0', '16,777,216'],
          ['/16', '255.255.0.0', '65,536'],
          ['/24', '255.255.255.0', '256'],
          ['/25', '255.255.255.128', '128'],
          ['/26', '255.255.255.192', '64'],
          ['/27', '255.255.255.224', '32'],
          ['/28', '255.255.255.240', '16'],
          ['/29', '255.255.255.248', '8'],
          ['/30', '255.255.255.252', '4'],
          ['/32', '255.255.255.255', '1']
        ],
        m: [
          ['Prefix', 'Dotted mask', 'Addresses', 'Usable hosts'],
          ['/8', '255.0.0.0', '16,777,216', '16,777,214'],
          ['/16', '255.255.0.0', '65,536', '65,534'],
          ['/24', '255.255.255.0', '256', '254'],
          ['/25', '255.255.255.128', '128', '126'],
          ['/26', '255.255.255.192', '64', '62'],
          ['/27', '255.255.255.224', '32', '30'],
          ['/28', '255.255.255.240', '16', '14'],
          ['/29', '255.255.255.248', '8', '6'],
          ['/30', '255.255.255.252', '4', '2'],
          ['/31', '255.255.255.254', '2', '2 (point-to-point)'],
          ['/32', '255.255.255.255', '1', '1 (a single host)']
        ],
        e: [
          ['Prefix', 'Mask', 'Wildcard', 'Addresses', 'Usable'],
          ['/8', '255.0.0.0', '0.255.255.255', '2<sup>24</sup>', '2<sup>24</sup> − 2'],
          ['/16', '255.255.0.0', '0.0.255.255', '2<sup>16</sup>', '2<sup>16</sup> − 2'],
          ['/24', '255.255.255.0', '0.0.0.255', '256', '254'],
          ['/25', '255.255.255.128', '0.0.0.127', '128', '126'],
          ['/26', '255.255.255.192', '0.0.0.63', '64', '62'],
          ['/27', '255.255.255.224', '0.0.0.31', '32', '30'],
          ['/28', '255.255.255.240', '0.0.0.15', '16', '14'],
          ['/29', '255.255.255.248', '0.0.0.7', '8', '6'],
          ['/30', '255.255.255.252', '0.0.0.3', '4', '2'],
          ['/31', '255.255.255.254', '0.0.0.1', '2', '2 (RFC 3021)'],
          ['/32', '255.255.255.255', '0.0.0.0', '1', '1 (host route)']
        ]
      }, tableClass: 'compare nums', after: {
        s: '',
        m: [
          '<b>Why "usable" is two less.</b> In every block the first address (all host bits 0) is the <b>network address</b>, the name of the subnet itself, and the last (all host bits 1) is the <b>broadcast address</b>, which reaches every host in it. Neither can be given to a machine. The two exceptions, <code>/31</code> and <code>/32</code>, are explained in {{row:slider}}.'
        ],
        e: [
          'Host-bits-all-zero is the network (prefix) address; all-ones is the directed broadcast. Both are excluded from assignment except on /31 links (RFC 3021, no broadcast needed on point-to-point) and /32 host routes.'
        ]
      }}
    ]
  },

  /* ------------------------------------------------------------------ slider */
  {
    id: 'slider',
    stack: 'cidr',
    chip: 'cidr',
    title: 'The CIDR slider',
    subtitle: 'Move the line, watch the block halve and double',
    oneLiner: '',
    sections: [
      { cidr: { ip: '192.168.0.0', min: 8, max: 32, start: 24, caption: {
        s: 'With <b>/{p}</b> the network keeps {p} switches and leaves <b>{hb}</b> for hosts. {hb} switches can be set 2<sup>{hb}</sup> = <b>{size}</b> ways, so the block has {size} addresses. Take away the first and last and <b>{usable}</b> machines can use it.',
        m: '<b>/{p}</b> leaves <b>{hb} host bits</b>, so the block holds 2<sup>{hb}</sup> = <b>{size}</b> addresses, from <code>{net}</code> (the network address) to <code>{bc}</code> (broadcast). That leaves <b>{usable}</b> usable host addresses. The mask is <code>{mask}</code>.',
        e: '<b>/{p}</b>: mask <code>{mask}</code>, wildcard <code>{wild}</code>. 2<sup>{hb}</sup> = <b>{size}</b> addresses, <code>{net}</code> to <code>{bc}</code>; <b>{usable}</b> assignable. Next block starts at <code>{next}</code>.'
      } } },
      { h: 'The two odd ones: /31 and /32', p: {
        s: [
          'At the far right of the slider the usual "take away two" rule stops. <code>/31</code> has just two addresses and both are used, on a wire that joins exactly two routers. <code>/32</code> is one single machine.'
        ],
        m: [
          '<code>/31</code> has 2 addresses and no room for a network and broadcast address, so RFC 3021 lets a point-to-point link between two routers use both. <code>/32</code> is a single address: a host route, a loopback on a router, or the way a firewall rule names one machine. The usable count on this site follows those rules.'
        ],
        e: [
          '/31 (RFC 3021): both addresses assignable on point-to-point links; no directed broadcast exists, so nothing is lost. /32: a host route or loopback; usable = 1. Older gear may refuse /31; /30 (2 usable of 4) remains the conservative choice for router links.'
        ]
      }}
    ]
  },

  /* ------------------------------------------------------------------ carve */
  {
    id: 'carve',
    stack: 'cidr',
    chip: 'split',
    title: 'Splitting a network',
    subtitle: 'One /24 into two /25s, four /26s, eight /27s',
    facts: [
      ['How many pieces', {
        s: 'Each switch you move from host to network cuts every block in half. Move two, you get four pieces.',
        m: 'Borrow <i>b</i> host bits and you get 2<sup><i>b</i></sup> equal subnets. /24 → /26 borrows 2 bits: 4 subnets of 64.',
        e: 'Child prefix c from parent p yields 2<sup>c−p</sup> subnets of 2<sup>32−c</sup> addresses, at increments of the child block size.'
      }],
      ['Where they start', {
        s: 'The pieces line up neatly: 0, 64, 128, 192 for four pieces. Never at odd places like 100.',
        m: 'Each subnet starts at a multiple of its block size, counting up from the parent\'s network address.',
        e: 'Subnet k has network = parent + k × 2<sup>32−c</sup>. The increment is the "magic number": 256 − the interesting mask octet.'
      }]
    ],
    oneLiner: {
      s: 'Subnetting means taking one block of addresses and cutting it into equal smaller blocks, one per floor, room or team.',
      m: 'Subnetting borrows host bits to make network bits, cutting one address block into equal smaller blocks that a router can keep apart.',
      e: 'Subnetting extends the prefix within an allocated block, producing 2<sup>b</sup> aligned child prefixes from b borrowed bits, each independently routable.'
    },
    sections: [
      { h: 'Pick a parent and a child size', p: {
        s: [
          'Start with the whole network on the left and choose how small the pieces should be on the right. The table lists every piece: where it starts, where it ends, and how many machines fit in it.'
        ],
        m: [
          'Choose the block you were given (the parent) and the prefix you want to cut it into (the child). The table lists each resulting subnet with its network address, first and last usable host, broadcast address and host count. Try <code>/24</code> into <code>/26</code>, the exam favourite, then <code>/24</code> into <code>/30</code> to see 64 tiny router links.'
        ],
        e: [
          'Select parent and child prefixes; the table enumerates the child subnets (network, first, last, directed broadcast, usable). Beyond 64 rows the list is truncated; the total is shown. This is fixed-length subnetting; VLSM simply applies it recursively to different children.'
        ]
      }, split: { ip: '192.168.1.0', parent: 24, child: 26 }, after: {
        s: [
          'A shortcut people use: look at the last number of the mask and take it away from 256. For <code>255.255.255.192</code> that is 256 − 192 = 64, and the pieces start every 64: 0, 64, 128, 192.'
        ],
        m: [
          '<b>The shortcut.</b> Find the "interesting" octet of the mask (the one that is not 0 or 255) and subtract it from 256. That is the block size and the step between subnets. Mask <code>255.255.255.192</code>: 256 − 192 = 64, so the subnets are .0, .64, .128, .192. Mask <code>255.255.240.0</code>: 256 − 240 = 16 in the third octet, so the subnets are x.x.0.0, x.x.16.0, x.x.32.0 and so on. Any address falls in the subnet whose start is the largest multiple of the block size not above it: 192.168.1.77 with a block of 64 is in the .64 subnet.'
        ],
        e: [
          'Magic-number method: 256 − (interesting mask octet) = increment. For /26, 256 − 192 = 64; for /20, 256 − 240 = 16 in octet 3. Network = floor(octet / increment) × increment. Equivalent to the AND but faster by hand. VLSM: allocate largest subnets first, then split remaining blocks further; every child stays aligned to its own size.'
        ]
      }}
    ]
  },

  /* ------------------------------------------------------------------ public */
  {
    id: 'public',
    stack: 'kinds',
    chip: 'pub',
    title: 'Private vs public',
    subtitle: 'Why every house has a 192.168 and the internet does not care',
    facts: [
      ['Private ranges', {
        s: 'Three families of addresses that anyone may use indoors: <code>10.x.x.x</code>, <code>172.16</code> to <code>172.31</code>, and <code>192.168.x.x</code>.',
        m: '<code>10.0.0.0/8</code>, <code>172.16.0.0/12</code> and <code>192.168.0.0/16</code> (RFC 1918). Free to use inside any network; never routed on the internet.',
        e: 'RFC 1918: 10/8 (16.7 M), 172.16/12 (1 M, 172.16.0.0 to 172.31.255.255), 192.168/16 (65,536). Plus 100.64/10 (RFC 6598) for carrier NAT. All filtered at internet borders (bogons).'
      }],
      ['How they reach the internet', {
        s: 'Your router swaps your private address for its one public address on the way out, and swaps it back on the way in. That trick is called NAT.',
        m: 'Through NAT (Network Address Translation) at the router: many private addresses share one public one. The router keeps a table of which inside address started each conversation.',
        e: 'NAPT / PAT (RFC 3022): the CPE rewrites source address and port, keeps a translation table keyed on the 5-tuple, and reverses it on the return path. Consequence: no unsolicited inbound without port forwarding, UPnP or a relay.'
      }]
    ],
    oneLiner: {
      s: 'Private addresses are like room numbers: fine inside your building, meaningless to the postal service. Public addresses are the street addresses the whole world can reach.',
      m: 'Private addresses are reused in millions of networks at once and never appear on the internet; public addresses are unique worldwide. NAT at the edge lets the first kind borrow the second.',
      e: 'RFC 1918 space is non-unique and unrouted on the public internet; public space is uniquely allocated via IANA → RIR → ISP. NAT bridges the two and is the reason IPv4 has lasted this long.'
    },
    sections: [
      { h: 'Three private families', p: {
        s: [
          'Long ago it was decided that three groups of addresses would never be used on the internet, so anyone could use them at home or at work without asking. That is why your home network is almost certainly <code>192.168.0.x</code> or <code>192.168.1.x</code>, and why your neighbour\'s is too. The addresses do not clash because they never leave the house.'
        ],
        m: [
          'RFC 1918 (1996) set aside three blocks that are never routed on the public internet. Any organisation may use them internally without registration. Because packets carrying these addresses are dropped at internet borders, thousands of networks can use <code>192.168.1.0/24</code> at the same time without conflict.'
        ],
        e: [
          'RFC 1918 reserves three blocks, one per old class, for private internets. ISPs and IXPs filter them (with other bogons) at their edges. Uniqueness is only required within a routing domain, which matters the day two companies with overlapping 10/8 space merge or peer over a VPN.'
        ]
      }, tableClass: 'compare prose', table: {
        s: [
          ['Range', 'Written as', 'How big', 'Where you see it'],
          ['10.0.0.0 to 10.255.255.255', '10.0.0.0/8', 'about 16 million', 'big companies, schools, VPNs'],
          ['172.16.0.0 to 172.31.255.255', '172.16.0.0/12', 'about 1 million', 'Docker, some offices'],
          ['192.168.0.0 to 192.168.255.255', '192.168.0.0/16', '65,536', 'almost every home router']
        ],
        m: [
          ['Block', 'Range', 'Addresses', 'Old class', 'Typical use'],
          ['10.0.0.0/8', '10.0.0.0 to 10.255.255.255', '16,777,216', 'one A', 'enterprises, campuses, cloud VPCs, VPNs'],
          ['172.16.0.0/12', '172.16.0.0 to 172.31.255.255', '1,048,576', 'sixteen Bs', 'Docker bridges (172.17.0.0/16), mid-size offices'],
          ['192.168.0.0/16', '192.168.0.0 to 192.168.255.255', '65,536', '256 Cs', 'home and small-office routers'],
          ['100.64.0.0/10', '100.64.0.0 to 100.127.255.255', '4,194,304', '', 'ISP carrier-grade NAT (RFC 6598), not for your LAN']
        ],
        e: [
          ['Block', 'Range', 'Size', 'RFC', 'Notes'],
          ['10.0.0.0/8', '10.0.0.0 – 10.255.255.255', '2<sup>24</sup>', '1918', 'Often carved by site with /16 per site, /24 per VLAN'],
          ['172.16.0.0/12', '172.16.0.0 – 172.31.255.255', '2<sup>20</sup>', '1918', '172.32.x.x is public: the boundary trips people up'],
          ['192.168.0.0/16', '192.168.0.0 – 192.168.255.255', '2<sup>16</sup>', '1918', 'CPE defaults: 192.168.0.1, 192.168.1.1, 192.168.49.1 (Miracast GO)'],
          ['100.64.0.0/10', '100.64.0.0 – 100.127.255.255', '2<sup>22</sup>', '6598', 'Shared address space between CPE and ISP CGN; not RFC 1918, not for enterprise use']
        ]
      }, after: {
        s: '',
        m: [
          '<b>Watch the second block.</b> <code>172.16.0.0/12</code> is <code>172.16</code> to <code>172.31</code> inclusive. <code>172.15.x.x</code> and <code>172.32.x.x</code> are public addresses that belong to someone. The <code>/12</code> means the split falls inside the second octet: 16 = <code>00010000</code>, 31 = <code>00011111</code>, first four bits fixed.'
        ],
        e: [
          '172.16/12: second octet 0001xxxx, so 16 to 31 inclusive. 172.32/12 onwards is allocated public space. Similarly 100.64/10 covers second octet 01xxxxxx = 64 to 127.'
        ]
      }},
      { h: 'Public addresses and NAT', p: {
        s: [
          'A public address is one the whole internet can reach, like <code>8.8.8.8</code>. Your internet company gives your router one of those. When your laptop (say <code>192.168.1.23</code>) talks to a website, the router crosses out your private address and writes in its own public one, then remembers to give you the reply. That is <b>NAT</b>. From outside, your whole house looks like one computer.'
        ],
        m: [
          'Public addresses are allocated top-down: IANA to the five regional registries, registries to ISPs, ISPs to customers. Each is unique on the internet. There are only about 3.7 billion of them, which ran out around 2011, so nearly every home and office sits behind <b>NAT</b>: the router rewrites the private source address (and usually the port) to its single public address on the way out, keeps a table, and reverses the change on the way back.',
          'Consequences you will meet: a machine cannot be reached from the internet unless the router is told to forward a port to it; <code>whatismyip</code> shows the router\'s address, not yours; and two private networks with the same range cannot be joined by a VPN without renumbering one of them.'
        ],
        e: [
          'Allocation: IANA → RIR (ARIN, RIPE NCC, APNIC, LACNIC, AFRINIC) → LIR/ISP → end site. IANA\'s free pool was exhausted in February 2011; RIRs now run waiting lists and transfer markets. NAPT (RFC 3022) rewrites src IP:port, keeps state, and breaks end-to-end reachability: inbound requires static mapping, UPnP/NAT-PMP, hole punching (STUN/TURN) or a relay. CGNAT adds a second NAT layer at the ISP using 100.64/10, so many customers now have no public IPv4 at all.'
        ]
      }},
      { h: 'Try an address', p: {
        s: ['Type any address, or press one of the buttons, to find out whether it is private, public, or one of the special kinds explained in {{row:special}}.'],
        m: ['Type any address, or use the buttons, to classify it. Special ranges (loopback, link-local, multicast and friends) are covered in {{row:special}}.'],
        e: ['Classifier over the RFC 1918, 6598, 5737, 3927, 5771 and 1122 ranges, most specific match first.']
      }, classify: { presets: ['8.8.8.8', '192.168.1.1', '10.0.0.5', '172.31.255.1', '172.32.0.1', '100.64.1.1'] } }
    ]
  },

  /* ------------------------------------------------------------------ special */
  {
    id: 'special',
    stack: 'kinds',
    chip: 'spec',
    title: 'Special addresses',
    subtitle: 'Loopback, APIPA, multicast, Miracast and the rest',
    facts: [
      ['The ones to know cold', {
        s: '<code>127.0.0.1</code> means "this computer". <code>169.254.x.x</code> means "I asked for an address and nobody answered". <code>255.255.255.255</code> means "everyone nearby".',
        m: '<code>127.0.0.1</code> loopback; <code>169.254.0.0/16</code> APIPA / link-local (DHCP failed); <code>224.0.0.0/4</code> multicast; <code>255.255.255.255</code> limited broadcast; <code>0.0.0.0</code> "any" or "unknown".',
        e: '127/8 loopback (RFC 1122); 169.254/16 link-local (RFC 3927); 224/4 multicast (RFC 5771), 224.0.0/24 link-scope; 255.255.255.255 limited broadcast; 0.0.0.0/8 "this network"; 192.0.2/24, 198.51.100/24, 203.0.113/24 documentation (RFC 5737); 240/4 reserved.'
      }],
      ['Why they matter', {
        s: 'When something is broken, the address a machine ended up with is usually the first clue.',
        m: 'They are the addresses that show up when troubleshooting: an APIPA address means no DHCP, traffic to 239.255.255.250 is devices discovering each other, 127.0.0.1 never leaves the box.',
        e: 'Each maps to a diagnosis or a filter rule: APIPA → DHCP path broken; 224.0.0.x → link-local protocol chatter (OSPF, mDNS, SSDP); 0.0.0.0 in a bind() → all interfaces; 198.18/15 → lab traffic that should never escape.'
      }]
    ],
    oneLiner: {
      s: 'Some addresses are not for naming a machine at all. They are signals: talk to yourself, talk to everyone, I have no address, this is only an example.',
      m: 'A handful of IPv4 ranges are reserved for jobs other than naming a host: loopback, link-local fallback, multicast groups, broadcast and documentation. Recognising them on sight saves hours.',
      e: 'IANA\'s special-purpose registry (RFC 6890) carves out ranges with defined semantics and scope. Each has a reason to appear in a capture or a config, and each is filtered somewhere.'
    },
    sections: [
      { h: 'The reserved ranges', p: {
        s: ['Here they are, with what each one means when you see it.'],
        m: ['The ranges every network technician recognises on sight. Most-specific rule wins: <code>192.168.49.1</code> is private (RFC 1918) and also the usual Miracast group owner address.'],
        e: ['Per RFC 6890 / the IANA IPv4 Special-Purpose Address Registry, plus the well-known multicast groups you will see in every capture.']
      }, tableClass: 'compare prose', table: {
        s: [
          ['Range', 'Name', 'What it means'],
          ['127.0.0.1 (all of 127.x.x.x)', 'Loopback', 'This computer talking to itself. Never goes onto the network cable.'],
          ['169.254.x.x', 'APIPA', 'The machine asked for an address (DHCP) and got no answer, so it made one up. If you see this, DHCP is broken or the cable is out.'],
          ['224.x.x.x to 239.x.x.x', 'Multicast', 'Not one machine but a group. Used to find devices: TVs, printers, speakers.'],
          ['239.255.255.250', 'Device discovery (SSDP)', 'The group phones, PCs and smart TVs shout to when looking for each other. Miracast and screen-casting use this to find the screen.'],
          ['192.168.49.x', 'Miracast / Wi-Fi Direct', 'The private range a Miracast screen or Wi-Fi Direct printer uses for its own little network. 192.168.49.1 is the screen itself.'],
          ['255.255.255.255', 'Broadcast', 'Everyone on this network. How DHCP asks "is there a server here?"'],
          ['0.0.0.0', 'Nothing / anything', 'No address yet, or "every address" when a program listens on it.'],
          ['192.0.2.x, 198.51.100.x, 203.0.113.x', 'Examples only', 'Reserved for books and manuals so examples never hit a real machine.']
        ],
        m: [
          ['Range', 'Name', 'What it is for', 'Seen when'],
          ['127.0.0.0/8', 'Loopback', 'Traffic to the host itself. Handled in software; never reaches a network card. 127.0.0.1 is the usual one but the whole /8 works.', 'Local services (databases, dev web servers), <code>ping 127.0.0.1</code> to test the IP stack.'],
          ['169.254.0.0/16', 'Link-local, APIPA', 'Automatic Private IP Addressing. A host with no DHCP reply picks a random 169.254.x.x, checks it with ARP and uses it for the local link only. No default gateway.', 'Cable unplugged, DHCP server down, wrong VLAN. The classic "I have an IP but no internet".'],
          ['224.0.0.0/4', 'Multicast', 'One packet, many receivers who have joined the group. 224.0.0.0/24 is link-scope and never forwarded by routers.', '224.0.0.1 all hosts, 224.0.0.2 all routers, 224.0.0.5/6 OSPF, 224.0.0.251 mDNS (Bonjour, Avahi), 224.0.0.252 LLMNR.'],
          ['239.255.255.250', 'SSDP / UPnP', 'The Simple Service Discovery Protocol group (UDP 1900). Devices announce themselves and answer searches here.', 'Every capture on a home network. Casting, smart TVs, printers, media servers, and the discovery step before a Miracast session.'],
          ['192.168.49.0/24', 'Miracast / Wi-Fi Direct', 'Miracast runs over Wi-Fi Direct (P2P). The device acting as group owner, usually the display or dongle, runs a tiny DHCP server on this range and takes 192.168.49.1. Ordinary RFC 1918 space, by convention.', 'A laptop connected to a wireless display shows a second adapter with a 192.168.49.x address.'],
          ['255.255.255.255', 'Limited broadcast', 'Every host on the local link. Routers never forward it.', 'DHCP Discover from a host with no address yet (source 0.0.0.0, destination 255.255.255.255).'],
          ['0.0.0.0/8', '"This network" / unspecified', '0.0.0.0 means "no address" as a source, "any address" when a server binds to it, and the default route when written 0.0.0.0/0.', 'DHCP Discover source address; <code>netstat</code> listening on 0.0.0.0:80; the default route in a routing table.'],
          ['192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24', 'Documentation (TEST-NET-1/2/3)', 'Reserved so that examples in books and manuals never point at a real host.', 'Textbooks, RFCs, vendor docs. Should never appear on a live network.'],
          ['100.64.0.0/10', 'Shared address space (CGNAT)', 'Used between an ISP\'s carrier-grade NAT and its customers\' routers. Not public, not RFC 1918.', 'The WAN address on a home router behind CGNAT: you do not have a public IPv4 of your own.'],
          ['240.0.0.0/4', 'Reserved (Class E)', 'Never allocated. Most stacks refuse to use it.', 'Only in exam questions.']
        ],
        e: [
          ['Prefix', 'Name', 'RFC', 'Scope / forwardable', 'Notes'],
          ['0.0.0.0/8', '"This host on this network"', '1122 §3.2.1.3', 'src only, not forwardable', '0.0.0.0/32 as unspecified source (DHCPDISCOVER) and INADDR_ANY in bind(); 0.0.0.0/0 default route.'],
          ['10/8, 172.16/12, 192.168/16', 'Private-use', '1918', 'not globally routed', 'Bogon-filtered at borders. See {{row:public}}.'],
          ['100.64.0.0/10', 'Shared address space', '6598', 'routable within the ISP only', 'CGN inside; must not be used as RFC 1918 or announced globally.'],
          ['127.0.0.0/8', 'Loopback', '1122 §3.2.1.3', 'host-internal', 'Whole /8 valid; Linux binds 127.0.0.1/8 on lo. Packets with a 127/8 destination on the wire are dropped.'],
          ['169.254.0.0/16', 'Link-local', '3927', 'link only, not forwardable', 'Chosen pseudo-randomly from 169.254.1.0 to 169.254.254.255, ARP-probed before use. No gateway. Windows: APIPA; macOS/Linux: avahi-autoipd / zeroconf.'],
          ['192.0.0.0/24', 'IETF protocol assignments', '6890', 'varies', '192.0.0.0/29 DS-Lite, 192.0.0.8 IPv4 dummy, 192.0.0.170/171 NAT64 discovery.'],
          ['192.0.2/24, 198.51.100/24, 203.0.113/24', 'Documentation', '5737', 'none', 'TEST-NET-1/2/3. Filter and never assign.'],
          ['192.168.49.0/24', 'Wi-Fi Direct / Miracast GO', 'WFA P2P spec (convention)', 'link (P2P group)', 'The P2P Group Owner runs DHCP on this /24 and holds .1; Miracast (WFA Wi-Fi Display) sessions ride RTSP/RTP over it. Discovery beforehand may use SSDP 239.255.255.250 or mDNS on the infrastructure LAN.'],
          ['198.18.0.0/15', 'Benchmarking', '2544', 'lab only', 'Interconnect device testing. Should never leave a test bed.'],
          ['224.0.0.0/4', 'Multicast (Class D)', '5771', 'group scope', '224.0.0.0/24 link-local control (TTL 1, never forwarded): .1 all-hosts, .2 all-routers, .5/.6 OSPF, .9 RIPv2, .13 PIM, .18 VRRP, .22 IGMPv3, .251 mDNS, .252 LLMNR. 239/8 administratively scoped; 239.255.255.250 SSDP.'],
          ['240.0.0.0/4', 'Reserved (Class E)', '1112', 'none', 'Rejected as source or destination by most stacks; 255.255.255.255 sits at its top.'],
          ['255.255.255.255/32', 'Limited broadcast', '919, 922', 'link only, not forwardable', 'Distinct from the directed broadcast of a subnet (all host bits 1), which routers may forward but by default do not (RFC 2644).']
        ]
      }},
      { h: 'Try one', p: {
        s: ['Press a button or type an address to see which kind it is.'],
        m: ['Classify an address. The buttons cover one example from each row above.'],
        e: ['Most-specific-first lookup over the ranges in <code>subnet.js</code>.']
      }, classify: { presets: ['127.0.0.1', '169.254.10.20', '239.255.255.250', '224.0.0.251', '192.168.49.1', '255.255.255.255', '0.0.0.0', '203.0.113.9', '198.18.0.1', '240.0.0.1'] } }
    ]
  },

  /* ------------------------------------------------------------------ practice */
  {
    id: 'practice',
    stack: 'practice',
    chip: 'quiz',
    title: 'Try it yourself',
    subtitle: 'Random questions, checked as you go',
    facts: [
      ['The method', {
        s: '1. Count the host switches: 32 minus the slash number. 2. Double 1 that many times. 3. Take away 2 for the machines that can use it.',
        m: '1. Host bits = 32 − prefix. 2. Addresses = 2<sup>host bits</sup>. 3. Usable = addresses − 2. 4. Block size = 256 − interesting mask octet; network = the multiple of it at or below the address; broadcast = next network − 1.',
        e: 'h = 32 − p; size = 2<sup>h</sup>; usable = size − 2 (p ≤ 30). net = ip AND mask; bcast = net OR ~mask; first = net + 1; last = bcast − 1. /31: both usable; /32: one.'
      }],
      ['Difficulty', {
        s: 'Easy sticks to friendly home networks. Medium and Hard move the line into the other numbers.',
        m: 'Easy: /24 to /30 inside a familiar /24. Medium: /16 to /30 on a random host address. Hard: /8 to /32, including /31 and /32.',
        e: 'Easy: p ∈ [24,30], aligned blocks in RFC 1918 /24s. Medium: p ∈ [16,30], arbitrary host. Hard: p ∈ [8,32], arbitrary address, so octets 2 and 3 split too.'
      }]
    ],
    oneLiner: {
      s: 'Practice until "how many addresses in a /28?" is as quick as "what is 7 times 8?".',
      m: 'Random subnetting questions of the four kinds that appear in every networking exam, with the working shown after each answer.',
      e: 'Generated drill over size, usable count, network/broadcast and first/last/mask, with the bit-level derivation revealed on demand.'
    },
    sections: [
      { h: 'Questions', p: {
        s: [
          'Pick what kind of question you want and how hard. Type your answer and press Enter. If you get stuck, "Show me how" draws the switches for that exact question.'
        ],
        m: [
          'Choose a question type and difficulty, type your answer and press Enter or Check. After each answer the working is shown at your current reading level. "Show me how" draws the 32-bit strip for the question so you can see where the line falls. Your score is kept for this browser tab only.'
        ],
        e: [
          'Question type, difficulty, answer, Enter. The feedback shows the derivation; "Show me how" renders the bit strip and mask for the question. Answers are lenient about whitespace and thousands separators. Score persists per tab (sessionStorage).'
        ]
      }, quiz: { kinds: ['size', 'usable', 'netbc', 'range'] } },
      { h: 'Worked example: 192.168.1.0/28', p: {
        s: [
          '<b>Step 1.</b> 32 − 28 = 4 host switches.',
          '<b>Step 2.</b> 4 switches can be set 2 × 2 × 2 × 2 = <b>16</b> ways, so 16 addresses.',
          '<b>Step 3.</b> The first one (.0) is the network\'s own name and the last one (.15) is for shouting to everyone, so <b>14</b> machines can use it.',
          '<b>Step 4.</b> The 16 addresses run from 192.168.1.0 to 192.168.1.15. The next block of 16 starts at .16.'
        ],
        m: [
          '<b>Host bits.</b> 32 − 28 = 4.',
          '<b>Addresses.</b> 2<sup>4</sup> = <b>16</b>. Mask <code>255.255.255.240</code> (240 = 11110000, four ones in the last octet).',
          '<b>Usable.</b> 16 − 2 = <b>14</b>.',
          '<b>Network and broadcast.</b> Block size 256 − 240 = 16, so /28 blocks start at .0, .16, .32 … The address .0 is already aligned: network <code>192.168.1.0</code>, broadcast <code>192.168.1.15</code>, hosts <code>.1</code> to <code>.14</code>.',
          'Same question for <code>192.168.1.77/28</code>: 77 ÷ 16 = 4 remainder 13, so the block starts at 4 × 16 = 64. Network <code>.64</code>, broadcast <code>.79</code>, hosts <code>.65</code> to <code>.78</code>.'
        ],
        e: [
          '192.168.1.0/28: mask 0xFFFFFFF0 = 255.255.255.240, wildcard 0.0.0.15. Size 2<sup>4</sup> = 16, usable 14. net = .0 AND .240 = .0; bcast = .0 OR .15 = .15; hosts .1 to .14.',
          '192.168.1.77/28: 77 = 0100<b>1101</b>; clear the low four bits → 0100<b>0000</b> = 64. net .64, bcast .79, hosts .65 to .78. In hex: 0x4D AND 0xF0 = 0x40.'
        ]
      }}
    ]
  },

  /* ------------------------------------------------------------------ exam */
  {
    id: 'exam',
    stack: 'practice',
    chip: 'CCNA',
    check: false,
    title: 'Exam practice',
    subtitle: 'CCNA-style multiple choice, with fresh numbers every time',
    facts: [
      ['What these are like', {
        s: 'The kind of questions on the Cisco CCNA test: a short scenario, four answers, one right.',
        m: 'Scenario questions in the style of the CCNA (200-301) exam: choose a mask for a host count, find network and broadcast, spot a misconfigured PC, pick the longest-match route, write an ACL wildcard, summarise routes, allocate with VLSM.',
        e: 'CCNA 200-301 item styles for IPv4 addressing: mask selection, address arithmetic, VLSM allocation, route summarisation, wildcard masks, longest-prefix match and host misconfiguration exhibits. Every value is generated, so distractors change each time.'
      }],
      ['How to use them', {
        s: 'Pick an answer, press Check, read why. Then Next. Work until you get ten in a row.',
        m: 'Pick a topic or leave it on Mixed, choose an answer and press Check. The explanation shows the working the exam expects you to do in your head. Aim for a run of ten correct before the real thing.',
        e: 'Answer, check, read the derivation. The distractors are the classic errors (mask instead of wildcard, off-by-one host bits, unaligned summary, gateway outside the subnet); if one tempts you, that is the concept to revisit.'
      }]
    ],
    oneLiner: {
      s: 'Practice questions that look and feel like the real certification exam.',
      m: 'Multiple-choice questions in the CCNA style covering everything on this site, generated with new numbers every time.',
      e: 'Generated CCNA-style items with plausible distractors, covering mask selection, address arithmetic, VLSM, summarisation, ACL wildcards, longest match and troubleshooting.'
    },
    sections: [
      { h: 'Questions', p: {
        s: ['Read the question, choose one answer, press Check.'],
        m: ['One question at a time. Some have an exhibit, as on the exam. Your score is kept for this browser tab.'],
        e: ['Single-answer items. Exhibits are rendered inline. Score persists per tab (sessionStorage).']
      }, exam: {} },
      { h: 'The methods the exam expects', p: {
        s: [
          '<b>Choose a mask:</b> add 2 to the hosts you need, then find the next power of two. That many host bits.',
          '<b>Find the block:</b> 256 minus the interesting mask number is the step. Count up in steps until you pass the address; the network is the last step you did not pass.',
          '<b>Which route:</b> the most specific matching route wins, however the table is ordered.',
          '<b>Wildcard:</b> 255.255.255.255 minus the mask.'
        ],
        m: [
          '<b>Mask for N hosts.</b> 2<sup>h</sup> − 2 ≥ N; the smallest h that works gives the prefix 32 − h. 60 hosts → 2<sup>6</sup> − 2 = 62 → /26.',
          '<b>Network of a host.</b> Block size = 256 − interesting octet of the mask. Network = the largest multiple of the block size not above the host\'s octet. Broadcast = next network − 1.',
          '<b>VLSM.</b> Sort the requirements largest first, size each subnet by the rule above, and place them back to back starting at the block\'s network address. Alignment takes care of itself.',
          '<b>Summarisation.</b> For k consecutive /24s starting on a multiple of k, the summary is /(24 − log<sub>2</sub> k).',
          '<b>Wildcard.</b> 255.255.255.255 − mask, or "block size − 1" in the interesting octet.',
          '<b>Longest match.</b> Every matching route is a candidate; the longest prefix wins. The default route matches everything and wins only when nothing else does.',
          '<b>Troubleshooting exhibits.</b> Check three things for each host: is the address a valid host in its subnet, do the masks agree, and is the gateway inside the subnet.'
        ],
        e: [
          'h = ⌈log<sub>2</sub>(N + 2)⌉, p = 32 − h. Network = ip AND mask; broadcast = network OR ~mask. VLSM: allocate in descending size for natural alignment. Summary of 2<sup>k</sup> aligned /24s = /(24 − k). Wildcard = ~mask. FIB lookup = longest prefix match, 0.0.0.0/0 last. Host checks: address ∈ (network, broadcast), mask consistency, gateway on-link.'
        ]
      }}
    ]
  }
];
