---
name: create-ticket
description: "Draft a ticket (title + description) for a piece of work — for filing before the work starts, or for documenting already-finished work as a forward-looking spec. The description is always written as requirements to satisfy, never as a changelog of what was done. Use when the user asks to 'create a ticket', 'write a ticket', 'file an issue', or 'draft a task' for something discussed in the conversation."
trigger: /ticket
---

> **Setup still needed for this project (Zoho project `1335000000176026`).**
> Fill the placeholders `<PREFIX>` (item key prefix), `<projNo>` (project number in
> the Zoho URL), `<KANBAN_SPRINT_ID>`, `<BACKLOG_SPRINT_ID>`, `<ITEM_TYPE_TASK_ID>`
> and `<PRIORITY_*_ID>` with this project's values. Status, member and user-group
> IDs are workspace-wide values copied from Marhab — verify them on this board.

# /ticket

Turn a piece of work — planned or already completed in this conversation — into a
ticket that reads like a spec, not a changelog.

## Usage

```
/ticket                         # draft AND file a ticket for whatever was just discussed/done
/ticket <topic or task>         # draft AND file a ticket for a specific topic
/ticket <ticket-key> <topic>    # use a specific key, e.g. /ticket <PREFIX>-I12 attendance register
/ticket draft <topic>           # draft only — print markdown, do not create the Zoho item
```

**Every `/ticket` invocation always creates the real Zoho Sprints item by
default** — filing is not an opt-in extra, it's the normal outcome. Use
`/ticket draft ...` (or an explicit "just draft it" / "don't file this yet"
from the user) for the rare case where only the markdown is wanted.

## The core rule

**Write the description as what SHOULD be done, not what WAS done.**

Even if the work is already finished (e.g. the user did it earlier in this
session and now wants a ticket for the record), the ticket must read as if it
were filed _before_ the work started: present-tense problem statement,
imperative requirements, testable acceptance criteria. Never say "added",
"fixed", "refactored", "implemented", "simplified" — those are changelog verbs
and belong in a commit message or PR description, not here.

Banned phrasing → required phrasing:

| Don't (changelog / past tense)   | Do (spec / requirement)                              |
| -------------------------------- | ---------------------------------------------------- |
| "Merged the two lists into one"  | "Show all reservations in a single list"             |
| "Removed the status tabs"        | "Remove the per-status tabs; list all receipts"      |
| "Added a cash count column"      | "Add a cash count column to the reservations table"  |
| "Fixed the date filter"          | "The date filter must scope to the creation date"    |
| "Refactored ReservationsColumns" | (omit — implementation detail, not a ticket concern) |

If you catch yourself writing a past-tense verb describing an edit, stop and
rephrase it as a present-tense requirement.

## What goes in, what stays out

- **In**: the problem/goal, the desired end-user-visible behavior, acceptance
  criteria, and (optionally) a short "affected areas" pointer so whoever picks
  it up knows roughly where to look.
- **Out**: specific file names, function names, "how" implementation detail,
  reasoning-in-the-moment ("I checked X and found Y"), and any first-person
  narration of the work session. A ticket is read by someone who wasn't in
  this conversation — write for them, not as a record for yourself.
- If the work is retroactive (already done), do **not** mention that fact in
  the ticket body at all. The ticket should be indistinguishable from one
  filed up front. If the user wants to note it was already implemented, that
  belongs in your reply to them, not in the ticket text.

## Title format

Pattern: `<KEY> <Area> — <imperative summary>` or `<KEY> <imperative summary>`,
e.g. `<PREFIX>-I12 Attendance — Check trainees in by QR pass`. This project's key
prefix is **`<PREFIX>`** (Service Provider Portal). For a new ticket with no assigned key
yet, omit the key entirely from the title (just the imperative summary)
rather than inventing a real-looking ticket number or writing a placeholder
like `<PREFIX>-I<TBD>` into the actual title — the ticket's own `itemNo`, returned
by `CreateItem`, is the real key. If the user wants the key visible before
filing, say so in your reply, not in the title text.

Keep the title under ~70 characters, specific enough to disambiguate from
similar tickets, phrased as the outcome (not the mechanism):

- Good: "Reservations — Reschedule all missed sessions of a trainee to one run"
- Bad: "Update reschedule-page.tsx" (names an implementation file)
- Bad: "Fixed reschedule" (past tense, vague)

## Description format

