# Documentation templates

Copy-paste skeletons. Rules behind them: [DOCUMENTATION_GUIDELINES.md](DOCUMENTATION_GUIDELINES.md).
`junkit/upload.html` is the reference package page; `jungo/multi-database.html` is a compact guide page.

## Page shell

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Junkit PKG · Jundoc</title>
  <meta name="description" content="junkit/PKG: ONE SENTENCE.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../assets/css/jundoc.css">
  <script src="../assets/js/nav.js"></script>
  <script src="../assets/js/jundoc.js"></script>
</head>
<body>
<div id="jd-app" data-root="..">
<article class="jd-content">
  <header class="jd-hero">
    <div class="jd-eyebrow">Junkit · PKG</div>
    <h1>PKG</h1>
    <p lang="en">What it is and when to use it, in one or two sentences.</p>
    <p lang="vi">…</p>
    <div class="jd-chips">
      <span class="jd-chip">github.com/jun-develop/junkit/PKG</span>
      <span class="jd-chip"><span lang="en">Fx: <code>PKG.Module</code> → provides <code>T</code></span><span lang="vi">Fx: <code>PKG.Module</code> → cung cấp <code>T</code></span></span>
      <span class="jd-chip"><span lang="en">Depends on: fx · zap</span><span lang="vi">Phụ thuộc: fx · zap</span></span>
    </div>
  </header>

  <!-- sections: what · setup · quick · try · api · jungo · gotchas -->

  <footer class="jd-footer">
    <span>Jundoc · Junkit · PKG</span>
    <span><a href="PREV.html">← PREV</a> · <a href="NEXT.html">NEXT →</a></span>
  </footer>
</article>
</div>
</body>
</html>
```

Then add the page to `assets/js/nav.js`.

## Section

```html
<section id="api" class="jd-section c-green">
  <div class="jd-section-head">
    <span class="jd-badge">5</span>
    <div>
      <h2><span lang="en">API reference</span><span lang="vi">Tham chiếu API</span></h2>
      <p class="jd-sub" lang="en">One sentence: what this section gives the reader.</p>
      <p class="jd-sub" lang="vi">…</p>
    </div>
  </div>
  <!-- content -->
</section>
```

`gotchas` uses `<span class="jd-badge">!</span>` and `c-red`.

## Code example with explanations

```html
<div class="jd-grid-2" style="margin-top:18px">
  <div><div class="jd-sticky">
    <div class="jd-term" data-copy><div class="jd-term-bar"><i></i><i></i><i></i><span>file_name.go</span></div>
<pre data-hl="go" id="code-quick">
…
</pre></div>
  </div></div>
  <div class="jd-explain">
    <div class="jd-ex c-blue" data-code="#code-quick" data-show="1-3"><span class="n">1</span><span class="w">Short title</span><span class="x" lang="en">…</span><span class="x" lang="vi">…</span></div>
  </div>
</div>
```

## API entry

```html
<div class="jd-sym c-blue">
  <div class="jd-sym-head"><span class="jd-kind">func</span><span class="jd-sym-name">Name</span></div>
  <div class="jd-term"><pre data-hl="go">func Name(arg Type) (Result, error)</pre></div>
  <p lang="en">What it does. What each error means.</p>
  <p lang="vi">…</p>
</div>
```

`jd-kind`: `func`, `method`, `type`, `interface`, `const`, `var` (a `Module` is a `var`).

## Parameter / config table

```html
<div class="jd-tablewrap"><table class="jd-params">
  <tr><th>field</th><th><span lang="en">type</span><span lang="vi">kiểu</span></th><th><span lang="en">default</span><span lang="vi">mặc định</span></th><th><span lang="en">meaning</span><span lang="vi">ý nghĩa</span></th></tr>
  <tr><td>Name</td><td>string</td><td><code>""</code></td><td lang="en">…</td><td lang="vi">…</td></tr>
</table></div>
```

## Callout

```html
<div class="jd-callout c-red">
  <b lang="en">Warning:</b><b lang="vi">Cảnh báo:</b>
  <span lang="en">…</span><span lang="vi">…</span>
</div>
```

Types and colours: Note `c-blue`, Tip `c-green`, Important `c-orange`, Warning `c-red`.

## Flow diagram (boxes + wires)

```html
<div class="jd-flow" data-wires='[
  {"from":"a","to":"b","color":"blue","label":"request"},
  {"from":"b","to":"c","color":"red","label":"error","dashed":true}]'>
  <div class="jd-node is-tint c-blue" data-node="a"><span class="k">role</span><span class="t mono">RealName</span><div class="d" lang="en">…</div><div class="d" lang="vi">…</div></div>
  <div class="jd-node is-tint c-green" data-node="b">…</div>
  <div class="jd-node is-tint c-red" data-node="c">…</div>
</div>
```

## Gotchas list

```html
<div class="jd-explain" style="margin-top:16px">
  <div class="jd-ex c-red" style="cursor:default"><span class="n">1</span><span class="w">Short title</span><span class="x" lang="en">…</span><span class="x" lang="vi">…</span></div>
</div>
```

## In Jungo table

```html
<div class="jd-tablewrap" style="margin-top:16px"><table class="jd-params c-orange">
  <tr><th>file</th><th><span lang="en">what it does</span><span lang="vi">làm gì</span></th></tr>
  <tr><td>internal/…/file.go</td><td lang="en">…</td><td lang="vi">…</td></tr>
</table></div>
```
