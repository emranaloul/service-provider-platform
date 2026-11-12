#!/usr/bin/env node
// Tags a Zoho Sprints work item with one or more user groups.
//
// The MCP server's CreateItem/UpdateItem tools expose no user-group field, so
// this has to go through the REST API as a follow-up call after the item is
// created.
//
// Usage:
//   node scripts/zoho/set-item-usergroup.mjs --item <itemId> [--groups frontend,backend]
//
// Required env (same self-client credentials as sync-ticket-status.mjs):
//   ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
//
// Optional env overrides (defaults match this project - Service Provider Portal):
//   ZOHO_ACCOUNTS_DOMAIN (default https://accounts.zoho.sa)
//   ZOHO_API_DOMAIN       (default https://sprintsapi.zoho.sa/zsapi)
//   ZOHO_TEAM_ID          (default 150001150029)
//   ZOHO_PROJECT_ID       (default 1335000000176026)
//   ZOHO_KANBAN_SPRINT_ID (required)
//
// Confirmed working end-to-end on 2026-08-16 with a live OAuth bearer token
// against a known-baseline test item (userGroupCount went 1 -> 2 as expected
// after sending 2 group IDs): `usergroupids` (JSON-array-encoded string) as a
// form-data field, POSTed to the plain item path with no `action` param,
// authenticated via the same `Authorization: Zoho-oauthtoken` bearer header
// every other call in this repo uses. `chkdependent` (seen in a browser
// devtools capture) is NOT required - the bearer-token call above succeeded
// without it.
//
// This endpoint still answers {"status":"success"} even when it silently
// ignores a bad parameter (confirmed earlier by sending the value as a raw
// body instead of form-data), so readUserGroupCount() below stays load-bearing
// - don't remove it even though the shape is now trusted.

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

// Confirmed by inspecting the item form's User Group picker on 2026-08-16.
const USER_GROUP_IDS = {
  frontend: '1335000000043005',
  backend: '1335000000043008',
  ai: '1335000000047076',
};

const DEFAULT_GROUPS = ['frontend'];

function fail(message) {
  console.error(`[zoho-usergroup] ERROR: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--item' || flag === '--groups' || flag === '--sprint') {
      const value = argv[i + 1];
      if (!value) fail(`${flag} requires a value`);
      args[flag.slice(2)] = value;
      i += 1;
    }
  }
  return args;
}

function resolveGroupIds(groupsArg) {
  const names = groupsArg
    ? groupsArg
        .split(',')
        .map((n) => n.trim().toLowerCase())
        .filter(Boolean)
    : DEFAULT_GROUPS;

  return names.map((name) => {
    const id = USER_GROUP_IDS[name];
    if (!id) {
      fail(
        `Unknown user group "${name}" - known: ${Object.keys(USER_GROUP_IDS).join(', ')}`,
      );
    }
    return id;
  });
}

async function getAccessToken() {
  for (const key of [
    'ZOHO_CLIENT_ID',
    'ZOHO_CLIENT_SECRET',
    'ZOHO_REFRESH_TOKEN',
  ]) {
    if (!env[key]) fail(`Missing required env var ${key}`);
  }

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

async function setUserGroups(accessToken, sprintId, itemId, groupIds) {
  const url = new URL(
    `${API_DOMAIN}/team/${TEAM_ID}/projects/${PROJECT_ID}/sprints/${sprintId}/item/${itemId}/`,
  );

  // Form-data fields, not query params - see the note at the top of this file.
  // Leave Content-Type unset so fetch adds the multipart boundary itself.
  const form = new FormData();
  form.set('usergroupids', JSON.stringify(groupIds));
  form.set('chkdependent', 'true');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'x-za-ui-version': 'v2',
      'X-convert-response': 'true',
    },
    body: form,
  });
  const data = await res.json();
  if (!res.ok || data.status !== 'success') {
    fail(`Zoho API call failed (HTTP ${res.status}): ${JSON.stringify(data)}`);
  }
}

// This endpoint answers {"status":"success"} even when it silently ignored the
// parameter, so a write is only believable once userGroupCount reflects it.
async function readUserGroupCount(accessToken, sprintId, itemId) {
  const url = new URL(
    `${API_DOMAIN}/team/${TEAM_ID}/projects/${PROJECT_ID}/sprints/${sprintId}/item/${itemId}/`,
  );
  url.searchParams.set('action', 'details');

  const res = await fetch(url, {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'x-za-ui-version': 'v2',
      'X-convert-response': 'true',
    },
  });
  const data = await res.json();
  // The raw REST response is NOT wrapped in an extra top-level "data" key the
  // way the zoho-sprints MCP tool's output is - it's {items: [...]} directly.
  return data?.items?.[0]?.userGroupCount;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.item) fail('Missing --item <itemId>');

  const sprintId = args.sprint || KANBAN_SPRINT_ID;
  const groupIds = resolveGroupIds(args.groups);

  const accessToken = await getAccessToken();
  await setUserGroups(accessToken, sprintId, args.item, groupIds);

  const count = await readUserGroupCount(accessToken, sprintId, args.item);
  if (count !== groupIds.length) {
    fail(
      `Verification failed: expected userGroupCount ${groupIds.length}, got ${count}. ` +
        `The API reported success but the tag did not stick.`,
    );
  }
  console.log(
    `[zoho-usergroup] Tagged item ${args.item} with ${groupIds.length} group(s)`,
  );
}

main().catch((err) => fail(err.stack || String(err)));
