# CLAUDE.md — Service Provider Portal (Mwafq)

Bilingual (ar RTL first / en) front-end for Mwafq service providers
(medical centres): reservations, claims, team, services, branches, profile.
**Starter project** — theme, shell, reusable components and two sample
screens are in place; the remaining screens, the API and auth are not.
Structure and conventions follow `C:\Users\kenea\marhab` (same stack, same
rules); the theme and product are this project's.

## Design source of truth — `docs/design/`

- `canvas.json` — board order, titles and the designer's notes per screen
  (what changed, status model, open questions). Read its `notes` first.
- `pulse.css` — the **Pulse** theme: every token and component recipe.
  Ported to `src/index.css` (tokens) and `src/shared/components/pulse/`.
- `*.dc.html` — one board per screen (markup = visual spec, the inline
  `renderVals()` script = sample data and derived values):

| Board                  | Screen                                   | Route                         | Status                                    |
| ---------------------- | ---------------------------------------- | ----------------------------- | ----------------------------------------- |
| `Main.dc.html`         | 01 Today                                 | `/today`                      | sample built                              |
| `Reservations.dc.html` | 02 Reservations — table + preview drawer | `/reservations`               | table sample built; drawer, bulk bar TODO |
| `Board.dc.html`        | 03 Reservations — board                  | TODO `/reservations/board`    | TODO                                      |
| `Calendar.dc.html`     | 04 Reservations — calendar               | TODO `/reservations/calendar` | TODO                                      |
| `Ledgers.dc.html`      | 05 Claims                                | `/ledgers`                    | placeholder                               |
| `Team.dc.html`         | 06 Team + add-member drawer              | `/team`                       | placeholder                               |
| `Profile.dc.html`      | 07 Provider profile                      | `/profile`                    | placeholder                               |
| `Branches.dc.html`     | 08 Branches + drawer                     | `/branches`                   | placeholder                               |
| `Branch.dc.html`       | 09 Branch page (tabs)                    | TODO `/branches/:id`          | TODO                                      |
| `Services.dc.html`     | 10 Services catalogue                    | `/services`                   | placeholder                               |

Reservation status model: Accepted (default) → Checked in → In progress →
Completed; side exits Delayed, No show, Cancelled. No accept/decline step.
Lives in `src/shared/lib/reservation-status.ts`.

## Stack

React 19 · Vite 8 (React Compiler) · TypeScript strict · Tailwind 4 · shadcn/ui
(`radix-ui`, RTL) · React Router 7 · TanStack Query 5 · TanStack Table 8 ·
axios · Zustand 5 · i18next · Zod 4 · react-hook-form · sonner · lucide-react.
Lint oxlint, format Prettier, tests Vitest. Fonts: Tajawal (UI), Noto Kufi
Arabic (headings, `hd`), Geist (numbers, `num` / `fig`).

`.env` (gitignored) needs `VITE_API_BASE_URL` (+ optional `VITE_API_ROOT`
path prefix) — copy `.env.example`. The app refuses to start without it.

## Theme — Pulse

Tokens are Tailwind classes (`src/index.css`), redefined under `.dark`:

- grounds `bg-canvas` `bg-surface` `bg-raised` `bg-sunken`
- ink `text-ink` `text-ink-2` `text-ink-3`; lines `border-line` `border-line-strong`
- the one accent: `bg-brand` `text-brand` `bg-brand-soft` `bg-brand-strong` `text-on-brand`
- status: `up` (success) `down` (danger) `warn` `flat` (neutral), each with `-soft`
- hero palette (sidebar + one hero per page): `bg-hero` `bg-hero-raised`
  `text-hero-ink(-2)` `border-hero-line` `text-hero-accent|up|down|warn`
- radius: `rounded-md` 12 (controls) · `rounded-xl` 16 · `rounded-2xl` 24
  (panels) · `rounded-3xl` 32 (hero) · `rounded-full` (buttons, pills)
- utilities: `num`, `fig`, `hd`, `hero-glow`, `rtl-mirror`, `animate-enter`

The "compat" aliases in `index.css` (`surface-2`, `ink-muted`, `success`, …)
only exist so the shared layer inherited from MARHAB compiles — use the
Pulse names in new code.

## Reusable components

- `src/shared/components/ui/` — shadcn primitives (Button has Pulse variants:
  `default` ink→violet, `outline`, `ghost`, `brand`, `tint`, `hero`,
  `destructive`). Missing one → `npx shadcn@latest add <name>`.
