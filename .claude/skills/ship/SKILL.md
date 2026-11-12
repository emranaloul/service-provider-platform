---
name: ship
description: "Check out a new branch for the current changes, commit them, push, and open a GitHub PR into main — in one flow. Use when the user asks to 'ship this', 'checkout and commit', 'create a PR for these changes', or similar end-to-end branch/commit/PR requests."
trigger: /ship
---

> **Setup still needed for this project (Zoho project `1335000000176026`).**
> Fill the placeholders `<PREFIX>` (item key prefix), `<projNo>` (project number in
> the Zoho URL), `<KANBAN_SPRINT_ID>`, `<BACKLOG_SPRINT_ID>`, `<ITEM_TYPE_TASK_ID>`
> and `<PRIORITY_*_ID>` with this project's values. Status, member and user-group
> IDs are workspace-wide values copied from Marhab — verify them on this board.

# /ship

Take whatever is currently changed in the working tree and turn it into a
branch, a commit, and an open PR against `main` — the full local-to-remote
handoff in one pass. This repo ships feature work directly to `main` via PR
(there is no `staging`/`prod` split), so this is the only ship flow.

## Usage

```
/ship                     # infer branch name + commit message + PR from the diff
/ship <PREFIX>-I12 <summary>    # use a specific ticket key, e.g. from a just-created ticket
```

## Workflow

1. **Check state first.** Run `git status` and `git diff` (staged + unstaged).
   If there's nothing changed, stop and say so rather than creating an empty
   branch/PR. If already on a non-`main` feature branch with the same changes
   already committed, skip straight to push + PR (step 4) instead of branching
   again.

2. **Branch name.** Convention: `<PREFIX>-I<ticket-number>-<Title-Case-Words>`
   (e.g. `<PREFIX>-I12-Attendance-Register`). `<PREFIX>` is this project's Zoho Sprints
   prefix (Service Provider Portal). Build it: split the title on whitespace,
   Title-Case each word (leave all-uppercase acronyms like `API`, `QR`, `RTL`
   as-is), strip any character that isn't alphanumeric or a hyphen, join
   prefix + words with `-`. If the user gave a ticket key (or one was created
   earlier in the conversation via `/ticket`), use it. If not, and there's no
   way to infer one, use a conventional slug without the `<PREFIX>-I<n>-` prefix
   (e.g. `feat/attendance-register`) rather than inventing a ticket number.
   The ticket number in the branch name is what drives the status sync (see
   `scripts/zoho/README.md`), so a made-up number would move the wrong ticket.
   Create and switch with `git checkout -b <branch-name>` from the current
   `HEAD` — check `git status` first and don't branch over unrelated
   uncommitted work without confirming.

3. **Commit.** Stage the relevant files by name (never `git add -A`/`.`
   blindly) and write a commit message: an imperative present-tense summary
   line, a blank line, then 1-2 sentences of _why_. If a ticket key is known,
   prefix the summary with `<PREFIX>-I<n>: ` and add a `Ticket:` trailer with the
   ticket URL (see "Ticket URL format") directly above the `Co-Authored-By`
   trailer:

   ```
   git commit -m "$(cat <<'EOF'
   <PREFIX>-I12: Check trainees in by QR pass on the attendance register

   Reception needs to record attendance per session day; the register reads
   the session from the run and accepts desk-scanner input.

   Ticket: https://sprints.zoho.sa/workspace/mwafqportal#P<projNo>/itemdetails/I12

   Co-Authored-By: <the acting model's own trailer>
   EOF
   )"
   ```

   Omit the `Ticket:` line entirely if there's no associated ticket — don't
   invent one. Use the acting model's own `Co-Authored-By` trailer (as given
   by the session's attribution instructions). Never use past-tense changelog
   verbs like "Fixed X" without the why. Never skip hooks.

4. **Push.** `git push -u origin <branch-name>`.

5. **Create the PR** with `gh pr create`. Base branch is **`main`**. Only
   target a different base on explicit user instruction for that one PR.
   - Title: short (<70 chars), same imperative style as the commit summary.
   - Body: a short **Summary** section (bullets, why this change matters). No
     Test plan section.
   - If a ticket exists, reference it in the body with a short ref plus the
     full URL, e.g.:
     ```
     Ref <PREFIX>-I12 — https://sprints.zoho.sa/workspace/mwafqportal#P<projNo>/itemdetails/I12
     ```
   - End the PR body with:
     ```
     🤖 Generated with [Claude Code](https://claude.com/claude-code)
     ```
   - Always self-assign the PR: pass `--assignee @me`.
   - Only add `--reviewer <name>` when the user explicitly names a reviewer
     for this PR. Don't infer one from the ticket's assignee or any other
     heuristic.

