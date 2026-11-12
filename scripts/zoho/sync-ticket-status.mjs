#!/usr/bin/env node
// Moves a Zoho Sprints ticket forward through its status lifecycle based on
// GitHub branch/PR activity. Never moves a ticket backward - see STATUS_RANK.
//
// Required env:
//   ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
//     - from a Zoho self-client (see .github/workflows/zoho-ticket-status-sync.yml)
//   GITHUB_EVENT_NAME, GITHUB_HEAD_REF or GITHUB_REF_NAME, GITHUB_BASE_REF, PR_MERGED
//     - wired from the workflow's github context, not set by hand
//
// Optional env overrides (defaults match this project - Service Provider Portal):
//   ZOHO_ACCOUNTS_DOMAIN (default https://accounts.zoho.sa)
//   ZOHO_API_DOMAIN       (default https://sprintsapi.zoho.sa/zsapi)
//   ZOHO_TEAM_ID          (default 150001150029)
//   ZOHO_PROJECT_ID       (default 1335000000176026)
//   ZOHO_KANBAN_SPRINT_ID (required)
//   ZOHO_BACKLOG_SPRINT_ID(required)
//   ZOHO_TICKET_PREFIX    (required)
//
// The read path (findItemByNumber) uses the endpoint shape confirmed against
// a real open-source Zoho Sprints client (github.com/AutoIDM/tap-zohosprints):
// GET {API_DOMAIN}/team/{teamId}/projects/{projectId}/sprints/{sprintId}/item/?action=sprintitems
// NOTE (Service Provider Portal): status IDs below are copied from Academy Management and are
// NOT yet verified on this board - the workflow runs with DRY_RUN=true until
// they are. Academy history: updateStatus confirmed live (I2: To do -> In progress on
// a branch push, 2026-10-04); moveToKanban is still unconfirmed here.
//
// This repo ships feature work directly to `main` (no staging/prod split), so
// unlike the sibling Mwafaq - Development project's version of this script,
// there is no "Staging Done"/"Production Done" distinction - a merged PR goes
// to "Ready For Testing", and QA moves it to "Done" by hand once verified. The
// Service Provider Portal board has no Code Review column, so opening a PR does not move the
// ticket.

const env = process.env;

// Project-specific values have no defaults: set them as GitHub repo variables
// (Settings → Secrets and variables → Actions → Variables) or env vars.
const REQUIRED = ['ZOHO_KANBAN_SPRINT_ID', 'ZOHO_TICKET_PREFIX'];
const missing = REQUIRED.filter((k) => !env[k]);
if (missing.length) {
  console.log(
    `Zoho sync not configured (missing ${missing.join(', ')}) - skipping.`,
  );
  process.exit(0);
}

const ACCOUNTS_DOMAIN = env.ZOHO_ACCOUNTS_DOMAIN || 'https://accounts.zoho.sa';
const API_DOMAIN = env.ZOHO_API_DOMAIN || 'https://sprintsapi.zoho.sa/zsapi';
const TEAM_ID = env.ZOHO_TEAM_ID || '150001150029';
const PROJECT_ID = env.ZOHO_PROJECT_ID || '1335000000176026';
const KANBAN_SPRINT_ID = env.ZOHO_KANBAN_SPRINT_ID || '';
const BACKLOG_SPRINT_ID = env.ZOHO_BACKLOG_SPRINT_ID || '';
// Zoho Sprints item prefix of this project; branches are named <PREFIX>-I<n>-...
const TICKET_PREFIX = env.ZOHO_TICKET_PREFIX || '';

// The Service Provider Portal board's four statuses. To do, In progress and Ready For Testing
// are verified on this board (Ready For Testing sampled from I90, 2026-11-04);
// Done is the workspace-shared ID. A ticket in a status not listed here fails the run with
// "unrecognized statusId" - sample it via GetItemDetails and add it. See
// scripts/zoho/README.md.
// Lower rank = earlier in the lifecycle. A sync never moves a ticket to a
// lower rank than its current status.
const STATUS_RANK = {
  1335000000008495: { name: 'To do', rank: 1 },
  1335000000008497: { name: 'In progress', rank: 2 },
  1335000000164071: { name: 'Ready For Testing', rank: 3 },
  1335000000008499: { name: 'Done', rank: 4 },
};

