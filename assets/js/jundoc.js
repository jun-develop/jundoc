// jundoc — shared runtime for every doc page: shell (menu, language, theme, table of
// contents), code highlighting, copy buttons, tabs, animated wires and step players.
(function () {
  "use strict";

  const root = document.documentElement;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  // ------------------------------------------------------------------ language & theme
  // Runs before first paint (script is loaded in <head>) to avoid a flash of both languages.
  const urlLang = new URLSearchParams(location.search).get("lang");
  let lang = urlLang || store.get("jd-lang") || ((navigator.language || "").startsWith("vi") ? "vi" : "en");
  if (lang !== "vi") lang = "en";
  root.dataset.lang = lang;
  root.lang = lang;

  const savedTheme = store.get("jd-theme");
  if (savedTheme === "light" || savedTheme === "dark") root.dataset.theme = savedTheme;

  const listeners = { lang: [] };
  const JD = (window.JD = { on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); } });

  function setLang(next) {
    lang = next;
    root.dataset.lang = next;
    root.lang = next;
    store.set("jd-lang", next);
    document.querySelectorAll(".jd-seg [data-lang-btn]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.langBtn === next)));
    listeners.lang.forEach((fn) => fn(next));
  }

  function isDark() {
    if (root.dataset.theme) return root.dataset.theme === "dark";
    return matchMedia("(prefers-color-scheme: dark)").matches;
  }

  // both-language helper: {en, vi} | string -> HTML
  function bi(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    return `<span lang="en">${v.en}</span><span lang="vi">${v.vi}</span>`;
  }
  JD.bi = bi;

  function toast(msg) {
    let t = document.querySelector(".jd-toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "jd-toast";
      document.body.appendChild(t);
    }
    t.innerHTML = bi(msg);
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 1400);
  }

  function copy(text) {
    const done = () => toast({ en: "Copied", vi: "Đã sao chép" });
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { /* ignore */ }
    ta.remove();
  }

  // ------------------------------------------------------------------ shell
  function buildShell() {
    const app = document.getElementById("jd-app");
    if (!app) return;
    const base = app.dataset.root || ".";
    const article = app.querySelector(".jd-content");

    const top = document.createElement("header");
    top.className = "jd-topbar";
    top.innerHTML = `
      <button class="jd-btn jd-menu-btn" type="button" aria-label="Menu">☰</button>
      <a class="jd-brand" href="${base}/index.html"><span class="jd-logo">◆</span>Jundoc
        <span class="jd-brand-sub" style="font-weight:600;font-size:13px;color:var(--muted)">${bi({ en: "· docs for Jungo & Junkit", vi: "· tài liệu cho Jungo & Junkit" })}</span></a>
      <span class="jd-spacer"></span>
      <div class="jd-seg" role="group" aria-label="Language">
        <button type="button" data-lang-btn="en" aria-pressed="${lang === "en"}">EN</button>
        <button type="button" data-lang-btn="vi" aria-pressed="${lang === "vi"}">VI</button>
      </div>
      <button class="jd-btn jd-theme-btn" type="button" aria-label="Toggle theme"></button>`;

    const layout = document.createElement("div");
    layout.className = "jd-layout";
    const side = document.createElement("nav");
    side.className = "jd-sidebar";
    side.innerHTML = renderNav(base);
    const main = document.createElement("main");
    main.className = "jd-main";
    main.appendChild(article);
    const toc = document.createElement("aside");
    toc.className = "jd-toc";
    layout.append(side, main, toc);
    app.replaceWith(top, layout);

    top.querySelectorAll("[data-lang-btn]").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.langBtn)));
    const themeBtn = top.querySelector(".jd-theme-btn");
    const paintThemeBtn = () => { themeBtn.textContent = isDark() ? "☀︎" : "☾"; };
    paintThemeBtn();
    themeBtn.addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      root.dataset.theme = next;
      store.set("jd-theme", next);
      paintThemeBtn();
    });
    top.querySelector(".jd-menu-btn").addEventListener("click", () => document.body.classList.toggle("nav-open"));
    side.addEventListener("click", (e) => { if (e.target.closest("a")) document.body.classList.remove("nav-open"); });

    buildToc(toc, article);
  }

  function renderNav(base) {
    // Cloudflare serves /a/b.html as /a/b and /a/index.html as /a/, so compare without them
    const clean = (p) => p.replace(/\\/g, "/").replace(/(index)?\.html$/, "").replace(/\/+$/, "");
    const here = clean(location.pathname);
    return (window.JUNDOC_NAV || []).map((g) => {
      let hasActive = false;
      const items = g.items.map((it) => {
        const color = `var(--${it.color || "purple"})`;
        if (it.soon || !it.href) {
          return `<span class="jd-nav-link is-soon"><span class="dot" style="color:${color}"></span>${bi(it.title)}<span class="jd-soon">${bi({ en: "soon", vi: "sắp có" })}</span></span>`;
        }
        const active = it.href === "index.html" ? here === "" || /\/jundoc$/.test(here) : here.endsWith("/" + clean(it.href));
        hasActive = hasActive || active;
        return `<a class="jd-nav-link${active ? " is-active" : ""}" href="${base}/${it.href}"><span class="dot" style="color:${color}"></span>${bi(it.title)}</a>`;
      }).join("");
      if (g.items.length < 2) return `<div class="jd-nav-group"><div class="jd-nav-title">${bi(g.group)}</div>${items}</div>`;
      // name="jd-nav" makes the browser keep only one group open at a time
      return `<details class="jd-nav-group" name="jd-nav"${hasActive ? " open" : ""}><summary class="jd-nav-title">${bi(g.group)}<span class="jd-nav-count">${g.items.length}</span></summary>${items}</details>`;
    }).join("");
  }

  function buildToc(toc, article) {
    const sections = [...article.querySelectorAll("section[id]")];
    if (!sections.length) { toc.remove(); return; }
    toc.innerHTML = `<div class="jd-toc-title">${bi({ en: "On this page", vi: "Trong trang này" })}</div>` +
      sections.map((s) => {
        const h = s.querySelector("h2");
        return `<a href="#${s.id}" data-toc="${s.id}">${h ? h.innerHTML : s.id}</a>`;
      }).join("");
    const links = new Map([...toc.querySelectorAll("a")].map((a) => [a.dataset.toc, a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          links.forEach((a) => a.classList.remove("is-active"));
          const a = links.get(en.target.id);
          if (a) a.classList.add("is-active");
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    sections.forEach((s) => io.observe(s));
  }

  // ------------------------------------------------------------------ code highlighting
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const RULES = {
    go: [
      [/\/\/[^\n]*/y, "c"],
      [/`[^`]*`|"(?:\\.|[^"\\\n])*"/y, "s"],
      [/\bfx\.[A-Za-z]+/y, "f"],
      [/\b(?:func|return|type|struct|var|package|import|if|nil|error|go|interface|range|for|const)\b/y, "k"],
      [/\b\d+\b/y, "n"],
    ],
    bash: [
      [/^\$ /my, "p"],
      [/#[^\n]*/y, "c"],
      [/"[^"\n]*"|'[^'\n]*'/y, "s"],
      [/\bmake\b/y, "k"],
    ],
    json: [
      [/"(?:\\.|[^"\\])*"(?=\s*:)/y, "key"],
      [/"(?:\\.|[^"\\])*"/y, "s"],
      [/\/\/[^\n]*/y, "c"],
      [/\b(?:true|false|null)\b/y, "k"],
      [/-?\b\d+(?:\.\d+)?\b/y, "n"],
    ],
    sql: [
      [/--[^\n]*/y, "c"],
      [/'(?:''|[^'])*'/y, "s"],
      [/\b(?:SELECT|FROM|WHERE|AND|OR|NOT|NULL|IS|INSERT|INTO|VALUES|UPDATE|SET|DELETE|RETURNING|ALTER|TABLE|ADD|DROP|COLUMN|IF|EXISTS|DEFAULT|BIGINT|ORDER|BY|LIMIT|OFFSET)\b/y, "k"],
      [/\b\d+\b/y, "n"],
    ],
    js: [
      [/\/\/[^\n]*/y, "c"],
      [/`[^`]*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/y, "s"],
      [/\b(?:const|let|async|await|function|return|if|else|throw|new|export|import|from)\b/y, "k"],
      [/\b\d+\b/y, "n"],
    ],
    tree: [
      [/[├└│─]+/y, "c"],
      [/#[^\n]*/y, "c"],
    ],
  };
  function highlight(code, langName) {
    const rules = RULES[langName];
    if (!rules) return esc(code);
    let out = "", plain = "", i = 0;
    while (i < code.length) {
      let hit = null;
      for (const [re, cls] of rules) {
        re.lastIndex = i;
        const m = re.exec(code);
        if (m && m[0].length) { hit = [m[0], cls]; break; }
      }
      if (hit) {
        out += esc(plain) + `<span class="tok-${hit[1]}">${esc(hit[0])}</span>`;
        plain = "";
        i += hit[0].length;
      } else {
        plain += code[i++];
      }
    }
    return out + esc(plain);
  }
  JD.highlight = highlight;

  // "1,3-5" -> [1, 3, 4, 5]
  function parseLines(spec) {
    const out = [];
    spec.split(",").forEach((part) => {
      const [a, b] = part.split("-").map(Number);
      if (!a) return;
      for (let n = a; n <= (b || a); n++) out.push(n);
    });
    return out;
  }

  // [data-code="#pre-id" data-show="2-4"]: hovering / clicking the element spotlights those
  // lines in the target code block.
  function enhanceExplain() {
    document.querySelectorAll("[data-code][data-show]").forEach((item) => {
      const pres = document.querySelectorAll(item.dataset.code);
      if (!pres.length) return;
      const lines = parseLines(item.dataset.show);
      const group = item.closest(".jd-explain");
      const on = () => {
        if (group) {
          group.querySelectorAll(".jd-ex").forEach((x) => { if (x !== item) x.classList.remove("is-active"); });
        } else {
          document.querySelectorAll(`[data-code="${item.dataset.code}"]`).forEach((x) => x.classList.remove("is-active"));
        }
        item.classList.add("is-active");
        pres.forEach((pre) => {
          pre.classList.add("has-focus");
          pre.querySelectorAll(".ln").forEach((ln) => ln.classList.toggle("is-focus", lines.includes(Number(ln.dataset.n))));
        });
      };
      const off = () => {
        if (item.classList.contains("is-pinned")) return;
        item.classList.remove("is-active");
        pres.forEach((pre) => pre.classList.remove("has-focus"));
      };
      item.tabIndex = 0;
      item.addEventListener("mouseenter", on);
      item.addEventListener("focus", on);
      item.addEventListener("mouseleave", off);
      item.addEventListener("blur", off);
      item.addEventListener("click", () => {
        const pinned = item.classList.contains("is-pinned");
        if (group) {
          group.querySelectorAll(".jd-ex").forEach((x) => x.classList.remove("is-pinned"));
          group.querySelectorAll("[data-code]").forEach((ex) => {
            document.querySelectorAll(ex.dataset.code).forEach((p) => p.classList.remove("has-focus"));
          });
        } else {
          document.querySelectorAll(`[data-code="${item.dataset.code}"]`).forEach((x) => x.classList.remove("is-pinned"));
        }
        if (!pinned) { item.classList.add("is-pinned"); on(); } else { off(); }
      });
    });
  }

  function enhanceCode() {
    document.querySelectorAll("pre[data-hl]").forEach((pre) => {
      const raw = pre.textContent.replace(/^\n/, "").replace(/\s+$/, "");
      pre.dataset.raw = raw;
      let html = highlight(raw, pre.dataset.hl);
      const marks = parseLines(pre.dataset.lines || "");
      html = html.split("\n").map((l, k) =>
        `<span class="ln${marks.includes(k + 1) ? " line-hl" : ""}" data-n="${k + 1}">${l}</span>`).join("\n");
      pre.innerHTML = html;
    });
    document.querySelectorAll(".jd-term[data-copy]").forEach((term) => {
      const bar = term.querySelector(".jd-term-bar");
      if (!bar) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "jd-copy";
      btn.innerHTML = bi({ en: "Copy", vi: "Sao chép" });
      btn.addEventListener("click", () => {
        const pre = term.querySelector("pre");
        let text = pre.dataset.raw || pre.textContent;
        if (term.dataset.copy === "commands") {
          text = text.split("\n").filter((l) => !/^\s*#/.test(l) && l.trim()).map((l) => l.replace(/^\$ /, "")).join("\n");
        }
        copy(text);
      });
      bar.appendChild(btn);
    });
  }

  // ------------------------------------------------------------------ tabs
  function enhanceTabs() {
    document.querySelectorAll(".jd-tabs").forEach((box) => {
      // :scope keeps nested tab boxes independent
      const tabs = [...box.querySelectorAll(":scope > .jd-tablist > .jd-tab")];
      const panels = [...box.querySelectorAll(":scope > .jd-tabpanel")];
      tabs.forEach((t, k) => t.addEventListener("click", () => {
        tabs.forEach((x, j) => x.setAttribute("aria-selected", String(j === k)));
        panels.forEach((p, j) => { p.hidden = j !== k; });
      }));
    });
  }

  // ------------------------------------------------------------------ wires
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SVGNS = "http://www.w3.org/2000/svg";
  const packets = [];
  const colorOf = (c) => (c && c.startsWith("#") ? c : `var(--${c || "blue"})`);

  function rel(el, host) {
    const r = el.getBoundingClientRect(), h = host.getBoundingClientRect();
    return { l: r.left - h.left, t: r.top - h.top, r: r.right - h.left, b: r.bottom - h.top, w: r.width, h: r.height };
  }

  function route(a, b, dir) {
    if (dir === "s") {
      // S-curve from bottom center of a to top center of b
      const s = { x: a.l + a.w / 2, y: a.b };
      const e = { x: b.l + b.w / 2, y: b.t };
      const midY = (s.y + e.y) / 2;
      return `M${s.x},${s.y} C${s.x},${midY} ${e.x},${midY} ${e.x},${e.y}`;
    }
    if (dir === "l") {
      // bulge out to the left of both boxes — used to link lines of code
      const s = { x: a.l, y: a.t + a.h / 2 }, e = { x: b.l, y: b.t + b.h / 2 };
      const x = Math.min(s.x, e.x) - Math.max(64, Math.abs(e.y - s.y) * 0.6);
      return `M${s.x},${s.y} C${x},${s.y} ${x},${e.y} ${e.x},${e.y}`;
    }
    const apart = b.l >= a.r - 2 || a.l >= b.r - 2;
    const horizontal = dir === "h" || (dir !== "v" && apart);
    let s, e, d;
    if (horizontal) {
      const right = b.l >= a.r - 2 || (b.l + b.w / 2 > a.l + a.w / 2);
      s = { x: right ? a.r : a.l, y: a.rowY ?? (a.t + a.h / 2) };
      e = { x: right ? b.l : b.r, y: b.rowY ?? (b.t + b.h / 2) };
      const c = Math.max(24, Math.abs(e.x - s.x) / 2);
      const k = right ? 1 : -1;
      d = `M${s.x},${s.y} C${s.x + c * k},${s.y} ${e.x - c * k},${e.y} ${e.x},${e.y}`;
    } else {
      const down = b.t + b.h / 2 >= a.t + a.h / 2;
      s = { x: a.l + a.w / 2, y: down ? a.b : a.t };
      e = { x: b.l + b.w / 2, y: down ? b.t : b.b };
      const c = Math.max(18, Math.abs(e.y - s.y) / 2);
      const k = down ? 1 : -1;
      d = `M${s.x},${s.y} C${s.x},${s.y + c * k} ${e.x},${e.y - c * k} ${e.x},${e.y}`;
    }
    return d;
  }

  function drawWires(host) {
    let defs;
    try { defs = JSON.parse(host.dataset.wires); } catch (e) { console.error("jundoc: bad data-wires", host, e); return; }
    let svg = host.querySelector(":scope > svg.jd-wires");
    if (!svg) {
      svg = document.createElementNS(SVGNS, "svg");
      svg.setAttribute("class", "jd-wires");
      host.prepend(svg);
    }
    svg.innerHTML = "";
    (host._packets || []).forEach((p) => { p.el.remove(); p.dead = true; });
    host._packets = [];

    // Create defs for SVG arrowhead markers
    const defsEl = document.createElementNS(SVGNS, "defs");
    svg.appendChild(defsEl);

    defs.forEach((def, idx) => {
      const a = host.querySelector(`[data-node="${def.from}"]`);
      const b = host.querySelector(`[data-node="${def.to}"]`);
      if (!a || !b || !a.offsetParent || !b.offsetParent) return;

      const aRel = rel(a, host);
      const bRel = rel(b, host);
      if (def.dir !== "s" && def.dir !== "v") {
        const fromRow = a.querySelector(".row-provides");
        const toRow = b.querySelector(".row-needs");
        if (fromRow) {
          const fr = rel(fromRow, host);
          aRel.rowY = fr.t + fr.h / 2;
        }
        if (toRow) {
          const tr = rel(toRow, host);
          bRel.rowY = tr.t + tr.h / 2;
        }
      }

      const d = route(aRel, bRel, def.dir);
      const color = colorOf(def.color);
      const colorKey = def.color || "blue";

      // SVG arrowhead marker pointing into consumer
      const markerId = `jd-arrow-${colorKey}`;
      if (!defsEl.querySelector(`#${markerId}`)) {
        const m = document.createElementNS(SVGNS, "marker");
        m.setAttribute("id", markerId);
        m.setAttribute("viewBox", "0 0 10 10");
        m.setAttribute("refX", "7");
        m.setAttribute("refY", "5");
        m.setAttribute("markerWidth", "6");
        m.setAttribute("markerHeight", "6");
        m.setAttribute("orient", "auto-start-reverse");
        const pth = document.createElementNS(SVGNS, "path");
        pth.setAttribute("d", "M 0 1.5 L 8 5 L 0 8.5 z");
        pth.setAttribute("fill", color);
        m.appendChild(pth);
        defsEl.appendChild(m);
      }

      const base = document.createElementNS(SVGNS, "path");
      base.setAttribute("d", d);
      base.setAttribute("class", "jd-wire-base");
      base.style.stroke = color;
      if (def.wireId) base.setAttribute("data-wire-id", def.wireId);

      const path = document.createElementNS(SVGNS, "path");
      path.setAttribute("d", d);
      path.setAttribute("class", "jd-wire" + (def.dashed ? " is-dashed" : ""));
      path.style.stroke = color;
      path.setAttribute("marker-end", `url(#${markerId})`);
      if (def.wireId) path.setAttribute("data-wire-id", def.wireId);

      svg.append(base, path);
      if (!def.label) return;
      const el = document.createElement("span");
      el.className = "jd-packet";
      el.style.setProperty("--c", color);
      if (def.color === "yellow" || color.includes("yellow")) {
        el.style.setProperty("--c-ink", "#0f172a");
        el.style.color = "#0f172a";
      }
      el.innerHTML = bi(def.label);
      host.appendChild(el);
      const p = { el, path, host, to: b, len: path.getTotalLength(), dur: def.dur || 2800, phase: (def.delay || idx * 450), w: el.offsetWidth, h: el.offsetHeight, last: 0 };
      host._packets.push(p);
      packets.push(p);
      if (reduced) place(p, 0.5);
    });
  }

  function place(p, t) {
    const pt = p.path.getPointAtLength(t * p.len);
    p.el.style.transform = `translate(${pt.x - p.w / 2}px, ${pt.y - p.h / 2}px)`;
  }

  function tick(now) {
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      if (p.dead) { packets.splice(i, 1); continue; }
      if (!p.host._visible) continue;
      const t = ((now + p.phase) % p.dur) / p.dur;
      place(p, t);
      const fade = 0.22;
      p.el.style.opacity = t < fade ? (t / fade) : t > (1 - fade) ? ((1 - t) / fade) : 1;
      if (t < p.last) {
        p.to.classList.remove("is-ping");
        void p.to.offsetWidth;
        p.to.classList.add("is-ping");
      }
      p.last = t;
    }
    requestAnimationFrame(tick);
  }

  function enhanceWires() {
    const hosts = [...document.querySelectorAll("[data-wires]")];
    const vis = new IntersectionObserver((es) => es.forEach((e) => { e.target._visible = e.isIntersecting; }), { rootMargin: "100px" });
    let pending = null;
    const redrawAll = () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => hosts.forEach(drawWires));
    };
    const ro = new ResizeObserver(redrawAll);
    hosts.forEach((h) => { vis.observe(h); ro.observe(h); });
    redrawAll();
    JD.on("lang", redrawAll);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(redrawAll);
    if (!reduced) requestAnimationFrame(tick);
  }

  // ------------------------------------------------------------------ step player
  // JD.player(rootEl, steps): steps = [{ node, token, color, ms, text: {en, vi} }]
  JD.player = function (rootEl, steps) {
    const stage = rootEl.querySelector(".jd-stage");
    const cap = rootEl.querySelector(".jd-caption");
    const bar = rootEl.querySelector(".jd-progress > i");
    const playBtn = rootEl.querySelector('[data-act="play"]');
    const token = document.createElement("span");
    token.className = "jd-token";
    stage.appendChild(token);

    let i = 0, timer = null, playing = false, started = false;
    const nodeOf = (id) => stage.querySelector(`[data-node="${id}"]`);

    function render(animate) {
      const s = steps[i];
      const el = nodeOf(s.node);
      const color = colorOf(s.color || "green");
      const isYellow = s.color === "yellow" || color.includes("yellow");
      token.style.setProperty("--tc", color);
      token.style.setProperty("--tc-ink", isYellow ? "#0f172a" : "#fff");
      cap.style.setProperty("--tc", color);
      cap.style.setProperty("--tc-ink", isYellow ? "#0f172a" : "#fff");
      token.innerHTML = bi(s.token);
      if (!animate) token.style.transition = "none";
      if (el) {
        const r = rel(el, stage);
        const w = token.offsetWidth, h = token.offsetHeight;
        // sit on the node's bottom edge so its title stays readable
        token.style.transform = `translate(${r.l + r.w / 2 - w / 2}px, ${r.b - h / 2}px)`;
      }
      if (!animate) { void token.offsetWidth; token.style.transition = ""; }
      stage.querySelectorAll("[data-node]").forEach((n) => n.classList.remove("is-lit", "is-done"));
      steps.slice(0, i).forEach((p) => { const n = nodeOf(p.node); if (n) n.classList.add("is-done"); });
      if (el) el.classList.add("is-lit");
      // step.set = { nodeId: "state" } — states stack up to the current step (data-state on the node)
      const state = {};
      steps.slice(0, i + 1).forEach((p) => Object.assign(state, p.set || {}));
      stage.querySelectorAll("[data-node]").forEach((n) => {
        if (state[n.dataset.node]) n.dataset.state = state[n.dataset.node];
        else delete n.dataset.state;
      });

      // Clear previous active pulses
      stage.querySelectorAll(".is-pulsing, .is-pulsing-row, .is-wire-active").forEach((x) => {
        x.classList.remove("is-pulsing", "is-pulsing-row", "is-wire-active");
      });

      // Pulse matching pill, row, and wire if defined in step
      if (s.pill) {
        stage.querySelectorAll(`[data-pill-id="${s.pill}"]`).forEach((pill) => {
          pill.classList.add("is-pulsing");
          const row = pill.closest(".row");
          if (row) row.classList.add("is-pulsing-row");
        });
        stage.querySelectorAll(`[data-wire-id="${s.pill}"]`).forEach((wire) => {
          wire.classList.add("is-wire-active");
        });
      }

      cap.innerHTML = `<span class="step">${i + 1}/${steps.length}</span><div class="txt">${bi(s.text)}</div>`;
      bar.style.width = `${((i + 1) / steps.length) * 100}%`;
    }

    function schedule() {
      clearTimeout(timer);
      if (!playing) return;
      const wait = i === steps.length - 1 ? 3800 : (steps[i].ms || 1700);
      timer = setTimeout(() => {
        i = i === steps.length - 1 ? 0 : i + 1;
        render(i !== 0);
        schedule();
      }, wait);
    }
    function setPlaying(v) {
      playing = v;
      playBtn.innerHTML = v ? bi({ en: "❚❚ Pause", vi: "❚❚ Tạm dừng" }) : bi({ en: "▶ Play", vi: "▶ Phát" });
      schedule();
    }
    rootEl.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => {
      const act = b.dataset.act;
      if (act === "play") return setPlaying(!playing);
      if (act === "next") i = Math.min(steps.length - 1, i + 1);
      if (act === "prev") i = Math.max(0, i - 1);
      if (act === "restart") i = 0;
      render(true);
      setPlaying(false);
    }));

    render(false);
    setPlaying(false);
    new ResizeObserver(() => render(false)).observe(stage);
    JD.on("lang", () => requestAnimationFrame(() => render(false)));
    // start automatically the first time the player scrolls into view
    new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting && !started && !reduced) { started = true; setPlaying(true); }
      });
    }, { threshold: 0.35 }).observe(rootEl);
  };

  // ------------------------------------------------------------------ cheat sheet
  function enhanceCheat() {
    document.querySelectorAll(".jd-cheat-row").forEach((row) => {
      const code = row.querySelector("code");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = bi({ en: "copy", vi: "chép" });
      btn.addEventListener("click", () => copy(code.textContent));
      row.appendChild(btn);
    });
    document.querySelectorAll(".jd-cheat-search").forEach((input) => {
      const scope = document.querySelector(input.dataset.target);
      input.addEventListener("input", () => {
        const q = input.value.trim().toLowerCase();
        scope.querySelectorAll(".jd-cheat-row").forEach((row) => {
          row.hidden = q && !row.textContent.toLowerCase().includes(q);
        });
      });
    });
  }

  // ------------------------------------------------------------------ boot
  document.addEventListener("DOMContentLoaded", () => {
    buildShell();
    enhanceCode();
    enhanceExplain();
    enhanceTabs();
    enhanceCheat();
    enhanceWires();
    document.dispatchEvent(new CustomEvent("jd:ready"));
  });
})();
