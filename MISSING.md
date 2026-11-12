# What is still missing

Status of the Service Provider portal against its contract,
`SERVICE_PROVIDER_A_TO_Z.md` (the complete reference: Service Provider module,
authentication, lookups and the answered questions). Last updated 2026-11-12.

**Nothing has been run against the real backend yet.** What exists is checked
by type-check, lint, unit tests (158) and headless-browser smoke tests of every
screen with stubbed API responses (English and Arabic).

---

## 1. Where things stand

The provider flow of the A-to-Z is complete: every endpoint a provider user
needs has its API code and its screen. What is left is backend confirmation,
two backend improvements, and product calls on admin features.

| Area                                                           | Screen                                        |
| -------------------------------------------------------------- | --------------------------------------------- |
| Sign-in (password + OTP), forgot password                      | `/auth/*`                                     |
| Change password                                                | account menu                                  |
| Today — dashboard, today's appointments                        | `/today`                                      |
| Reservations — table, board, calendar, drawer                  | `/reservations`                               |
| Order actions, record result, result files, vaccines, answers  | reservations drawer + dialogs                 |
| Update result / update price (Admin or the company bits)       | reservations drawer                           |
| Check-in (paste a QR link or reservation id)                   | top bar                                       |
| Public QR verification page                                    | `/public/orderscantoverify/:id/:langId`       |
| Claims — claim completed orders                                | `/ledgers?tab=claim`, branch page "Financial" |
| Ledgers — list, report, files, export                          | `/ledgers?tab=ledgers`                        |
| Team — provider users                                          | `/team`                                       |
| Branches, services & vaccines, weekly schedule                 | `/branches`, `/branches/:id`                  |
| Provider profile — overview, settings, attachments, tags, FAQs | `/profile`                                    |
| Sidebar badges (new reservations, claimable)                   | sidebar                                       |

---

## 2. Not built: admin-only (Blocked Items §4)

This is a provider portal. These are admin features in the working client
and nothing in the provider flow depends on them. Their APIs exist; build
screens only if admins will use this app:

- Creating providers (`create:service-provider`) and choosing which provider
  to open (`?provider=`).
- Categories, classifications (`settings/api/taxonomy.ts`), FAQ editing.
- The service catalogue (A-Z §30). The Services menu entry is removed and
  `/services` redirects to Branches, where each branch's offering is managed.
- Company / company-branch / company-package filters on orders — shown only
  to Admin and Company users in the working client (Blocked Items §1).
- Ledger Paid / Unpaid is built and shows for Admin users only.

---

## 3. Gaps inside the built screens

- **Reservations**
  - Board and calendar load one large page (100 / 200); beyond that a line
    says only the first N are shown.
  - A provider user cannot ask to "exclude nothing": with no excluded
    statuses ticked, the API default (Cancel + NoShow) applies (§13.2).
- **Claims**
  - No patient (`OwnerId`) filter — there is no patient lookup.
- **Ledgers**
  - A ledger opened by link that is not on the current list page is looked up
    in `LedgerList` (filtered by provider and the link's `from` / `to`, plus an
    `Id` the backend may ignore). If it is still not found, status, period,
    totals, the Paid switch and the admin-note editor are hidden. The real fix
    is backend item 8 below.
- **Branches**
  - Bulk delete has no "delete anyway" step: if the backend answers `-1`
    (related data) the user is asked to delete those branches one by one.
  - Branch-service editing locks the service / group / vaccine itself.
- **Check-in camera scanning** uses the browser's built-in `BarcodeDetector`
  (Chrome, Edge, Android). Where it is missing (Firefox, iOS Safari) only
  pasting a link works; supporting those needs a scanner library. Not yet
  tried on a real device.
- **Sidebar branch switcher** does nothing yet — what it should switch is a
  product decision (all screens filtered to one branch?).
- **No end-to-end tests against a running backend.**

---

## 4. Still open with the backend team

1. **Service-group default price** — the portal prefills from the B2C row
   (`isB2CPrice: true`). Confirm.
2. **Branch-service update, single service** — the portal sends the link-row
   id as `Services[0].id` (matches the schema). Confirm once.
3. **Provider users in `CompanyId`** — the portal sends the provider id there,
   as the working client does. Confirm.
4. **Login username matching** — login only trims. Are usernames
   case-insensitive?
5. **`PageSize=1000` on lookups** — accepted on branch slots; not confirmed
   for the lookup lists.
6. **Tags tab permission** — no tags flag exists; the portal uses
   `view:` / `update:service-provider-settings`. Decide.
7. **Team import id** — `ServiceProviderUserExport` (a bulk _import_) has a
   `ServiceProviderBranchId` field, but the working client fills it with the
   provider id on this screen; the portal does the same. Which id is it?
8. **`LedgerDetailsGetById`** — please add `status`, `claimedFrom`,
   `claimedTo`, `total`, `tax` and `adminNote`, so a ledger opened by link
   always shows them (Blocked Items §3, option 1). Until then: does
   `LedgerList` honour an `Id` filter?