const TARGET_STATUS_ID = {
  IN_PROGRESS: '1335000000008497',
  READY_FOR_TESTING: '1335000000164071',
};

function fail(message) {
  console.error(`[zoho-sync] ERROR: ${message}`);
  process.exit(1);
}

function skip(message) {
  console.log(`[zoho-sync] Skipping: ${message}`);
  process.exit(0);
}

function extractTicketNumber(branchName) {
  if (!branchName) return null;
  const match = branchName.match(new RegExp(`${TICKET_PREFIX}-I(\\d+)`, 'i'));
  return match ? match[1] : null;
}

function resolveDesiredStatus() {
  const eventName = env.GITHUB_EVENT_NAME;
  const baseRef = env.GITHUB_BASE_REF || '';
  const merged = env.PR_MERGED === 'true';

  if (eventName === 'push') {
    return { statusId: TARGET_STATUS_ID.IN_PROGRESS, reason: 'branch pushed' };
  }
  if (
    eventName === 'pull_request' &&
    env.PR_ACTION === 'closed' &&
    merged &&
    baseRef === 'main'
  ) {
    return {
      statusId: TARGET_STATUS_ID.READY_FOR_TESTING,
      reason: 'PR merged into main',
    };
  }
  return null;
}

async function getAccessToken() {
  const url = new URL(`${ACCOUNTS_DOMAIN}/oauth/v2/token`);
  url.searchParams.set('refresh_token', env.ZOHO_REFRESH_TOKEN);
  url.searchParams.set('client_id', env.ZOHO_CLIENT_ID);
  url.searchParams.set('client_secret', env.ZOHO_CLIENT_SECRET);
  url.searchParams.set('grant_type', 'refresh_token');

  const res = await fetch(url, { method: 'POST' });
  const body = await res.json();
  if (!res.ok || !body.access_token) {
    fail(`Token refresh failed: ${JSON.stringify(body)}`);
  }
  return body.access_token;
}