- `src/shared/components/pulse/` — design-system pieces: `Panel`,
  `PanelHeader`, `Hero`, `HeroEyebrow`, `HeroTitle`, `HeroFigure`,
  `HeroTile` (KPI / selectable saved view), `SegmentedControl` (view switch,
  link or button segments), `FilterBar` + `FilterChip`, `IconTile`, `Tag`,
  `InitialsAvatar`, `Kbd`.
- `src/shared/components/` — `DataTable`, `ListPagination`, `EmptyState`,
  `ListError`, skeletons, `StatusBadge` (+ `ReservationStatusBadge`),
  `PageHeader`, `SearchBox`, filters, form fields (`layout/form/*`),
  `entity-form-dialog`, table cells (`layout/table/*`), `KpiCard`, motion.
- Shell: `src/modules/shell/_components/` — `AppLayout`, `SidebarContent`
  (hero palette, branch switcher, badges), `Topbar` (search, check-in,
  language, theme, account), `PagePlaceholder`.

Reference implementations to copy from: `modules/reservations` (hero with
saved views in the URL, view switch, filter bar, `DataTable` + column
factory) and `modules/today` (KPI tiles, panels with lists).

## Hard rules (same as MARHAB)

1. shadcn primitives only — no raw `<input>`, `<select>`, `<table>`,
   `<dialog>`. Raw `<button>` only inside the Pulse track components.
2. No `any`; no TS `enum` — `as const` + unions.
3. Every string through `t()` in both `en` and `ar`, one namespace per
   module (`src/modules/<m>/i18n/{en,ar,index}.ts`, registered in
   `src/shared/i18n/lazy-namespaces.ts`). Shared words live in `shell`.
   Arabic plurals need `_zero/_one/_two/_few/_many/_other`.
4. First load = skeleton shaped like the content, no spinners.
5. Theme via tokens only — no hex in TSX; logical utilities only
   (`ms/me/ps/pe/start/end`), never `ml/mr/left/right`.
6. Status is never colour alone — dot/icon + word.
7. Gate with `permission` props / `<PermissionGate>`; never check roles.
   `src/shared/permissions/has-permission.ts` currently allows everything
   (`TODO(backend)`).
8. One screen per `views/*-page.tsx`; sub-components and `ColumnDef[]`
   factories in the module's `_components/`.
9. Server data only through TanStack Query in `modules/<m>/api/` (never
   in component state or Zustand); filters/search/page in the URL
   (`useListParams`, `useSortParams`). Mock data in `lib/mock-*.ts` is
   temporary.
10. Dialog/drawer state that should survive refresh goes in the URL.

## Module shape

`src/modules/<m>/{views,_components,api,routes,i18n,lib}`. Add a screen:
module folder → `routes/<m>.routes.tsx` spread in `src/app/router.tsx` →
nav entry in `src/app/screens.ts` + `nav.<key>` in shell i18n → area in
`src/shared/permissions/permission-types.ts` → namespace in
`lazy-namespaces.ts`.

## Not done yet (handover TODO)

- Auth: sign-in route + `ProtectedRoute`; token store / refresh-on-401
  already exist in `src/shared/api/` but endpoint names are guesses
  (`Auth/RefreshToken`, `Auth/Logout`).
- API layer per module + real types (`src/shared/api/enums.ts`, `types.ts`).
- Permissions from the backend.
- Screens 03–10, the reservation preview drawer, bulk bar, command palette
  (Ctrl K, `cmdk` installed), branch switcher, account menu, Check-in (QR).

## Zoho Sprints tooling

- Skills: `/create-ticket`, `/pickup-ticket`, `/ship` (`.claude/skills/`).
- GitHub Action `.github/workflows/zoho-ticket-status-sync.yml` moves the
  ticket on branch push / PR merge via `scripts/zoho/sync-ticket-status.mjs`.
  It needs repo secrets `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`,
  `ZOHO_REFRESH_TOKEN` and repo variables `ZOHO_KANBAN_SPRINT_ID`,
  `ZOHO_BACKLOG_SPRINT_ID`, `ZOHO_TICKET_PREFIX`; without them it skips.
  It runs with `DRY_RUN: true` until the status IDs are verified.
- Zoho project ID `1335000000176026`; other IDs are placeholders — see
  `scripts/zoho/README.md`.

## Commands

`npm run dev` · `npx tsc -b` · `npm run lint` · `npm run format` ·
`npm run test:run` · `npm run build`
