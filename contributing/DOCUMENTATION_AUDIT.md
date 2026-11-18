# Documentation audit

Phase 2 audit of every Jundoc page (29 pages) against Jungo HEAD (`73123bf`) and Junkit `v0.0.9`
(the version Jungo pins). Read-only: no page was changed during the audit. Fixes are tracked in the
refactor phase; this file is the record of what was found.

## Status (2026-11-18)

All P0 and P1 items below were fixed in the refactor that followed, then re-checked by an
independent QA pass (3 more P0 found and fixed). Most P2 items were fixed. What is left needs a
human decision, not a doc edit:

| # | Question | Where |
|---|---|---|
| 1 | `console.Fatalf` in the console kernel skips `Shutdown` and every Fx `OnStop` hook when a command fails | `jungo/internal/console/kernel.go:53,60` |
| 2 | Login-guard Telegram alert ignores `notification.Enabled`, so it also fires in development | `jungo/.../auth/infrastructure/login_guard.go` |
| 3 | Jungo login sets no reCAPTCHA `ExpectedAction` / `Hostnames` | `provideRecaptchaOptions` in `jungo/internal/app/fx.go` |
| 4 | `middleware.Trace` `TrustHeader` is off, so a client's `X-Trace-Id` is ignored. Intended? | `jungo/internal/router/router.go` |
| 5 | `UploadAvatar` drops the storage error without logging it | `jungo/.../user/service/user_service.go:184-188` |
| 6 | `validation` min/max message texts are off by one; `datetime` message ignores its layout | `junkit/validation` |
| 7 | `ParseUUID`'s 400 branch looks unreachable | `junkit/validation` |
| 8 | `security/secret.go` comment says `database` uses the secret-name list; it does not | `junkit/security/secret.go` |
| 9 | Not run end-to-end: first-run order (`migrate-up` before the app can start), the `make feature` output (derived from templates), sample outputs marked as examples | `jungo/overview.html`, `jungo/build-a-feature.html` |
| 10 | Is the README's SQL the recommended way to create the first admin (there is no console command)? | `jungo/access.html#ops` |

## Summary

| Area | Pages | P0 | P1 | P2 |
|---|---|---|---|---|
| Jungo | overview, build-a-feature, uber-fx, auth, access, multi-database | 12 | 12 | 24 |
| Junkit B | middleware, security, response, validation, i18n, index, slicex | 2 | 18 | ~30 |
| Junkit C | tracer, cache, logger, database, pagination, apidoc, sqlfmt | 3 | 12 | ~40 |
| Junkit D | recaptcha, notification, telegram, httpclient, storage, upload, mailer, console, scaffold | 5 | 21 | 14 |

P0 = factually wrong / would break a developer · P1 = missing, misleading or confusing · P2 = style, verbosity, consistency.

### What was right

- Internal links and anchors: no broken links (checked by script). Every nav entry points to a real page.
- Junkit API reference sections are largely accurate: signatures, defaults and error behavior match source.
- The bilingual system is consistently applied at paragraph level.

### Main problems

1. **Stale "In Jungo" and Jungo-page content.** The Junkit APIs are accurate, but text describing
   how Jungo uses them lags the Jungo refactor: renamed functions, removed files, old generator
   output, a per-email login limit that no longer exists, console commands (`user:list`,
   `user:create`) that do not exist.
2. **Wrong config key across 6 pages:** `CACHE_REDIS_ENABLE` → actual `CACHE_REDIS_ENABLED`
   (`jungo/internal/config/config.go:86`). Setting the documented name silently leaves Redis off.
3. **Wrong order in the request-lifecycle diagram:** Banner and Limiter run before Payload
   (`jungo/internal/router/router.go`), so banned/limited clients never have their body read.
4. **Duplication:** the same topics (tracer, transactions, upload/avatar, login captcha,
   identity, 422 envelope, validation messages, auth route protection) are explained on 2–3 pages,
   sometimes inconsistently (e.g. invalid `:uuid` → 404 vs 422).
5. **Unverifiable performance numbers** (µs, ms, CPU %, logins/s) that the source does not support.
6. **Bilingual gaps in short labels:** "Good to know" item titles and some diagram labels are English only.
7. **Inconsistent presentation:** callout colours used arbitrarily; Vietnamese section titles vary
   between pages; some packages miss `setup`.
8. **Diagrams:** mostly accurate and useful. Wrong: overview middleware player (order), logger
   trace-ID flow (`TrustHeader` is off in Jungo), cache "on miss" node order, storage/upload node
   text. Decorative: console flow. Missing: notification → telegram path, httpclient retry loop,
   response `Error()` decision.

Decisions taken from this audit are in [DOCUMENTATION_GUIDELINES.md](DOCUMENTATION_GUIDELINES.md)
(content ownership table, accuracy rules) and [DOCUMENTATION_TERMINOLOGY.md](DOCUMENTATION_TERMINOLOGY.md).

---

## Jungo pages audit (Phase 2, read-only)

Scope: jundoc/jungo/{overview, build-a-feature, uber-fx, auth, access, multi-database}.html, plus nav.js / index.html / README.
Source: jungo @ local HEAD, junkit @ local HEAD. Paths below: `jungo/…` = /Users/quoctuan/Workspace/personal/jun/jungo, `junkit/…` = …/junkit.

Counts: **P0 = 12 · P1 = 12 · P2 = 24**

---

### P0 — factually wrong / would break a developer

**P0-1 · Env var name `CACHE_REDIS_ENABLE` does not exist; it is `CACHE_REDIS_ENABLED`.**
- Where: overview#run (redis node), build-a-feature#generate (GET row), #endpoint 3.4 prose, bf-player step "cache.Delete", auth#config (row + "Several app instances?"), access#inside 5.4 "Redis or nothing". (Also junkit/cache.html, junkit/middleware.html — outside scope, flag to their owner.)
- Source: jungo/internal/config/config.go:86 `env:"CACHE_REDIS_ENABLED"`; .env.example:106.
- Fix: global rename to `CACHE_REDIS_ENABLED`.

