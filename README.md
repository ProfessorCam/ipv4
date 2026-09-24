# IPv4 Subnetting

Part of the Packet Lessons family, in the same shell as [Frames & Packets](https://github.com/ProfessorCam/frames).
Students click a row in the left column and get, in the right column, a plain-English lesson with a live
widget in it. Every number on the site is computed in the browser from the address the student types;
nothing is a lookup table.

Rows, grouped in the sidebar: **Bits and octets** (an address as 32 bits, with place values), **Mask and CIDR**
(the network/host split, `255.255.255.0` = `/24`, why "usable" is two less), **The CIDR slider** (drag from /16
to /32: /23 = 512, /24 = 256, /25 = 128, with mask, network, broadcast and a 32-bit strip updating live),
**Splitting a network** (one /24 into two /25s, four /26s, sixty-four /30s, every range listed),
**Private vs public** (the RFC 1918 ranges, CGNAT, NAT, plus an address classifier), **Special addresses**
(loopback, APIPA, multicast, SSDP, Miracast / Wi-Fi Direct, broadcast, 0.0.0.0, documentation ranges) and
**Try it yourself** (random questions such as "how many addresses are in 192.168.1.0/28?", checked as you
go, with the working shown and a bit strip on demand).

No frameworks, no build step: plain HTML, CSS and JavaScript. Published to GitHub Pages at
<https://professorcam.github.io/ipv4/> by `.github/workflows/pages.yml` on every push to `main`.

## Run it

Nothing on this site needs a server, so `site/index.html` opens straight from disk. To serve it:

```sh
docker compose up -d --build
```

Then open <http://127.0.0.1:8082>. Stop it with `docker compose down`. Or, from Docker Hub, in the foreground
(Ctrl+C stops and removes it):

```sh
docker run --rm -it --name ipv4 -p 8082:8082 professorcryan/ipv4
```

## Reading level (Simple | Moderate | Engineer)

The buttons at the top right of the page switch every explanation between three depths: **Simple**
(the big idea in plain words), **Moderate** (beginner CCNA student, the default) and **Engineer** (RFC
numbers, wildcard masks, /31 and CGNAT, kept short). The choice is stored in the browser, and a link such as
`index.html?level=simple` (or `moderate`, `engineer`) opens the site at that level.

The mechanism is `site/level.js`, identical on every Packet Lessons site. In `site/lessons.js` any piece of
prose can be a plain string (same at every level) or an object with `s`, `m` and `e` keys. A missing key
falls back to Moderate; an empty string leaves that paragraph out at that level. Rows refer to each other
with `{{row:id}}`. Widget captions use the same objects, with `{size}`, `{mask}`, `{net}` and similar
placeholders filled in from the live values.

## Layout

```
Dockerfile           nginx:alpine + the site directory
docker-compose.yml   one service, port 8082
nginx.conf           serves site/
site/
  index.html         page shell: left <nav>, right <main>
  style.css          the shared Packet Lessons theme, plus the widget styles at the end
  app.js             builds the nav, renders a lesson, draws and wires the widgets
  lessons.js         ALL teaching content lives here, one object per row
  level.js           the Simple | Moderate | Engineer toggle and the lv() text resolver
  subnet.js          the arithmetic: masks, networks, broadcasts, classification, question generator
```

## The maths

`site/subnet.js` has no DOM in it and is loaded by node as well as the browser, so it can be tested:

```sh
node -e "var S=require('./site/subnet.js'); console.log(S.blockSize(28), S.usable(28), S.fmtIp(S.maskOf(20)))"
# 16 14 255.255.240.0
```

Addresses are unsigned 32-bit integers. `network` is `ip AND mask`, `broadcast` is `network OR ~mask`,
block size is `2^(32 - prefix)`. `/31` counts both addresses as usable (RFC 3021) and `/32` counts one.
`classify()` walks the special-purpose ranges most-specific first, so `192.168.49.1` is reported as the
Miracast / Wi-Fi Direct group-owner subnet as well as RFC 1918 space.

## Adding a row

Append an object to `LESSONS` in `site/lessons.js`. The comment at the top of that file lists every key,
and the section keys `binary`, `anatomy`, `cidr`, `split`, `classify`, `quiz`, `table`, `steps` and
`columns` each drop a widget or block into the lesson.