6. **Link the PR to its Zoho Sprints ticket, if one exists.** If the branch
   name (or the `/ship <PREFIX>-I<n> ...` argument) carries a ticket key like
   `<PREFIX>-I12`, record the PR URL on that ticket in this exact format:

   ```
   PR => <PR URL>
   ```

   Do **not** change the ticket's status from here — status transitions are
   owned exclusively by the `zoho-ticket-status-sync.yml` GitHub Action (see
   `scripts/zoho/README.md`), which moves the ticket to Ready For Testing once this PR
   merges into `main` (opening it changes nothing — the board has no Code
   Review column). See "Recording PR links
   on the ticket" below. Skip this step entirely if there's no associated
   ticket.

7. **Report back** the PR URL. Do not merge it — opening the PR is the end of
   this flow; merging is a separate, explicit user action.

## Ticket URL format

```
https://sprints.zoho.sa/workspace/mwafqportal#P<projNo>/itemdetails/I<itemNo>
```

`P<projNo>` is this project's project number (projNo `<projNo>`, Service Provider Portal) —
fixed for this repo. `<itemNo>` is the plain ticket number (e.g. `12` for
`I12`/`<PREFIX>-I12`), not the internal `itemId`.

## Zoho Sprints IDs (Service Provider Portal)

Reuse these — don't re-derive them. Priorities and item types are
**per-project**, not workspace-global.

| Field                               | Value                  |
| ----------------------------------- | ---------------------- |
| teamId                              | `150001150029`         |
| projectId (Service Provider Portal) | `1335000000176026`     |
| backlog sprintId                    | `<BACKLOG_SPRINT_ID>`  |
| Kanban board sprintId               | `<KANBAN_SPRINT_ID>`   |
| Item type Task                      | `<ITEM_TYPE_TASK_ID>`  |
| Priority Medium                     | `<PRIORITY_MEDIUM_ID>` |
| Comment moduleId                    | `1335000000002127`     |

Do **not** reuse the sibling "Mwafq - OSH" (`MO`, `P8`) project's IDs here —
that mismatch is exactly what breaks with "Sprint not available".

## Status IDs

The Service Provider Portal board has four statuses — **no Code Review column**.
There is no "list statuses" API; if a column is added, sample a ticket in it
via `ZohoSprints_GetItemDetails` (read its `statusId`), then update this
table and `STATUS_RANK` in `scripts/zoho/sync-ticket-status.mjs`.

| Status            | statusId           | Confidence                                             |
| ----------------- | ------------------ | ------------------------------------------------------ |
| To do             | `1335000000008495` | unverified for this project                            |
| In progress       | `1335000000008497` | unverified for this project                            |
| Ready For Testing | `1335000000164071` | unverified for this project                            |
| Done              | `1335000000008499` | workspace-shared ID — unverified until the first merge |

A merged PR moves the ticket to Ready For Testing; QA moves it to Done.
`/ship` never calls `UpdateItem` with a `statusid` — this table is kept for
the sync workflow's reference.

## Recording PR links on the ticket

1. **Find the ticket.** Extract the item number (e.g. `I12` from
   `<PREFIX>-I12-...`). Look it up with `ZohoSprints_GetItems` against
   `sprintId=<KANBAN_SPRINT_ID>` (Kanban board) — then the backlog
   `<BACKLOG_SPRINT_ID>` if not found — with `searchby="name"`,
   `searchvalue="I12"`, or reuse the `itemId` if it's already known from
   earlier in the conversation. Use the item's _actual_ `sprintId` for the
   calls below.

2. **Post the PR link as a comment on the ticket** via
   `ZohoSprints_AddItemComment` (comment bodies are HTML):

   ```html
   <p>PR =&gt; <a href="<PR URL>"><PR URL></a></p>
   ```

   `AddItemComment` requires a `moduleId` path variable alongside
   `teamId`/`projectId`/`itemId` — use `1335000000002127` (a _key_ in
   `GetProjectDetails`' `moduleIdvsLayoutId` map; passing one of that map's
   _values_ 404s with "Module ID not found").

   Additionally (not instead), append the same link to the ticket
   **description**: fetch the current description with
   `ZohoSprints_GetItemDetails`, then call `ZohoSprints_UpdateItem` with that
   same description plus an appended (or extended) section:

   ```html
   <h2>Links</h2>
   <p>PR =&gt; <a href="<PR URL>"><PR URL></a></p>
   ```

   Never call `UpdateItem` with only the new section — this endpoint replaces
   the whole field. If `UpdateItem` fails with `7401.14 Doesn't have
permission in item`, the comment still stands as the recorded link — don't
   treat the description-append failure as blocking.

**Never call `UpdateItem`/`MoveItem` with a `statusid`, and never move the
ticket onto the Kanban board, from `/ship` or any other skill.** Status
transitions are the exclusive responsibility of the
`zoho-ticket-status-sync.yml` GitHub Action. If a status looks stuck, fix or
re-run that Action rather than patching the status directly.

## Notes

- Never force-push, never skip hooks, never commit unless there are real
  changes, always create a new commit rather than amending.
- If `gh pr create` fails because the branch has no upstream or diverges, fix
  that (push first) rather than forcing.
- To do just part of this flow (e.g. only a branch, or only a commit), run the
  matching git step directly — `/ship` is the full end-to-end path.
