# Service Provider Module — API & Business Logic Reference

This document describes the **Service Provider** module: every backend endpoint it
calls, the exact request payloads, the response shapes, and the business rules
the client enforces. It is meant to let another project re-implement the module
against the same backend.

Scope:

| Area                                                                                                                  | Backend service |
| --------------------------------------------------------------------------------------------------------------------- | --------------- |
| Service Providers, Branches, Branch Slots, Branch Services, Branch Vaccines, Categories, Classifications, Attachments | `Provider`      |
| Provider orders, Financial (claiming), Ledgers                                                                        | `Reservation`   |

---

## Contents

1. [Transport conventions (read first)](#1-transport-conventions-read-first)
2. [Shared enums and value encodings](#2-shared-enums-and-value-encodings)
3. [Shared payload rules (translations, diffs, dates)](#3-shared-payload-rules-translations-diffs-dates)
4. [Service Provider Category](#4-service-provider-category)
5. [Service Provider Classification](#5-service-provider-classification)
6. [Service Provider](#6-service-provider)
7. [Service Provider Attachments](#7-service-provider-attachments)
8. [Service Provider Branch](#8-service-provider-branch)
9. [Branch Slots (weekly schedule)](#9-branch-slots-weekly-schedule)
10. [Branch Services](#10-branch-services)
11. [Branch Vaccines](#11-branch-vaccines)
12. [Branch lookups used by booking flows](#12-branch-lookups-used-by-booking-flows)
13. [Provider Orders](#13-provider-orders)
14. [Financial — claiming completed orders](#14-financial--claiming-completed-orders)
15. [Ledgers](#15-ledgers)
16. [Permissions](#16-permissions)
17. [Provider account (profile) behaviour](#17-provider-account-profile-behaviour)
18. [Known quirks and bugs to avoid copying](#18-known-quirks-and-bugs-to-avoid-copying)

---

## 1. Transport conventions (read first)

### 1.1 Base URL and headers

- Every path in this document is relative to the API base URL (`VITE_APP_API_URL`).
- Every request sends `Authorization: Bearer <token>` (the logged-in user's token).
  If the stored token has expired, the client logs the user out and does not send the request.
- Every request gets a `culture` query parameter appended automatically:
  `?culture=en` or `&culture=ar` (from the current UI language, default `en`).
  The backend uses it to localise names in responses.
- Static files (icons, logos, attachments) are served from a separate media origin
  (`VITE_APP_MEDIA_URL`). The API returns **relative paths**; build the full URL as
  `MEDIA_URL + relativePath` (with any leading `/` stripped from the path).

### 1.2 Request bodies

- **All create/update requests are `multipart/form-data`** (a `FormData` body), not JSON.
  Nested objects and arrays use ASP.NET model-binding notation:
  `Translations[0].langId`, `requests[1].times[0].services[2].isDeleted`, `Reason.Reason`.
- Booleans are sent as the strings `"true"` / `"false"`.
- Repeated scalar fields (file lists, id lists) are sent by appending the same key several
  times, e.g. `ProposalFiles`, `ProposalFiles`, … or `slotTimeIds`, `slotTimeIds`, ….
- Field-name casing is not significant to the backend (ASP.NET binding is
  case-insensitive), so `Name` / `name` and `Id` / `id` are equivalent.
- Bulk delete endpoints (`MultipleDelete`) take a **JSON array of ids as the body of a
  `DELETE` request**.

### 1.3 Response envelope

Every successful response is wrapped:

```json
{ "value": <payload> }
```

The payload is read from `response.value`. In the tables below, **"Returns"
always means the content of `value`**.

Paged list endpoints return this payload:

```ts
{
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: T[];
}
```

### 1.4 Status codes and errors

| HTTP status | Meaning                   | Client behaviour                                         |
| ----------- | ------------------------- | -------------------------------------------------------- |
| `200`       | Success                   | Use `value`                                              |
| `600`       | **Custom business error** | `{ message: string }`. Show `message` to the user as-is. |
| `400`       | Bad request               | Generic "bad request" error                              |
| `401`       | Unauthorized              | Treated as invalid credentials                           |
| `404`       | Not found                 | Generic "not found" error                                |
| `500`       | Server error              | Generic server error                                     |
| other       | —                         | Generic unexpected error                                 |

Status `600` is the backend's channel for validation and rule violations (duplicates,
constraint failures, and so on). Always show its `message`.

### 1.5 The two-step delete protocol (`-1` = "has dependents")

Single-item `Delete` endpoints share one protocol:

1. Call `DELETE …/Delete?Id={id}` **without** `forceDelete`.
2. If the returned `value` is **`-1`**, the record has dependent data. Ask the user
   for a second confirmation ("this will also delete related data").
3. If they confirm, call again with `forceDelete=true`:
   `DELETE …/Delete?forceDelete=true&Id={id}`.
4. Any other truthy `value` means the delete succeeded.

The parameter is spelled `forceDelete` everywhere except Branch Vaccines, where the client
sends `ForceDelete`. Because binding is case-insensitive, both work.

### 1.6 List query strings

List endpoints take query parameters. The standard list state is serialised as:

```
pageNumber=1&pageSize=10&orderBy=…&orderDirection=…&search=…&<filterKey>=<value>&…
```

- Defaults: `pageNumber=1`, `pageSize=10`.
- Empty or null filter values are omitted.
- Multi-value filters repeat the key: `TagIds=3&TagIds=7`.
- **Quirk:** the client lower-cases the whole generated list query string, so the backend
  receives `status=true`, `categoryid=5`, `tagids=3`, and so on. The backend matches these
  case-insensitively. Your implementation does not need to lower-case.
- Some screens add fixed parameters before or after the generated string. Each section
  lists them.
- Endpoint constants end in `?`. Parameters are appended directly after it, so a URL may
  look like `List?&ServiceProviderId=4`. The backend accepts the empty leading parameter.

---

## 2. Shared enums and value encodings

### 2.1 Language ids

| Language | `langId` |
| -------- | -------- |
| English  | `1`      |
| Arabic   | `2`      |

English is the required language in every translatable form.

### 2.2 Days of the week (bit flags)

Days are **bit flags**. One field can hold several days ORed together.

| Day       | Value |
| --------- | ----- |
| Saturday  | `1`   |
| Sunday    | `2`   |
| Monday    | `4`   |
| Tuesday   | `8`   |
| Wednesday | `16`  |
| Thursday  | `32`  |
| Friday    | `64`  |

Used by:

- `ServiceProvider.closingDay`: a **bitmask** of the provider's weekly closing days.
  For example, Friday + Saturday = `64 | 1 = 65`. To read it, test each bit:
  `(closingDay & dayValue) !== 0`.
- `BranchSlot.day`: a **single** day value, one slot record per open day.

### 2.3 Order status (bit flags)

| Status     | Value |
| ---------- | ----- |
| New        | `1`   |
| Accept     | `2`   |
| Cancel     | `4`   |
| Reject     | `8`   |
| CheckIn    | `16`  |
| InProgress | `32`  |
| Complete   | `64`  |
| NoShow     | `128` |
| Delayed    | `256` |

Because statuses are bit flags, an "excluded statuses" filter is the **sum** of the
excluded values. For example, excluding Cancel + NoShow gives `ExcludedStatus=132`.

### 2.4 Ledger status

| Status | Value |
| ------ | ----- |
| UnPaid | `1`   |
| Paid   | `2`   |

### 2.5 Provider attachment category

These values are stored as integers and must never change.

| Category        | Value | Create-form field (multi-file) |
| --------------- | ----- | ------------------------------ |
| Proposal        | `1`   | `ProposalFiles`                |
| LegalDocument   | `2`   | `LegalDocumentFiles`           |
| Invoice         | `3`   | `InvoiceFiles`                 |
| CustomerSuccess | `4`   | `CustomerSuccessFiles`         |

### 2.6 User types (`groupId` on the logged-in user)

| Type          | Value |
| ------------- | ----- |
| Admin         | `1`   |
| Client        | `2`   |
| Provider      | `3`   |
| Company       | `4`   |
| CompanyMember | `5`   |

A logged-in Provider user also has `user.serviceProviderId`, which is the provider they
belong to.

---

## 3. Shared payload rules (translations, diffs, dates)

### 3.1 Translations

Names (and some descriptions or addresses) are stored per language as a `Translations`
collection.

- **On create**, send one entry per language that has a name filled in. Indexes are
  **compacted**: if only English is filled, it is `Translations[0]`, whatever its
  `langId`.
  ```
  Translations[0].langId = 1
  Translations[0].Name   = "Al Noor Clinic"
  ```
- **On update**, every entry also carries its existing translation-row `id` (`0` if this
  language had no translation before) and the parent's id:
  ```
  Translations[0].id                = 17      // existing row id, or 0 for a new language
  Translations[0].serviceProviderId = 4       // parent FK (key name varies per entity)
  Translations[0].langId            = 1
  Translations[0].Name              = "Al Noor Clinic"
  ```
- A language whose name was cleared is not sent at all on update. Deleting a translation
  this way is not supported.

### 3.2 Child-collection diffing (`id` / `isDeleted`)

Updatable child collections (tags, schedule-offs, slot services) are sent as a **diff
against what the server returned**:

| Case                               | Sent as                              |
| ---------------------------------- | ------------------------------------ |
| Item existed and is still selected | its existing `id`, `isDeleted=false` |
| Item existed and was removed       | its existing `id`, `isDeleted=true`  |
| New item                           | `id=0`, `isDeleted=false`            |

Items are matched on their business key (the tag id, the date, or the branch-service
id), not on the row id.

### 3.3 Dates and times

- **Date-only values** (closing dates, schedule-off dates) are sent as `YYYY-MM-DD`.
- **Slot times** (`from` / `to`) are **stored in UTC** as time-of-day. The client converts
  local `HH:mm` to UTC `HH:mm` before sending, and converts UTC back to local for display.
  The backend type is a `TimeSpan`.
- Dates returned by the API are UTC. Convert them to local time for display.

### 3.4 Common field validation

| Rule              | Meaning                                           |
| ----------------- | ------------------------------------------------- |
| "required string" | trimmed, non-empty                                |
| "integer"         | numeric, integer, `>= 0`, required                |
| "decimal"         | numeric, `>= 0`, required                         |
| "email"           | required, must match `^[^\s@]+@[^\s@]+\.[^\s@]+$` |
| "lookup"          | a selected option (id) is required                |

> **Phone numbers are validated as integers** (digits only, no `+` and no spaces).
> **VAT number** is also validated as an integer.

---

## 4. Service Provider Category

A simple lookup that groups providers, for example "Hospital" or "Lab".

### 4.1 Endpoints

| Action       | Method   | Path                                                                      | Body            | Returns               |
| ------------ | -------- | ------------------------------------------------------------------------- | --------------- | --------------------- |
| List         | `GET`    | `Provider/ServiceProviderCategory/List?`                                  | —               | Paged `Category[]`    |
| Get by id    | `GET`    | `Provider/ServiceProviderCategory/GetById?id={id}`                        | —               | `Category`            |
| Create       | `POST`   | `Provider/ServiceProviderCategory/Create`                                 | form-data       | `Category`            |
| Update       | `PUT`    | `Provider/ServiceProviderCategory/Update`                                 | form-data       | `Category`            |
| Delete       | `DELETE` | `Provider/ServiceProviderCategory/Delete?Id={id}` (+ `forceDelete=true&`) | —               | `-1` or truthy (§1.5) |
| Bulk delete  | `DELETE` | `Provider/ServiceProviderCategory/MultipleDelete`                         | JSON `number[]` | truthy                |
| Delete image | `DELETE` | `Provider/ServiceProviderCategory/DeleteImage?`                           | —               | _(defined, unused)_   |

**List filters:** `status` (`true` / `false`; omit for both), `rank`, plus paging.

### 4.2 Response shape

```ts
interface Category {
  id: number;
  rank: number; // ordering; lower comes first. Default for new records: 100
  status: boolean; // active / inactive
  translations: {
    id: number;
    ServiceProviderCategoryID: number;
    langId: number;
    name: string;
    description: string;
  }[];
}
```

### 4.3 Create payload

```
Rank                         = 100
Status                       = true
Translations[i].langId       = 1
Translations[i].Name         = "Hospital"
Translations[i].Description  = "…"         // "" if empty
```

### 4.4 Update payload

```
Id                                         = 5
Rank, Status                               (as on create)
Translations[i].id                         = existing id or 0
Translations[i].ServiceProviderCategoryID  = 5
Translations[i].langId / .Name / .Description
```

### 4.5 Rules

- English name is required.
- Any other language's name becomes required **if that language's description is
  filled**.
- `rank` is required. It defaults to `100`.
- A category's detail view links to the provider list filtered by this category.

---

## 5. Service Provider Classification

A tier or class of provider branch, for example "Class A" or "Class B".
**Classification drives pricing**: services and service groups carry one price per
classification, and a branch's classification decides which price applies (§10.4).
Company packages and branch searches also filter by it.

### 5.1 Endpoints

The backend path is misspelled **`ServiceProviderClassfication`**. Keep the typo.

| Action       | Method   | Path                                                                           | Body            | Returns                  |
| ------------ | -------- | ------------------------------------------------------------------------------ | --------------- | ------------------------ |
| List         | `GET`    | `Provider/ServiceProviderClassfication/List?`                                  | —               | Paged `Classification[]` |
| Get by id    | `GET`    | `Provider/ServiceProviderClassfication/GetById?id={id}`                        | —               | `Classification`         |
| Create       | `POST`   | `Provider/ServiceProviderClassfication/Create`                                 | form-data       | `Classification`         |
| Update       | `PUT`    | `Provider/ServiceProviderClassfication/Update`                                 | form-data       | `Classification`         |
| Delete       | `DELETE` | `Provider/ServiceProviderClassfication/Delete?Id={id}` (+ `forceDelete=true&`) | —               | `-1` or truthy           |
| Bulk delete  | `DELETE` | `Provider/ServiceProviderClassfication/MultipleDelete`                         | JSON `number[]` | truthy                   |
| Delete image | `DELETE` | `Provider/ServiceProviderClassfication/DeleteImage?`                           | —               | _(defined, unused)_      |

**List filters:** `status`, `rank`.

### 5.2 Response shape, payloads and rules

These are identical to Category (§4). The only difference is the translation FK key:
`Translations[i].ServiceProviderClassificationID`.

---

## 6. Service Provider

The provider organisation, for example a hospital group. It owns branches, users,
attachments, tags, orders and ledgers.

### 6.1 Endpoints

| Action                          | Method   | Path                                                       | Body             | Returns                   |
| ------------------------------- | -------- | ---------------------------------------------------------- | ---------------- | ------------------------- |
| List                            | `GET`    | `Provider/ServiceProvider/List?`                           | —                | Paged `ServiceProvider[]` |
| Get by id                       | `GET`    | `Provider/ServiceProvider/GetById?id={id}`                 | —                | `ServiceProvider`         |
| Create                          | `POST`   | `Provider/ServiceProvider/Create`                          | form-data        | `ServiceProvider`         |
| Update                          | `PUT`    | `Provider/ServiceProvider/Update`                          | form-data        | `ServiceProvider`         |
| Delete                          | `DELETE` | `Provider/ServiceProvider/Delete?forceDelete=true&Id={id}` | —                | `-1` or truthy            |
| Bulk delete                     | `DELETE` | `Provider/ServiceProvider/MultipleDelete`                  | JSON `number[]`  | _(defined, unused)_       |
| Delete icon / legacy attachment | `DELETE` | `Provider/ServiceProvider/DeleteImage/DeleteImage?`        | form-data (§6.6) | truthy                    |

**List filters:**

| Param                             | Notes                                                        |
| --------------------------------- | ------------------------------------------------------------ |
| `status`                          | `true` / `false`; omit for both                              |
| `CategoryId`                      |                                                              |
| `isAvailable`                     |                                                              |
| `TagIds`                          | repeated                                                     |
| `ServiceTypeId`                   | appended when the list is opened for a specific service type |
| `ServiceProviderClassificationId` | used by provider pickers                                     |
| `Search`                          | used by provider pickers (URL-encoded)                       |
| `PageNumber`, `PageSize`          |                                                              |

### 6.2 Response shape

```ts
interface ServiceProvider {
  id: number;
  email: string;
  phone: string;
  firstName: string; // contact person
  lastName: string; // contact person
  companyName: string; // legal company name
  crNumber: string; // commercial registration
  vatNumber: string;
  bankDetails: string;
  icon: string; // relative media path
  attachment: string; // legacy single attachment, relative media path
  closingDay: number; // bitmask of weekly closing days (§2.2)
  status: boolean;
  categoryId: number;
  tags: { id: number; tagId: number; tagName: string }[]; // id = link-row id
  translations: {
    id: number;
    serviceProviderId: number;
    name: string;
    langId: number;
  }[];
  dates: { id: number; closingDate: string; serviceProviderId: number }[]; // one-off closing dates
  schaduleOffReasons: {
    id: number;
    Reason: string;
    ServiceProviderId: number;
  }[];
}
```

The display name is the translation for the current culture. Fall back to the first
translation.

### 6.3 Create payload

```
Id                              = 0
Email, Phone, FirstName, LastName
CrNumber, VatNumber, BankDetails, CompanyName
Status                          = true | false
CategoryId                      = 3
ClosingDay                      = 65            // OR of selected days; 0 if none
Icon                            = <file>        // optional
Attachment                      = <file>        // optional (legacy single file)

ProposalFiles                   = <file> (repeat per file)   // optional
LegalDocumentFiles              = <file> (repeat)            // optional
InvoiceFiles                    = <file> (repeat)            // optional
CustomerSuccessFiles            = <file> (repeat)            // optional

Tags[i].id                      = 0
Tags[i].serviceProviderId       = 0
Tags[i].tagsId                  = <tag id>
Tags[i].isDeleted               = false

ScheduleOffs[i].closingDate     = "YYYY-MM-DD"  // one per one-off closing date
Reason.Reason                   = "…"           // required when any ScheduleOffs are sent

Translations[i].langId / .Name                 // §3.1
```

### 6.4 Update payload

```
Id                              = 4
(all scalar fields as on create)
StatusChanged                   = true | false   // true when Status differs from the loaded value

Tags[i].Id                      = existing link-row id, or 0 for new
Tags[i].tagsId                  = <tag id>
Tags[i].serviceProviderId       = 4
Tags[i].isDeleted               = true | false   // diff, §3.2 (matched on tag id)

ScheduleOffs[i].id              = existing id, or 0
ScheduleOffs[i].serviceProviderId = 4
ScheduleOffs[i].isDeleted       = true | false    // diff, §3.2 (matched on date)
ScheduleOffs[i].closingDate     = UTC date

Reason.Reason                   = "…"   // required when any schedule-off was added or removed

Translations[i].id / .serviceProviderId / .langId / .Name   // §3.1
```

`Icon` and `Attachment` are only sent when a new file is chosen. Leaving them out keeps
the existing files.

### 6.5 Validation and rules

| Field                                                   | Rule                                                                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| English name                                            | required                                                                                                                                               |
| Email                                                   | email                                                                                                                                                  |
| Phone                                                   | integer (digits only)                                                                                                                                  |
| FirstName, LastName, CrNumber, BankDetails, CompanyName | required string                                                                                                                                        |
| VatNumber                                               | integer                                                                                                                                                |
| CategoryId                                              | required on update. Create sends it, but the form does not enforce it, so require it in your implementation.                                           |
| Tags                                                    | optional                                                                                                                                               |
| Reason                                                  | **Create:** required if at least one one-off closing date is set. **Update:** required if the set of closing dates **changed** (any added or removed). |

Business meaning:

- **`closingDay`** is the provider's _recurring_ weekly days off. It applies to every branch.
  When building a branch's weekly slot schedule, those days are excluded (§9.3).
- **`ScheduleOffs` / `dates`** are _one-off_ closing dates, such as holidays. A reason must
  be recorded whenever they change, and it is kept in `schaduleOffReasons`.
- **`StatusChanged`** tells the backend that the active flag was toggled, so it can apply
  side-effects such as cascading to branches or notifications.
- The four category file lists on create are uploaded as provider attachments (§7).
  After creation, attachments are managed only through the Attachments endpoints.

### 6.6 Deleting the icon or legacy attachment

`DELETE Provider/ServiceProvider/DeleteImage/DeleteImage?`. The form-data goes in the
**DELETE body**:

```
Id                  = 4
IsDeletedIcon       = true | false
IsDeletedAttachment = true | false
```

Send one flag `true` per call. Confirm with the user first.

### 6.7 Delete

The client sends `forceDelete=true` on the **first** call. If `-1` comes back, it asks a
second time and repeats the same call. See §18. Use the standard protocol (§1.5) in your
implementation.

### 6.8 Navigation from a provider

From a provider, the user can open:

- its branches (§8, list filtered by `ServiceProviderId`)
- its users (the Users module, filtered by user type Provider = 3 and this provider id)
- its financial view (§14, filtered by `ServiceProviderId`)

Each needs the matching permission (§16).

---

## 7. Service Provider Attachments

These are document folders per provider, one folder per category (§2.5).

### 7.1 Endpoints

| Action | Method   | Path                                                                               | Body                                 | Returns                                                   |
| ------ | -------- | ---------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------- |
| Upload | `POST`   | `Provider/ServiceProvider/UploadAttachment?serviceProviderId={id}&category={cat}`  | form-data: `files` (repeat per file) | `Attachment[]` (the created rows)                         |
| List   | `GET`    | `Provider/ServiceProvider/ListAttachments?serviceProviderId={id}[&category={cat}]` | —                                    | `Attachment[]` (not paged; may be `null` → treat as `[]`) |
| Delete | `DELETE` | `Provider/ServiceProvider/DeleteAttachment?id={attachmentId}`                      | —                                    | `number` (deleted id)                                     |

### 7.2 Response shape

```ts
interface Attachment {
  id: number;
  serviceProviderId: number;
  category: 1 | 2 | 3 | 4;
  fileName: string; // stored name
  originalFileName: string; // name to show the user
  contentType: string | null;
  relativePath: string; // e.g. content/ServiceProviderAttachments/{providerId}/{category}/{file}
  createdDateUtc: string | null;
}
```

File URL = `MEDIA_URL + relativePath` (with any leading `/` stripped from the path).

### 7.3 Rules

- Every upload goes to one category. The default category is Proposal.
- Several files can be uploaded at once.
- Uploading with zero files does nothing.
- Listing without `category` returns all four categories. Group the results by
  `category` on the client.
- Confirm before deleting. The confirmation shows `originalFileName`.
- Permissions are separate for view, upload and delete (§16).

---

## 8. Service Provider Branch

A physical location of a provider. Branches carry the location, the classification
(which drives pricing), the services and vaccines on offer, and the weekly slot
schedule.

### 8.1 Endpoints

| Action        | Method   | Path                                                                    | Body            | Returns             |
| ------------- | -------- | ----------------------------------------------------------------------- | --------------- | ------------------- |
| List          | `GET`    | `Provider/ServiceProviderBranch/List?`                                  | —               | Paged `Branch[]`    |
| Get by id     | `GET`    | `Provider/ServiceProviderBranch/GetById?id={id}`                        | —               | `Branch`            |
| Create        | `POST`   | `Provider/ServiceProviderBranch/Create`                                 | form-data       | `Branch`            |
| Update        | `PUT`    | `Provider/ServiceProviderBranch/Update`                                 | form-data       | `Branch`            |
| Delete        | `DELETE` | `Provider/ServiceProviderBranch/Delete?Id={id}` (+ `forceDelete=true&`) | —               | `-1` or truthy      |
| Bulk delete   | `DELETE` | `Provider/ServiceProviderBranch/MultipleDelete`                         | JSON `number[]` | truthy              |
| Delete image  | `DELETE` | `Provider/ServiceProviderBranch/DeleteImage?`                           | —               | _(defined, unused)_ |
| Custom list   | `GET`    | `Provider/ServiceProviderBranch/CustomList?`                            | —               | §12.1               |
| Filtered list | `POST`   | `Provider/ServiceProviderBranch/FilteredList`                           | form-data       | §12.2               |
| Map list      | `GET`    | `Provider/ServiceProviderBranch/MapList?`                               | —               | §12.3               |

**List filters:**

| Param                             | Notes                                              |
| --------------------------------- | -------------------------------------------------- |
| `ServiceProviderId`               | always set when the list is opened from a provider |
| `status`                          | `true` / `false`                                   |
| `serviceProviderClassificationId` |                                                    |
| `countryId`, `cityId`             |                                                    |
| `TagIds`                          | repeated                                           |
| `CityId`                          | used by branch pickers                             |

### 8.2 Response shape

```ts
interface Branch {
  id: number;
  email: string;
  phone: string;
  firstName: string; // branch contact person
  lastName: string;
  logo: string; // relative media path
  latitude: number;
  longitude: number;
  countryId: number;
  countryName: string;
  cityId: number;
  cityName: string;
  serviceProviderId: number;
  serviceProvider: string; // provider display name
  serviceProviderClosingDay: number; // the parent provider's closingDay bitmask (§2.2)
  serviceProviderClassificationId: number;
  status: boolean;
  tags: { id: number; tagId: number; tagName: string }[];
  translations: {
    id: number;
    serviceProviderBranchId: number;
    langId: number;
    name: string;
    address: string;
  }[];
}
```

### 8.3 Create payload

```
Id                               = 0
Email, Phone, FirstName, LastName
Latitude, Longitude              = decimal numbers
CountryId, CityId
Status                           = true | false
Logo                             = <file>    // optional
ServiceProviderId                = 4         // from context when created under a provider, else chosen
ServiceProviderClassificationId  = 2

Tags[i].id                       = 0
Tags[i].serviceProviderBranchId  = 0
Tags[i].tagsId                   = <tag id>
Tags[i].isDeleted                = false

Translations[i].langId           = 1
Translations[i].name             = "Riyadh – Olaya"
Translations[i].address          = "…"       // "" if empty
```

### 8.4 Update payload

The update payload is the same as create, plus:

```
Id                               = 12
Tags[i].Id / .tagsId / .serviceProviderBranchId (=12) / .isDeleted     // diff, §3.2
Translations[i].id / .serviceProviderBranchId (=12) / .langId / .name / .address
```

### 8.5 Validation and rules

| Field                         | Rule                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| English name, English address | required string                                                                                 |
| Arabic address                | required **if** an Arabic name is given                                                         |
| Email                         | email                                                                                           |
| Phone                         | integer                                                                                         |
| FirstName, LastName           | required string                                                                                 |
| Country, City                 | required lookup. City options depend on the chosen country.                                     |
| Latitude, Longitude           | required number (negatives allowed)                                                             |
| Tags                          | required array                                                                                  |
| Classification                | required lookup                                                                                 |
| ServiceProviderId             | required **unless** the branch is created from inside a provider, where the provider is implied |

Business meaning:

- A branch **belongs to exactly one provider** and **has exactly one classification**.
- The branch's **classification** chooses which price tier applies when a service or
  service group is attached to it (§10.4).
- The branch's **city** limits which vaccines can be offered there (§11.4).
- A branch inherits its provider's weekly closing days. The branch response repeats them
  as `serviceProviderClosingDay`.
- Bulk delete is available on the branch list for selected rows.

### 8.6 What hangs off a branch

- **Services and vaccines offered** (§10, §11). The branch detail combines the two lists
  into one (§10.6).
- **Weekly slot schedule** (§9). Requires `view:service-provider-branch-slots` or
  `view:service-provider-branch-vaccine-slots`.
- **Financial** (§14), filtered by `ServiceProviderBranchId`.

---

## 9. Branch Slots (weekly schedule)

A branch has **one slot record per open weekday**. Each slot record has a daily capacity
and a list of **slot times** (time windows). Each slot time lists the **branch services**
bookable in that window, and can also be linked to **branch vaccines**.

```
Branch
 └─ Slot (day = Monday(4), maxOccupancyPerDay = 30)
     ├─ SlotTime 08:00–10:00 (UTC)
     │    ├─ slotServices → BranchService #51, #52
     │    └─ vaccine links → BranchVaccine #9   (managed through §11 endpoints)
     └─ SlotTime 10:00–12:00
```

### 9.1 Endpoints

| Action                                   | Method   | Path                                                                                 | Body      | Returns                 |
| ---------------------------------------- | -------- | ------------------------------------------------------------------------------------ | --------- | ----------------------- |
| List (a branch's weekly schedule)        | `GET`    | `Provider/ServiceProviderBranchSlot/List?PageSize=1000&ServiceProviderBranchId={id}` | —         | Paged `Slot[]`          |
| List for a date (legacy)                 | `GET`    | `Provider/ServiceProviderBranchSlot/List?ServiceProviderBranchId={id}&date={date}`   | —         | `value.data` = `Slot[]` |
| Get by id                                | `GET`    | `Provider/ServiceProviderBranchSlot/GetById?id={id}`                                 | —         | `Slot`                  |
| **Set (create / update the whole week)** | `PUT`    | `Provider/ServiceProviderBranchSlot/Set`                                             | form-data | truthy                  |
| Delete slot (day)                        | `DELETE` | `Provider/ServiceProviderBranchSlot/Delete?Id={id}&forceDelete={bool}`               | —         | truthy                  |
| Delete one slot time                     | `DELETE` | `Provider/ServiceProviderBranchSlot/DeleteSLotTime?Id={slotTimeId}&forceDelete=true` | —         | truthy                  |
| Slots for a company package on a date    | `GET`    | `Provider/ServiceProviderBranchSlot/GetSlots?`                                       | —         | §12.4                   |
| Weekly available slots (booking)         | `GET`    | `Provider/ServiceProviderBranchSlot/GetWeeklyAvailableTimeSlotsForBranch?`           | —         | §12.5                   |

Always fetch the schedule with `PageSize=1000` so no day is cut off by paging.

### 9.2 Response shape

```ts
interface Slot {
  id: number;
  serviceProviderBranchId: number;
  serviceProviderBranch: string;
  day: number; // single day bit value (§2.2)
  maxOccupancyPerDay: number; // daily capacity for this weekday
  slotTimes: {
    id: number;
    branchServiceSlotId: number;
    from: string; // UTC time of day
    to: string; // UTC time of day
    slotServices: {
      id: number; // link-row id
      branchServiceSlotId: number;
      serviceProviderBranchServiceId: number; // → Branch Service (§10)
    }[];
  }[];
}
```

### 9.3 Building the schedule

1. **Open days** = all 7 weekdays **minus** the provider's `closingDay` bits.
   Closed days get no slot record and cannot be scheduled.
2. For each open day:
   - If the server returned a slot for that `day`, use it. Convert `from` / `to` from UTC
     to local time.
   - Otherwise start a new slot: `id=0`, `maxOccupancyPerDay=1`, and one empty slot time
     (`id=0`).
3. The services offered in a slot time are chosen from **this branch's Branch Services**
   (§10), loaded with `BranchService/List?ServiceProviderBranchId={branchId}`. An option's
   label is the service-group name if the branch service is a group, otherwise the
   service name.
4. The vaccines linked to a slot time come from this branch's **Branch Vaccines** (§11).
   Each branch vaccine's `slotTimes[]` gives `serviceProviderBranchSlotTimeId` → link id.

### 9.4 Validation

- Every day: `day` and `maxOccupancyPerDay` are required.
- Every day must have **at least one slot time**.
- Every slot time: `from` and `to` are required.
- Services and vaccines per slot time are **optional**. An empty selection may be `null`.

### 9.5 Set payload (`PUT …/Set`)

One request saves the whole week. `requests[i]` is indexed over the days being sent,
**skipping days that have no slot times**.

```
requests[i].id                       = existing slot id, or 0
requests[i].serviceProviderBranchId  = 12
requests[i].day                      = 4                // day bit value
requests[i].maxOccupancyPerDay       = 30

requests[i].times[j].id              = existing slot-time id, or 0
requests[i].times[j].from            = "05:00"          // UTC HH:mm
requests[i].times[j].to              = "07:00"          // UTC HH:mm

requests[i].times[j].services[k].id                              = link-row id, or 0
requests[i].times[j].services[k].serviceProviderBranchServiceId  = 51
requests[i].times[j].services[k].isDeleted                       = true | false
```

Services are **diffed per slot time** (§3.2). They are matched on
`serviceProviderBranchServiceId`. A removed service is sent with `isDeleted=true`.

### 9.6 Deleting a slot time

- An unsaved slot time (`id=0`) is just removed locally.
- A saved slot time is deleted **immediately**, after a confirmation, with
  `DELETE …/DeleteSLotTime?Id={slotTimeId}&forceDelete=true`. This does not wait for Save.

### 9.7 Linking vaccines to slot times (after Set)

Vaccine ↔ slot-time links are **not** part of the Set payload. They are applied
**after** a successful Set:

1. **Resolve ids of new slot times.** Slot times created in this save had `id=0`, so
   refetch the schedule (§9.1 List). Match each new slot time on **(day, UTC from, UTC to)**
   to get its real id. If the backend returns times as `HH:mm:ss`, normalise both sides
   before comparing.
2. **Diff the vaccine selections** per slot time against their state when the schedule
   was loaded:
   - **Added:** group by branch vaccine. For each branch vaccine, call
     `POST Provider/ServiceProviderBranchVaccine/AddSlotTimes` with:
     ```
     serviceProviderBranchVaccineId = 9
     slotTimeIds                    = 101   (repeat per slot time)
     slotTimeIds                    = 102
     ```
   - **Removed:** for each removed link, call
     `DELETE Provider/ServiceProviderBranchVaccine/DeleteSlotTime?Id={linkId}`.
     `linkId` is the link-row id from the branch vaccine's `slotTimes[].id`.
3. Send all add and remove calls in parallel.
4. Skip this whole step unless the user has `update:service-provider-branch-vaccine-slots`.
   Users with only `view:service-provider-branch-vaccine-slots` see the links read-only.

---

## 10. Branch Services

A **branch service** is an offering at one branch. It is either one **service** or one
**service group** (a bundle of services). It carries the branch-specific cost, price,
discount and one-off unavailable dates.

> The same "add" flow can also create a **branch vaccine**. That is a separate entity with
> its own endpoints (§11). The form simply sends vaccine submissions to §11.

### 10.1 Endpoints

| Action       | Method   | Path                                                                           | Body            | Returns                 |
| ------------ | -------- | ------------------------------------------------------------------------------ | --------------- | ----------------------- |
| List         | `GET`    | `Provider/ServiceProviderBranchService/List?`                                  | —               | Paged `BranchService[]` |
| Get by id    | `GET`    | `Provider/ServiceProviderBranchService/GetById?id={id}`                        | —               | `BranchService`         |
| Create       | `POST`   | `Provider/ServiceProviderBranchService/Create`                                 | form-data       | `BranchService`         |
| Update       | `PUT`    | `Provider/ServiceProviderBranchService/Update`                                 | form-data       | `BranchService`         |
| Delete       | `DELETE` | `Provider/ServiceProviderBranchService/Delete?Id={id}` (+ `forceDelete=true&`) | —               | `-1` or truthy          |
| Bulk delete  | `DELETE` | `Provider/ServiceProviderBranchService/MultipleDelete`                         | JSON `number[]` | truthy                  |
| Delete image | `DELETE` | `Provider/ServiceProviderBranchService/DeleteImage?`                           | —               | _(defined, unused)_     |

**List filters:** `ServiceProviderBranchId` (also sent as `serviceProviderBranchId` by the
filter panel), plus paging.

### 10.2 Response shape

```ts
interface BranchService {
  id: number;
  serviceProviderBranchId: number;
  serviceProviderBranch: string;
  cost: number; // what the provider charges the platform
  b2CPrice: number; // price to the end customer
  b2BPrice: number; // always 0 for branch services (B2B pricing lives elsewhere)
  b2CDiscount: number;
  services: {
    // a single object, not an array
    id: number;
    serviceProviderBranchServiceId: number;
    serviceId: number;
    serviceName: string;
    serviceGroupId: number; // non-zero ⇒ this branch service is a SERVICE GROUP
    serviceGroupName: string;
    isDeleted: boolean;
  };
  slots: {
    id: number;
    serviceProviderBranchServiceId: number;
    day: number;
    maxOccupancyPerDay: number;
    isDeleted: boolean;
    slotTimes: {
      id: number;
      branchServiceSlotId: number;
      from: string;
      to: string;
      isDeleted: boolean;
    }[];
  }[];
  scheduleOffs: {
    id: number;
    serviceProviderBranchServiceId: number;
    date: string;
    isDeleted: boolean;
  }[];
  reasons: {
    id: number;
    serviceProviderId: number;
    reason: number;
    jsonDates: boolean;
  }[];
}
```

Display name: `services.serviceGroupName` if `services.serviceGroupId` is set, otherwise
`services.serviceName`.

### 10.3 Create — type is "service" or "service group"

```
ServiceProviderBranchId   = 12
Cost                      = 150
B2CPrice                  = 200
B2BPrice                  = 0                  // always "0"
B2CDiscount               = 0
Reason.Reason             = "…"                // required if any ScheduleOffs

// type = single service
Services[0].serviceId     = 31

// type = service group: fetch the group (Service module: ServiceGroup GetById)
// and send EVERY service in it, tagged with the group id
Services[0].serviceId     = 31
Services[0].groupedId     = 7
Services[1].serviceId     = 32
Services[1].groupedId     = 7
…

ScheduleOffs[i].date      = "YYYY-MM-DD"       // one-off unavailable dates
```

### 10.4 Pricing rules

- Each **service** and **service group** in the catalogue has a pricing list:
  `[{ serviceProviderClassificationId, price }, …]`.
  For services it comes from the Service list `pricing`; for groups, from
  `serviceGroupClassificationPricings`.
- When a service or group is chosen, **Cost** and **B2C Price** both default to the
  price for the **branch's classification**, or `0` if there is no price for it.
  The user can then edit them.
- **B2C Price must be ≥ Cost.**
- **B2B Price** is not used for branch services. It is always sent as `0`.
- **B2C Discount** is required (a number `≥ 0`, default `0`).
- When the type changes, clear the selections that belong to the other types so stale
  values are never sent.

### 10.5 Update payload

```
Id                        = 51
Cost, B2CPrice, B2CDiscount
B2BPrice                  = 0
ServiceProviderBranchId   = 12

// if it is a service group
Services[0].id                              = services.id
Services[0].groupedId                       = 7
Services[0].isDeleted                       = false
Services[0].serviceProviderBranchServiceId  = 51

// if it is a single service
Services[0].id                              = 51
Services[0].serviceId                       = 31
Services[0].isDeleted                       = false
Services[0].serviceProviderServiceProviderBranchServiceId = 51

ScheduleOffs[i].id                          = existing id, or 0
ScheduleOffs[i].serviceProviderBranchServiceId = 51
ScheduleOffs[i].date                        = UTC date
ScheduleOffs[i].isDeleted                   = true | false     // diff, §3.2

Reason.Reason                               = "…"   // required when schedule-offs changed
```

Update validation: Cost, B2C Price and B2C Discount are validated as **integers `≥ 0`**
(stricter than create; see §18). The service or group is required to match the type.

### 10.6 The combined "services and vaccines" view of a branch

The branch detail shows one list that merges:

- `BranchService/List?ServiceProviderBranchId={id}` → entries of type **Service**
  (`name`, `cost`, `b2CPrice`, `b2CDiscount`)
- `BranchVaccine/List?ServiceProviderBranchId={id}` → entries of type **Vaccine**
  (`name`, `cost`, `b2CPrice`, no discount)

The vaccine half is only fetched and merged when the user has `view:branch-vaccines`.
Edit and delete go to each entity's own endpoints. Service #5 and Vaccine #5 are
unrelated records.

---

## 11. Branch Vaccines

A vaccine offered at a branch, with its own cost and prices, linked to specific slot
times.

### 11.1 Endpoints

| Action               | Method   | Path                                                                           | Body      | Returns                 |
| -------------------- | -------- | ------------------------------------------------------------------------------ | --------- | ----------------------- |
| List                 | `GET`    | `Provider/ServiceProviderBranchVaccine/List?`                                  | —         | Paged `BranchVaccine[]` |
| Get by id            | `GET`    | `Provider/ServiceProviderBranchVaccine/GetById?Id={id}`                        | —         | `BranchVaccine`         |
| Create               | `POST`   | `Provider/ServiceProviderBranchVaccine/Create`                                 | form-data | `BranchVaccine`         |
| Update               | `PUT`    | `Provider/ServiceProviderBranchVaccine/Update`                                 | form-data | `BranchVaccine`         |
| Delete               | `DELETE` | `Provider/ServiceProviderBranchVaccine/Delete?Id={id}` (+ `ForceDelete=true&`) | —         | `-1` or truthy          |
| Link slot times      | `POST`   | `Provider/ServiceProviderBranchVaccine/AddSlotTimes`                           | form-data | truthy                  |
| Unlink one slot time | `DELETE` | `Provider/ServiceProviderBranchVaccine/DeleteSlotTime?Id={linkId}`             | —         | truthy                  |

**List filters:** `ServiceProviderBranchId` / `serviceProviderBranchId`, plus paging.

### 11.2 Response shape

```ts
interface BranchVaccine {
  id: number;
  serviceProviderBranchId: number;
  branchName?: string;
  serviceProviderBranch?: string;
  serviceProviderId?: number;
  vaccineId: number;
  vaccineName?: string; // display name; fall back to `vaccine`, then `#${vaccineId}`
  vaccine?: string;
  cost: number;
  b2CPrice: number;
  b2BPrice: number;
  slotTimes?: {
    id: number; // link-row id → use for DeleteSlotTime
    serviceProviderBranchSlotTimeId: number; // → Slot time id (§9.2)
    timeFrom?: string;
    timeTo?: string;
  }[];
}
```

### 11.3 Create payload

```
ServiceProviderBranchId  = 12
VaccineId                = 3
Cost                     = 40
B2CPrice                 = 60
B2BPrice                 = 55
SlotTimeIds              = 101    (repeat per slot time)
SlotTimeIds              = 102
```

When a vaccine is created from the Branch Service "add" flow (§10), `SlotTimeIds` is not
sent. The vaccine is linked to slots later through the slot schedule (§9.7).

### 11.4 Rules

- **Cost:** required, a number `≥ 0`.
- **B2C Price ≥ Cost** and **B2B Price ≥ Cost**. Both are required.
- **Vaccine:** required. Only vaccines **available in the branch's city** may be chosen.
  The vaccine catalogue is listed filtered by `cityId`.
  - When the branch (and therefore the city) changes, clear the chosen vaccine.
- **Slot times** (standalone create): at least **one** is required. Options are the
  branch's slot times (§9.1 List, `PageSize=1000`), labelled `Day — from-to`.
  - When the branch changes, clear the chosen slot times.
- Unlike branch services, vaccines have **no discount and no schedule-offs**.

### 11.5 Update payload

The vaccine itself cannot be changed on update. Always resend the original:

```
id                       = 9
serviceProviderBranchId  = 12          // original
vaccineId                = 3           // original
cost                     = 40
b2CPrice                 = 60
b2BPrice                 = 55
```

Update validates `cost`, `b2CPrice` and `b2BPrice` as integers `≥ 0`.

---

## 12. Branch lookups used by booking flows

These endpoints are used by other modules (company packages, wallet reservations,
public booking links) to find branches and free time slots.

### 12.1 Custom list — branches for a package or city

`GET Provider/ServiceProviderBranch/CustomList?`

| Param                            | Notes    |
| -------------------------------- | -------- |
| `CompanyPackageId`               |          |
| `CompanyPackageClassificationId` |          |
| `CityId`, `CountryId`            |          |
| `VaccineIds`                     | repeated |
| `ServiceGroupIds`                | repeated |

Returns `value.data` = `Branch[]` (§8.2).
The client groups the result by `serviceProviderId` into
`{ id, name: branch.serviceProvider, branches[] }` so the user picks a provider first,
then one of its branches.

### 12.2 Filtered list — branches by classification and location

`POST Provider/ServiceProviderBranch/FilteredList`, with form-data:

```
ClassificationId = 2
CountryId        = 14
CityId           = 12
```

Returns `Branch[]`. Some backend versions return `{ data: Branch[] }`; handle both.
Only call it when all three values are known.

### 12.3 Map list — lightweight branch markers

`GET Provider/ServiceProviderBranch/MapList?CityId={id}`

| Param              | Notes                                                  |
| ------------------ | ------------------------------------------------------ |
| `CityId`           | **required**                                           |
| `ClassificationId` | optional                                               |
| `ServiceGroupIds`  | repeated, optional                                     |
| `VaccinIds`        | repeated, optional. **Backend spelling: `VaccinIds`.** |

Returns an array (`null` → `[]`):

```ts
{
  id: number;
  isActive: boolean;
  name: string;
  serviceProviderId: number;
  serviceProviderName: string;
  latitude: number;
  longitude: number;
  icon?: string;    // relative media path
}[]
```

Rules used by the branch-finder:

- City always has a value. The default is city `12`, from the cities of country `14`.
- Free-text search is done **client-side** on `name` and `serviceProviderName`. It does
  not refetch.
- The vaccine filter is only offered when the user has `view:vaccine` (Service area). The
  vaccine options are scoped to the chosen city.

### 12.4 Slots for a company package on a date

`GET Provider/ServiceProviderBranchSlot/GetSlots?`

```
ServiceProviderBranchId={id}&DateChosen={date}&CompanyPackageId={id}&CompanyPackageClassificationId={id}&
```

Each parameter is optional. It returns **one** `Slot` (§9.2) for that date's weekday,
with the `slotTimes` that apply to that package. Times are UTC.

### 12.5 Weekly available slots for booking

`GET Provider/ServiceProviderBranchSlot/GetWeeklyAvailableTimeSlotsForBranch?serviceProviderBranch={branchId}`

Optional parameters: `&serviceGroupId={id}`, and `&vaccineId={id}` repeated.

```ts
{
  slotTimesGroupedByDay: {
    day: string;
    totalPrice: number;
    slotTimes: {
      slotTimeId: number;
      from: string;
      to: string;
      price: number;
      taxPrice: number;
      // service slot ⇒ these are set (vaccine fields null)
      serviceProviderBranchServiceId: number | null;
      serviceId: number | null;
      serviceName: string | null;
      serviceGroupId: number | null;
      serviceGroupName: string | null;
      // vaccine slot ⇒ these are set (service fields null)
      serviceProviderBranchVaccineId: number | null;
      vaccineId: number | null;
      vaccineName: string | null;
    }
    [];
  }
  [];
}
```

Booking flows call this once, then filter client-side by the weekday of the date the user
picks.

---

## 13. Provider Orders

Reservations (orders) served by a provider's branches. These endpoints live in the
`Reservation` service.

### 13.1 Endpoints

| Action                   | Method   | Path                                                                 | Body      | Returns              |
| ------------------------ | -------- | -------------------------------------------------------------------- | --------- | -------------------- |
| List (provider view)     | `GET`    | `Reservation/Reservation/ShortcutList?`                              | —         | Paged `Order[]`      |
| List (full)              | `GET`    | `Reservation/Reservation/List?`                                      | —         | Paged `Order[]`      |
| Details                  | `GET`    | `Reservation/Reservation/GetById?Id={id}`                            | —         | `ReservationDetails` |
| Change status            | `PUT`    | `Reservation/Reservation/UpdateStatus`                               | form-data | truthy               |
| Complete                 | `PUT`    | `Reservation/Reservation/UpdateStatusToComplete`                     | form-data | truthy               |
| Add result attachments   | `POST`   | `Reservation/Reservation/AddAttachment`                              | form-data | truthy               |
| Delete result attachment | `DELETE` | `Reservation/Reservation/DeleteAttachment?Id={id}&attachment={path}` | —         | truthy               |
| Service questions        | `GET`    | `Service/Service/QuestionsList?ServiceIds=1&ServiceIds=2`            | —         | question list        |

### 13.2 Provider order list query

The query string is built as:

```
[CompanyId={id}&]
[ServiceProviderId={id}&]                   // admins/company views only; never added for provider users
[ExcludedStatus=132&]                       // provider users only, when the filter didn't set it (Cancel + NoShow)
OrderDirection=false&OrderBy=CreatedAt&     // newest first
<list state + filters>
```

Provider users are scoped to their own provider by the backend, based on their token.

Filters:

| Param                                              | Notes                               |
| -------------------------------------------------- | ----------------------------------- |
| `phone`                                            |                                     |
| `ReservationDate`                                  |                                     |
| `CompanyId`, `CompanyBranchId`, `CompanyPackageId` |                                     |
| `Status`                                           |                                     |
| `ExcludedStatus`                                   | **sum** of the excluded status bits |
| `ServiceProviderId`                                |                                     |
| `from`, `to`                                       |                                     |
| `IdentityNumber`                                   |                                     |
| `isFit`                                            |                                     |
| `CityId`                                           |                                     |
| `RequestChannel`, `RequestFunding`                 |                                     |

### 13.3 Order shape (list item)

```ts
interface Order {
  id: string; // reservation id (string)
  status: number; // §2.3
  dateChosen: string; // appointment date (UTC)
  createdAt: string;
  acceptedDate?: string;
  serviceProviderBranchId: number;
  serviceProviderBranchName: string;
  serviceProviderBranchPhone: string;
  serviceProviderBranchLogo: string;
  latitude: number;
  longitude: number;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  identityNumber: string | null;
  createdByName: string;
  companyName: string;
  companyBranchId: number;
  companyBranchName: string;
  companyPackageCode: string;
  companyPackageRequestUserId: string;
  packageType: number;
  enrollmentType: number;
  channel: number;
  fundingType: number | null;
  requestFunding?: number | null;
  requestChannel?: number | null;
  cost: number;
  costTax: number; // provider cost and its tax
  sellPrice: number;
  sellPriceTax: number; // customer price and its tax
  isFit: boolean; // medical result: fit / unfit
  isClaimedByProvider: boolean; // already included in a ledger
  note: string | null;
  adminNotes: string | null;
  cancelationReason: string;
  rejectionReason: string;
  attachments: string[] | null;
  reservationServices: {
    id: number;
    services: {
      reservationServiceId: number;
      id: number;
      serviceName: string;
      from: string;
      to: string;
      sellPrice?: number;
      costPrice?: number;
      totalPrice?: number;
    }[];
    groupServices: {
      reservationServiceId: number;
      serviceGroupId: number;
      serviceGroupName: string;
      from: string;
      to: string;
      sellPrice: number;
      costPrice: number;
      services: {
        reservationServiceId: number;
        id: number;
        serviceName: string;
        from: string;
        to: string;
        sellPrice: number;
        costPrice: number;
      }[];
    }[];
  };
  reservationVaccines?:
    | {
        id: number;
        vaccineId: number;
        vaccineName?: string;
        slotTimeId: number;
        from?: string;
        to?: string;
        cost?: number;
        sellPrice?: number;
        serviceProviderBranchVaccineId?: number;
      }[]
    | null;
  reservationQuestionAnswers?: {
    id: string;
    question: string;
    answer: string;
  }[];
  statusLogs:
    | {
        id: number;
        status: number;
        createdBy: string;
        createdAt: string;
        reservationId: string;
      }[]
    | null;
}
```

`GetById` returns a similar `ReservationDetails` that also has `qualityCheck`, `cityId`,
`attachment`, `fullPathAttachments` and `govPlatLogs`. Note that its fit flag is spelled
`isfit`.

### 13.4 Order lifecycle and actions

```
New(1) → Accept(2) → CheckIn(16) → InProgress(32) → Complete(64)
                                      ↘ Delayed(256) ↗
Any status except Cancel/Reject → Cancel(4)
Reject(8), NoShow(128) are terminal side-exits
```

Actions available on an order:

| Action                        | Who                                                                    | Allowed when                                                          | Call                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Change status**             | Admin or Provider user with `change-status:company-orders`             | status ∈ New, Accept, CheckIn, InProgress                             | `PUT UpdateStatus`. The only targets offered here are **CheckIn** and **InProgress**. |
| **Complete**                  | Admin or Provider with `complete:company-orders`                       | status ∈ InProgress, Delayed                                          | `PUT UpdateStatusToComplete`                                                          |
| **Edit completed result**     | same as Complete                                                       | status = Complete                                                     | `POST AddAttachment` / `DELETE DeleteAttachment`                                      |
| **Cancel**                    | any user with `cancel:company-orders`                                  | status ∉ Cancel, Reject                                               | `PUT UpdateStatus` with `Status=4`                                                    |
| **Update vaccines**           | Admin or Provider with `update:order-vaccines` (company-extended area) | status ≠ Cancel **and** not yet claimed (`isClaimedByProvider=false`) | Handled by the Orders module                                                          |
| **Copy QR verification link** | anyone who can see the order                                           | always                                                                | `{appOrigin}/public/orderscantoverify/{orderId}/{langId}`                             |

**Change status payload**

```
Id                 = "<reservation id>"
Status             = 16 | 32 | 4 | 8
CancelationReson   = "…"     // required when Status = 4 (backend field is misspelled)
rejectionReason    = "…"     // required when Status = 8
```

**Complete payload**

```
Id                 = "<reservation id>"
Note               = "…"          // optional ("" if empty)
IsFit              = true | false
ReservationService[s].id                                            = <reservationServiceId>
ReservationService[s].reservationServiceAnswer[a].serviceQuestionId = 5
ReservationService[s].reservationServiceAnswer[a].answer            = "…"
ResultAttachments  = <file>       (repeat; at least one required)
```

How completion works:

- The questions to answer come from `Service/Service/QuestionsList` for the services on
  the reservation. Each question has `questionId`, `question`, `isRequired` and
  `serviceId`. The client maps each service back to its `reservationServiceId`, so each
  answer is grouped under the correct reservation service.
- Answers are required when the question's `isRequired` is true.
- **Result attachments are required to complete.**

**Edit a completed order**

- Add files: `POST AddAttachment` with `Id` and `ResultAttachments` (repeat).
- Remove a file: `DELETE DeleteAttachment?Id={id}&attachment={path}`.

---

## 14. Financial — claiming completed orders

A provider **claims** its completed, not-yet-claimed orders. Claiming creates a **ledger**
(§15).

### 14.1 Endpoints

| Action           | Method | Path                                                                                                  | Body      | Returns         |
| ---------------- | ------ | ----------------------------------------------------------------------------------------------------- | --------- | --------------- |
| Claimable orders | `GET`  | `Reservation/Reservation/List?isClaimedByProvider=false&Status=64[&ServiceProviderId={id}]&<filters>` | —         | Paged `Order[]` |
| Claim            | `PUT`  | `Reservation/Reservation/ClaimReservations?<context params>`                                          | form-data | truthy          |

**Claimable-orders filters:**

| Param                     | Notes    |
| ------------------------- | -------- |
| `serviceProviderBranchId` |          |
| `ServiceGroupIds`         | repeated |
| `ServiceIds`              | repeated |
| `OwnerId`                 |          |
| `From`, `To`              | UTC date |
| `Search`                  |          |

Company users also get `&CompanyBranchIds[0]=…&CompanyBranchIds[1]=…` for the company
branches they are assigned to. Provider users are **not** scoped to branches.

The Claim URL carries the current context query, for example `ServiceProviderId=4` or
`ServiceProviderBranchId=12`.

### 14.2 Claim payload

```
Ids[0]               = "<reservation id>"
Ids[1]               = "<reservation id>"
ClaimedFrom          = "2026-10-01T00:00:00.000Z"   // earliest dateChosen among selected orders
ClaimedTo            = "2026-10-31T00:00:00.000Z"   // latest  dateChosen among selected orders
Note                 = "…"                          // required
ClaimedAttachments   = <file>  (repeat, optional)
```

### 14.3 Rules

- Only orders with **Status = Complete** and **`isClaimedByProvider = false`** can be claimed.
- The user selects one or more orders. The claim summary shows:
  - **Cost** = sum of `cost`
  - **Sell price** = sum of `sellPrice`
  - The period = min / max `dateChosen` of the selection
- The list shows "cost with tax" as `cost + costTax`.
- A **note is required**.
- After a successful claim, the user is taken to the provider's ledgers, filtered to the
  claimed period.
- Once claimed, an order cannot be claimed again, and its vaccines can no longer be edited.

---

## 15. Ledgers

A ledger is one claim: a batch of orders submitted for payment.

### 15.1 Endpoints

| Action                   | Method | Path                                                                                    | Body                              | Returns                         |
| ------------------------ | ------ | --------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------- |
| List                     | `GET`  | `Reservation/Reservation/LedgerList?orderBy=claimedDate&orderDirection=false&<filters>` | —                                 | Paged `Ledger[]`                |
| Details                  | `GET`  | `Reservation/Reservation/LedgerDetailsGetById?Id={id}`                                  | —                                 | `LedgerDetails`                 |
| Add attachments          | `PUT`  | `Reservation/Reservation/UpdateLedgerAttachment?id={id}`                                | form-data: `Attachments` (repeat) | truthy                          |
| Update status            | `PUT`  | `Reservation/Reservation/UpdateLedgerStatus?Id={id}&Status={1\|2}`                      | —                                 | truthy                          |
| Set admin note           | `PUT`  | `Reservation/Reservation/UpdateLedgerAdminNote?Id={id}&AdminNote={urlencoded}`          | —                                 | truthy                          |
| Export to Excel          | `GET`  | `Reservation/Reservation/ExportLedgerToExcel?LedgerId={id}`                             | —                                 | **binary file** (blob)          |
| Download all attachments | `GET`  | `Reservation/Reservation/LedgerDownloadAttachments?id={id}`                             | —                                 | **binary file** (blob, archive) |

**List filters:** `ServiceProviderId`, `from`, `to`, `status` (§2.4).
Company users also get the company-branch scoping described in §14.1.

### 15.2 Response shapes

```ts
interface Ledger {
  id: number;
  serviceProviderName: string;
  claimedBy: string;
  claimedDate: string;
  claimedFrom: string;
  claimedTo: string;
  total: number;
  tax: number;
  status: 1 | 2; // UnPaid / Paid
  note: string; // provider's note from the claim
  adminNote: string | null; // platform admin's note
  attachment: string;
  ledgerOrders: {
    id: number;
    reservationId: string;
    orderId: number;
    serviceProviderLedgerId: number;
  }[];
}

interface LedgerDetails {
  id: number;
  claimedBy: string;
  claimedDate: string;
  note: string;
  attachment: string;
  cost: number;
  reservationIds: { orderId: number; reservationId: string }[];
  servicesCount: number;
  services: {
    serviceId: number;
    serviceName: string;
    count: number;
    cost: number;
    sellPrice: number;
  }[];
  serviceGroupsCount: number;
  serviceGroups: {
    serviceGroupId: number;
    serviceGroupName: string;
    count: number;
    cost: number;
    sellPrice: number;
    servicesCount: number;
    services: {
      serviceId: number;
      serviceName: string;
      count: number;
      cost: number;
      sellPrice: number;
    }[];
  }[];
  vaccinesCount: number;
  vaccines: {
    vaccineId: number;
    vaccineName: string;
    count: number;
    cost: number;
    sellPrice: number;
  }[];
}
```

### 15.3 Rules

- The list is sorted by claim date, newest first.
- Anyone who can view ledgers can:
  - add attachments
  - view the report (`LedgerDetails`: totals broken down by service, service group and vaccine)
  - export to Excel
  - download all attachments
- **Only Admin users** (`groupId = 1`) can change a ledger's status between **UnPaid** and **Paid**.
- Setting the **admin note** requires `update:service-provider-ledgers-admin-note`.
- Excel and attachment downloads are binary responses. Save them as files.

---

## 16. Permissions

Permissions are **bit flags per area**. The logged-in user has a `rolePermissions` list of
`{ type, permission }`, where `permission` is a (possibly very large) integer. A user has
a permission when `(BigInt(userPermission) & BigInt(required)) === BigInt(required)`.

> Use **BigInt** (or a 64-bit integer). Several flags are larger than 2^31, and some are
> close to 2^53.

### 16.1 Area ids

| Area                 | `type`                                                                   |
| -------------------- | ------------------------------------------------------------------------ |
| company              | `1`                                                                      |
| service              | `2`                                                                      |
| **service-provider** | `4`                                                                      |
| general-settings     | `8`                                                                      |
| sidebar              | `32`                                                                     |
| company-extended     | _(separate layer; holds `update:order-vaccines`, `view:order-vaccines`)_ |

### 16.2 `service-provider` area flags

| Permission                                   | Value          |
| -------------------------------------------- | -------------- |
| view:service-provider-category               | 1              |
| create:service-provider-category             | 2              |
| update:service-provider-category             | 4              |
| delete:service-provider-category             | 8              |
| view:service-provider-classification         | 16             |
| create:service-provider-classification       | 32             |
| update:service-provider-classification       | 64             |
| delete:service-provider-classification       | 128            |
| view:service-provider                        | 256            |
| create:service-provider                      | 512            |
| update:service-provider                      | 1024           |
| delete:service-provider                      | 2048           |
| view:service-provider-branch                 | 4096           |
| create:service-provider-branch               | 8192           |
| update:service-provider-branch               | 16384          |
| delete:service-provider-branch               | 32768          |
| view:branch-services                         | 65536          |
| create:branch-services                       | 131072         |
| update:branch-services                       | 262144         |
| delete:branch-services                       | 524288         |
| view:service-provider-users                  | 1048576        |
| create:service-provider-users                | 2097152        |
| update:service-provider-users                | 4194304        |
| delete:service-provider-users                | 8388608        |
| view:service-provider-financial              | 16777216       |
| view:service-provider-branch-slots           | 33554432       |
| view:service-provider-overview               | 67108864       |
| update:service-provider-overview             | 134217728      |
| create:service-provider-overview             | 268435456      |
| view:service-provider-settings               | 536870912      |
| update:service-provider-settings             | 1073741824     |
| create:service-provider-settings             | 2147483648     |
| view:service-provider-orders                 | 4294967296     |
| view:service-provider-ledgers                | 8589934592     |
| delete-attachment:service-provider-orders    | 17179869184    |
| view:branch-vaccines                         | 34359738368    |
| create:branch-vaccines                       | 68719476736    |
| update:branch-vaccines                       | 137438953472   |
| delete:branch-vaccines                       | 274877906944   |
| view:service-provider-branch-vaccine-slots   | 549755813888   |
| update:service-provider-branch-vaccine-slots | 1099511627776  |
| update:service-provider-ledgers-admin-note   | 2199023255552  |
| view:service-provider-attachments            | 4398046511104  |
| upload:service-provider-attachments          | 8796093022208  |
| delete:service-provider-attachments          | 17592186044416 |

### 16.3 Which permission gates what

| Capability                                      | Required                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Provider list / detail                          | `view:service-provider`                                                                          |
| Create / update / delete provider               | `create:` / `update:` / `delete:service-provider`                                                |
| Branch list, plus "branches" from a provider    | `view:service-provider-branch`                                                                   |
| Branch create / update / delete                 | `create:` / `update:` / `delete:service-provider-branch`                                         |
| Branch services list / create / update / delete | `view:` / `create:` / `update:` / `delete:branch-services`                                       |
| Choosing "Vaccine" in the add-offering flow     | `create:branch-vaccines`                                                                         |
| Branch vaccines list / create / update / delete | `view:` / `create:` / `update:` / `delete:branch-vaccines`                                       |
| Open a branch's slot schedule                   | `view:service-provider-branch-slots` **or** `view:service-provider-branch-vaccine-slots`         |
| See vaccine links on slot times                 | `view:service-provider-branch-vaccine-slots`                                                     |
| Change vaccine links on slot times              | `update:service-provider-branch-vaccine-slots`                                                   |
| Provider users                                  | `view:service-provider-users` (+ create / update / delete)                                       |
| Financial / claim                               | `view:service-provider-financial`                                                                |
| Provider orders                                 | `view:service-provider-orders`                                                                   |
| Ledgers                                         | `view:service-provider-ledgers`                                                                  |
| Ledger admin note                               | `update:service-provider-ledgers-admin-note`                                                     |
| Ledger status                                   | Admin user type (not a permission bit)                                                           |
| Attachments view / upload / delete              | `view:` / `upload:` / `delete:service-provider-attachments`                                      |
| Category / classification CRUD                  | `*:service-provider-category`, `*:service-provider-classification`                               |
| Order status / complete / cancel                | company area: `change-status:company-orders`, `complete:company-orders`, `cancel:company-orders` |
| Order vaccines                                  | company-extended area: `view:order-vaccines`, `update:order-vaccines`                            |
| Filter branch finder by vaccine                 | service area: `view:vaccine`                                                                     |

---

## 17. Provider account (profile) behaviour

A per-provider workspace, opened as `…/provider/account/<tab>?provider={providerId}`.

### 17.1 Loading the provider

- The provider id comes from the `provider` query parameter.
- The provider is loaded with `GET Provider/ServiceProvider/GetById?id={id}` only when:
  - the user is an **Admin**, or
  - the user's own `serviceProviderId` equals the requested id.

  Provider users can only open their own provider.

- Admins pick the provider from a provider list (§6.1 List). Choosing one sets
  `?provider={id}`.

### 17.2 Tabs

Each tab is shown only if its permission allows.

| Tab         | Content                                               | Permission                                       |
| ----------- | ----------------------------------------------------- | ------------------------------------------------ |
| Overview    | provider details                                      | `view:service-provider-overview`                 |
| Settings    | edit provider (§6.4), upload attachments              | `view:service-provider-settings`                 |
| Branches    | branch list scoped to this provider (§8)              | `view:service-provider-branch`                   |
| Users       | provider users (user type 3, scoped to this provider) | `view:service-provider-users`                    |
| Orders      | provider orders (§13)                                 | `view:service-provider-orders`                   |
| Tags        | provider tags                                         | `view:service-provider-orders`                   |
| Financial   | claimable orders and claim (§14)                      | `view:service-provider-financial`                |
| Ledgers     | ledgers (§15)                                         | `view:service-provider-ledgers`                  |
| FAQs        | provider FAQs                                         | company area `view:company`                      |
| Attachments | category folders (§7)                                 | `view:` or `upload:service-provider-attachments` |

---

## 18. Known quirks and bugs to avoid copying

These come from the current client. Copy the **contract**, not these behaviours.

1. **Provider delete always forces.** The first delete call already sends
   `forceDelete=true`, so the "has dependents" confirmation is effectively skipped.
   Use the standard two-step protocol (§1.5), as the other entities do.
2. **Closing-date / schedule-off diff key is wrong.** Dates are matched on
   `${getDay()}${getMonth()}${getFullYear()}`, where `getDay()` is the _weekday_, not the
   day of the month. Two different dates in the same month that fall on the same weekday
   collide. Match on the full `YYYY-MM-DD` instead.
3. **Create vs update numeric rules differ for branch services and vaccines.** Create
   accepts decimals for Cost and prices. Update requires integers. Pick one rule. Decimals
   are the sensible choice for money.
4. **B2C ≥ Cost is not re-checked on update** for branch services. Neither is B2C/B2B ≥
   Cost for vaccines. Enforce it on both create and update.
5. **Service-provider `CategoryId` is not validated on create**, although it is required
   on update. Treat it as required.
6. **Phone and VAT number are validated as integers.** This rejects `+966…` and numbers
   with leading zeros or spaces. Consider string validation with a pattern.
7. **Branch-service update sends a `null` string.** It sends
   `Services[0].id = String(services.id || null)` for groups, which can become the text
   `"null"`. Send `0` instead.
8. **Inconsistent field name in branch-service update (single service).** It sends
   `Services[0].serviceProviderServiceProviderBranchServiceId`. The group case uses
   `serviceProviderBranchServiceId`. The backend schema (`ServiceProviderBranchServiceServicesRequest`)
   only defines `id`, `serviceProviderBranchServiceId`, `serviceId`, `groupedId` and
   `isDeleted`. Use `serviceProviderBranchServiceId`.
9. **Backend spellings you must keep:**
   - `ServiceProviderClassfication` (path)
   - `DeleteSLotTime` (path)
   - `VaccinIds` (MapList param)
   - `CancelationReson` (form field)
   - `schaduleOffReasons` (response field)
   - `isfit` (details response field)
   - the duplicated `DeleteImage/DeleteImage` (provider image path)
10. **"Tags" tab permission.** The provider profile's Tags tab is gated by
    `view:service-provider-orders`, not a tags permission. That looks unintended.

---

### Appendix — backend request schemas (from the Provider Swagger)

These are the nested request types the `Provider` service declares. Top-level forms are
multipart, so only these nested shapes appear in the schema.

```ts
ServiceProviderTranslationRequest              { id; name; langId }
ServiceProviderTagsRequest                     { id; serviceProviderId; tagsId; isDeleted }
ServiceProviderScheduleOffRequest              { id; closingDate (date-time); isDeleted }
ServiceProviderBranchesTranslationRequest      { id; langId; serviceProviderBranchId; name; address }
ServiceProviderBranchTagsRequest               { id; serviceProviderBranchId; tagsId; isDeleted }
ServiceProviderCategoryTranslationRequest      { id; serviceProviderCategoryId; name; langId; description }
ServiceProviderClassficationTranslationRequest { id; serviceProviderClassificationId; name; langId; description }
ServiceProviderBranchServiceServicesRequest    { id; serviceProviderBranchServiceId; serviceId; groupedId (nullable); isDeleted }
ServiceProviderBranchServiceScheduleOffRequest { id; serviceProviderBranchServiceId; date (date-time); isDeleted }
ServiceProviderBranchSlotRequest               { id; serviceProviderBranchId; day; maxOccupancyPerDay; times[] }
ServiceProviderBranchSlotTimesRequest          { id; from (time-span); to (time-span); services[] }
ServiceProviderBranchSlotServicesRequest       { id; serviceProviderBranchServiceId; isDeleted }
```

All ids are `int32`. Every field is optional in the schema; the required fields are the
ones listed in the validation rules above.
