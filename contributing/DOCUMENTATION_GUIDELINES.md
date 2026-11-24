# Documentation guidelines

Rules for every page in Jundoc. Templates: [DOCUMENTATION_TEMPLATES.md](DOCUMENTATION_TEMPLATES.md).
Names: [DOCUMENTATION_TERMINOLOGY.md](DOCUMENTATION_TERMINOLOGY.md). Markup: [../README.md](../README.md).

## 1. Scope: Jungo vs Junkit

| | Jungo pages (`jungo/`) | Junkit pages (`junkit/`) |
|---|---|---|
| Documents | The application skeleton: how to run it, its request flow, features, auth, permissions, databases, CLI | One package each: what it exports and how it behaves |
| Source of truth | `github.com/jun-develop/jungo` (`internal/`, `cmd/`, `Makefile`) | `github.com/jun-develop/junkit/<pkg>` at the version Jungo pins in `go.mod` |
| Mentions the other | Links to the Junkit package page; does not repeat its API | One short **In Jungo** section: which Jungo files use it and how. Jungo routes, flows and policies stay on Jungo pages |

Junkit is a set of packages for Jungo, not a framework. A package page never describes a Jungo
feature in depth; it links to the Jungo page instead.

### Content ownership

Each topic has one home. Other pages give one sentence and a link.

| Topic | Owner page | Others |
|---|---|---|
| Global middleware chain and its order in Jungo | `jungo/overview.html#flow` | `junkit/middleware.html` documents each middleware's options and behavior, links to the Jungo order |
| Junkit middleware API (`Trace`, `Payload`, `TracerDebug`, `SetIdentity`, …) | `junkit/middleware.html` | |
| Tracer dashboard package | `junkit/tracer.html` | middleware page: `TracerDebug` options only |
| Debugging a request in Jungo (`trace_id`, `t_debug`) | `jungo/build-a-feature.html#debug` | |
| Login, tokens, sessions, login guard, login captcha, brute-force alert | `jungo/auth.html` | `security`, `recaptcha`, `notification`, `cache` pages: one "In Jungo" row + link |
| Authenticate middleware, `Guard`, roles, permissions | `jungo/access.html` (`auth.html` for authentication) | `junkit/middleware.html` links |
| Transactions: API | `junkit/database.html` | |
| Transactions and databases in Jungo | `jungo/multi-database.html` | |
| Upload validation; avatar flow | `junkit/upload.html` | `storage.html` stores files and links to upload |
| Response envelope, 422 shape | `junkit/response.html` | `validation.html` links |
| Validation messages catalog | `junkit/validation.html` | `i18n.html` links |
| Identity on context | `junkit/security.html` (`WithIdentity`/`GetIdentity`) | `middleware.html` (`SetIdentity`) links |
| `make feature` workflow | `jungo/build-a-feature.html` | overview: one line; `scaffold.html`: the engine |
| Audit log: what is recorded, recording in a feature, read API, retention | `jungo/audit.html` | `auth.html`, `access.html`, `build-a-feature.html#generate`, `overview.html#cli`: one sentence + link |
| Telegram client vs ops alerts | `telegram.html` (client), `notification.html` (alerts) | each links the other once |

## 2. Accuracy

- Read the source before writing. Signatures, fields, defaults, errors, routes and orderings are
  copied from code, not paraphrased from memory or older docs.
- Never document planned behavior as implemented. Unclear source → leave it out and report it.
- Code examples must compile against the documented version (imports and error handling aside).
- When code and docs disagree, the code wins; fix the page.
- No performance numbers (latency, CPU %, throughput) unless the page says how they were measured.
  Prefer the mechanism ("bcrypt cost 12, run under a concurrency limit") over a number.
- Sample output blocks ("real output") must match what the current code prints.

## 3. Writing

- Answer, in this order: what it is, when to use it, how to use it, what to watch out for.
- Short sentences. One idea per paragraph. No marketing words ("powerful", "seamless", "simply").
- Lead with the behavior, then the reason: "Returns `ErrNotFound` when … — so handlers can map it to 404."
- Say each fact once. Link to the page that owns it instead of repeating it.
- Keep edge cases, limits and error behavior. Short is good; incomplete is not.

### Bilingual text

- Every visible English string has a Vietnamese twin (`<span lang="en">…</span><span lang="vi">…</span>`),
  and they say the same thing — same facts, same numbers, same caveats.
- Vietnamese keeps established technical terms in English (request, handler, middleware, token,
  session, cache, migration, transaction, context, struct, interface, package). Do not invent translations.
- Code, identifiers, file paths, HTTP fields and error codes are never translated.
- Short labels count too: `.jd-ex .w` titles, table headers, diagram `.k`/`.d` text and wire labels
  that are prose get both languages (`<span class="w"><span lang="en">…</span><span lang="vi">…</span></span>`;
  wire labels use `{"en":…,"vi":…}`). Labels that are code stay as-is.

## 4. Page structure

Use the sections that apply, in this order. Do not add empty or filler sections.

**Junkit package page** — section ids are fixed so links stay stable:

| id | Title (EN / VI) | Content |
|---|---|---|
| `what` | What it does / Nó làm gì | 1–3 sentences + at most one diagram |
| `setup` | Setup / Cài đặt | Fx module or constructor, config struct, env keys with defaults |
| `quick` | Quick start / Dùng nhanh | One minimal, realistic example with `.jd-explain` notes |
| `try` | Try it / Thử ngay | Optional interactive demo; only if it teaches something the example cannot |
| (topic) | | Optional deep-dive sections for a package's core concept (e.g. `rules`, `errors`) |
| `api` | API reference / Tham chiếu API | Every exported symbol, grouped; signatures verbatim |
| `jungo` | In Jungo / Trong Jungo | Table: Jungo file → how it uses the package |
| `gotchas` | Good to know / Cần lưu ý | Limits, edge cases, common mistakes |

