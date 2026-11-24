# Terminology

One name per concept, everywhere. Vietnamese text keeps the English term (column 3) unless a
translation is listed.

## Projects

| Use | Not | Meaning |
|---|---|---|
| **Jungo** | jungo framework, the app | The Go application skeleton (Gin + Uber Fx) you clone and build on. Lower-case `jungo` only for the module/repo name |
| **Junkit** | junkit framework, the library | The set of infrastructure packages Jungo imports. Lower-case `junkit` for the module path |
| **package** (Junkit) | module, lib, component | One importable Go package, e.g. `junkit/cache`. Junkit has 23 top-level packages; `database/postgres` is a sub-package of `database` |
| **Fx module** | provider module, fx bundle | An exported `fx.Option` (usually `Module`) that wires a package into Fx |
| **feature** (Jungo) | module, domain, app | A folder under `internal/features/<name>` with handler, service, repository, router |

## Application layers (Jungo)

| Term | Meaning |
|---|---|
| handler | Gin handler: binds and validates input, calls the service, sends the response |
| service | Business logic; no Gin types |
| repository | Data access (sqlc queries or raw SQL) |
| router | The feature's route registration (`*_router.go`) |
| request lifecycle | The full path of one HTTP request through middleware → handler → response |
| middleware chain | The ordered list of global middleware in `internal/router/router.go` |

## Errors and responses

| Term | Not | Meaning |
|---|---|---|
| response envelope | wrapper, JSON frame | The JSON shape `response` writes for every reply |
| `AppError` | app exception | `response`'s error type that maps to an HTTP status and message key |
| message key | i18n key, code string | The key (e.g. `invalid_avatar_file`) translated by `i18n` |
| sentinel error | error constant | An exported `var ErrX = errors.New(...)` compared with `errors.Is` |
| validation error | binding error | A 422 response listing field errors from `validation` |

## Auth and access

| Term | Not | Meaning |
|---|---|---|
| access token | JWT, bearer | Short-lived token sent as `Authorization: Bearer …` |
| refresh token | | Long-lived token used only on the refresh endpoint |
| token pair | | One access + one refresh token issued together |
| session | login, device session | A server-side record grouping token pairs for one user on one device |
| rotation | renewal | Issuing a new pair and revoking the old one |
| reuse detection | replay detection | Ending a session when a rotated refresh token is presented again |
| identity | user context, actor | The authenticated user stored on the request (`middleware.SetIdentity` on the Gin context; `security.WithIdentity` / `GetIdentity` on a `context.Context`) |
| permission | right, scope | A named capability in `resource:action` form, e.g. `users:read` |
| role | group | A named set of permissions |
| Guard | permission middleware | Jungo's route-level permission check (`internal/middleware/permission.go`, `NewGuard`). Not the login guard |
| login guard | brute-force guard | Jungo's login attempt limiter (`features/auth/infrastructure/login_guard.go`) |

## Observability

| Term | Not | Meaning |
|---|---|---|
| trace ID | request ID, correlation ID | Per-request ID set by `middleware.Trace`, logged as `trace_id` |
| debug key | t_debug key | Secret that enables `TracerDebug` for one request (`TRACER_DEBUG_KEY`) |
| channel (logger) | stream, sink | A named logger writing to its own file |

## Audit

| Term | Not | Meaning |
|---|---|---|
| audit log | history log, activity log, change log | Jungo's record of who changed what, written by the services through `auditlog.Recorder`, in the `audit_logs` table (`jungo/audit.html`) |
| audit entry | audit record, log line | One row of `audit_logs` |
| actor | | Code term only: `internal/common/actor` and the `actor_id` column. In prose about a request, say **identity** (see Auth and access); about an entry, say "who made the change" |

Here too, `trace_id` is the **trace ID** (not request ID).
Vietnamese keeps "audit log" in English; "audit entry" is "bản ghi audit".

## Writing conventions

- Env vars, config keys, file paths, routes and identifiers: always in `code`, exact spelling.
- HTTP: "returns 404", "responds with 422"; status codes as numbers.
- "Fx" (not "FX" or "fx") in prose; `fx` only in code.
- "Redis", "PostgreSQL" (prose), `postgres` (package/code).
