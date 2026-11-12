# Zoho Sprints ticket-status sync

> **Setup still needed for this project (Zoho project `1335000000176026`).**
> Fill the placeholders `<PREFIX>` (item key prefix), `<projNo>` (project number in
> the Zoho URL), `<KANBAN_SPRINT_ID>`, `<BACKLOG_SPRINT_ID>`, `<ITEM_TYPE_TASK_ID>`
> and `<PRIORITY_*_ID>` with this project's values. Status, member and user-group
> IDs are workspace-wide values copied from Marhab — verify them on this board.

`.github/workflows/zoho-ticket-status-sync.yml` runs
`sync-ticket-status.mjs` on branch pushes and PR events to move a ticket
forward through the Service Provider Portal board's four statuses: To do -> In progress ->
Ready For Testing -> Done. It never moves a ticket backward (see `STATUS_RANK`).

This repo ships feature work directly to `main` (no `staging`/`prod` split —
see the `ship` skill), so a merged PR moves the ticket to **Ready For Testing**; QA
moves it to **Done** by hand once verified (the sync never sets Done).
The board has no Code Review column, so opening a PR leaves the ticket in
In progress.

Ported from `osh-compliance` (project "Mwafq - OSH"), where it is confirmed
working end-to-end. This copy targets the **Service Provider Portal** project
(prefix `<PREFIX>`, project #<projNo>, created 2026-11-10).

## Live mode (`DRY_RUN` is `"false"`)

The workflow runs **live** — it changes ticket statuses on the board. Set
`DRY_RUN` to `"true"` to have it log `would apply: ...` and exit 0 without
changing anything instead; a green run in that mode is never evidence a
status moved. Live mode depends on:

1. **Repo secrets** — `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`,
   `ZOHO_REFRESH_TOKEN` (see "One-time setup" below). The OSH repo's
   self-client can be reused: the credentials are per Zoho account, not per
   project.
2. **Status IDs** — `STATUS_RANK` holds the board's four statuses:

   | Status            | statusId           | Confidence                                             |
   | ----------------- | ------------------ | ------------------------------------------------------ |
   | To do             | `1335000000008495` | unverified for this project                            |
   | In progress       | `1335000000008497` | unverified for this project                            |
   | Ready For Testing | `1335000000164071` | unverified for this project                            |
   | Done              | `1335000000008499` | workspace-shared ID — unverified until the first merge |

   If a column is ever added (e.g. Code Review), sample a ticket in it via
   `GetItemDetails`, add its `statusId` to `STATUS_RANK` at the right rank,
   and map an event to it in `resolveDesiredStatus`.

3. **Workflow → Associated Board is set to the Kanban board** in the
   project's settings (Zoho Sprints web UI — no API for it). On the OSH
   project this missing setting made every write fail with
   `7404 Given URL is wrong`, which looked like a request-shape bug but
   wasn't.

## Troubleshooting

### `7404 Given URL is wrong`

Check the project's Workflow → Associated Board setting (step 3 above) before
assuming the request shape is wrong.

### `7601 Invalid oauthscope`

`getAccessToken` succeeds but the next call fails: the token lacks scopes,
usually because the scope string wasn't entered exactly during the Self
Client's **Generate Code** step. Regenerate the authorization code (same
client — no need to recreate it) with this exact string, comma-separated, no
spaces:

```
ZohoSprints.projects.ALL,ZohoSprints.teams.ALL,ZohoSprints.sprints.ALL,ZohoSprints.items.ALL
```

Exchange it for a refresh token immediately (the code expires in ~10 minutes)
and update the `ZOHO_REFRESH_TOKEN` secret.

### Known limitation: item ownership

Zoho Sprints restricts item field updates (`statusid` included) to **the
item's owner** — the same call fails with `7401.14 Doesn't have permission in
item` on a ticket owned by someone else. The self-client acts as one fixed
Zoho identity, so status updates only succeed for tickets that account owns;
for everyone else's, the script logs a skip and exits cleanly (not a failed
run):

```
[zoho-sync] Skipping: I<n> isn't owned by this integration's account
(Zoho 7401.14) - can't update status via API. Move it manually.
```

## User groups (`set-item-usergroup.mjs`)

Tags a work item with a user group (Frontend / Backend / AI). The
`create-ticket` skill calls it after filing so new tickets land tagged
**Frontend**:

```bash
node --env-file=.env.local scripts/zoho/set-item-usergroup.mjs --item <itemId> [--groups frontend,backend] [--sprint <sprintId>]
```

The MCP server has no user-group tool, so this is REST-only:

- Parameter is **`usergroupids`**, a JSON-array-encoded string of group IDs,
  sent as a **form-data field** (not a query param), POSTed to the plain item
  path with no `action` param.
- The endpoint answers `{"status":"success"}` even for parameters it silently
  ignores, so the script always re-reads `userGroupCount` and fails if the
  tag didn't stick.

Group IDs (workspace-level, from the item form's picker — verified on the OSH
project):

| Group    | ID                 |
| -------- | ------------------ |
| Frontend | `1335000000043005` |
| Backend  | `1335000000043008` |
| AI       | `1335000000047076` |

There is **no endpoint to list user groups**, hence the hardcoded table.

## One-time setup: Zoho self-client credentials

GitHub Actions has no interactive login, so it needs its own long-lived
credential:

1. In the Zoho API Console for this data center (`https://api-console.zoho.sa`)
   create a **Self Client** (or reuse the OSH one).
2. Generate an authorization code with the exact scope string above and the
   `.sa` data center.
3. Exchange it once, by hand, for a `refresh_token` (Zoho's self-client OAuth
   flow) — self-client refresh tokens don't expire like a 1-hour access token.
4. Add three **repo secrets** (Settings → Secrets and variables → Actions):
   `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`.
5. For running `set-item-usergroup.mjs` locally, put the same three in the
   gitignored `.env.local`.

## What triggers what

| Event                                                        | Target status     |
| ------------------------------------------------------------ | ----------------- |
| Push to any branch matching `<PREFIX>-I<n>-...` (not `main`) | In progress       |
| PR merged into `main`                                        | Ready For Testing |

Opening a PR changes nothing — the board has no Code Review column, so the
workflow doesn't listen for it.

The ticket number is parsed from the branch name (`<PREFIX>-I<n>`; override the
prefix with `ZOHO_TICKET_PREFIX`). If none is found, the run exits cleanly —
most branches won't have one.

## IDs hardcoded for this project

Same ones the `ship` skill documents (`.claude/skills/ship/SKILL.md`):
teamId `150001150029`, projectId `1335000000176026`, Kanban sprint
`<KANBAN_SPRINT_ID>`, Backlog sprint `<BACKLOG_SPRINT_ID>`. Each is overridable by
env (`ZOHO_TEAM_ID`, `ZOHO_PROJECT_ID`, `ZOHO_KANBAN_SPRINT_ID`,
`ZOHO_BACKLOG_SPRINT_ID`). Status IDs are in `STATUS_RANK` in the script.