Zoho Sprints renders the `description` field as **HTML**, not markdown — a
literal `## Summary` / `- item` / `**bold**` is displayed as-is (you'll see it
come back through `GetItemDetails` with `&quot;`-style entity escaping, a tell
that it's being treated as markup, not text). Always write the description as
HTML tags: `<h2>`/`<h3>` for section headers, `<p>` for prose, `<ul>`/`<li>`
for lists. There's no native checkbox markup, so render acceptance criteria as
a plain `<ul>` list (no literal `[ ]`, which would just show up as bracket
text). Use `<strong>`/`<em>` instead of `**`/`_`.

## Description template

```html
<h2>Summary</h2>
<p>
  <!-- 1-3 sentences: what's wrong or missing today, and why it matters, from
  the user/business point of view. No implementation detail. -->
</p>

<h2>Current Behavior</h2>
<p>
  <!-- Factual, present-tense description of how it works today — the
  "before" state a reader unfamiliar with the recent session would observe by
  using the product right now. -->
</p>

<h2>Requirements</h2>
<ul>
  <li><!-- Imperative, testable requirement --></li>
  <li><!-- Imperative, testable requirement --></li>
</ul>

<h2>Acceptance Criteria</h2>
<ul>
  <li><!-- Observable, checkable outcome --></li>
  <li><!-- Observable, checkable outcome --></li>
</ul>

<h2>Affected Areas</h2>
<p>
  <!-- Optional — screen/route/module names only, e.g. "Reservations →
  Reservation details → Trainees tab". Omit file paths and code symbols; this
  is for routing/triage, not a code map. -->
</p>

<h2>Out of Scope</h2>
<p>
  <!-- Optional — only include if there's a real risk of scope creep worth
  flagging. -->
</p>
```

Omit any section (including its `<h2>`) that would be empty rather than
leaving a heading with no content under it.

## Workflow

1. Identify the task: use what's given as an argument, or infer it from the
   most recent substantive piece of work in the conversation if no argument
   is given. If genuinely ambiguous (multiple candidate tasks, or no work
   discussed yet), ask the user which one before drafting.
2. Strip the task down to its requirement-shape: what changes for the user or
   the system, stated as an outcome. Discard the "how" — file paths, function
   names, library choices, the order you tackled things in.
3. Fill in the template above. Skip optional sections that would be empty or
   trivial rather than padding them out.
4. Present the ticket to the user as readable markdown (title as a heading,
   then the body) even though the body will be _filed_ as HTML — showing raw
   HTML tags to the user for review is unnecessary noise. Convert to the HTML
   template just before calling `CreateItem`.
5. If the user gives a ticket key/number, use it verbatim in the title. If
   they don't, omit the key from the title entirely (see "Title format").
6. Immediately continue into "Filing via the Zoho Sprints MCP server" below
   and create the item — do not stop after drafting and wait to be told to
   file it. Only skip filing if the invocation was `/ticket draft ...` or the
   user explicitly said not to file it (this turn or as standing guidance
   earlier in the conversation).

## Filing via the Zoho Sprints MCP server

Filing is the default behavior of `/ticket` — draft the ticket per the
workflow above, then immediately create it as a work item via the connected
`zoho-sprints` MCP server's `ZohoSprints_CreateItem` tool.

**Known workspace (Service Provider Portal)** — reuse these instead of rediscovering
them. Derived on 2026-11-10 from `GetProjects` / `GetProjectDetails` /
`GetProjectPriorities`. Do **not** reuse the sibling "Mwafq - OSH" (`MO`)
project's IDs — that mismatch fails with "Sprint not available" / "Select a
valid item type."

| Field           | Value                                                                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| teamId          | `150001150029`                                                                                                                                             |
| projectId       | `1335000000176026` (Service Provider Portal, **Kanban** — no real sprints)                                                                                 |
| sprintId to use | `<KANBAN_SPRINT_ID>` (the project's **Kanban board** — new items should land here; `<BACKLOG_SPRINT_ID>` is the plain Backlog and leaves items un-boarded) |

Item type IDs (`projitemtypeid`):

| Name | ID                    | Confidence                                         |
| ---- | --------------------- | -------------------------------------------------- |
| Task | `<ITEM_TYPE_TASK_ID>` | verified — <PREFIX>-I1 filed with it on 2026-11-10 |

Other types (e.g. Bug) are unobserved: create one by hand in the Sprints UI,
read its `projItemTypeId` via `GetItems`/`GetItemDetails`, and add it here.

Priority IDs (`projpriorityid`, verified via `GetProjectPriorities`):

| Name   | ID                     |
| ------ | ---------------------- |
| None   | `<PRIORITY_NONE_ID>`   |
| Low    | `<PRIORITY_LOW_ID>`    |
| Medium | `<PRIORITY_MEDIUM_ID>` |
| High   | `<PRIORITY_HIGH_ID>`   |

If a different project is ever targeted, re-derive its IDs via
`GetProjects` → `GetProjectDetails` → `GetProjectPriorities`, and sample a
couple of existing items via `GetItems`/`GetItemDetails` to learn that
project's item-type IDs (there's no direct "list item types" tool).

**Steps:**

1. Draft the ticket per the workflow above first — do not skip straight to
   filing an undrafted ticket. Show at least the title so the user can catch
   anything wrong before it becomes a real tracker item.
2. Use item type `Task` and priority `Medium` by default — do not stop to ask
   for these on every ticket. Only deviate when the user specifies a
   type/priority for this ticket, or when the work is clearly a defect fix
   (favor a `Bug`-shaped framing if that type exists; otherwise note it in
   the title/summary).
3. Map the draft into `CreateItem`'s fields: ticket title → `name`; the full
   body, converted to the HTML template above, → `description`; the
   creator's user ID (see "Assignee" below), JSON-array-encoded, → `users`,
   so every filed ticket is self-assigned to whoever is running `/ticket`
   unless told otherwise.
4. If the tool errors with `Invalid oauthscope`, the Sprints connection needs
   re-authorization — tell the user to re-authorize in the `mcp.zoho.com`
   console, then retry. If it errors because the server needs OAuth at all,
   tell the user to run `/mcp` in an interactive session. Do not ask the user
   for tokens, codes, or callback URLs either way.
5. After a successful create, verify with `GetItemDetails` before reporting
   success — don't claim the ticket exists based only on `CreateItem`'s
   return value. Confirm `ownerId` reflects the assignee, not `Unassigned`.
   Report back the item number (e.g. `I12`) and ID, plus the ticket URL
   `https://sprints.zoho.sa/workspace/mwafqportal#P<projNo>/itemdetails/I<itemNo>`.

## User group

Every filed ticket should be tagged with the **Frontend** user group — this is
a frontend repo. Only deviate when the user says otherwise (e.g. a backend
ticket filed from this session).

`CreateItem`/`UpdateItem` have no user-group parameter and the MCP server
exposes no user-group tool, so it's a follow-up REST call after a successful
create:

```bash
node --env-file=.env.local scripts/zoho/set-item-usergroup.mjs --item <itemId>
```

The `--env-file` flag is required — plain `node` won't load env files on its
own. Pass `--groups backend` / `--groups ai` / `--groups frontend,ai` to
deviate from the Frontend default. The script needs `ZOHO_CLIENT_ID`,
`ZOHO_CLIENT_SECRET` and `ZOHO_REFRESH_TOKEN` in `.env.local` (gitignored) —
the same self-client credentials `sync-ticket-status.mjs` uses. **If they're
missing, skip this step and tell the user the ticket was filed untagged**
rather than failing the whole filing; tagging by hand in the UI takes a few
seconds.

The script defaults to the Kanban sprint ID, matching where `/ticket` files
new items. Pass `--sprint <BACKLOG_SPRINT_ID>` for an item still on the plain
Backlog — a mismatched sprint ID in the path returns `7404`.

## Assignee

By default, assign every filed ticket to its creator — the person running
`/ticket`. Pass their Zoho user ID via `CreateItem`'s `users` query param (or
`UpdateItem`'s `newusers` param, if assigning after the fact) as a
**JSON-array-encoded string**, e.g. `'["1335000000030001"]'` — a bare numeric
string fails with `7600 Given JSON is invalid`. Comma-separate multiple IDs
inside the array for multiple assignees.

Known user IDs for this workspace (from `GetProjects`' `userDisplayName`):

| User               | Zoho user ID       |
| ------------------ | ------------------ |
| Emran Aloul        | `1335000000030001` |
| Khaled Abulawi     | `1335000000015001` |
| Mohammad Al-Hajjaj | `1335000000019016` |
| Oraib Aljbour      | `1335000000019021` |
| Wesam Jabr         | `1335000000002018` |

If the ticket is being filed on behalf of someone else, use their ID instead.
Only leave a ticket unassigned if the user explicitly asks for that.
