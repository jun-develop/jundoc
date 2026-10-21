# Jundoc

🌐 **Live: [jundoc.pages.dev](https://jundoc.pages.dev/)**

Visual, bilingual (EN / VI) docs for Jungo and Junkit. Plain HTML, CSS and JS — no build step.
Open `index.html` in a browser (double-click works), or serve the folder:

```bash
python3 -m http.server 4000   # then open http://localhost:4000
```

## Layout

```
jundoc/
├── index.html              home: a card for every page in the menu
├── assets/
│   ├── css/jundoc.css      shared styles (light/dark tokens, nodes, wires, code)
│   └── js/
│       ├── nav.js          the menu — add every new page here
│       └── jundoc.js       shell, language/theme toggle, wires, step player, code highlight
├── jungo/                  the starter app: overview, build-a-feature, uber-fx, auth, multi-database
│   └── *.html
└── junkit/                 the library: index.html + one page per package (cache, logger, middleware, …)
    └── *.html
```

## Adding a page

1. Copy `jungo/overview.html`, keep the `<head>` and the `#jd-app` / `.jd-content` wrapper, set
   `data-root` to the path back to `jundoc/` (`..` for one folder deep).
2. Add it to `assets/js/nav.js` (`href`, `title`, `desc`, `color`).
3. Every `<section id="…">` with an `<h2>` shows up in the "On this page" list.

## Building blocks

| What | Markup |
|---|---|
| Both languages | `<span lang="en">…</span><span lang="vi">…</span>` (any element works) |
| Box | `<div class="jd-node is-tint c-green" data-node="id">` with `.k` label, `.t` title, `.p` path, `.d` text |
| Animated wires | `data-wires='[{"from":"a","to":"b","color":"blue","label":"cfg"}]'` on the parent of the nodes. Options: `dashed`, `dir` (`"h"`/`"v"`), `dur` (ms), `delay` (ms); `label` may be `{"en":…,"vi":…}` |
| Code | `<pre data-hl="go\|bash\|json">` inside `.jd-term`; `data-lines="2,5"` highlights lines; `data-copy="commands"` on `.jd-term` adds a copy button that strips `$ ` and comments |
| Step player | `.jd-player` > `.jd-stage` (nodes) + `.jd-controls` + `.jd-caption`, then `JD.player(el, steps)` on `jd:ready` |
| Tabs | `.jd-tabs` > `.jd-tablist` > `.jd-tab` + `.jd-tabpanel` |
| Colours | `c-blue`, `c-green`, `c-purple`, `c-orange`, `c-pink`, `c-red`, `c-muted` |