**P0-2 · Global middleware order is wrong (overview#flow player).**
- Page: 1 TracerDebug … 7 Recover, **8 Payload, 9 Banner, 10 Limiter**, 11 RoutePatterns.
- Source: jungo/internal/router/router.go:236-299 — TracerDebug, Security, Trace, CORS, Gzip, AccessLog, Recover, **Banner (only if BANNER_ENABLED, default true), Limiter, Payload**, RoutePatterns. Comment at :236-237: "Banner and Limiter run before Payload, so a banned or rate-limited client never makes the server read its body."
- Fix: reorder nodes and steps (8 Banner, 9 Limiter, 10 Payload, 11 RoutePatterns); Recover caption "if anything below panics (Payload, Limiter…)" order also; mark Banner as conditional. Also note `/uploads/*` is registered before the global chain (router.go:103-116: only Security + Recover).

**P0-3 · First-run order deadlocks: overview#run step 3 says wait for `server: starting`, then step 4 `make migrate-up`.**
- On a fresh DB the API never reaches `server: starting`: `access.PermissionCheck` (OnStart) runs before `(*App).Run`'s OnStart and fails because `permissions` does not exist.
- Source: jungo/internal/app/fx.go:121-129 (HTTPModules order: RegisterAll, access.PermissionCheck, NewApp, (*App).Run); jungo/internal/features/access/module.go:74-90; access_service.go:62-82; app.go:45-49 logs `server: starting` inside its own OnStart. README §2 runs `make migrate-up` right after `make app-dev-bg`.
- Fix: steps = app-init → app-dev-bg → migrate-up (needs only postgresql, which is healthchecked) → app-logs until `server: starting`. The page's own Docker node already says Air restarts the app every 3 s until migrated. (Needs one confirming fresh run — see review list.)

**P0-4 · Console commands `user:list` and `user:create` do not exist.**
- Where: overview#cli (flow node c1/c4, "Built-in commands" ×2 langs, --verbose/--debug examples), overview#cheat row, auth#config Operations terminal ×2, access#ops SQL comment ×2; uber-fx#module code comment "COMMANDS: 2 console.Command providers" in user/module.go.
- Source: the only commands are `health:check`, `db:migrate` (jungo/internal/console/commands/*.go:28-29) and `auth:cleanup-tokens` (features/auth/command/cleanup_tokens_command.go:33-35). jungo/internal/features/user/module.go:54-56 COMMANDS block is empty. README "First admin" (README ~:616) creates the first admin with SQL.
- Fix: replace examples with `health:check` / `auth:cleanup-tokens`; add `db:migrate` to built-ins; replace "first admin" with the README SQL (user + super_admin role); delete the uber-fx comment.

**P0-5 · build-a-feature: the generated service has no cache.**
- Page: 3.4 code (`s.cache.Delete`, "GetProduct caches 5 min"), #generate table ("cached 5 min in Redis"), bf-player node "Save, clear cache" + step `cache.Delete`, 3.9 test (`NewProductService(repo, &fakeProductCache{})`, tests `TestUpdateProduct_DoesNotInvalidateCacheOnError` "come with the generator"), 5.4 constructor `NewProductService(repo, cache, log)` + "test calls NewProductService(repo, cache)", #errors "served from the cache… (3.4)", checklist "Cache key deleted…". uber-fx#why product module snippet with a `cache.Cache[*domain.Product]` provider.
- Source: jungo/cmd/scaffold/templates.go service template (~:440-462): every method is a one-line pass-through, e.g. `UpdateProduct` = `return s.repo.Update(ctx, uid, input)`, no Flow comment; constructor `NewProductService(repo)` (serviceTestTmpl uses `New{{.Pascal}}Service(repo)`); generated tests are `TestProductService_CreateProduct/_GetProduct/_ListProducts/_DeleteProduct` (no Update test). moduleTmpl (~:885-945) has no cache provider.
- Fix: rewrite 3.4 around the real pass-through and show "where a rule/cache would go" as an optional add-on; fix 3.9 (fake has no cache, add `TestProductService_UpdateProduct` example), 5.4, errors row, checklist, player, uber-fx snippet.

**P0-6 · build-a-feature: generated DTO/response shapes are wrong.**
- Page: `Status *int16 binding:"omitempty,oneof=1 2"`, POST body `{"name":"…","status":1}`, 200 response `"status": 1`, 422 `status must be one of the values: 1 2`, hint "status stayed 1".
- Source: templates.go:623-625 `CreateProductRequest{Name}` only (new items are active, repo Create sets StatusActive ~:330); :633-636 `Status *string binding:"omitempty,oneof=active inactive"` converted via `ParseProductStatus`; response `Status string` = `ProductStatusName` + `Active bool` (dtoTmpl ~:680-700).
- Fix: show the real DTO + converter, POST body `{"name":"…"}`, response `"status":"active"`, 422 `…one of the values: active inactive`.

**P0-7 · auth: there is no per-email login limit.**
- Page: login 429 row ("5 from this IP or 10 for this email… anyone can lock an email"), login-player node l3 "IP 15 min + email" + caption, l7 caption "IP-15-min and email counters are cleared", 4.4 simulator (meter `m-email`, `LIM.email`, JS model), config row `AUTH_LOGIN_EMAIL_MAX_ATTEMPTS` default 10.
- Source: jungo/internal/features/auth/infrastructure/login_guard.go:35-37 "Logins are not counted per email: anyone could then lock any account out"; Attempt :70-85 is IP-only; config.go:143-146 has no email var.
- Fix: two counters (IP short window counting every attempt, IP blacklist counting failures). Remove email meter/JS/config row; state the deliberate reason (no account lockout).

**P0-8 · auth#config "Redis down? … counter counts as 0 … Logins still work" is the opposite of the code (and of the page's own 4.4).**
- Source: login_guard.go:68-69 "A cache error refuses the attempt, so an outage cannot turn throttling off"; :75-78 incr error → returned → 500. (Only the blacklist *read* error is ignored, :71.) Forgot-password likewise refuses (:112-118).
- Fix: "Redis down → login and forgot-password answer 500 (fail closed); open sessions keep working without cache".

**P0-9 · auth internal revoke 200 message is wrong.**
- Page: `"message": "Token revoked successfully"`. Source: auth_handler.go:175 key `session_revoked` → module.go:104 "Session revoked successfully".

**P0-10 · auth forgot-password 500 message and log level are wrong.**
- Page: "Password reset is unavailable because email sending is not configured"; "The app log (Error) names the variable".
- Source: module.go:124 `password_reset_unavailable` = "Password reset is currently unavailable"; the reason is logged once at startup at **Warn** (auth_service.go:94-97, password_reset.go:159-175). Also triggered when no mailer is wired.
- Fix both strings; AUTH_PASSWORD_RESET_URL config row "the log says so" → "a Warn at startup says so".

**P0-11 · uber-fx#fxgo code shows APIs that do not exist.**
- Page: `fx.Provide(router.Module)`, `fx.New(GetFxOptions(cfg)...)`, console `fx.Provide(console.Module)`; HTTPModules missing Guard + PermissionCheck; CoreModules features list missing access.
- Source: jungo/internal/app/fx.go:113-114 (access, auth, user), :121-130 HTTPModules = `fx.Provide(provideGin)`, `fx.Provide(middleware.NewGuard)`, `fx.Invoke(router.RegisterAll)`, `access.PermissionCheck`, `fx.Provide(NewApp)`, `fx.Invoke((*App).Run)`; :134 `FxOptions`; :151-176 NewConsoleFx opts = `fx.Invoke(console.RunSelected)` only (+ logger switch).
- Fix: paste the real (shortened) functions; re-number data-show lines.

**P0-12 · access#inside 5.4: global invalidation threshold is 100 users, not 1000.**
- Source: jungo/internal/features/access/service/access_service.go:19-21 `maxUsersToInvalidate = 100`; :380-387.

---

### P1 — missing / misleading / confusing

**P1-1 · overview#run `make app-init` silently resets git history.** Node only says "creates .env". Source: jungo/deploy/app-init.sh:319-321 `rm -rf .git; git init`; :212-315 also writes a release CI workflow (GitHub/GitLab prompt). README §4 says "reset git history". Fix: add a warning in the step node.

**P1-2 · auth "Invalid token … or an older token of a device that has since logged in again (replaced in place)".** Rotated rows are kept (f_auth_login_session.sql:51-62 revoke as `rotated`, insert new pair in same family), so the old access token resolves to the session and fails `hash != session.Access.Hash` → **"Token has been revoked"** (auth_service.go:270-272). Only after `auth:cleanup-tokens` deletes it does it become "Invalid token". Fix the me-tab 401 rows.

**P1-3 · auth token-details 404 "replaced in place by a re-login".** Same reason: GetTokenDetails returns the token with status `revoked` (auth_service.go:320-331). 404 only after cleanup or for a deleted user. Fix the row.

**P1-4 · auth AUTH_REVOKED_RETENTION: "after cleanup [a used refresh token] just gets Invalid token and the session stays open".** Cleanup never deletes unexpired exchanged refresh tokens: auth.sql CleanupTokens :141-158 `NOT (type = 2 AND revoked_reason IN ('refresh','rotated') AND expires_at > now())`; cleanup_tokens_command.go:15-16. Fix: "reuse is detected until the used refresh token would have expired, whatever the retention".

**P1-5 · auth 4.6 revoked_reason table misses `password_reset`.** Source: domain/auth.go:38; password_reset.go:115. (reset-password tab mentions it, the table does not.)

**P1-6 · auth login-counter semantics.** l7 "Clear failure counters" — only the short-window attempts counter is cleared; the blacklist counter is kept (login_guard.go:104-110). Config row AUTH_LOGIN_MAX_ATTEMPTS "Failures per IP" — it counts every attempt in the window, a success clears it (:75-84). Warning text "from the 3rd failed try" holds only when no success in between. Fix wording.

**P1-7 · Guard coverage scope is stated as "versioned routes" / `/api/v{n}`.** Where: access#concepts card 4, access startup node ("Is every /api/v{n} route…"), auth#client explain "+" ("Every versioned route… Can, Authenticated or Public"). Source: router.go:176-195 — every route whose path starts with `/api/` (incl. unversioned `/api/internal/*`) needs a Guard policy (Can/Authenticated/Public/**Internal**) **and** a Docs() entry. access safety rule 5 already says it right — align the others.

**P1-8 · access#inside authorize snippet is not the real code.** Page calls `GetActorAndTargetPermissions` + `actor.Covers` and returns `domain.ErrCannotManageStrongerUser` (does not exist in user domain). Source: user_service.go:267-293 calls `actor.RequireManage` (actor.go:103-127), which also re-checks the permission from the DB (`ErrForbidden`) and returns `actor.ErrCannotManageStrongerUser`. Fix: show the real 3 lines and explain RequireManage.

**P1-9 · access startup diagram omits the Docs()/BodyLimit verification.** router.go:189-207: a route without Docs, or a BodyLimit/doc naming an unregistered route, also stops the app. Add to node "router.RegisterAll".

**P1-10 · multi-database#add-postgres checklist would not work as written.**
- Step 1 keeps `functions/f_user_permissions.sql`, which queries `user_roles`/`role_permissions` (f_user_permissions.sql:13-18) → fails on a fresh analytics DB. Remove all three functions.
- Copied migrate.go has `//go:embed migrations/*.sql functions/*.sql` (migrate.go:20); with empty dirs the build fails ("pattern matches no files"). Needs a note (keep a placeholder or drop the functions pattern) — confirm (review list).
- Production migrations run only `db:migrate` on `*primary.DB` (migrate_command.go:23-34; README :213). Add a step: a migrate command/service for the new DB.

**P1-11 · build-a-feature 3.2 interface method names.** `GetProducts` → real `ListProducts` (templates.go domainTmpl `ListPASCAL_PLURAL`); interface also has `WithTransaction`. Fix comment lines.

**P1-12 · Diagrams/sims that encode wrong models must change with the P0 fixes:** overview rf-player (P0-2), bf-player (P0-5), auth login-player + brute-force sim incl. its JS `selfCheck` (P0-7), uber-fx module comment (P0-4). Also auth 4.2 node a3 says the session query's permissions mean "no second query" unconditionally — on a session-cache hit permissions are dropped and the Guard reloads them via PermissionCache (session_cache.go:44-46; permission.go:157-165). access q2 caption already says this correctly; reuse that wording.

---

### P2 — style / verbosity / consistency

1. overview#flow callout + player: `?t_debug=` presented as fixed; the name is `TRACER_DEBUG_KEY` (router.go:240-245, no default; .env.example:40 sets `t_debug`). Say `?<TRACER_DEBUG_KEY>=<TRACER_DEBUG_VALUE>` once, link build-a-feature 5.2.
2. overview Recover caption "sends an alert": only in production with Telegram configured (fx.go provideNotificationOptions `Enabled: Environment=="production"`).
3. overview Banner caption strike statuses omit 405 (junkit/middleware/banner.go:87-90); thresholds are BANNER_MAX_STRIKES=30 / BANNER_STRIKE_WINDOW=1m (config.go:69-74).
4. overview Docker map: Mailpit also via `WITH=mail` (docker-compose.dev.yaml:82); node has no text — say it needs MAIL_DRIVER=smtp, MAIL_SMTP_HOST=mailpit, port 1025, ALLOW_PLAINTEXT (compose comment :78-79).
5. overview hero: EN/VI differ (VI adds "Opaque token"; EN "production-ready" claim). Make them match, drop marketing.
6. "Generated routes apply `middleware.BearerAuth`" (overview#feature callout, build-a-feature#generate callout, 3.7): generated code uses the injected `middleware.Authenticate` (`gin.HandlerFunc(r.authenticate)`, templates.go:851; auth/module.go:87-91). Pick one term: "the auth middleware (`middleware.Authenticate`, a BearerAuth)".
7. build-a-feature 3.3 prose says `database.Match`, code shows `database.MatchNotFound`; real code wraps it: `wrap("update", database.MatchNotFound(…))` (templates.go:384). Align.
8. build-a-feature 3.8 translations snippet omits the 5 permission label keys the generator writes (moduleTmpl `permission_group.*`, `permission.*`).
9. build-a-feature list endpoint also takes `sort_order=asc|desc` (junkit/pagination/pagination.go:21-25).
10. build-a-feature: Vietnamese inside shared/EN content — 422 JSON comments ("hoặc", "JSON cú pháp lỗi", "chỉ nhận 1 hoặc 2"), "where does it go" table cells ("dùng tag", "Viết trong").
11. build-a-feature VI copy is ~2× EN and embellished ("đắc lực", "trái tim của hệ thống", "Dump and Die độc quyền của Jungo" — tracer is a junkit package). Trim VI to EN meaning.
12. build-a-feature quickmap "CRUD in 4 commands" but the flow has 3 steps.
13. uber-fx#why says the same thing ~5 times (two main.go columns ×2 langs, "Manual Chain" bar, ⭐ IMPORTANT callout, 3 cards, DI callout). Keep one before/after code pair + one DI paragraph.
14. uber-fx sim: chain is simplified (real NewUserService takes repo, TargetPermissionReader, storage, hasher, SessionRevoker, logger — user_service.go:19-29). Label "simplified"; consider fewer tiers/hover-pill machinery (complex for what it shows).
15. uber-fx permissions callout: "fx.ParamTags(…, group:"permissions")" — it is an `fx.In` struct field tag (access_service.go:27-35).
16. uber-fx app.go snippet `go srv.ListenAndServe()`: real code binds with `net.Listen` inside OnStart so a busy port fails startup, Serve runs in a goroutine and calls `Shutdowner` on error, plus timeouts (app.go:33-77). Worth one sentence.
17. uber-fx quickmap lists 5 of 9 sections; "5 Cheat Sheet" is §8. Make quickmap match sections.
18. auth login-player "bcrypt (~180 ms)" vs config row "10 ≈ 45 ms" (default cost 10). Use ~45 ms.
19. Param badge text `require` → `required` (auth, access tables).
20. Title inconsistency: nav.js:19 + auth h1 VI "Auth" vs EN "Authentication"; VI elsewhere "Xác thực" (access#concepts). Use "Xác thực".
21. access 4-tables: "Deleting a user … cascades" — API deletes are soft (user_service.go:137-170), user_roles stay; cascade only on hard SQL delete.
22. access escalation simulator claims to mirror SetUserRoles but skips "cannot change own roles" and "stronger target user" (access_service.go:259-261, 329-342). Add or say "role-permission check only".
23. Long prose that should be tables: auth "Telling 401s apart" (message → client action), access "Telling 403s apart" (message → meaning/UI action).
24. Footers inconsistent (overview/multi-db no next link; build-a-feature → uber-fx; auth → access). Use prev/next in nav order.

### Duplication (consolidate; link instead of repeat)
- "Generated routes require login + guard.Public" callout: overview#feature ≈ build-a-feature#generate (near-verbatim). Keep in build-a-feature; overview → one line + link.
- Product router snippet: auth#client ≡ access#integrate (identical). Keep in access#integrate; auth links.
- 401 token errors: auth me-tab (canonical) vs build-a-feature #try 401 tab + #errors rows. Keep auth; build-a-feature shows one example + link.
- t_debug how-to: overview callout + player, build-a-feature 5.2, auth config row, junkit/middleware + tracer. Canonical: build-a-feature 5.2 (Jungo usage) / junkit tracer (API).
- Redis/no-cache behaviour explained in overview, build-a-feature (3×), auth (3×), access (2×). One sentence + link to auth#config.
- "Distinct DB type instead of name tag": uber-fx explain 4 + uber-fx errors + multi-database#pick. Keep multi-database.
- Raw SQL via Executor: build-a-feature 3.3 ≈ multi-database#sqlc.
- Middleware order: overview player vs junkit/middleware "In Jungo" — one canonical list (Jungo page), junkit links.
- Log channels table (build-a-feature 5.1) vs junkit/logger.

---

### Diagrams

| Page · diagram | Verdict |
|---|---|
| overview · rf-player (21 steps) | Wrong order (P0-2). Long; consider a static numbered middleware list with a "short-circuits with" column and keep the player for router→DB only. Add Guard/Actor as its own step (currently inside "Router"). |
| overview · start flow s1-s4 | Wrong order (P0-3). |
| overview · Docker map | Fine, mostly decorative. |
| overview · feature flow f1-f4, CLI flow c1-c5 | Duplicates build-a-feature; CLI flow uses nonexistent `user:list`. |
| build-a-feature · bf-player | Service step wrong (P0-5). Otherwise good, readable. |
| build-a-feature · debug d1-d3 | Good. |
| uber-fx · fxsim player | Correct in principle, simplified, visually heavy (tiers, pills, hover wiring). |
| uber-fx · groups / names / lifecycle flows | Good. |
| auth · token creation wires | Good. |
| auth · life-player | Good. |
| auth · login-player | Step 3/7 wrong (P0-7, P1-6). |
| auth · 4.2 check chain | Good; add the Guard step (permissions/403) after a5, fix a3 note. |
| auth · reuse-player | Correct (incl. 10 s grace in prose). |
| auth · brute-force sim | Wrong model (P0-7); JS self-check asserts the wrong model. |
| access · concept wires, req-player | Good. |
| access · startup checks | Missing Docs check, "/api/v{n}" wrong (P1-7, P1-9). |
| access · escalation sim | Partial (P2-22). |
| multi-db · layout + query path | Good, accurate. |

Where a diagram would replace prose: uber-fx#why (one before/after); auth 401/403 decision tables; overview #flow "Good to know" error-code list is fine as is.

---

### Per-page summary

- **overview** — Good structure (run → flow → feature → CLI → cheat sheet). Three blockers: wrong env var, wrong middleware order, first-run step order; CLI section built on nonexistent commands; app-init git reset not mentioned. Feature section duplicates build-a-feature.
- **build-a-feature** — Best hands-on page, but its core walkthrough (service + DTO + tests + logging) describes a cached, int-status generator that no longer exists. Needs a re-pass of 3.2–3.9, 4, 5.4, 6 against templates.go. VI copy bloated.
- **uber-fx** — Concepts accurate; fx.go walkthrough shows invented APIs; #why is 3× too long; quickmap out of sync.
- **auth** — Very thorough and mostly accurate (refresh SQL, 10 s grace, device rotation, /me vs /sessions created_at, reset flow). Wrong: per-email limit everywhere, Redis-down behaviour, two messages, retention/reuse claim, rotated-token errors, missing `password_reset` reason.
- **access** — Accurate on routes, permissions, seeders, error ordering, cache keys/2 s skew; wrong 1000→100; Guard scope wording; authorize snippet; user:create reference.
- **multi-database** — Accurate on types, Executor, tx key, junkit symbols (all verified). Checklist misses f_user_permissions, go:embed, and production migration for the second DB.
- **nav / index / README** — nav descs accurate (11 auth endpoints, 9 access endpoints). Auth VI title "Auth" inconsistent. index.html claims "every diagram shows the real code paths" — untrue until P0s are fixed (orchestrator-owned).

---

### Needs human review

1. P0-3: confirm on a fresh clone that the app does not log `server: starting` before `make migrate-up` (my reading of Fx hook order says it cannot).
2. P1-10: confirm `go:embed` with an empty `functions/` dir fails the build for a copied `analytics` package, and decide the recommended layout (drop functions pattern vs placeholder file).
3. auth#client recommends `security.MustGetIdentity[*authdomain.Identity]` in a product handler — this imports the auth feature's domain from another feature. The Guard already puts an `actor.Actor` (UserID, UserUUID, Permissions) in the context (permission.go:150-151, actor.go:43). Owner should decide which to recommend.
4. build-a-feature "What the generator prints" block — output format comes from junkit/scaffold; not verified line-by-line.
5. "Every … output below was produced by actually making the mistake" / "All outputs below are real" claims on build-a-feature — several outputs are now stale (P0-5/6); decide whether to re-run and re-capture or drop the claim.
6. junkit/cache.html and junkit/middleware.html also use `CACHE_REDIS_ENABLE` (outside this scope).

---


---

## Audit — Junkit pages (batch B)

Scope: `jundoc/junkit/{middleware,security,response,validation,i18n,index,slicex}.html`
Checked against: junkit HEAD (`junkit/<pkg>/*.go`, non-test) and jungo HEAD (`internal/…`, `cmd/scaffold`, `.env.example`).
Citations: `pkg/file.go:line` = junkit, `jungo:path:line` = jungo, `page.html:line` = jundoc page.

Overall: the pages are accurate in depth (most edge-case claims verified true: sealed-token length 142, 3008-byte payload limit,
BADINDEX output, omitempty semantics, Banner/Limiter/Payload behaviour, i18n 62-key catalog, all exported symbols present).
Problems are mostly **stale Jungo snippets**, **two wrong env facts**, and **verbosity/Jungo content inside package pages**.

---

### P0 — factually wrong / would break a developer

| # | Page · section | Finding | Source evidence | Fix |
|---|---|---|---|---|
| P0-1 | middleware · `#jungo` (row router/router.go, `middleware.html:1980`) | Env key `CACHE_REDIS_ENABLE` does not exist. Setting it has no effect, Banner stays per-instance memory. | `jungo:internal/config/config.go:86` `env:"CACHE_REDIS_ENABLED"`; `jungo:.env.example:106` | Rename to `CACHE_REDIS_ENABLED` (EN+VI). **Same wrong key also on Jungo pages** (overview.html:303, auth.html:1118,1163, access.html:789, build-a-feature.html:200,400,401,1120,1121) — out of my scope, flag to orchestrator. |
| P0-2 | middleware · `#setup` "After the chain" (`middleware.html:426-437`) | Jungo user_router snippet does not compile against Jungo: `middleware.BearerAuth(r.authenticator, r.responder, middleware.BearerAuthOptions{})` — there is no `BearerAuthOptions`, `BearerAuth` takes 2 args, and the router does not call it at all. | `jungo:internal/middleware/auth.go:48` `func BearerAuth[T any](a Authenticator[T], responder response.Responder)`; `jungo:internal/features/user/router/v1/user_router.go:38` `users := group.Group("/users", gin.HandlerFunc(r.authenticate))` (injected `middleware.Authenticate`) | Replace with the real `Register` body (group with `gin.HandlerFunc(r.authenticate)`, `guard.Can`/`Authenticated`). Better: move this block to Jungo access/auth page and link (see P2-M1). |

### P1 — missing / misleading / stale / confusing

### middleware.html
| # | Section | Finding | Evidence | Fix |
|---|---|---|---|---|
| P1-M1 | `#jungo` env table (`:2034-2036`) | "TRACER_DEBUG_KEY default `t_debug`" — config has **no default** (empty ⇒ debug off). `t_debug` comes from `.env.example`. | `jungo:internal/config/config.go:166-167` (no envDefault); `jungo:.env.example:40-41` | Column "default": `— (.env.example: t_debug)` / VALUE `— (app-init: random 4 digits)`. |
| P1-M2 | `#api` RoutePatterns vs other pages | Middleware page correctly says `/users/abc` → 404 before `ParseUUID`; but response.html `#jungo` and validation.html `ParseUUID` say Jungo answers 422 for an invalid `:uuid`. In Jungo, RoutePatterns makes that 422 path unreachable for malformed UUIDs. | `middleware/route_patterns.go:27-40`; `jungo:internal/router/router.go:294-298` | Fix on response/validation pages (see P1-R3, P1-V3). |
| P1-M3 | `#what` table (`:144-227`) | Row order (…CORS, Payload, AccessLog, Banner, Limiter, RoutePatterns, Recover, Gzip) contradicts the chain order shown directly above it and in `#setup` (…CORS, Gzip, AccessLog, Recover, Banner, Limiter, Payload, RoutePatterns). A reader learning "order is behaviour" gets two orders. | `jungo:internal/router/router.go:247-299` | Reorder rows to chain order and number them 1–11. |
| P1-M4 | `#jungo` row middleware/ (`:2009-2016`) + `#setup` "After the chain" | `BearerAuth on /users` — Jungo routers use the injected `middleware.Authenticate`, not `BearerAuth` directly (the auth feature provides it). Minor, but repeated in player step "group". | `jungo:internal/middleware/auth.go:32-38` | Say "the bearer-token middleware (`middleware.Authenticate`, built from `BearerAuth`)". |

### security.html
| # | Section | Finding | Evidence | Fix |
|---|---|---|---|---|
| P1-S1 | `#api` Options · PasswordOptions (`security.html:490-500`) | Signature block claims "copied from source" but omits `PasswordOptions.MaxConcurrent`. | `security/security.go:28-36` | Add `MaxConcurrent int`. |
| P1-S2 | `#jungo` row login_guard.go (`:989-994`) | `emailKey = "auth:login:email:"+HashToken(...)` does not exist. Login guard keys are IP-only (`ClientKey`); the hashed-email key is the **password-reset** key `auth:reset:email:`. | `jungo:internal/features/auth/infrastructure/login_guard.go:187-205` | Rewrite: `ipAttemptsKey`/`ipBlacklistKey`/`resetIPKey` use `security.ClientKey(ip)`; `resetEmailKey` = `"auth:reset:email:" + HashToken(lower(trim(email)))`. |
| P1-S3 | `#jungo` | Missing: `password_reset.go` also uses `GenerateToken` (reset tokens). | `jungo:internal/features/auth/service/password_reset.go:130` | Add one row or fold into auth_service row. |

### response.html
| # | Section | Finding | Evidence | Fix |
|---|---|---|---|---|
| P1-R1 | `#quick` (`:359-376`) | Labelled "Jungo's create-user handler" but uses `ShouldBindJSON` + `GetValidationErrors`; Jungo uses `validation.BindJSON`. | `jungo:internal/features/user/handler/v1/user_handler.go:36-49`; `validation/bind.go:25` | Use the real 3-line `if !validation.BindJSON(...) { return }`; keep explanation #2 (422 → `error`) pointing at it. Re-check `data-show` ranges after edit. |
| P1-R2 | `#jungo` row auth/domain/errors.go (`:894-899`) | "13 auth errors: Unauthorized, Forbidden, TooManyRequests, NotFound" — there are **17**, and also UnprocessableEntity (`password_too_long`), BadRequest (`invalid_reset_token`), Internal (`password_reset_unavailable`). User row lists 3 of 6. | `jungo:internal/features/auth/domain/errors.go:6-29`; `jungo:internal/features/user/domain/errors.go:6-13` | Drop the count ("auth errors: …, e.g.") or fix to 17 + codes. Mark user list as "e.g.". |
| P1-R3 | `#jungo` row validation (`:922-928`) | "`ParseUUID` answers 422 for a missing/invalid `:uuid`, then 400" — in Jungo a malformed UUID is stopped by `RoutePatterns` (404) first. | `middleware/route_patterns.go:30-32`; `jungo:internal/router/router.go:294-298` | "In Jungo, RoutePatterns answers 404 for a malformed `:uuid` before the handler; ParseUUID is the second line." |
| P1-R4 | `#what` table row `code` (`:239-246`) + 409 tab note (`:189`) | "On every status ≥ 400" / "Every error response has a code" — `Pagination()` never sets `Code`, even for ≥ 400 (page says so later at `:570`). Contradiction. | `response/responder.go:80-90` | Add "(except `Pagination`)". |

### validation.html
| # | Section | Finding | Evidence | Fix |
|---|---|---|---|---|
| P1-V1 | `#quick` DTO (`:303-311`) | Labelled "Jungo's create-user request", but `Email` tag is `required,max=150,email,email_advanced` in Jungo (page omits `max=150`). | `jungo:internal/features/user/dto/v1/user_dto.go:18` | Copy the real tag. |
| P1-V2 | `#quick` handler (`:315-325`) + `#what` diagram node 1 | Leads with `ShouldBindJSON`+`GetValidationErrors`, the pattern Jungo no longer uses; `BindJSON` only appears as explanation #5. | `validation/bind.go:17-27`; all Jungo handlers use BindJSON/BindQuery/ParseUUID (12 call sites) | Lead with `BindJSON`; show the manual form as "what BindJSON does" second. |
| P1-V3 | `#api` ParseUUID (`:815-818`) | (a) "Missing … → 422 `uuid must be a valid UUID`": a missing param fails `required` first → `"uuid is required"`. (b) No mention of the 400 `invalid_uuid` branch. (c) No note that a global `RoutePatterns` (Jungo) answers 404 first. | `validation/bind.go:12-15,42-55` | State both messages, the 400 branch, and the RoutePatterns interaction. |
| P1-V4 | `#setup` Fx tab code (`:206-221`) | Snippet mixes an fx option list with a `func` declaration and then another option — not valid Go and not Jungo's order (`SetDefaultLang` Invoke is before `response.Module`, the provider func is at fx.go:230). | `jungo:internal/app/fx.go:67-73,230-232` | Split into two code blocks (option list / provider func), real order. |

### i18n.html / index.html / slicex.html
| # | Page · section | Finding | Evidence | Fix |
|---|---|---|---|---|
| P1-X1 | index · hero (`index.html:22-23`) | "23 modular packages" — there are **22** package directories and 22 entries in nav (`database/postgres` is a subpackage). | `ls junkit` (22 dirs); `nav.js` 22 `pkg:true` | "22 packages" (or "22 packages, incl. database/postgres"). Needs owner confirmation (could intentionally count postgres). |
| P1-X2 | index · `#principles` rule 1 (`:44-45`) | "The only file read is one you name: validation's BlocklistPath" — `scaffold` also reads (and writes) files you pass; `logger` writes `Filename`, `storage` writes under `BaseDir`. junkit README lists all four. | `scaffold/fxfile.go:11,45,84`; `storage/local.go:35,55`; `junkit/README.md` §2 | Copy README wording: "the only files touched are the ones you name (logger Filename, validation BlocklistPath, storage BaseDir, scaffold paths)". |
| P1-X3 | index · hero | "each package works completely standalone" — several Modules need other junkit packages (response→i18n, validation→i18n, notification→telegram, middleware→response/notification/tracer/cache). | module.go files; index's own `#modules` table | "take only the ones you need; dependencies are listed in the Modules table". |

### P2 — style / verbosity / consistency

### Cross-page
- **P2-C1 Duplication response ↔ validation**: identical 422 envelope JSON (response `#what` 422 tab; validation `#what` grid) and identical `curl …/auth/login -d '{"email":"nope"}'` blocks in both `#jungo` sections. Keep the envelope on response, the field-map shape on validation; link.
- **P2-C2 Duplication i18n ↔ validation**: i18n `#api` lists all 23 validation messages; validation `#rules` repeats them by tag. Keep the full table on one page (validation, keyed by tag), and on i18n show only the system keys + link.
- **P2-C3 Duplication security ↔ middleware**: `SetIdentity` explained on both (security `#api` Identity, middleware `#setup` sym block) incl. the `ContextWithFallback` note (said 5× across the two pages). Document it once on middleware, link from security.
- **P2-C4 Jungo paths inconsistent**: i18n/response/validation/security `#jungo` use `app/fx.go`, `features/…` (relative to `internal/`, unstated); slicex mixes `features/*/…` with repo-root `cmd/scaffold/templates.go`; only middleware states "relative to jungo/internal". Use one convention (full `internal/…` paths) everywhere.
- **P2-C5 Terminal titles not bilingual**: middleware has VI-only bar titles in EN context ("trace id tự sinh" `:891`, "body vượt giới hạn" `:1160`, "kiểm tra header nén" `:1836`, "tải và giải nén" `:1859`, "403 secret sai" `:2123`), while response/validation duplicate whole terminal blocks per language. Pick one approach (bilingual span in the bar title; one shared command block).
- **P2-C6 Contradiction "never ctx.JSON"**: response says handlers never call `ctx.JSON` (`response.html:62`), security quick-start handler does `c.JSON(200, user)` (`security.html:371`). Use `responder.SendWithData`.
- **P2-C7 Accuracy notes I could not verify** (keep or soften): see "needs human review".

### middleware.html
- **P2-M1 Jungo content in the package page**: `#setup` is titled "How Jungo registers them" and is Jungo's router; "Two places for middleware" + "After the chain — the app's own middleware" + its table + `#jungo` row "middleware/" all describe `jungo/internal/middleware` (BearerAuth, RequireSecret, Guard), which jungo/access.html and jungo/auth.html already cover. Proposed structure: `#what` (11 middleware, one table in chain order + player) → `#setup` generic recommended order (quick main.go) → `#api` → `#jungo` (Jungo's router.go chain, env table, one-line link to access/auth pages for app middleware) → `#gotchas`.
- **P2-M2 Verbosity**: 11 "why this position" explain items (`:319-414`) + 19 player captions + gotcha 1 all restate the order. Replace the 11 explain items with one compact table: position · middleware · "must be before/after" · what breaks if moved. Keep the player (it is the best diagram on the site for this).
- **P2-M3** "Required, the same in every app" (`:67`) overstates — Gzip is optional (page itself says skip it behind a compressing proxy), Banner is toggleable. Say "Generic, the same in every app".
- **P2-M4** Banner `#api` list: EN/VI items interleaved out of order (`:1335-1344`: EN banned, EN panics, VI panics, VI banned) → EN and VI show the two bullets in different order.
- **P2-M5** VI term: "strike" is translated "lỗi" (= error) throughout Banner; collides with "error". Use "lần vi phạm"/"strike".
- **P2-M6** Player node ids don't match numbers (`mw6`=Payload #10, `mw7`=AccessLog #6, `mw8`=Limiter #9, `mw9`=Recover #7, `:108-118`). Harmless but error-prone for edits; rename to `mw1..mw11`.
- **P2-M7** Missing small facts: LogTTL/whitelist are "per IP" but buckets are per `ClientKey` (/64 for IPv6) (`limiter.go:202-214`); `ClientStore` is exported but has no exported methods (page says so — fine; could drop the sym block entirely).
- **P2-M8** Hero/what repeat "Authentication and permissions are app policy…" twice (`:31-35`, `:52-59`).

### security.html
- **P2-S1** `#setup` Options row MaxConcurrent contains a Jungo-specific benchmark ("~190 ms per cost-12 compare", "Measured on 10 cores: ~25/s while /auth/me keeps its p99") — move to Jungo auth page or gotchas, mark as measured where.
- **P2-S2** VI hero adds algorithm details (AES-256-GCM, HMAC-SHA256, SHA-256) the EN hero lacks; align.
- **P2-S3** Identity flow diagram duplicates the `#api` Identity section; fine, but could be merged with the token flow into one player (issue → seal → open → lookup → SetIdentity → MustGetIdentity).

### response.html
- **P2-R1** Edge not documented: `AppError{Code: ""}` (or unknown code) → status 500 and `"code"` omitted / sent as-is (`responder.go:109-114,153`). One line in ErrorCode table ("any other value") already partly covers; add empty-code case.
- **P2-R2** `Error()` translates `AppError.Message` with no args (`responder.go:112`): a message key whose text contains verbs will render raw `%[1]s`. Add to gotchas.
- **P2-R3** Small diagram opportunity: `Error()` decision (errors.As → status from Code → c.Error if 5xx||Cause → JSON; else c.Error(non-nil) → 500) as a 3-node flow instead of the 5-bullet list.

### validation.html
- **P2-V1** Missing gotchas: blocklist matches the exact domain only (`sub.mailinator.com` passes) (`custom_validation.go:86`); MX cache is capped at 10 000 domains and cleared wholesale (`:112-115`).
- **P2-V2** `datetime` built-in tag takes a layout param but its message always says `YYYY-MM-DD` (`i18n/i18n.go:145`) — note it (source wording, see human review).
- **P2-V3** Setup paragraph about Fx laziness/panic (`:223-234`) is long; move "force it with fx.Invoke" to gotchas.

### i18n.html
- **P2-I1** `#jungo` omits `features/access/module.go` (third `registerTranslations`). Note that `user_not_found` is registered by access, auth and user (`jungo:…/access/module.go:104`, `auth/module.go:108`, `user/module.go:71`) — a live example of gotcha 6.
- **P2-I2** `#setup` "request language" row is Jungo-specific; it is repeated in `#jungo`. Keep in `#jungo` only.

### slicex.html
- **P2-L1** Structure: only `quick`/`api`/`jungo`. Acceptable for one function, but add a 2-line `#gotchas` (fn is called sequentially, no error return — use a loop when the mapper can fail; a nil input still allocates an empty slice). Sub-headline "Use it in 30 seconds" consistent with others.
- **P2-L2** `#jungo` misses service usage (`jungo:internal/features/access/service/access_service.go:284`); paths lack `internal/`.

### index.html
- **P2-X1** Section ids (`principles`/`packages`/`modules`) differ from the package pattern — fine for an overview page; no change.
- **P2-X2** Packages subtitle promises every page has "what … pitfalls" — slicex/upload/pagination/apidoc don't have all sections; soften.

---

### Diagrams
| Page | Diagram | Verdict |
|---|---|---|
| middleware | `#mw-player` 19-step player, 11 chain nodes + app + handler | Accurate vs `jungo:router.go:247-299` and each middleware's in/out behaviour. Readable; keep. Rename node ids (P2-M6). Replace the 11 explain items with a table (P2-M2). |
| security | token life flow (4 nodes) + identity flow (3 nodes) | Accurate (`token_sealer.go`, `token_hash.go`, `identity_context.go`). Optional merge into one player (P2-S3). |
| response | 4-node handler→translate→envelope→JSON | Accurate, slightly decorative. Candidate addition: Error() decision flow (P2-R3). |
| validation | 4-node bind→classify→translate→respond | Accurate but node 1 shows `ShouldBindJSON`; show `BindJSON` wrapping steps 1–4 (P1-V2). The GetValidationErrors order table is better than a diagram — keep. |
| i18n | 4-node fill→store→resolve→use | Accurate (`i18n.go:73-115`). Keep. |
| index | 3-node Options→Module→your code | Accurate. Keep. |
| slicex | none | None needed. |

### Per-page summary
- **middleware.html** (2400 lines): technically very accurate on every middleware (verified all 11 against source). Problems: wrong env key (P0), stale BearerAuth snippet (P0), wrong TRACER_DEBUG_KEY default, table order ≠ chain order, heavy Jungo app-middleware content, much repetition of the ordering rationale. Biggest win: restructure + order table.
- **security.html**: accurate crypto/format/error details (lengths, order of Open checks, 3008-byte limit all correct). Fix PasswordOptions signature, stale login_guard row; trim Jungo benchmark.
- **response.html**: accurate envelope/ErrorCode/omitempty semantics. Fix stale quick-start, auth error count, ParseUUID/RoutePatterns claim, Pagination code exception.
- **validation.html**: rules, regexes, field-name mapping, MX behaviour all accurate. Fix stale DTO/handler (lead with BindJSON), ParseUUID details, invalid-Go setup snippet; dedupe catalog with i18n.
- **i18n.html**: accurate and tight (62 keys, fallback, BADINDEX). Only small Jungo-table gaps and dedupe.
- **index.html**: package count 23→22, "only file read" claim, "completely standalone" overclaim. Modules table verified correct against every module.go.
- **slicex.html**: accurate; minimal; add tiny gotchas, fix paths.

### Needs human review
1. **Package count**: is "23" intentional (counting `database/postgres`)? Source has 22 dirs, nav 22.
2. **CACHE_REDIS_ENABLE** also appears on 4 Jungo pages (outside my scope) — orchestrator should fix site-wide to `CACHE_REDIS_ENABLED`.
3. Performance numbers not verifiable from source: Banner "~20 µs vs ~1–2 µs per request" (`middleware.html:1365-1368`); security "~190 ms per cost-12 compare", "~25 logins/s on 10 cores" (`security.html:251-258`). Keep only if the owner has the benchmark.
4. Built-in i18n texts are off-by-one (`min` "longer than", `min_int` "greater than", `max_int` "less than" for inclusive bounds) and `datetime` message ignores its layout param (`i18n/i18n.go:134-137,145`). Pages document this honestly; fixing the source text is a junkit decision.
5. `security/secret.go:5-6` comment says the hint list is shared with `database`; database does not call `IsSecretName` (only tracer, middleware, notification do). Docs don't repeat the claim — source comment may be stale.
6. Whether the "Two places for middleware" explainer should live on Jungo access page (recommended) or stay on middleware page as a short boundary note.


---

## Audit — Junkit pages (group C): tracer, cache, logger, database, pagination, apidoc, sqlfmt

Read-only audit. Paths: pages in `jundoc/junkit/`, source in `junkit/<pkg>/` and `jungo/`. Line numbers are from the source at HEAD.

### P0: factually wrong, would break a developer

| # | Page · section | Finding | Source evidence | Fix |
|---|---|---|---|---|
| P0-1 | logger · `#what` (2nd flow, node `t1`) and `#jungo` (both EN and VI terminal blocks) | The page says `middleware.Trace` "reads the `X-Trace-Id` header or generates a UUID". The demo sends `-H 'X-Trace-Id: demo-123'` and says "the response echoes `X-Trace-Id: demo-123`", then `grep demo-123`. In fact Trace reads the client header only when `TraceOptions.TrustHeader` is true, and Jungo does not set that field. Jungo returns a fresh UUID and the grep finds nothing. | `junkit/middleware/trace.go:24-26,41-47`; `jungo/internal/router/router.go:250-254` (no TrustHeader) | Node t1: "generates a UUID (reuses a client `X-Trace-Id` only with `TrustHeader`)". Demo: read the `X-Trace-Id` response header from `curl -i`, then grep for that value. Add a gotcha that TrustHeader is off in Jungo, and why. |
| P0-2 | cache · `#setup` (paragraph under the Fx tab), `#jungo` (app/fx.go row, config/config.go row, session_cache row, the `.env` comment in the terminal) | The env var is given as `CACHE_REDIS_ENABLE`. The real name is `CACHE_REDIS_ENABLED`. A developer who sets the documented name keeps running on the no-op cache. | `jungo/internal/config/config.go:86`; `jungo/.env.example:106` | Replace all 5 occurrences (EN and VI) with `CACHE_REDIS_ENABLED`. |
| P0-3 | database · `#jungo` (auth_service.go row) | "`Refresh`: consume the token, revoke the family, issue a new pair — one transaction." This is stale. Refresh makes one sqlc call, `repo.RefreshSession` (the "one DB call" in the source comment), with no `WithTransaction`. | `jungo/internal/features/auth/service/auth_service.go:175-190`; `auth/repository/auth_repository.go:59-72` | Replace the row with a real `WithTransaction` user: `features/access/service/access_service.go` (lines 113, 154, 185, 217, 264), `features/auth/service/password_reset.go:98` (consume the reset token and set the password), or `database/primary/migrate.go:86,117`. |

### P1: missing, misleading, stale or confusing

| # | Page · section | Finding | Source evidence | Fix |
|---|---|---|---|---|
| P1-1 | cache · `#jungo` intro | The intro says "The auth feature is the only consumer". The same table lists `access/permission_cache.go` and `router/router.go` (Banner). | `access/infrastructure/permission_cache.go:28`; `router/router.go:272` | Change to "auth (sessions, login guard), access (permissions) and the Banner middleware". |
| P1-2 | cache · `#jungo` session_cache row; `#api` Invalidatable ("marker: the session's family") | The session cache uses two markers, the family and the user (`auth:user:<uuid>:invalidated_at`). The page names only the family. | `auth/infrastructure/session_cache.go:34-39,80-87` | Add the user marker and key. Mention `InvalidateUser`. |
| P1-3 | cache · `#jungo` login_guard row | The keys are stale. The page lists `auth:login:ip:short:<ip>`, `auth:login:ip:long:<ip>` and `auth:login:email:<hash>`. The real keys are `auth:login:ip:attempts:<ip>`, `auth:login:ip:failures:<ip>`, `auth:reset:ip:<ip>` and `auth:reset:email:<hash>`. | `auth/infrastructure/login_guard.go:128-139,195-204` | Copy the keys from the source. Mention the password-reset counters. |
| P1-4 | cache · `#gotchas` 4 | "Jungo's session cache does `session := *entry.Session`" is stale. It now does `copied := *session` and also clears `Permissions`. | `session_cache.go:43-47` | Update the code quote, or drop the Jungo reference. |
| P1-5 | cache · missing behavior (`#api` or `#gotchas`) | There is no key namespacing. All Redis caches on one Store share one keyspace, but each `Memory[T]` has its own map. The same key in two caches of different types collides on Redis and does not collide on memory. `Invalidatable` puts entries and markers in the same keyspace on Redis. | `cache.go:121-129`; `memory.go:52-56`; `invalidatable.go:35` | Add a gotcha: "Prefix keys per cache. On Redis every cache on a Store shares one keyspace." |
| P1-6 | logger · `#gotchas` 1 | "Production prints nothing to stdout … mount or ship the log folder" leaves out the documented fix: `Output: logger.OutputConsole` forces stdout in any environment. Also, any unrecognised `Output` value (e.g. `"stdout"`) silently means file. | `logger/logger.go:74-84` | Add "unless `Output = OutputConsole`". Add the unknown-value → file rule to the Options table. Note that Jungo exposes no env var for Output (only the console's `--verbose`/`--debug` set it, `jungo/internal/app/fx.go:149-161`). |
| P1-7 | database · `#config` DSN row | Lists only DB_HOST/PORT/USER/PASSWORD/NAME/SSLMODE. `cfg.DB.DSN(tz)` also sets `timezone`, `connect_timeout` (DB_CONNECT_TIMEOUT=5s), `statement_timeout` (DB_STATEMENT_TIMEOUT=30s) and `idle_in_transaction_session_timeout` (DB_IDLE_IN_TX_TIMEOUT=60s). | `jungo/internal/config/config.go:28-30,223-245` | Add the 3 timeout env vars and their defaults, plus the timezone. The statement timeout matters operationally. |
| P1-8 | database · `#api` completeness | Missing exported symbols: `postgres.Options` (fields appear only as a Jungo env table), `postgres.DB` type, `database.ErrorType` and its 10 constants with string values (`ErrorNone`=`""`, `"not_found"`, … `"unknown"`), the `database.Classifier` type. The signatures are abbreviated (`WithTransaction(ctx, fn) error`) where other pages give full Go signatures. | `database/error.go:11-29`; `postgres/postgres.go:16-77` | Add a code block with the full signatures, the `Options` struct and the ErrorType consts. Use the same `jd-sym` style as other pages. |
| P1-9 | database · structure | No "what" and no "setup / without Fx" section. A non-Jungo reader never sees `postgres.New` + `Ping` + `Close` or `postgres.Module` wiring. The `#config` section is really Jungo's env table. | — | See "Structure" below: add a short `setup` (Fx: `postgres.Module` + supply Options; without Fx: `New`/`Ping`/`defer Close`). Make `#config` the package Options table and move the env column to `#jungo`. |
| P1-10 | pagination · `#jungo` rows 1–3 | Stale. `ToFilter()` does not exist; the code calls the function `v1dto.ToUserListFilter(req)`. The handler binds with `validation.BindQuery`, not `ShouldBindQuery`. The repository runs `ListUsersNewest` / `ListUsersOldest` (picked by sort_order), not `ListUsers`. | `user/dto/v1/user_dto.go:66-73`; `user/handler/v1/user_handler.go:69-85`; `user/repository/user_repository.go:93-104` | Update the three rows. |
| P1-11 | sqlfmt · `#try` | The page says "Same regexes and the same `$n` scanner as the Go code", but the JS `bind()` does not skip single-quoted strings or `$$…$$` / `$tag$` bodies the way Go `Bind` does. Typing `'$1'` in the playground binds it; Go leaves it. | `sqlfmt/sqlfmt.go:113-149` vs the page's `<script>` `bind()` | Port `closingSpan` and `dollarTag` to the JS and add an assert (`bind("SELECT '$1', $1",["x"]) === "SELECT '$1', 'x'"`), or soften the claim. |
| P1-12 | tracer · missing behavior (`#gotchas`) | On a debug request a handler panic is recorded only as a "PANIC RECOVERED" entry: it is not logged and the notifier is skipped. AccessLog also skips debug requests (`SkipIf: debug.Matches`), so the panic leaves no trace in the logs. A panic in a middleware that runs before Recover (Security, Trace, CORS, Gzip, AccessLog) is re-panicked by TracerDebug's deferred handler. | `junkit/middleware/recover.go:41-44`; `tracer_debug.go:76-79`; `jungo/internal/router/router.go:262-267` | Add one gotcha: "Debug requests are invisible to the logs and the notifier". |

### P2: style, verbosity, consistency, minor gaps

### tracer
- `#what` and hero: `?t_debug=` and `X-Internal-Secret` are Jungo's values. The package concepts are `QueryKey`/`QueryValue`/`SecretHeader` (`tracer_debug.go:34-39`). Say "e.g. Jungo's `?t_debug=`" in the hero.
- `#setup` "Settings (Jungo config)" table plus the security callout is Jungo-specific and is repeated in `#jungo` (config and .env.example rows) and in gotcha 7 (secrets). Move the env table to `#jungo` and keep one security callout.
- Duplicated with `junkit/middleware.html` (the TracerDebug section repeats the curl/httpie/wget rule and the ModHeader tip, around lines 678-702) and `jungo/overview.html#flow`. Make tracer.html the canonical home and have middleware.html link to it.
- `#api` intro: "Every function taking a ctx is a no-op without a Debugger" is not quite true. `Measure` still runs `fn`, `BeginQuery` returns nil, and `RenderHTML`/`RenderJSON` return placeholder text (`render.go:126-157`). Reword: "records nothing".
- `#api` PgxWrapper bullet: "the true `row_count`" is really the number of successful `Scan` calls (`db.go:215-226`). The SQLData table states this correctly, so align the bullet with it.
- `#jungo` table is missing the `"Bcrypt Hashing"` span in `auth/service/password_reset.go:104`.
- `#gotchas` 2: headers the handler set (e.g. `Set-Cookie` on login) still reach the client. Only the body and status are discarded (`tracer_debug.go:16-30`).
- The router snippet uses the literal `"X-Internal-Secret"`; the source uses `policy.InternalSecretHeader` (`router.go:243`). This is fine for docs, but mark it as simplified.
- Length: about 1,090 lines. The "What the dashboard shows" list and the "Browser → HTML" block could shrink, since the Try-it already shows the DB summary.

### cache
- `#what` diagram: node order is service → New → store → on-miss (dashed). On a miss `fetchFn` runs before the store, so the read-through order looks reversed. Reorder to service → New → (miss) fetchFn → store, or label the wire "miss".
- `#setup` Options and `#api` Memory: "a full cache evicts another key". Say it is an arbitrary entry in map order, not LRU (`memory.go:198-204`).
- `#api` Invalidatable: add that a marker read error counts as stale, so revoked data is never served on a Redis error (`invalidatable.go:89-99`). That Invalidatable reads entries with `Get` (an error counts as a miss) is fine.
- The `#api` driver table and the `Redis[T]` / `Memory[T]` / `Noop[T]` method lists repeat the same 7 signatures 4 times. Keep the interface once, plus "extra: `Redis.Ping`".
- VI hero ("chuyển đổi linh hoạt chỉ qua một dòng cấu hình") says more than the EN. Tighten it to match.
- The `#jungo` table has a stray indented `</table>`.

### logger
- `#try` claims to mirror how `New` picks the output, but it has no `Output` input. Add one, or say "Output not modelled".
- `#api` New: two `<li>` elements ("Both: `zap.AddCaller()`…", EN and VI) are never closed.
- `#setup` VI sub: "từ cách Jungo đang dùng tới hoàn toàn Không dùng Fx" has a capital "K" in mid-sentence. Rewrite as "tới cách không dùng Fx".
- The 17% CPU profile figure in `#api` New is a perf claim that is not in the source comment (`logger.go:58-61` mentions no figure). Mark for human review or drop it.
- Two flows in `#what`: the first (config→build→output→lifecycle) is mostly decorative and restates the Options table.

### database
- `#use`: the code says "How Jungo writes it" but leaves out `wrap(...)`, which every Jungo repository uses (`user_repository.go:42,54,192`). Show `return nil, wrap("create", database.Match(...))`.
- `#how` rules 2–3 (transaction keyed per DB, nested call joins, no savepoints) duplicate `jungo/multi-database.html:106-110,212-213`. Keep the package rule here and link from multi-database, or the reverse. Don't keep both in full.
- `#api` WithTransaction: add that begin and commit failures come back wrapped as `postgres: begin transaction: …` / `postgres: commit transaction: …`, and that a rollback error is ignored (`tx.go:45-63`).
- `#config` QueryLogging: add that queries are logged at INFO (failures at ERROR), so `LOG_SQL_LEVEL=warn` shows only slow and failed queries (`postgres.go:131-136`; `query_tracer.go:37-47`). Event names are `SQL_EXECUTION` / `SLOW_QUERY_DETECTION`.
- `#errors`: add the details for not-found (`"resource not found"`) and timeout (`"query timeout or canceled"`) (`postgres/error.go:21-23`; `error.go:67-69`).
- `FromPool` "without logging": more precisely, it attaches no query tracer and no Decorate; a tracer already on your pool still runs.

### pagination
- No `setup` section. That is justified: there is nothing to wire. Add a one-line chip or sentence ("nothing to wire") for consistency.
- `#quick`: uses `ShouldBindQuery` plus a hand-written 422. The house helper is `validation.BindQuery(ctx, h.responder, h.validator, &req)` (`junkit/validation/bind.go:30-32`). Use it.
- `#api` NewPagination: a hand-built Request with `PageSize` > 100 gives `page_size: 150` in the metadata while `GetLimit()` = 100. Pass `int(req.GetLimit())`, or document the mismatch.
- `#jungo`: "48–80 ms against 0.02 ms + 6 ms for 200k users" cannot be checked against the source (needs human review).

### apidoc
- `#tags` table is missing: a field with no tag uses the Go field name, not a lower-cased one (`schema.go:125-127`); `int64`/`uint64` get `format: int64`; `[]byte` becomes `string/byte`; a map becomes `additionalProperties`; a `TextMarshaler` becomes `string`; recursive types stop at a bare `object`; `*T` is nullable in bodies but not in query params (`schema.go:37-76,84`).
- `#api` Security: `APIKeyHeader` adds only 401, not 403, and creates a security scheme named after the header. Permissions also emit `x-permissions` (`apidoc.go:127-130,155-158,228-234`). In `#api` Spec, "401/403 (protected)" is imprecise for the same reason.
- `#api` Spec: it sorts the caller's `ops` slice in place (`apidoc.go:70-76`), and a duplicate method+path silently overwrites the earlier one (`apidoc.go:90`).
- `#jungo` router row: tags come from the first segment after `/api` and an optional `vN` segment (`router.go:212-220`).
- Hero: "API docs that cannot drift" overclaims. Field rules cannot drift, but `Summary` and the `Response` type are hand-written in `Docs()`. Startup only checks that every route has a doc.

### sqlfmt
- `#api` FormatValue: a named non-string type (e.g. `type Role int32`) misses the `case int…` arm and is rendered quoted (`'5'`), because the type switch is on the concrete named type (`sqlfmt.go:232-256`). Add a table row or gotcha. A named string type renders the same as a plain string, so it is unaffected.
- `#api` BindQuestion: the quote toggle ignores backslash escapes (MySQL `'it\'s ?'`), double-quoted strings and backtick identifiers (`sqlfmt.go:198-211`). Add a gotcha like Bind's `E'…'` note.

### All seven pages
- The `.w` headings of `jd-ex` items (gotchas and quick explanations, e.g. "Close your rows", "Keep the ctx", "Delete on write", "Pass txCtx, not ctx") are English only. apidoc's gotchas already wrap them in en/vi spans. Apply that everywhere, keeping pure code tokens (`GetOrSet`) as they are.
- Table header cells such as `field · json` are fine as code.

### Structure

| page | sections | verdict |
|---|---|---|
| tracer | what, setup, quick, try, api, jungo, gotchas | Follows the pattern. Too long; trim duplication. |
| cache | what, setup, quick, try, api, jungo, gotchas | Follows the pattern. |
| logger | what, setup, quick, try, api, jungo, gotchas | Follows the pattern. |
| sqlfmt | what, setup, quick, try, api, jungo, gotchas | Follows the pattern. |
| pagination | what, quick, try, api, jungo, gotchas | No setup; acceptable (nothing to wire). |
| apidoc | what, quick, tags, api, jungo, gotchas | `tags` stands in for `try`. Justified: the tag→OpenAPI table is the core content. |
| database | use, how, errors, config, api, jungo, gotchas | Leading with `use` is defensible (most readers come from a repository). The missing what/setup and the Jungo-only `config` are not. Proposed order: `use` (keep first), `how`, `setup` (Fx Module / without Fx / package Options table), `errors`, `api`, `jungo` (env table and files), `gotchas`. |

Headings: the "Use it in 30 seconds" / "Try it" / "Good to know" set is consistent. database's "Configuration" should become "Wire it up" to match.

### Diagrams

- tracer `#what` (4 nodes): accurate (`tracer_debug.go:54-72`). The N+1 timeline playground is accurate: grouping matches `render.go:67-119` and the self-check asserts pass. A small JD.player could replace prose for "Stop → Recover re-panics → TracerDebug recovers → render" and "panic → Recover records PANIC RECOVERED", which are now spread over 3 bullets.
- cache `#what`: the order is misleading (see P2). Invalidatable's "load started at / marker at / 2 s skew" rule is dense prose. A 3-row timeline (marker, load start, load end, verdict) would make it clear. The fixed-window playground is accurate (`memory.go:107-140`).
- logger `#what`: flow 2 is factually wrong (P0-1). Flow 1 is decorative.
- database `#how`: accurate (`postgres.go:146-171`). The Classify playground mirrors `postgres/error.go:37-62`.
- pagination, apidoc, sqlfmt `#what`: accurate and readable. sqlfmt's playground differs from the source (P1-11).

### Per-page summary

- **tracer**: The API is complete and every exported symbol matches the source. No P0. Main issues: the debug-panic invisibility gotcha is missing; the page is long and duplicated with middleware.html and its own `#jungo`; the Jungo key is used as if it were the package concept.
- **cache**: The API is complete and accurate. One P0 (wrong env var name, 5 places). Several stale Jungo facts (keys, markers, "only consumer"). The shared-keyspace behavior is missing.
- **logger**: The API is complete and accurate, including the zap level parsing (checked against zap v1.28.0 `zapcore/level.go:170-200`). One P0 (trace-ID header demo). Gotcha 1 is misleading. Minor HTML and VI glitches.
- **database**: The covered behavior is correct (tx join, classification table, MaskDSN, EscapeLike, Wrapper). One P0 (Refresh transaction). The API reference is incomplete, the DSN env list is incomplete, the structure deviates without a setup section, and it overlaps multi-database.
- **pagination**: The API is accurate (`pagination.go` fully covered). The `#jungo` section is stale (P1-10). The quick-start helper is not idiomatic.
- **apidoc**: The API is complete. A few schema rules and security nuances are undocumented.
- **sqlfmt**: The API is complete and accurate, including the gotchas about comment stripping and `[]byte`. The playground's bind does not mirror Go `Bind`. Named numeric types render quoted, which the page doesn't mention.

### Needs human review
1. pagination `#jungo`: the "48–80 ms vs 0.02 ms + 6 ms at 200k users" benchmark (not in the source).
2. logger `#api` New: the "~17% of a busy API's CPU in a profile" figure (not in the source comment).
3. logger P0-1 fix direction: document TrustHeader as off, or should Jungo turn it on? (product decision)
4. database/multi-database overlap: which page owns the transaction rules and the tracer contract-test text (now in tracer.html `#api`, multi-database.html:317 and the junkit README:745)?
5. tracer.html vs junkit/middleware.html: which page owns the TracerDebug documentation?


---

## Audit — Junkit pages, batch D

Scope: jundoc/junkit/{recaptcha,notification,telegram,httpclient,storage,upload,mailer,console,scaffold}.html
Source read: junkit/{recaptcha,notification,telegram,httpclient,storage,upload,mailer,console,scaffold}/*.go (non-test, all files);
jungo internal/app/fx.go, internal/config/config.go, internal/router/router.go, internal/console/kernel.go,
internal/console/commands/*, internal/features/auth/{service/auth_service.go,infrastructure/login_guard.go,dto,domain},
internal/features/user/{handler,router,service}, cmd/scaffold/{main,command,templates}.go, Makefile, .env.example;
junkit/middleware/{recover,limiter,banner,alert}.go.
Paths below: `jk/` = /Users/quoctuan/Workspace/personal/jun/junkit, `jg/` = /Users/quoctuan/Workspace/personal/jun/jungo.

Overall: the API reference sections are accurate and close to the code. The real errors are in the "In Jungo" sections
and the quick-start notes: they name files and symbols that do not exist (console, scaffold) and quote a Jungo snippet
that does not match the source (storage).

---

### P0 — factually wrong / would mislead a developer

1. **console.html #jungo (table rows 3–4)**: cites `features/user/command/create_user_command.go` (`Successf("Created user %s <%s>")`)
   and `features/user/command/list_users_command.go` (`Infof("Showing %d of %d user(s)")`). Neither the files nor the
   directory exist (`ls jg/internal/features/user/command` → no such dir; grep finds no such strings). The page also leaves out the real
   caller `jg/internal/console/commands/migrate_command.go:36,43` (`Infof("Applied %s")`, `Successf("Database is up to date")`).
   **Fix:** delete the two rows and add migrate_command.go.

2. **scaffold.html #quick, explanation 6**: "Errors come from console.NewError". `console.NewError` does not exist.
   jk/console/console.go exports only Infof/Successf/Warnf/Fatalf/Stepf. scaffold creates its errors with `fmt.Errorf("scaffold: …")`
   (jk/scaffold/scaffold.go:158,167,180,192,196; remove.go:31,35,50,63; migration.go:26).
   **Fix:** "Errors are plain wrapped errors prefixed `scaffold:`; scaffold itself prints progress (Created …, → Registering …, Registered in …)."

3. **scaffold.html #jungo, templates.go row**: "moduleTmplFor fills in those label words, since text/template cannot capitalize."
   `moduleTmplFor` does not exist (grep finds no match in jg/cmd/scaffold). The real mechanism is `fill()` (jg/cmd/scaffold/templates.go:42-54),
   which replaces the placeholders PASCAL_PLURAL, TABLE_UPPER, NAME_WORDS, PLURAL_WORDS, PLURAL_TITLE and `@@` in **every** template
   before scaffold renders it. **Fix:** describe `fill` and its placeholders.

4. **scaffold.html #gotchas 5**: "To emit a Go struct tag backtick … Jungo writes {{"`"}} via string concatenation." Wrong. The
   templates write `@@`, and `fill` replaces it with a backtick (jg/cmd/scaffold/templates.go:36,52). **Fix:** describe the `@@`
   placeholder and suggest a replacer applied before `scaffold.Generate`.

5. **storage.html #setup (Fx tab, "internal/router/router.go" box) and #jungo (router.go row)**: shows
   `p.Router.Static("/uploads", p.Config.StoragePath("uploads"))`. The source has no such line. jg/internal/router/router.go:106-116
   (`registerUploads`) creates `p.Router.Group("/uploads", middleware.Security({ForceHSTS, CrossOriginResourcePolicy:"cross-origin"}),
   middleware.Recover(...))` and then calls `uploads.Static("/", …)`. The snippet leaves out the security headers (nosniff, CORP),
   which the source comment (router.go:104-105) says matter for user files. A developer who copies the snippet loses them.
   **Fix:** quote the real group or describe it, and say why the headers matter.

### P1 — missing / misleading / confusing

### recaptcha
6. **#jungo**: does not say that Jungo's `provideRecaptchaOptions` never sets `ExpectedAction` or `Hostnames` (jg/internal/app/fx.go:321-325).
   As a result, Jungo login accepts a token minted for any action or host. That is exactly the risk gotcha 2 warns about. **Fix:** add one line in #jungo (and
   optionally a TODO note for Jungo).
7. **#gotchas 3 vs Jungo**: "fail closed, as Jungo's login does". This is correct (auth_service.go:113-117 maps every error to ErrRecaptchaFailed), but the log
   line Jungo emits is `Warn("auth: recaptcha rejected login")` for **all** errors, including outages. Minor; consider citing it.

### notification
8. **#gotchas 4 "one switch for everything"** and **#setup Enabled row** ("The one switch for every alert"): misleading in a Jungo
   context. The login-guard brute-force alert bypasses Notifier and `Enabled`. It calls telegram.Client directly whenever the
   token and chat id are set, in any environment (jg/internal/features/auth/infrastructure/login_guard.go:148-168).
   **Fix:** say "every Notifier alert", and note that the login-guard alert is not gated by `Enabled` (also on telegram #jungo).
9. **#gotchas 2**: "Dropped() on the *TelegramNotifier". Module provides the `Notifier` interface (jk/notification/module.go:26),
   so under Fx you need a type assertion `n.(*notification.TelegramNotifier)`. **Fix:** say so.
10. **#api ReportError**: missing behaviour. When Stack is set, SendDocument is attempted even if SendMessage failed, and both errors are
    joined into a single "notification: send failed" log line (jk/notification/notification.go:203-214). Also, sends are sequential on one
    worker, so one slow Telegram call (up to 10s) delays every queued alert. Add both.
11. **#jungo router row**: does not mention that Banner runs only when `cfg.Banner.Enabled` (jg/internal/router/router.go:270), or that Recover
    is installed twice (the /uploads group, router.go:113, and global, router.go:267). Ban alerts therefore depend on BANNER_* config.

### telegram
12. **#jungo login_guard row**: correct, but should add that this alert is **not** gated by notification's `Enabled`
    (production-only) and so fires in development too when TELEGRAM_* are set (login_guard.go:148-150). It is sent with
    `context.WithoutCancel(ctx)` + 5s, tracked so shutdown waits (login_guard.go:46,161-167).

### httpclient
13. **#jungo table**: lists only telegram and recaptcha as consumers of the shared *http.Client. mailer.Module also takes it
    (`HTTPClient *http.Client optional:"true"`, jk/mailer/module.go:21) and uses it for the brevo driver. notification uses it indirectly through telegram.
    **Fix:** add mailer (brevo) and the notification→telegram path.
14. **#setup "Fx (Jungo)" tab**: should say that `fx.Provide(httpclient.NewDefaultClient)` registers **no** OnStop
    `CloseIdleConnections` hook (only `Module` does, jk/httpclient/module.go:15-19). Minor, but this is the visible difference between the two tabs.

### storage
15. **#api "package upload" block + #what node s1 + hero chip**: storage.html re-documents the whole upload API (Rule, Image, Open,
    HasType, Extension, ErrInvalidFile and their behaviour), duplicating upload.html. **Fix:** keep a 2-line pointer and one handler
    snippet, and link to upload.html.
16. **#gotchas 5**: "Any such URL still deletes that file, so only pass URLs you stored yourself." The wording is unclear in both EN and VI.
    **Fix:** "Any URL of the form BaseURL/<name> deletes BaseDir/<name> — never pass a client-supplied URL straight to DeleteFile."
17. **#api NewLocalService**: does not mention that NewService/NewLocalService with an `err` returns a nil service, or that
    `os.ModePerm` (0777 before umask) is used for the directory and `os.Create` (0666 before umask) for files (jk/storage/local.go:35,55). P1 only
    for the permission note (relevant on shared hosts). Otherwise P2.

### upload
18. **#gotchas 1 "Size is the header's claim"** and **#what node u1 "From the multipart header; nothing read yet"**: wrong.
    `multipart.FileHeader.Size` is the byte count Go counted while parsing the form, not a value the client declares. By the time
    `c.FormFile` returns, Gin has already read the whole body (into memory up to MaxMultipartMemory, then into temp files). The real cap
    is the body limit (Payload). **Fix:** "Size is measured after the whole multipart body is parsed, so the request body limit is what stops
    a huge upload; Open's size check just enforces the rule."
19. **#api Open/HasType**: missing edge cases. An empty file always fails (`io.ReadFull` returns `io.EOF`, which is not ErrUnexpectedEOF → false →
    ErrInvalidFile, jk/upload/upload.go:61-63). Rule.Extensions must be lowercase or nothing matches (compared to `Extension()`,
    upload.go:40). A seek failure in HasType also becomes ErrInvalidFile, not an I/O error (upload.go:66-68).
20. **#quick explanation 4 title "close, then store"**: says the reverse of the code (store with defer-close). **Fix:** "store, then close
    (defer)".

### mailer
21. **#api**: exported types `Options`, `SMTPOptions` and `BrevoOptions` (jk/mailer/mailer.go:36-99) have no API entries. They appear only
    as a setup table. Add `jd-sym` entries (or state that the setup table is the reference, as httpclient does).
22. **hero chip "standard library only"**: wrong. The package imports go.uber.org/zap, go.uber.org/fx and github.com/google/uuid (mailer.go:13,
    module.go:6-7, smtp.go:21). **Fix:** list the real dependencies.
23. **#api / gotchas**: brevo ignores `Attachment.ContentType` (only name + content are sent, jk/mailer/brevo.go:87-90). With AllowPlaintext
    and a Username on a non-localhost host, PLAIN auth fails ("unencrypted connection") because net/smtp refuses
    (smtp.go:108-116). The log driver logs Bcc recipients together with To/Cc in "to" (log.go:44). Add these as short notes.

### console
24. **#gotchas 2 (Fatalf skips defers / OnStop)**: Jungo's own kernel is the live example. `console.Fatalf` in `dispatch`
    (jg/internal/console/kernel.go:53,60) skips the deferred `p.Shutdowner.Shutdown()`, so Fx OnStop hooks (DB close, notification
    drain) never run on a failed command. Worth stating in #jungo; it is also a candidate fix for Jungo (needs human review).

### scaffold
25. **#jungo first row (main.go remove)**: missing the edge case that `make feature-remove` passes no TABLE (jg/Makefile:148-150). For a
    feature created with TABLE=custom, the printed migration file list falls back to `NNNNNN_<plural>…` placeholders
    (main.go:130-138) and step 3 prints the wrong Model. Add to gotchas.
26. **#jungo intro**: links "day-to-day use" to jungo/overview.html#feature. jungo/build-a-feature.html (#generate) is the dedicated
    page. **Fix:** link there (verify with the orchestrator which page owns it).

### P2 — style / verbosity / consistency

27. **Setup heading VI inconsistent**: "Kết nối" (recaptcha, notification, telegram, mailer) vs "Kết nối vào app" (httpclient, storage,
    console, scaffold). Tab labels vary as well: "with Fx (as Jungo)" / "Fx (Jungo)" / "Fx" / "with Fx". Pick one.
28. **Structure**: telegram, storage, mailer and upload have no `#try`; upload also has no `#setup` (fine: no Module, but console keeps a
    "nothing to wire" setup section, so be consistent). Section badge numbers shift as a result. Either add a small `#try` (telegram:
    message-length/escape checker; storage: URL → DeleteFile verdict) or accept the variation explicitly.
29. **recaptcha hero chip "stdlib only"**: module.go imports go.uber.org/fx. Say "stdlib + fx".
30. **recaptcha #jungo** duplicates jungo/auth.html (which already covers RECAPTCHA_* and recaptcha_token). Trim to 2–3 rows and link
    to auth.html#… .
31. **storage #jungo user_service row and #gotchas 2, 8**: Jungo-specific avatar flow (permission re-check in tx, DeleteUser, body
    limits, 400-masking). Move to a Jungo page (user feature / build-a-feature) and keep one sentence plus a link.
32. **upload #jungo**: "(middleware.Payload RouteLimits)". Precise path: `UserRoutes.BodyLimits()` implementing `router.BodyLimited`,
    MaxAvatarFileSize + 64 KiB (jg/internal/features/user/router/v1/user_router.go:50-60).
33. **scaffold #jungo templates row**: "protects every route with middleware.BearerAuth and guard.Can". The template injects
    `middleware.Authenticate` (gin.HandlerFunc) on the group plus `r.guard.Can` (templates.go:831-857). BearerAuth exists
    (jg/internal/middleware/auth.go:48) but is wired elsewhere. Reword to "the injected `middleware.Authenticate` + `guard.Can`".
34. **scaffold error texts**: #api lists errors without the `scaffold:` prefix the code adds (e.g. `scaffold: add import: …`). Add the
    prefix once in a note. Also mention `Stepf("→", "Registering …")` among the printed lines.
35. **scaffold hero VI** adds "(PascalCase, camelCase, snake_case)" and "tự động hóa toàn bộ… liên kết vào hệ thống Fx", which the EN does not have.
    Align the two.
36. **notification/telegram overlap**: notification #what node 4 and #setup TelegramChatID row restate telegram's nil-skip rule, and
    telegram #jungo restates notification's middleware callers. Acceptable, but keep one sentence and a link each way.
37. **mailer #jungo**: shows only an SMTP/Brevo .env. The Jungo default (`MAIL_DRIVER=log`, .env.example:120) and the startup warning
    (fx.go:294-296) appear only in gotcha 2. Also list SMTP error prefixes (`mailer: smtp dial/handshake/starttls/auth/MAIL FROM/RCPT TO/DATA/send`,
    smtp.go:84-166) in #api for log grepping.
38. **telegram #api**: the build-request error `telegram: <method>: build request failed` (telegram.go:139) is not listed. Trivial.
39. **console #what diagram**: a 4-node flow for 5 one-line functions repeats the table under it. It is decorative and can be removed (the table and the try-it
    already cover it).
40. **VI phrasing**: telegram #what VI ("Cung cấp 2 method, mỗi method thực hiện một HTTP request độc lập… Guard") and recaptcha
    Client VI ("stateless… concurrent-safe") use English jargon in parentheses that the EN does not need. Tighten.

### Diagrams

- recaptcha #what: accurate (order: secret → siteverify → success/action/host/score matches recaptcha.go:96-176). Keep.
- notification #what: accurate. **Suggest** a cross-page diagram (notification or telegram #jungo):
  `Recover / Limiter / Banner → Notifier (Enabled? → queue 100) → worker (10s) → telegram.Client → api.telegram.org`, plus a
  separate dashed path `LoginGuard → telegram.Client` (no queue, no Enabled gate). This would replace most of the prose in the
  two #jungo tables and makes P1 #8/#12 visible.
- telegram #what: fine. Node t2's title "token == "" ?" should read "token / chatID empty?".
- httpclient #what: linear and correct, but the retry logic is long prose in #api. **Suggest** a JD.player for RoundTrip:
  replayable? → attempt → shouldRetry (err / 429 / ≥500)? → attempts left? → delay (Retry-After or backoff+jitter, cap) →
  sleep (ctx) → clone body → attempt. It would replace the 9-row "Retry rules" table (keep the table for numbers only).
- storage #what: s1 describes upload's job, and s4 uses the wrong Static form (see P0 #5). Simplify to handler → UploadFile → disk →
  served URL, and point s1 to upload.
- upload #what: node u1 text wrong (P1 #18). Otherwise good.
- mailer #what: correct and readable.
- console #what: decorative (P2 #39).
- scaffold #what: correct. Consider adding a failure branch at step 4 ("fx.go edit fails → files stay", gotcha 1).

### Per-page summary

- **recaptcha**: API reference exact and the try-it mirrors the code. Main gap: Jungo sets no ExpectedAction/Hostnames. #jungo overlaps with auth.html.
- **notification**: API accurate, demo accurate. Clarify that Enabled does not gate login-guard alerts, the Dropped() type assertion, and the
  send-ordering/joined-error behaviour.
- **telegram**: accurate. Add the "not gated by Enabled" note. No #try.
- **httpclient**: accurate, including the backoff math. #jungo omits mailer. The retry rules are a good candidate for a step player.
- **storage**: P0 router snippet. Heavy duplication of the upload API and Jungo avatar flow. The core API is accurate.
- **upload**: accurate signatures. The "Size is the header's claim" and "nothing read yet" statements are wrong. A few missing edge cases.
- **mailer**: accurate behaviour. Missing Options/SMTPOptions/BrevoOptions entries. The "standard library only" chip is wrong.
- **console**: API exact. #jungo cites two non-existent files.
- **scaffold**: API/behaviour accurate. Three non-existent names (console.NewError, moduleTmplFor, the {{"`"}} trick). Remove-with-TABLE edge case.

### Needs human review

- console P1 #24: should Jungo's kernel return the error and exit after Shutdown, instead of calling console.Fatalf inside dispatch? (A code change in Jungo, outside the docs.)
- recaptcha P1 #6: is the missing ExpectedAction for Jungo login intended? Docs vs code decision.
- scaffold P1 #26: which Jungo page owns "make feature": overview#feature or build-a-feature#generate?
- storage P2 #31 / recaptcha P2 #30: confirm with the orchestrator where Jungo-specific avatar and login-captcha content should live.
- upload P1 #18: wording relies on Gin's FormFile → ParseMultipartForm behaviour (standard library, not in repo). Confirm the phrasing.

---