**Jungo guide page** — task-oriented. Start with the concept, then the flow (diagram), then the
steps or reference, then operations/troubleshooting. Endpoint references use `.jd-ep-*` blocks with
method, path, auth, request fields, response and every error.

### Fixed page elements

These are the same on every page. Copy the wording exactly.

| Element | Rule |
|---|---|
| Eyebrow | `Jungo · ‹nav title›` or `Junkit · ‹package›` (Junkit index: `Junkit · Overview`) |
| Junkit hero chips | Exactly three: import path · `Fx: ‹pkg›.Module → provides ‹T›` (or `No Fx module`) · `Depends on: ‹non-stdlib imports, A→Z, junkit/* last›` (or `Depends on: standard library only`). Generated from the source imports; other facts go in the text |
| Jungo hero chips | Source path(s) first (`internal/…`, `cmd/…`), then at most three key facts. No reading times |
| Setup tabs | Exactly two, in this order: `With Fx (as in Jungo)` / `Dùng Fx (như Jungo)` (the code Jungo actually uses) and `Without Fx` / `Không dùng Fx`. A variant goes inside the matching tab under a small `h4`, never in a third tab. Packages with no Fx module have no tabs |
| Tab colour | No colour class on `.jd-tabs`; tabs take their section's colour |
| API subtitle | `Everything the package exports — signatures copied from junkit/‹pkg›.` then page-specific notes |
| Options table header | `field · type · default · meaning` (VI: `field · kiểu · mặc định · ý nghĩa`); drop `default` only if no field has one |
| Env table header | `env · default · meaning` |
| In Jungo table header | `file · what it does` |
| `jd-kind` | `func`, `method`, `type`, `interface`, `const`, `var` (a `Module` is a `var`) |
| Shell block bar | `terminal`, or `terminal · ‹what›` |
| Footer | `Jundoc · ‹group› · ‹title›` and `← previous · next →` in nav order (generated from `nav.js`) |
| Short titles (`.jd-ex .w`, labels) | Sentence case in both languages: "Level filter", "Bound the call". A title that starts with code keeps the code's exact case: `err == nil ≠ success`, `fx.Provide(…)`, `v3 only` |

### Headings

- `h2` per section, plain nouns or imperatives: "API reference", "Add a database". No questions,
  no jokes, no numbering inside the text (the badge numbers it).
- One `h2` per `<section id>`; the id is short, lowercase, stable. Never rename an existing id
  without updating every link to it.
- `.jd-sub` under the heading: one sentence that says what the section gives the reader.

## 5. Code examples

- `<pre data-hl="go|bash|json">` inside `.jd-term`; the bar shows a realistic file name or `terminal`.
- One concept per example. Show error handling the way real callers must do it.
- Comments only where they add something the code does not say.
- Shell commands that a reader will paste get `data-copy="commands"`.

## 6. Tables

Use `.jd-params` inside `.jd-tablewrap` for parameters, fields, config keys, defaults, errors and
comparisons. Column order: name · type · default (if any) · meaning. Keep cells to one sentence.

## 7. Callouts

`.jd-callout` with a bold lead word and a fixed colour per type:

| Type | Class | Lead (EN / VI) | Use for |
|---|---|---|---|
| Note | `jd-callout c-blue` | Note / Ghi chú | Useful extra context |
| Tip | `jd-callout c-green` | Tip / Mẹo | A recommended practice |
| Important | `jd-callout c-orange` | Important / Quan trọng | Something the reader must know to get it right |
| Warning | `jd-callout c-red` | Warning / Cảnh báo | Data loss, security, or a common mistake |

Live output panels inside a Try-it demo (`jd-callout c-pink`, filled by script) are not callouts
and keep their style. At most two or three callouts per page. If it is a list of caveats, it belongs in `gotchas`.

## 8. Diagrams

Diagrams are source-controlled HTML: `.jd-node` boxes joined by `data-wires`, or a `JD.player`
step player for ordered flows. No screenshots, no new diagram libraries.

Use a diagram for: architecture, request lifecycle, middleware order, auth/permission flows,
retries, state transitions, data flow between components. Do not draw one for a single function
call or anything a sentence says as well.

Every diagram:

- Has a heading or `.jd-sub` that says what it shows, and shows one idea.
- Matches the code: every box is a real component/function, every wire a real call or data hand-off.
- Reads left → right or top → bottom; ≤ 7 boxes per row; no crossing wires.
- Labels boxes with `.k` (role) and `.t` (real name); wires labels are short (a value or verb).
- Colours carry meaning: blue = request / main path, red = error path, green = storage, data or a
  successful end state, orange = external service or side effect, muted = optional or out of scope.
  Purple and pink mark a package's own components when the page needs more categories.
- An optional step (only added when a config flag is on) is drawn dashed (`is-opt`).
- Uses a step player only when order matters; each step's caption says what happens and why.
- Stays readable at phone width (the `.jd-flow` / `.jd-stage` layout wraps; check at 375 px).

## 9. Navigation and links

- Every page is in `assets/js/nav.js` with a one-line `desc` in both languages.
- Relative links only; anchors must exist. Run the link check before committing (see README).
- Cross-link the first mention of another package or Jungo page; not every mention.