async function zohoFetch(
  accessToken,
  path,
  { method = 'GET', query, body } = {},
) {
  const url = new URL(`${API_DOMAIN}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'x-za-ui-version': 'v2',
      'X-convert-response': 'true',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok || data.status === 'failure') {
    const err = new Error(
      `Zoho API call failed (HTTP ${res.status} ${method} ${path}): ${JSON.stringify(data)}`,
    );
    err.zohoCode = data.code;
    throw err;
  }
  return data;
}

// Zoho Sprints restricts item field updates (e.g. statusid) to the item's
// owner - even a project admin's own account gets this on items they don't
// own. Treat it as an expected, non-fatal outcome: most tickets in this
// project won't be owned by whichever account backs this self-client.
const PERMISSION_DENIED_CODE = '7401.14';

async function findItemByNumber(accessToken, itemNo) {
  for (const sprintId of [KANBAN_SPRINT_ID, BACKLOG_SPRINT_ID]) {
    let index = 1;
    for (;;) {
      const data = await zohoFetch(
        accessToken,
        `/team/${TEAM_ID}/projects/${PROJECT_ID}/sprints/${sprintId}/item/`,
        {
          query: {
            action: 'sprintitems',
            subitem: 'true',
            index: String(index),
            range: '250',
          },
        },
      );
      if (env.DEBUG_ZOHO === 'true') {
        console.log(
          `[zoho-sync][debug] sprint ${sprintId} index ${index}: ` +
            JSON.stringify(data).slice(0, 2000),
        );
      }
      // Confirmed shape: items/next are top-level, not nested under `data`.
      const items = data.items || [];
      const found = items.find((it) => String(it.itemNo) === String(itemNo));
      if (found) return { item: found, sprintId };
      if (!data.next) break;
      index += 250;
    }
  }
  return null;
}

// This shape (as originally written) initially failed live with
// `7404 Given URL is wrong` - turned out to be caused by the project's
// Workflow > Associated Board not being bound to the Kanban board (a Zoho
// Sprints UI setting, not a request-shape bug) - see scripts/zoho/README.md.
// Not yet independently re-confirmed after that fix: the 2026-08-16 live
// test only exercised updateStatus (I43 was already on the Kanban board by
// the time DRY_RUN=false ran), so watch the first real Backlog->Kanban move
// closely.
async function moveToKanban(accessToken, itemId) {
  await zohoFetch(
    accessToken,
    `/team/${TEAM_ID}/projects/${PROJECT_ID}/sprints/${BACKLOG_SPRINT_ID}/item/`,
    {
      method: 'POST',
      query: {
        action: 'moveitem',
        itemidarr: JSON.stringify([itemId]),
        toprojectid: PROJECT_ID,
        tosprintid: KANBAN_SPRINT_ID,
      },
    },
  );
}

// Confirmed live on 2026-08-16 against a real disposable ticket (I43): two
// real transitions applied correctly (To do -> In progress, In progress ->
// Code Review) once the Workflow > Associated Board setting was fixed - see
// the note on moveToKanban above and scripts/zoho/README.md.
async function updateStatus(accessToken, itemId, statusId) {
  await zohoFetch(
    accessToken,
    `/team/${TEAM_ID}/projects/${PROJECT_ID}/sprints/${KANBAN_SPRINT_ID}/item/${itemId}/`,
    { method: 'POST', query: { statusid: statusId } },
  );
}

async function main() {
  const branchName =
    env.GITHUB_HEAD_REF ||
    (env.GITHUB_REF_NAME || '').replace(/^refs\/heads\//, '');
  const itemNo = extractTicketNumber(branchName);
  if (!itemNo)
    skip(`no ${TICKET_PREFIX}-I<n> ticket number found in "${branchName}"`);

  const desired = resolveDesiredStatus();
  if (!desired) skip('event does not map to a status transition');

  const accessToken = await getAccessToken();
  const found = await findItemByNumber(accessToken, itemNo);
  if (!found)
    skip(`no ticket with itemNo ${itemNo} found in Kanban or Backlog`);

  const { item, sprintId } = found;
  const currentRank = STATUS_RANK[item.statusId]?.rank;
  const desiredRank = STATUS_RANK[desired.statusId].rank;

  if (currentRank === undefined) {
    fail(
      `Ticket I${itemNo} has unrecognized statusId ${item.statusId} - update STATUS_RANK`,
    );
  }
  if (currentRank >= desiredRank) {
    skip(
      `I${itemNo} is already "${STATUS_RANK[item.statusId].name}" (rank ${currentRank}), ` +
        `not moving to "${STATUS_RANK[desired.statusId].name}" (rank ${desiredRank})`,
    );
  }

  const transitionLog =
    `I${itemNo}: ${STATUS_RANK[item.statusId].name} -> ` +
    `${STATUS_RANK[desired.statusId].name} (${desired.reason})`;

  if (env.DRY_RUN === 'true') {
    console.log(`[zoho-sync] DRY RUN - would apply: ${transitionLog}`);
    if (sprintId === BACKLOG_SPRINT_ID) {
      console.log(
        `[zoho-sync] DRY RUN - would move I${itemNo} from Backlog to Kanban first`,
      );
    }
    return;
  }

  try {
    if (sprintId === BACKLOG_SPRINT_ID) {
      console.log(
        `[zoho-sync] Moving I${itemNo} from Backlog to Kanban board first`,
      );
      await moveToKanban(accessToken, item.itemId);
    }

    await updateStatus(accessToken, item.itemId, desired.statusId);
    console.log(`[zoho-sync] ${transitionLog}`);
  } catch (err) {
    if (err.zohoCode === PERMISSION_DENIED_CODE) {
      console.log(
        `[zoho-sync] Skipping: I${itemNo} isn't owned by this integration's account ` +
          `(Zoho ${PERMISSION_DENIED_CODE}) - can't update status via API. Move it manually.`,
      );
      return;
    }
    throw err;
  }
}

main().catch((err) => fail(err.stack || String(err)));