9. **Tag list for providers** — the portal sends `ServiceProviderId={own id}`
   (the working client sent nothing and let the token decide). Confirm the
   backend accepts it.

---

## 5. Where the portal differs from the A-to-Z reference, and why

`SERVICE_PROVIDER_A_TO_Z.md` is the contract. The portal follows it exactly
except in the places below. Each one is a difference the reference itself
asks for (§18 / §19.11 "avoid copying"), recommends (§31 / §32), or leaves to
product. Section numbers are the A-to-Z's.

| A-Z                     | The reference says                                                                       | The portal does                                                                                                                                                                     | Allowed by                           |
| ----------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| §3.4, §6.5, §8.5, §22.6 | Phone (and VAT) validated as integers                                                    | Digits with an optional leading `+`, spaces ignored; VAT digits only, still required                                                                                                | §18.6                                |
| §6.7                    | Provider delete forces on the first call                                                 | Standard two-step delete                                                                                                                                                            | §18.1                                |
| §6.4, §10.5             | Closing dates diffed on the old weekday key                                              | Diffed on the full `YYYY-MM-DD`                                                                                                                                                     | §18.2                                |
| §10.5, §11.5            | Update validates money as integers                                                       | Decimals on create and update                                                                                                                                                       | §18.3                                |
| §10.5, §11.5            | Price ≥ cost only checked on create                                                      | Checked on create and update                                                                                                                                                        | §18.4                                |
| §6.5                    | Category not validated on create                                                         | Required on create too                                                                                                                                                              | §18.5                                |
| §10.5                   | `Services[0].id = String(x \|\| null)`, `…ServiceProviderServiceProviderBranchServiceId` | `0` instead of `"null"`; `serviceProviderBranchServiceId`; link-row id as `Services[0].id`                                                                                          | §18.7, §18.8, §31.2                  |
| §17.2                   | Tags tab gated by `view:service-provider-orders`                                         | Gated by `view:` / `update:service-provider-settings` (open item 6)                                                                                                                 | §18.10                               |
| §17.2, §24              | FAQs tab gated by company `view:company`                                                 | Shown to every signed-in provider user                                                                                                                                              | §32.1                                |
| §19.8.1                 | Session expiry = now + 3 days                                                            | The earlier of 3 days and the JWT's `exp`                                                                                                                                           | §19.11.3                             |
| §19.10, §19.11.4        | Normalise login like forgot-password                                                     | Login only trims (forgot-password trims and lower-cases as typed)                                                                                                                   | §31.6                                |
| §19.6 / §31.5           | Ordinary 401s only show an error                                                         | A 401 on a signed-in request ends the session                                                                                                                                       | §31.5 ("stricter but sensible")      |
| §19.8.6                 | `/dashboard` landing page, `/error/*` routes                                             | `/dashboard` redirects to `/today`; there are no `/error/*` pages (errors show in place)                                                                                            | naming only                          |
| §20.1                   | Pickers send no `PageSize`                                                               | `PageSize=1000` on pickers                                                                                                                                                          | §20.1 ("or send a large `PageSize`") |
| §20.4, §32.2            | Provider tag picker sends no filter                                                      | Sends `ServiceProviderId={own id}`; admins `Type=1`                                                                                                                                 | §32.2                                |
| §20.6                   | Group default price = first match                                                        | B2C row first, else first match                                                                                                                                                     | §31.1 (stopgap)                      |
| §13.2, §32.6            | No branch filter on `ShortcutList`                                                       | A branch filter switches the list to `Reservation/List`                                                                                                                             | §32.6                                |
| §9.5, §31.3             | —                                                                                        | Every open weekday needs ≥ 1 time; no "Remove day"                                                                                                                                  | matches §31.3                        |
| §11.3–11.4              | Add flow sends no `SlotTimeIds`; standalone create needs ≥ 1                             | The add dialog offers the slot times as an optional pick (sent as `SlotTimeIds` when chosen; needs `update:service-provider-branch-vaccine-slots`) — both §11.3 modes in one dialog | §11.3                                |
| §32.3                   | "Update result" is admin-screen only                                                     | Shown on the order drawer only to Admins or `update:company-update-result` holders                                                                                                  | §32.3                                |
| Blocked Items §2        | "Update price" is admin-screen only                                                      | Shown on the order drawer (Prices) only to Admins or `update:company-update-price` holders, on Complete orders; resends the current `isFit`                                         | Blocked Items §2                     |
| §30, Blocked Items §4   | —                                                                                        | No Services menu entry; `/services` redirects to Branches                                                                                                                           | Blocked Items §4 (provider-only app) |
| §17                     | One provider workspace with tabs                                                         | Same tabs as top-level screens (Today, Reservations, Claims, Team, Branches, Profile)                                                                                               | layout only                          |

Other behaviour beyond the reference: a dialog in the reservations URL
(`complete`, `cancel`, `vaccines`, `result`) only opens if that action is
allowed for the order.
