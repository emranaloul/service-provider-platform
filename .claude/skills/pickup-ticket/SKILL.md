---
name: pickup-ticket
description: "Given a Zoho Sprints ticket ID (e.g. I12 or <PREFIX>-I12), fetch its title/description, do the repo's standard prework (checkout main, pull, branch off it), and start implementing what the ticket describes. Use when the user asks to 'pick up ticket X', 'start working on I12', 'work on ticket <PREFIX>-I12', or similar — the counterpart to /create-ticket (files it) and /ship (ships it)."
trigger: /pickup-ticket
---

> **Setup still needed for this project (Zoho project `1335000000176026`).**
> Fill the placeholders `<PREFIX>` (item key prefix), `<projNo>` (project number in
> the Zoho URL), `<KANBAN_SPRINT_ID>`, `<BACKLOG_SPRINT_ID>`, `<ITEM_TYPE_TASK_ID>`
> and `<PRIORITY_*_ID>` with this project's values. Status, member and user-group
> IDs are workspace-wide values copied from Marhab — verify them on this board.

# /pickup-ticket

Take a Zoho Sprints ticket ID, read what it actually asks for, set up a
clean branch for it, and start implementing — the counterpart to
`/create-ticket` (writes the spec) and `/ship` (lands the result). This
skill covers the middle: turning a filed ticket into work in progress.

## Usage

```
/pickup-ticket I12          # ticket item number
/pickup-ticket <PREFIX>-I12       # ticket key (same item, full key form)
/pickup-ticket 12           # bare number, same item
```

## Workflow

1. **Resolve the ticket.** Normalize whatever the user gave (`I12`,
   `<PREFIX>-I12`, `12`) to the item number form Zoho Sprints uses (`I12`).
   Look it up with `ZohoSprints_GetItems`:

   ```
   teamId: 150001150029
   projectId: 1335000000176026   (Service Provider Portal, Kanban)
   sprintId: <KANBAN_SPRINT_ID>    (the Kanban board; fall back to the
                                  backlog <BACKLOG_SPRINT_ID> if not found)
   searchby: "name"
   searchvalue: "I12"
   ```

   to find the `itemId`, then `ZohoSprints_GetItemDetails` for the full
   `itemName` and `description`. If nothing matches, stop and say so rather
   than guessing a different ticket or fabricating scope — don't proceed to
   branch/implement without a real ticket to anchor the work.

2. **Read and restate the ticket before touching git.** Parse out the
   Summary, Requirements, and Acceptance Criteria sections (this repo's
   tickets follow the template from `/create-ticket`). Turn the Acceptance
   Criteria checklist into a todo list — this is what you'll work through.
   If the description is too thin to act on (no clear requirements), ask
   the user to clarify rather than inventing scope.

3. **Prework — get a clean branch.** This repo has no `staging` branch;
   feature work branches off and PRs into `main`.
   - Run `git status` first. If there's uncommitted work, stash it
     (`git stash push -u -m "..."`) rather than losing or force-carrying it
     onto the new branch — don't `checkout`/`reset --hard` over it. If it's
     ambiguous whether the uncommitted work belongs to this ticket or a
     different one, ask.
   - `git checkout main`
   - `git pull origin main`
   - `git checkout -b <branch-name>` — derive the name from the ticket's
     key and title, matching this repo's convention (same as `/ship`):
     `<PREFIX>-I<ticket-number>-<Title-Case-Words>`, e.g.
     `<PREFIX>-I12-Attendance-Register`. Prefer reusing the ticket's own title
     wording over inventing new phrasing.

4. **Implement.** Work through the Acceptance Criteria list from step 2,
   updating the todo list as you go. Investigate the "Affected Areas" the
   ticket names (if present) as your starting point, but verify against the
   actual codebase rather than trusting the ticket's pointers blindly —
   it's a triage hint, not a code map. Follow this repo's normal engineering
   conventions (`CLAUDE.md`) for the
   implementation itself, including typecheck/build/browser verification.

5. **Stop short of shipping.** This skill ends once the implementation
   satisfies the acceptance criteria (or you've hit a genuine blocker worth
   surfacing to the user). Committing, pushing, and opening a PR is
   `/ship`'s job — don't run it automatically; let the user review the
   diff and decide when it's ready to ship.

## Notes

- If the ticket turns out to already be in progress (an existing local or
  remote branch matching its key), check out that existing branch instead
  of creating a duplicate — ask if it's unclear whether to resume it or
  start fresh.
- Same Git Safety Protocol as elsewhere in this repo: never force-push,
  never discard uncommitted work, never skip hooks.
- This skill assumes the ticket lives in the Zoho Sprints project
  documented in `/create-ticket`'s SKILL.md (teamId `150001150029`,
  projectId `1335000000176026`). If a ticket ID doesn't resolve there,
  don't guess a different workspace — ask.
