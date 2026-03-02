# Infrastructure Brain

**Document Version:** 1.2.0  
**Last Updated:** March 3, 2026

> **Note:** This document version should be incremented each time the file is updated:
> - **Major version** (X.0.0) — significant structural changes or major additions
> - **Minor version** (0.X.0) — new sections, important clarifications, or feature documentation
> - **Patch version** (0.0.X) — minor corrections, typos, or small improvements

---

## Overview

This is a **Node.js/Express API server infrastructure** (infra version 3.8.18) designed as a reusable foundation for building API servers. It uses **MySQL** as its database (via `mysql2`), employs a global-variable-based module system with `$`-prefixed globals, and follows a convention-over-configuration pattern for defining and implementing APIs.

The infrastructure runs two Express servers via PM2:
- **Main API server** (`backend/api/server.js`) — handles all API calls, tool UIs, and file serving
- **Files server** (`backend/api/files.js`) — dedicated file serving (can run on a separate port)
- **Cron jobs** — background tasks (e.g., `cron_remove_logs.js`)

---

## Directory Structure

```
doseon_server/
├── backend/
│   ├── api/                        # Express server entry points and tool UIs
│   │   ├── server.js               # Main API server (Express app, routes, session init)
│   │   ├── files.js                # Dedicated file-serving server
│   │   ├── main.js                 # Core API dispatcher (parses request, validates, routes to funcs)
│   │   ├── apiclient.js            # Built-in API testing client UI
│   │   ├── logtail.js              # Live log viewer UI
│   │   ├── log_analyzer.js         # Log analysis UI
│   │   ├── socket_viewer.js        # WebSocket connections viewer UI
│   │   ├── otp_viewer.js           # OTP debug viewer UI
│   │   ├── system_login.js         # System login page
│   │   ├── restore_password.js     # Password restore page
│   │   └── onelink.js              # Deep-link / universal link handler
│   │
│   ├── content/                    # User-generated content storage
│   │   ├── files/                  # Uploaded files
│   │   ├── media/                  # Media files (images, etc.)
│   │   └── temp/                   # Temporary files (multipart uploads, etc.)
│   │
│   ├── platform/                   # Core infrastructure code
│   │   ├── api/                    # API definitions (structure/schema)
│   │   ├── funcs/                  # API implementations (business logic)
│   │   ├── infra/                  # Infrastructure modules (core engine)
│   │   ├── config/                 # Configuration files
│   │   ├── data/                   # Static data files (JSON)
│   │   ├── definitions/            # Constants, error codes, user types/roles
│   │   ├── email_teplates/         # Email HTML templates
│   │   ├── jobs/                   # Background job templates and implementations
│   │   ├── system_modules/         # Optional plug-in modules (system-level)
│   │   └── user_modules/           # Custom project-specific modules (user-level)
│   │
│   ├── public/                     # Static public files (JS client libraries)
│   │   ├── jsapi.js                # Dynamic JS API client generator
│   │   ├── rest-base.js            # REST base client
│   │   ├── apiclient-control.js    # API client UI controller
│   │   ├── jquery-1.8.2.mini.js    # jQuery
│   │   └── jquery.cookie.js        # jQuery cookie plugin
│   │
│   └── runtime/                    # Runtime-generated data
│       ├── cache/                  # File-system cache (token/user caching)
│       ├── key_value_sets/         # Persistent key-value JSON storage
│       └── log/                    # Log files (daily rotation)
│
├── db/
│   ├── db.sql                      # Database schema
│   └── create_triggers.js          # DB trigger generation script
│
├── tools/                          # Developer tools
├── ecosystem.config.js             # PM2 process manager configuration
├── package.json                    # Node.js dependencies
└── Known_Issues.txt                # Known issues tracker
```

---

## API Module Pattern (api + funcs Pairs)

Each API set is defined by **two files with the same name** in different folders:

| API Definition (schema) | API Implementation (logic) |
|---|---|
| `platform/api/user.js` | `platform/funcs/user.js` |
| `platform/api/system.js` | `platform/funcs/system.js` |
| `platform/api/file.js` | `platform/funcs/file.js` |
| `platform/api/social_login.js` | `platform/funcs/social_login.js` |
| `platform/api/two_factor_auth.js` | `platform/funcs/two_factor_auth.js` |
| `platform/api/user_role.js` | `platform/funcs/user_role.js` |

### API Definition File (api/)

Each file exports an object where **keys are method names** and **values are parameter schema objects**:

```js
module.exports = {
    "method_name": {
        "@acl":              [...],       // Access control list (which user types can call this)
        "@acl_decline":      [...],       // User types explicitly denied (checked after @acl passes)
        "@doc":              "...",       // HTML string description for API docs. Use \\\" for quotes inside JSON examples
        "@mode":             "...",       // Modes: "off", "test", "superuser", "deprecated", "unlogged" (comma-separated)
        "@protected":        "...",       // Comma-sep param names to mask in logs (legacy)
        "@protected_request": "...",      // Param names to mask in request logs
        "@protected_response": "...",     // Param names to mask in response logs
        "@truncated_request": "...",      // Param names to truncate in request logs (e.g. base64 file data)
        "@truncated_response": "...",     // Param names to truncate in response logs
        "@accept_x_token":   "...",       // "no" / "yes" / "only" — X-tokens are tokens starting with 'X', used for limited-access scenarios (e.g. allowing a user with an expired password to call the change-password API but not other APIs)
        "@api_group":        "...",       // Override auto-generated API group name (for API client UI)
        "#token":            "s",         // Special: user authentication token
        "#passcode":         "s",         // Special: open API passcode
        "param_name":        "type",      // Required param: "s" (string), "i" (int), "d" (decimal), "b" (boolean), "a" (array of strings), "n" (array of numbers)
        "optional_param":    "o:s:default_value***description", // Optional param with default and docs
        "array_param":       { ... },     // Nested object/array parameter (becomes array of objects)
        "&server_param":     "type",      // Server-injected param (& prefix stripped; client doesn't send this)
    },
};
```

**@acl — Access Control List:**

The `@acl` property defines which user types can call the API method. It takes an array of user type IDs.

User types are defined in `platform/definitions/user_types.js`:

| Constant | Value | Name |
|---|---|---|
| `USER_TYPE_NA` | 0 | n/a (system/null user) |
| `USER_TYPE_ADMIN` | 1 | admin |
| `USER_TYPE_REGULAR` | 2 | regular |

These are registered as both `$ACL.USER_TYPE_*` (for ACL arrays) and `$Const.USER_TYPE_*` (for code logic).

Common ACL patterns:
```js
// Only regular (mobile app) users
"@acl": [$ACL.USER_TYPE_REGULAR],

// Only admins
"@acl": [$ACL.USER_TYPE_ADMIN],

// All authenticated user types (excludes USER_TYPE_NA)
"@acl": $Utils.allAuthedUserTypes(),

// All authenticated except specific types
"@acl": $Utils.allAuthedUserTypesExcluding([$ACL.USER_TYPE_ADMIN]),
```

Helper functions (from `$Utils`):
- `allAuthedUserTypes(excludeArr?)` — returns all user type IDs except `USER_TYPE_NA`
- `allAuthedUserTypesExcluding(excludeArr)` — alias for `allAuthedUserTypes(excludeArr)`
- `allUserTypes(excludeArr?)` — returns all user type IDs including `USER_TYPE_NA`

User types also support **roles** (defined in `platform/definitions/user_roles.js`). Each user type has default roles, and individual users can have additional allow/deny role overrides stored as bitmasks.

**Parameter type codes:**
- `s` — string (trimmed on input)
- `i` — integer (cast via `Number()`)
- `d` — decimal (cast via `Number()`)
- `b` — boolean
- `a` — array of strings
- `n` — array of numbers (values cast to Number)
- `o:TYPE:DEFAULT` — optional parameter with type and default value (e.g. `o:s:`, `o:i:0`, `o:b:true`, `o:n:0`)
- `***` separator — everything after is documentation text for the API client
- `{ ... }` — nested object/array parameter (if param missing, defaults to empty array `[]`)

**Special parameter prefixes:**
- `#token` — user authentication token, validated via `TokenValidator`
- `#passcode` — open API passcode, validated against config
- `&param` — server-injected parameter; the `&` prefix is stripped and the parameter is not expected from the client
- `#user_id` — built-in admin impersonation; if sent by an admin user, the session impersonates that user via `session.impersonateAccount()`

**API doc helper functions (for use in `***` descriptions):**
- `$Utils.getUserTypesForDoc(typeArr)` — generates HTML doc string listing user type names
- `$Utils.getUserRolesListForApiDoc()` — generates HTML doc string listing roles
- `$DataItems.getListForApiDoc(dataTable)` — generates HTML doc string listing data items as `"id\t= Name<br/>"`

### API Implementation File (funcs/)

Each file exports a **class** where method names match the API definition keys. Parameters are injected as `this.$param_name` properties, and session is available as `this.$Session`:

```js
module.exports = class {
    constructor(session = null) {
        if (session !== null) { this.$Session = session; }

        // Register data item constants at module load time (optional)
        $DataItems.define("some_data_table");
    }

    method_name() {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        // Business logic using this.$param_name, $Db, $Utils, etc.
        // Access session via this.$Session (userId, userType, userLang, etc.)

        return {...rc, ...vals};  // Standard response pattern
    }
};
```

**Key conventions in funcs implementations:**
- Early return for validation: `if (condition) return $ERRS.ERR_SOME_ERROR;`
- Transactions wrap multi-table writes: `$Db.beginTransaction()` → queries → `$Db.commitTransaction()` (rollback on any error)
- **⚠️ CRITICAL: Soft deletion** - **NEVER use `DELETE FROM`** except for cache/queue/temp tables. Use `UPDATE ... SET *_DELETED_ON=? WHERE ...` with `$Utils.now()`. All queries must filter `WHERE *_DELETED_ON IS NULL`. See "Soft Deletion Conventions (Detailed)" section below for complete checklist.
- Paginated list queries: separate count query + data query with `LIMIT/OFFSET`, returning `{num_of_pages, num_of_items, items: [...]}`
- User module delegation: funcs often delegate to user modules instantiated with userId: `new $SomeModule(this.$Session.userId).someMethod(...)`
- Internal API calls: `$executeAPI(this.$Session, "ModuleName/method_name", {param: value})` to call another API internally without HTTP
- Account impersonation tracking: `this.$Session.getAccountImpersonationTopParent().userId` to get the original (non-impersonated) user

### Which APIs Are Active

Controlled by `platform/config/using_api.js`:
```js
module.exports = [
    "file",
    "social_login",
    "system",
    "user",
    "user_role",
    // "two_factor_auth"  — auto-added if config "use_2factor_auth" is true
];
```

---

## Core Data Flow

### 1. Request Lifecycle

```
Client POST /api  →  server.js (Express)
    → getRawBody (parse raw body)
    → initSession (creates Session, sets $HttpContext)
    → main.js:run()
        → api.js:init() — loads API definitions from platform/api/*.js
        → Parse "#request" field (format: "ModuleName/method_name")
        → Look up API definition in $API[ModuleName][method_name]
        → Log request (with protected/truncated param handling)
        → Check @mode (off, deprecated, test, superuser, unlogged)
        → Extract and validate all parameters against schema
        → Validate #token via TokenValidator (if required)
        → Check @acl (user type + role-based access control)
        → Check #passcode (if required)
        → Instantiate funcs class: new $ModuleName()
        → Inject parameters as this.$param_name
        → Call method: apiModule[method_name]()
        → Return JSON response {rc, message, ...data}
    → session.closeDbAndEchoJsonEncode(response)
        → Log response
        → Send JSON to client
        → Release DB connection
```

### 2. Session Management

The `Session` class (`infra/session.js`) is created per-request and stored in `$HttpContext`:
- Holds: `userId`, `userType`, `userLang`, `userRoles`, `token`, DB connection (`_dbConn`)
- **TokenValidator** validates user tokens against DB or cache (3 cache modes: none, db mem table, file system)
- Supports **impersonation** (`impersonate(userId)` / `unimpersonate()`)
- Auto-destroyed on response `finish`/`close` events

**Impersonation system:**
- **Admin impersonation** (`#user_id`): Admin users can impersonate any user. Handled automatically in `main.js` when `#user_id` parameter is present. Modifies `session.userId` and `session.userType` so business logic operates transparently as the impersonated user.

### 3. Database Access

`$Db` (`infra/database.js`) wraps `mysql2/promise` with connection pooling:
- Uses `deasync` to provide **synchronous API** over async MySQL operations
- Connection per session (lazy-initialized on first query)
- Nested transactions with reference counting (`beginTransaction` / `commitTransaction` / `rollbackTransaction`)
- `executeQuery(sql, params)` — standard parameterized query, returns array of row objects
- `executeMdQuery(sql, params, pkFields, detailsName)` — master-detail JOIN query parser (M_ and D_ prefixed aliases)
- Result accessors: `result()`, `insertId()`, `lastError()`, `lastErrorMsg()`, `isError()`, `isDuplicateEntryError()`, `affectedRows()`

**Common DB usage patterns in funcs:**
```js
// Standard query — returns array of row objects
let rows = $Db.executeQuery(`SELECT * FROM \`table\` WHERE COL=?`, [value]);

// Insert and get ID
$Db.executeQuery(`INSERT INTO \`table\` (COL_A, COL_B) VALUES (?, ?)`, [a, b]);
if ($Db.isError()) return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
let newId = $Db.insertId();

// Transaction pattern (rollback on any error)
$Db.beginTransaction();
$Db.executeQuery(...);
if ($Db.isError()) { $Db.rollbackTransaction(); return $Err.DBError(...); }
$Db.executeQuery(...);
if ($Db.isError()) { $Db.rollbackTransaction(); return $Err.DBError(...); }
$Db.commitTransaction();

// IN clause via Array.toPlaceholders() (infrastructure prototype extension)
let ids = [1, 2, 3];
$Db.executeQuery(`SELECT * FROM \`table\` WHERE ID in (${ids.toPlaceholders()})`, ids);

// Master-detail query — groups JOINed rows by master PK
// Column aliases must be prefixed: M_ for master, D_ for detail
let result = $Db.executeMdQuery(
    `SELECT m.ID M_id, m.NAME M_name, d.ITEM D_item FROM master m JOIN detail d ON ...`,
    params, ["M_id"], "details"
);
// Returns: [{id, name, details: [{item}, ...]}, ...]
```

**SQL conventions:**
- Table names wrapped in backticks: `` \`table_name\` `` (handles reserved words like `case`, `event`, `user`)
- Column prefixes follow table abbreviation: `USR_` for `user`, `ENT_` for `entity`, `CAS_` for `case`, etc.
- **Table aliases:** Don't use table aliases if not needed. Since all columns have unique prefixes (e.g., `MTK_`, `MED_`), aliases are unnecessary even in JOINs. Only use aliases when absolutely required for disambiguation.
- Use `JOIN` instead of `INNER JOIN`, and `LEFT OUTER JOIN` instead of `LEFT JOIN`
- Indent JOINs on a new line, one tab more than the `FROM` clause
- Don't use `AS` keyword for table or column aliases
- Soft deletion: `*_DELETED_ON` timestamp column (null = active); queries filter with `WHERE *_DELETED_ON is null`
- Timestamps: `*_CREATED_ON`, `*_LAST_UPDATE`, `*_DELETED_ON` — all set via `$Utils.now()`
- JSON columns: stored as JSON strings, parsed/stringified in code (e.g. `JSON.parse(row.JSON_COL)`, `JSON.stringify(arr)`)

### 4. Authentication Flow

```
Login → Validate credentials → (Optional 2FA) → Generate token → Store in DB
    ↓
API Call with #token → TokenValidator.isValidToken()
    → Check cache (mode 0: none, 1: db mem table, 2: file system)
    → If not cached: query `user` table by token
    → Validate status, expiry
    → Populate session: userId, userType, userLang, roles
    → Update last access (with configurable interval)
    ↓
ACL Check → @acl array vs session.userType → Role-based check if needed
```

**Authentication methods supported:**
- Email + password login
- Phone OTP login (SMS verification)
- Email OTP login
- Social login (Facebook, Google, Apple)
- Two-factor authentication (OTP after password)
- Auth grants (persistent login tokens)
- System login (separate admin authentication)

---

## Infrastructure Modules (infra/)

### $Utils (`infra/utils.js`) — ~2174 lines, 100+ functions

The largest and most central utility module. Provides:

**PHP-Compatible Functions:**
- `isset(prop)` — checks if property is defined
- `empty(mixedVar)` — checks for empty/null/undefined/0/""/[]
- `isObject(obj)`, `isString(str)` — type checks
- `fileGetContents(fileName)` — synchronous file read
- `unlink(fileName)` — file deletion
- `arrayCombine(arr1, arr2)` — zip two arrays into key-value object
- `arrayCompare(a1, a2)` — element-by-element comparison
- `inArray(needle, haystack)` — search in array
- `arrayValues(arrayObj)` — extract values from object
- `deleteFromArray(needle, haystack)` — remove element
- `strFormat(pattern, ...args)` — string formatting with `{0}`, `{1}` placeholders
- `clone(obj)` — deep clone
- `arraySearch(needle, haystack)` — search with strict mode
- `base64Encode(content)`, `base64Decode(string)` — base64 operations
- `urlGet(url)` — synchronous HTTP GET
- `deg2rad(degrees)`, `round(num, precision)` — math utilities
- `sleep(timeMs)` — synchronous sleep (via deasync)
- `escapeHtml(text)` — HTML entity escaping

**Security & Hashing:**
- `hash(string)` — SHA-256 hash with salt
- `uniqueHash()` — UUID v4 based unique hash
- `simpleUniqueHash()` — shorter unique hash
- `getRandomCode(numOfChars)` — random code generator
- `isCorrectPwd(userId, inputPwd, dbPwd)` — password verification
- `isValidPassword(password)` — password criteria validation
- `isMyIpAuthorized(ipList)` — IP-based access control

**User & Role Management:**
- `allAuthedUserTypes()` — all authenticated user types (for ACL)
- `allUserTypes()` — all user types including NA
- `getUserTypesList()`, `getUserRolesList()` — human-readable lists
- `getCalculatedUserRoles(userType, allow, deny)` — bitmask-based role calculation
- `bitsToArray(bits)`, `arrayToBits(arr)` — bitmask conversions
- `getUserType(userId)` — look up user type from DB

**Date & Time:**
- `now()` — current datetime string in DB format
- `validateDateStr(dateStr)` — validate date string format
- `validateTimeString(timeString)`, `parseTimeString()` — time parsing
- `formatDateObjectToDbFormat(date)` — format JS Date to DB format

**File & Image Helpers:**
- `saveImagesList(...)`, `parseImagesList(...)` — batch image management
- `saveNewImageOrKeepOld(...)` — conditional image save
- `saveFilesList(...)`, `parseFilesList(...)` — batch file management

**Communication:**
- `sendSystemErrorEmail(title, message)` — admin error email
- `sendSystemErrorSMS(message)` — admin error SMS
- `callAPI(serverUrl, params)` — internal API call
- `callAsyncAPI(params)` — fire-and-forget API call
- `makeHttpRequest(url, method, params)` — general HTTP request

**Data Utilities:**
- `commaSepListToArray(list)` — comma-separated to array
- `commaSepDataItemsToArray(list, dataTable)` — data item resolution
- `makeArrayUnique(arr)`, `compareArrays(arr1, arr2)` — array operations
- `filterObject(obj, allowedProps)` — object property filtering
- `castArrayToNumbers(arr)`, `castArrayToStrings(arr)` — type casting
- `sortObjectByValue(obj, sortFunc)` — object sorting
- `createAcronym(name)` — create acronym from name

**Phone & Email:**
- `formatPhone(phoneNum)` — phone formatting
- `validatePhone(phoneNum)` — phone validation
- `makeIntlPhoneNum(obj, phoneField, countryCodeField)` — international format
- `validateEmail(email)` — email validation
- `getObscuredPhone(phone)`, `getObscuredEmail(email)` — privacy masking

**Geo:**
- `calculateCentroid(polygon)` — polygon centroid
- `isPointInPolygon(point, polygon)` — point-in-polygon test

**Cron:**
- `createCron(options, actionFunc)` — cron job creation (supports interval or expression)

### $Date (`infra/date.js`) — Date class

A PHP-style date class, much simpler than native JavaScript Date:

**Construction:**
- `new $Date()` — current date/time
- `new $Date("2024-01-15")` — from date string
- `new $Date("2024-01-15 10:30:00")` — from datetime string
- `new $Date(1705312200)` — from Unix timestamp (seconds)

**Formatting (PHP-style format specifiers):**
- `format("Y-m-d H:i:s")` — `2024-01-15 10:30:00` (default format)
- `Y` — 4-digit year, `y` — 2-digit year
- `m` — zero-padded month, `n` — month without padding
- `F` — full month name, `M` — short month name
- `d` — zero-padded day, `j` — day without padding
- `H` — 24h hour, `h` — 12h hour, `G`/`g` — without padding
- `i` — minutes, `s` — seconds, `z` — milliseconds
- `a`/`A` — am/pm, `D` — short day name, `l` — full day name
- `S` — ordinal suffix (st/nd/rd/th), `w` — day of week number
- `t` — days in month, `L` — leap year flag, `e` — timezone name

**Arithmetic (chainable):**
- `addSeconds(n)`, `addMinutes(n)`, `addHours(n)`, `addDays(n)`, `addMonths(n)`, `addYears(n)`

**Time Manipulation:**
- `setTime(time)`, `setTimeOfDay(time)` — set time portion
- `resetSeconds()`, `resetMinutes()`, `resetHours()` — zero out time parts

**Comparison & Calculation:**
- `diff(toDate)` — difference in seconds
- `getTimeAgo()` — human-readable relative time ("5 minutes ago", "2 days from now")
- `getAge()` — calculate age in years from birth date
- `getTimestamp(withMs)` — Unix timestamp

**Range:**
- `getMonthStart()`, `getMonthEnd()` — month boundaries

**Timezone:**
- `setTimeZone(tz)`, `getTimeZone()` — timezone conversion

**Other:**
- `clone()` — create a copy
- `isValid()` — check if constructed date is valid

### $Db (`infra/database.js`) — Database

MySQL connection pool with synchronous wrapper. See "Database Access" in Data Flow section above.

### $Logger (`infra/logger.js`) — Logging

Dual logging: **file-based** (daily rotating `.log` files) and **database** (`log` table):
- `logRequest(json, isRequest)` — log API request/response with protected param handling
- `logString(type, string)` — log at specific level (ERROR, WARNING, INFO, DEBUG, PROJECT)
- `queueString(type, string)` — queue log for batch DB insert (for use inside DB operations)
- `debug(string)` — write to `debug_log` table (separate from main log)
- `markCrashesAndErrors()` — detect crashes (requests without responses) and mark in DB
- `reportCrashes()`, `reportErrors()` — send email/SMS alerts for crashes and errors

**Log levels (bitmask):** `LL_REQUEST` (0x01), `LL_RESPONSE` (0x02), `LL_ERROR` (0x04), `LL_WARNING` (0x08), `LL_INFO` (0x10), `LL_DEBUG` (0x20), `LL_PROJECT` (0x40)

**Log level constants are accessed via `$Const`, not `$Logger`:**
```js
// Correct usage
$Logger.logString($Const.LL_ERROR, "Error message");
$Logger.logString($Const.LL_WARNING, "Warning message");
$Logger.logString($Const.LL_INFO, "Info message");
$Logger.logString($Const.LL_DEBUG, "Debug message");
$Logger.logString($Const.LL_PROJECT, "Project-specific log");

// Incorrect - do NOT use $Logger.ERROR, $Logger.INFO, etc.
```

### $Config (`infra/config_funcs.js`) — Configuration

Multi-layer configuration system:
1. `config.js` — main config (public defaults)
2. `.config.js` — private config (secrets, overrides) — **not committed to git**
3. `runtime_config.js` — runtime-only config
4. `environments.js` — domain-to-environment mapping
5. Environment-specific overrides: `{env}.config.js` / `.{env}.config.js`

**Security convention:** Keys prefixed with `#` contain secrets. In `config.js`, these must be placeholder strings like `"{some description}"`. Real values go in `.config.js`. The system validates this on startup and shuts down if secrets are exposed in public config.

Access: `$Config.get("key")` or `$Config.get("key", "subkey")` — auto-resolves `#`-prefixed keys.

### $Files (`infra/files.js`) — File Management

Comprehensive file handling:
- `saveFile()`, `saveFileFromBase64()` — file saving with access control
- `deleteFileInContainer()` — file deletion
- File access levels: `public`, `protected` (authed users), `limited` (authed + timeout), `private` (owner + timeout)
- `$Files.SQL` class — helper for building file JOIN queries
- `$Files.Server` — Express route handlers for serving files:
  - `/files/n/:filename` — direct file by name (no auth)
  - `/files/a/:filedata` — authenticated file access (with cipher)
  - `/download/:filedata` — file download
- Multipart upload support (begin, upload parts, end, abort)
- Optional S3 integration (via `$Aws`)

**`$Files.SQL` helper class** — used to join file metadata into queries:
```js
const filesSql = new $Files.SQL("FILE_ID_COLUMN");  // column name in source table that holds the file ID
const rows = $Db.executeQuery(`SELECT col_a, col_b, ${filesSql.select()}
                                FROM \`source_table\`
                                    ${filesSql.join(false)}
                                WHERE ...`, params);
rows.forEach(row => {
    row.file_url = $Files.getUrl(filesSql.get(row));
});
```
This pattern avoids manually joining the `file` table and handling URL generation — the SQL helper generates the SELECT fields, JOIN clause, and URL extraction.

### $Cache (`infra/cache.js`) — File-System Cache

Simple file-based key-value cache for token/user caching:
- `put(table, key, dataArr)` — write cache entry
- `get(table, key)` — read cache entry
- `delete(table, key)` — delete cache entry
- `truncate(table)` — clear all entries for a table
- Cache tables defined in `config/cache_tables.js`

### $Imaging (`infra/imaging.js`) — Image Processing

Built on `sharp` library:
- Create images from scratch or from file/buffer
- Resize, crop, copy, composite operations
- Format conversion (JPEG, PNG, etc.)
- Avatar generation
- Pixel-level manipulation (`setPixelsToColor`)
- Used for dynamic favicon generation per tool UI

### $DataItems (`infra/data_items.js`) — Static Data Tables

JSON-based data table manager for lookup/enum data. Data tables are JSON files stored in `platform/data/`.

**JSON file format** (e.g. `platform/data/medication_type.json`):
```json
{
    "pill":        {"name": {"en": "Pill"},        "define": "MED_TYPE_PILL" },
    "liquid":      {"name": {"en": "Liquid"},      "define": "MED_TYPE_LIQUID" },
    "injection":   {"name": {"en": "Injection"},   "define": "MED_TYPE_INJECTION" },
    "other":       {"name": {"en": "Other"},       "define": "MED_TYPE_OTHER" }
}
```
- Keys are the item IDs (can be strings or numeric strings)
- `name` is required, keyed by language code (e.g. `"en"`, `"he"`) for multi-language support
- `define` is optional — used by `define(table)` to register IDs as global `$Const` constants
- Additional custom attributes can be added to each item (e.g. `"optional_property": "value"`)

**Loading & Caching:**
- Tables are loaded on first access from `platform/data/{tableName}.json`
- Cached in memory (`_dataTablesData`) after first load
- Session-scoped caching supported for dynamic tables (`cache: "session"`)
- `clearCache(dataTable)` — force reload on next access
- If a table has `"dynamic": true`, it delegates to `$DynamicDataTables` for runtime generation

**Core API:**

| Method | Description |
|---|---|
| `isValidItemId(dataId, dataTable)` | Check if an ID exists in the table. Use for input validation. |
| `getItemName(dataId, dataTable, lang?)` | Get the localized name of an item |
| `getItem(dataId, dataTable, lang?)` | Get the full item object (with name resolved to single language) |
| `getList(dataTable, lang?, filterAttrs?)` | Get `{id: name}` map, optionally filtered by attribute values |
| `getListExcluding(dataTable, excludeIdsArr, lang?)` | Get list excluding specific IDs |
| `getListOfIds(dataTable)` | Get array of all item IDs |
| `getAttributedList(dataTable, attrsList, ...)` | Get items with specific attributes included |
| `getKeys(dataTable)` | Get array of all keys |
| `getNamesListAsJson(dataTable, lang?)` | Get `{id: name}` map as JSON string |
| `getListForApiDoc(dataTable, excludeByDefineArr?)` | Generate formatted HTML string for API docs (`"id\t= Name<br/>"`) |
| `getItemAttr(dataId, dataTable, attr)` | Get a specific attribute value from an item |
| `getItemIdByAttr(attrName, attrVal, dataTable)` | Find first item ID matching an attribute value |
| `filterItemsIdByAttr(attrName, attrVal, dataTable)` | Get all items matching an attribute value |
| `validateList(dataList, dataTable, forceUnique?)` | Validate a comma-separated string or array of IDs against the table |
| `search(searchString, dataTable, lang?)` | Text search item names, returns matching IDs |
| `count(dataTable)` | Count items in the table |
| `getString(dataId, lang?)` | Get string from the special `translation_strings` table |
| `define(dataTable)` | Register all items with `define` property as `$Const[define] = id` |

**Common usage patterns:**

Validation in API implementation (`platform/funcs/`):
```js
if (!$DataItems.isValidItemId(this.$medication_type, "medication_type"))
{
    return $ERRS.ERR_INVALID_MEDICATION_TYPE;
}
```

Auto-generated API doc descriptions in schema (`platform/api/`):
```js
"medication_type": "s***" + $DataItems.getListForApiDoc("medication_type"),
```

Registering constants (typically at startup):
```js
$DataItems.define("medication_type");
// Now $Const.MED_TYPE_PILL === "pill", etc.
```

### $Err (`infra/error.js`) — Error Handling

Error code management:
- `$ERRS` — global error codes object loaded from `definitions/errorcodes.{lang}.js`
- `$Err.isERR(response)` — check if response is an error (rc != 0)
- `$Err.err("ERR_NAME")` — get error by name (cloned)
- `$Err.errWithInfo("ERR_NAME", info)` — error with additional info
- `$Err.DBError("ERR_NAME", cause)` — DB-specific error with logging

**Standard response pattern:** `{rc: 0, message: "success", ...data}` — rc=0 means success.

**Error codes file:** `platform/definitions/errorcodes.en.js`

Each error is defined as: `"ERR_NAME": {"rc": <number>, "message": "<description>"}`

**Built-in error code ranges:**

| RC Range | Category | Examples |
|---|---|---|
| 0–2 | General | `ERR_SUCCESS` (0), `ERR_UNKNOWN_ERROR` (1), `ERR_API_CRASH` (2) |
| 100–112 | API | `ERR_INVALID_API_CALL` (101), `ERR_MISSING_API_PARAM` (102), `ERR_NO_PRIVILEGES` (103), `ERR_INVALID_API_PARAM` (105) |
| 201–251 | User/Auth | `ERR_INVALID_USER_TOKEN` (201), `ERR_USER_NOT_FOUND` (202), `ERR_USER_ALREADY_EXISTS` (204) |
| 301–305 | Image | `ERR_IMAGE_NOT_FOUND` (301), `ERR_INVALID_UPLOADED_IMAGE` (302) |
| 321–332 | File | `ERR_FILE_NOT_FOUND` (321), `ERR_INVALID_FILE_TYPE` (324) |
| 341–346 | S3 | `ERR_S3_FAILED_TO_SAVE_FILE` (341) |
| 361–372 | Services | `ERR_FAILED_TO_SEND_SMS` (361), `ERR_FAILED_TO_SEND_EMAIL` (364) |
| 400–407 | DB | `ERR_DB_GENERAL_ERROR` (400), `ERR_DB_INSERT_ERROR` (401), `ERR_DB_UPDATE_ERROR` (402) |
| 450–454 | Cache | `ERR_CACHE_GENERAL_ERROR` (450) |
| 500+ | **Project-specific** | Reserved for application-specific errors |

**Adding project-specific error codes:**
- Add under the `// Content` section at the end of `errorcodes.en.js`
- RC values start at 500 and increment sequentially
- Use descriptive, specific names (e.g. `ERR_INVALID_MEDICATION_TYPE` not `ERR_INVALID_PARAMETER`)
- Each validation case should have its own error code for clear client-side error handling

**Usage in API implementations:**
```js
// Return error directly (validation failures)
return $ERRS.ERR_INVALID_MEDICATION_TYPE;

// DB errors with logging
return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());

// Check if a response is an error
if ($Err.isERR(result)) { ... }
```

### $CountryUtils (`infra/country_utils.js`) — Country/Phone Utilities

- International phone number formatting and parsing
- Country code lookups (by name, ISO code, dialing code)
- Uses JSON data files from `platform/data/`

### $KeyValueSet (`infra/key_value_set.js`) — Persistent Key-Value Storage

JSON file-based persistent storage:
- `new $KeyValueSet("setName")` — creates/loads a named set
- `getValue(key)`, `setValue(key, value)`, `unsetValue(key)`, `hasValue(key)`
- `getAll()` — get all key-value pairs
- `delete()` — delete entire set
- Stored in `runtime/key_value_sets/`

### TokenValidator (`infra/token_validator.js`) — Token Authentication

Per-session token validation with caching:
- 3 cache modes: `0` = no cache (DB every time), `1` = DB memory table (`user_mem`), `2` = file system cache
- Validates token existence, user status, token expiry
- Populates session with user info (id, type, lang, roles)
- Configurable last-access update interval
- System token validation for admin tool access

---

## System Modules (Optional Plug-ins)

Located in `platform/system_modules/`, activated via `config/using_modules.js`:

| Module | Global | Purpose |
|---|---|---|
| `aws.js` | `$Aws` | AWS S3 file storage (upload, download, multipart, delete) |
| `bulk_action.js` | `$BulkAction` | Background bulk operations with progress tracking |
| `cipher.js` | `$Cipher` | AES-256-CBC encryption/decryption (for file access tokens) |
| `dynamic_data_tables.js` | `$DynamicDataTables` | Runtime-configurable data tables |
| `fcm.js` | `$Fcm` | Firebase Cloud Messaging push notifications |
| `geolocation.js` | `$Geolocation` | Geocoding, reverse geocoding, distance calculations |
| `json_db.js` | `$JsonDb` | JSON document storage in DB (NoSQL-like) |
| `mailer.js` | `$Mailer` | Email sending (Gmail SMTP via nodemailer) |
| `mailer_queue.js` | `$MailerQueue` | Queued email sending with retry |
| `message_queue.js` | `$MessageQueue` | DB-backed message queue |
| `notes.js` | `$Notes` | User notes/comments system |
| `queue_service.js` | `$QueueService` | Background queue processor service |
| `sendgrid.js` | `$Sendgrid` | SendGrid email integration |
| `service.js` | `$Service` | Background service management (heartbeat, active/inactive) |
| `sms.js` | `$Sms` | SMS sending (Twilio integration) |
| `socket_service.js` | `$SocketService` | WebSocket server (socket.io) with user channels, relay, memory queues |
| `system_upgrade.js` | `$SystemUpgrade` | Database schema upgrade system |
| `test.js` | `$Test` | Test utilities |
| `timed_messages.js` | `$TimedMessages` | Scheduled message delivery |
| `user_roles.js` | `$UserRoles` | Advanced user role management with custom allow/deny |

**Auto-included modules:**
- `cipher` — automatically included when `file_access_level.enabled` is true
- `aws` — automatically included when `using_s3` is true
- `two_factor_auth` (API) — automatically included when `use_2factor_auth` is true

### User Modules

`platform/user_modules/` — intended for **project-specific** modules that follow the same pattern as system modules. Loaded from `using_modules.js` under the `user` array.

**User module conventions:**
- Each module file in `user_modules/` exports a class
- The class is registered as a `$`-prefixed global (e.g. `calendar.js` → `$Calendar`)
- Two instantiation patterns:
  - **Static-style**: used directly as `$ModuleName.method()` (for stateless utilities)
  - **Per-user instantiation**: `new $ModuleName(userId)` — creates an instance scoped to a specific user, commonly used from funcs implementations when business logic needs user context
- User modules can access all infrastructure globals (`$Db`, `$Utils`, `$Config`, `$Const`, `$ERRS`, `$Err`, etc.)
- Common to have a `$Funcs` user module for project-wide helper functions (e.g. `$Funcs.makeUserName()`, `$Funcs.getInitials()`, `$Funcs.parseJSON()`)
- User modules are the recommended place for reusable business logic shared across multiple funcs classes

---

## Background Jobs (jobs/)

Templates and implementations for background processes:

| File | Purpose |
|---|---|
| `basic_cron_job.js` | Template for creating cron jobs |
| `basic_service.js` | Template for queue-processing services |
| `basic_socket.js` | Template for socket server startup |
| `basic_socket_service.js` | Template for socket + queue service |
| `bulk_action_service.js` | Template for bulk action processing |
| `cron_remove_logs.js` | **Active** — removes old log files (configurable retention) |
| `cron_monitor_logs.js` | Monitors logs for crashes/errors, sends alerts |
| `cron_send_mail_from_queue.js` | Processes email send queue |

Jobs use `initStandAlone()` to bootstrap the infrastructure without an HTTP server.

---

## Configuration System

### server.config.js — Server Ports & URLs
Sets global `$SERVER_PORT`, `$FILES_PORT`, `$SOCKET_PORT`, `$SERVER_PUBLIC_URL`, `$WEBAPP_PUBLIC_URL`, etc. Values are loaded as `$`-prefixed globals.

### config.js — Main Application Config
Comprehensive configuration covering:
- **Server**: version, active status, environment display
- **Security**: token expiry, login retries, cooldown, password criteria, salt, 2FA
- **Database**: host, port, schema, pool size, SSL
- **Logging**: log levels, file size limits, DB logging, log retention
- **Files**: paths, access levels, S3 config
- **Email**: SendGrid, Gmail SMTP, mailer accounts
- **SMS**: Twilio config
- **Push**: FCM/Firebase config
- **Social Login**: Facebook, Google, Apple
- **Sockets**: WebSocket server config
- **Queue Services**: service IDs, heartbeat intervals
- **Images**: upload reduction, avatar settings
- **Cipher**: encryption settings

### .config.js — Private Config (Secrets)
Overrides `#`-prefixed keys from `config.js` with actual secret values. Must never be committed to git.

### environments.js — Environment Mapping
Maps request domains to environment names, allowing per-environment config files (`{env}.config.js`).

### using_api.js — Active API Modules
Array of API module names to load.

### using_modules.js — Active System/User Modules
Object with `system` and `user` arrays of module names to load.

---

## Definitions

### constants.js
System-wide constants: log levels, user statuses, login authorities, OTP types, file access levels, service IDs, queue IDs, timeouts.

### errorcodes.{lang}.js
All error codes as `{rc: number, message: string}` objects. Organized by category:
- **0-2**: Success/unknown/crash
- **100-112**: API errors (invalid call, missing params, no privileges, deprecated)
- **201-251**: User errors (auth, registration, password, social login, OTP)
- **301-305**: Image errors
- **321-332**: File errors
- **341-346**: S3 errors
- **361-372**: Service errors (SMS, email, queue)
- **400-407**: Database errors
- **450-454**: Cache errors

### user_types.js
Defines user types with constants, values, names, and default roles:
- `USER_TYPE_NA` (0) — not authenticated
- `USER_TYPE_ADMIN` (1) — administrator
- `USER_TYPE_REGULAR` (2) — regular user

### user_roles.js
Defines custom roles (bitmask-based). Empty by default, project-specific.

---

## Global Variables Convention

The infrastructure uses `$`-prefixed global variables extensively:

| Global | Source | Purpose |
|---|---|---|
| `$Config` | `infra/config_funcs.js` | Configuration access |
| `$Const` | `definitions/constants.js` | System constants |
| `$ERRS` | `definitions/errorcodes.{lang}.js` | Error codes |
| `$Utils` | `infra/utils.js` | Utility functions |
| `$Db` | `infra/database.js` | Database operations |
| `$Date` | `infra/date.js` | Date class |
| `$Logger` | `infra/logger.js` | Logging |
| `$Files` | `infra/files.js` | File management |
| `$Cache` | `infra/cache.js` | File cache |
| `$Err` | `infra/error.js` | Error handling |
| `$Imaging` | `infra/imaging.js` | Image processing |
| `$DataItems` | `infra/data_items.js` | Static data tables |
| `$KeyValueSet` | `infra/key_value_set.js` | Key-value storage |
| `$CountryUtils` | `infra/country_utils.js` | Country/phone utilities |
| `$ACL` | Computed in `common.js` | Access control constants |
| `$API` | Computed in `infra/api.js` | Loaded API definitions |
| `$Globals` | Set in `common.js` | Shared runtime data |
| `$HttpContext` | `express-http-context` | Per-request context (session, req, res) |
| `$SERVER_PORT` | `server.config.js` | Server port |
| `$FILES_PORT` | `server.config.js` | Files server port |
| `$SOCKET_PORT` | `server.config.js` | Socket server port |

System modules are registered as `$ModuleName` (e.g., `$Aws`, `$Sms`, `$Fcm`).
API funcs modules are registered as `$ModuleName` (e.g., `$User`, `$System`, `$File`).

---

## Built-in Developer Tools

The infrastructure includes several browser-based developer tools served by the main server:

- **API Client** (`/apiclient`) — Interactive API testing UI with auto-generated forms from API definitions
- **Logtail** (`/logtail`) — Live log file viewer (like `tail -f`)
- **Log Analyzer** (`/log_analyzer`) — Log search and analysis
- **Socket Viewer** (`/socket_viewer`) — WebSocket connection monitor
- **OTP Viewer** (`/otp_viewer`) — OTP debug code viewer (for development)
- **System Login** (`/system_login`) — Admin authentication page

All tools have IP restriction support via `restrict_*_to_ip` config arrays.

---

## Key Design Patterns

1. **Convention-based API routing**: Request format `"ModuleName/method"` auto-maps to `$ModuleName.method()`
2. **Declarative API schema**: API definitions double as validation rules, ACL, documentation, and API client UI generation
3. **Global module registry**: All infrastructure and business modules are `$`-prefixed globals for easy access anywhere
4. **Synchronous-over-async**: Uses `deasync` to provide synchronous DB/IO APIs despite Node.js async nature
5. **Response pattern**: All API responses follow `{rc: 0, message: "success", ...data}` convention
6. **Config security**: `#`-prefixed keys for secrets with validation preventing accidental exposure
7. **Dual logging**: File + DB logging with crash detection, error reporting, and protected parameter masking
8. **Per-request session**: Session created per HTTP request with lazy DB connection and auto-cleanup
9. **Modular opt-in**: System modules and API sets are explicitly opted-in via config files
10. **Template-based jobs**: Predefined templates for cron jobs, queue services, and socket services

---

## Infrastructure Prototype Extensions

The infrastructure extends native JavaScript prototypes with utility methods:

**Array extensions:**
- `Array.toPlaceholders()` — generates SQL `?,?,?` placeholders for `IN` clauses: `[1,2,3].toPlaceholders()` → `"?,?,?"`

This is used extensively in DB queries:
```js
let ids = [1, 2, 3];
$Db.executeQuery(`SELECT * FROM \`table\` WHERE ID in (${ids.toPlaceholders()})`, ids);
```

---

## Common Implementation Patterns

### Paginated List Endpoint Pattern
```js
get_list() {
    let vals = {num_of_pages: 0, num_of_items: 0, items: []};
    let rc = $ERRS.ERR_SUCCESS;

    let page = Number(this.$page);
    let pageSize = $Config.get("SOME_PAGE_SIZE");
    let offset = pageSize * page;

    // 1. Count query
    let count = $Db.executeQuery(`SELECT COUNT(*) cnt FROM ...`, params)[0].cnt;
    let numOfPages = Math.floor((count + pageSize - 1) / pageSize);
    vals.num_of_pages = numOfPages;
    vals.num_of_items = count;

    if (page < 0 || page >= numOfPages || count == 0) return {...rc, ...vals};

    // 2. Data query with LIMIT/OFFSET
    let items = $Db.executeQuery(`SELECT ... LIMIT ${pageSize} OFFSET ${offset}`, params);
    vals.items = items;

    return {...rc, ...vals};
}
```

### CRUD with File Attachments Pattern
Entities with file attachments follow a junction table pattern:
- Main table: `entity` (e.g. `case`, `event`)
- Junction table: `entity_file` (e.g. `case_file`, `event_file`) with columns: entity FK, file FK, name, description, allow_vendor flag, created_on/by, deleted_on/by
- `add_files`: validates file IDs exist in `file` table, bulk inserts into junction table
- `remove_file`: soft-deletes from junction table
- When retrieving: uses `$Files.SQL` helper to join and generate file URLs

### Metadata Endpoint Pattern
Many modules have a `get_metadata()` method that returns configuration data needed by the client to render a form:
```js
get_metadata() {
    let vals = {};
    let rc = $ERRS.ERR_SUCCESS;
    vals.types = $DataItems.getList("some_data_table");
    vals.options = $DataItems.getList("some_options");
    vals.team = new $SomeModule(this.$Session.userId).getTeamMembers();
    return {...rc, ...vals};
}
```

### Dynamic Column/Filter Pattern
List endpoints support configurable table columns and filters:
- User preferences stored in DB for which columns are visible
- Each column maps to SQL SELECT fields, JOINs, filters, and sort fields via a helper method
- Filters are conditionally applied based on which columns are selected
- Sort field is resolved from the selected columns

### Internal API Calls
Funcs can call other API endpoints internally without HTTP:
```js
let result = $executeAPI(this.$Session, "ModuleName/method_name", {param1: "value"});
if ($Err.isERR(result)) return result;
```
This reuses the same session (including impersonation state) and skips HTTP overhead.

### Email Integration Pattern
The infrastructure supports multiple email providers:
- `$Sendgrid` — SendGrid API (template-based emails)
- `$Mailer` — Gmail SMTP via nodemailer
- `$MailerQueue` — Queued email sending with retry (DB-backed queue + cron processor)

Common usage: `$Sendgrid.send(recipientEmail, templateName, templateData)`

### Socket/Real-time Notification Pattern
```js
// Send real-time message to a specific user
$SocketService.sendMessage(userId, messageType, data);
```
Used for: chat messages, notifications, status updates. The socket service maintains per-user channels.

---

## Detailed Usage Patterns

The following sections document detailed infrastructure usage patterns for key modules.

### $Files.SQL — Multi-Instance & URL Resolution (Detailed)

When a query involves **multiple file columns**, each gets its own `$Files.SQL` instance:

```js
const filesSqlRes = new $Files.SQL("r.RES_IMAGE");
const filesSqlOp = new $Files.SQL("o.OPR_IMAGE");
const filesSqlVid = new $Files.SQL("c.CAL_VIDEO");

const result = $Db.executeQuery(`
    SELECT 
        r.RES_NAME AS resident_name,
        ${filesSqlRes.select()},
        ${filesSqlOp.select()},
        ${filesSqlVid.select()}
    FROM \`call\` c
        JOIN \`resident\` r ON c.CAL_RES_ID = r.RES_ID
        LEFT JOIN \`operator\` o ON c.CAL_OPR_ID = o.OPR_ID
        ${filesSqlRes.join()}
        ${filesSqlOp.join()}
        ${filesSqlVid.join()}
    WHERE c.CAL_ID = ?`, [callId]);

// URL resolution per row
vals.items = result.map(item => ({
    ...item,
    resident_image: $Files.getUrl(filesSqlRes.get(item)),
    operator_image: $Files.getUrl(filesSqlOp.get(item)),
    video_url: $Files.getUrl(filesSqlVid.get(item)),
}));
```

**Key points:**
- `.select()` → SQL SELECT columns for file metadata
- `.join()` → LEFT JOIN clause to the files table
- `.get(row)` → extracts file metadata from a result row
- `$Files.getUrl(metadata)` → converts metadata to a full URL
- Supports both prefixed (`r.RES_IMAGE`) and unprefixed (`USR_IMAGE`) column references
- Works for images, videos, audio files, and any stored file type

**Image saving pattern:**
```js
// Add new image
let imageName = "";
if (!$Utils.empty(this.$image_field))
{
    const rv = $Utils.saveNewImageOrKeepOld(userId, this.$image_field, null, "subfolder_name");
    if ($Err.isERR(rv)) return rv;
    imageName = rv.image_name;
}
// Store imageName in DB column

// Update existing image
if ($Utils.isset(this.$image_field))
{
    let newImageName = currentRecord.IMAGE_COLUMN;
    if (this.$image_field === "")
    {
        // Empty string = remove image reference (set to empty, but don't delete the file)
        newImageName = "";
    }
    else
    {
        const rv = $Utils.saveNewImageOrKeepOld(userId, this.$image_field, null, "subfolder_name");
        if ($Err.isERR(rv)) return rv;
        newImageName = rv.image_name;
    }
    updateFields.push("IMAGE_COLUMN=?");
    updateValues.push(newImageName);
}
```

**CRITICAL: Never delete uploaded files** - Files are kept for audit trail purposes, just like database records are soft-deleted. When removing an image reference, set the DB column to empty string but do NOT call `$Utils.unlink()` on the file.

**Named images list pattern (multi-image columns stored as JSON):**
```js
// Parse a JSON-stored list of image names into URLs
vals.media_url = $Utils.parseNamedImagesList(call.media);
vals.confirmation_images = $Utils.parseNamedImagesList(call.confirmation_images);

// Get filename from URL (for removal)
const fileName = $Files.getFileNameFromUrl(imageUrl);
```

### $DataItems — Detailed Method Usage

**Registration in constructor:**
```js
constructor(session = null) {
    if (session !== null) { this.$Session = session; }
    $DataItems.define("call_status_types");    // Creates $Const.CALL_STATUS_TYPE_*
    $DataItems.define("call_service_types");   // Creates $Const.CALL_SERVICE_TYPE_*
}
```

**Extended method reference:**
```js
// Get a single item by ID
let item = $DataItems.getItem(itemId, "table_name");

// Get a specific attribute of an item
let isConcierge = $DataItems.getItemAttr(serviceType, "call_service_types", "is_concierge");

// Get display name
let name = $DataItems.getItemName(statusId, "call_status_types");

// Get full list as {id: name} map
let statusList = $DataItems.getList("call_status_types");

// Validate item ID exists
let isValid = $DataItems.isValidItemId(notificationType, "admin_notification_types");

// Filter items by attribute value
let filtered = $DataItems.filterItemsIdByAttr("is_concierge", true, "call_service_types");

// Get keys (IDs) from items or table name
let keys = $DataItems.getKeys(filteredItems);
let allKeys = $DataItems.getKeys("call_service_types");

// Get attributed list — array of objects with selected attributes
let services = $DataItems.getAttributedList(
    "call_service_types",           // table name or filtered items
    ["name", "description", "icon"], // attributes to include
    [],                              // attributes to exclude
    true,                            // include ID
    null,                            // filter function
    "service_type"                   // ID field name in output
);
// Returns: [{service_type: 1, name: "...", description: "...", icon: "..."}, ...]

// Combined filter + attributed list
let conciergeItems = $DataItems.filterItemsIdByAttr("is_concierge", true, "call_service_types");
let services = $DataItems.getAttributedList(conciergeItems, ["name", "description", "icon"], [], true, null, "service_type");
```

**Using $Const values defined by $DataItems:**
```js
// After $DataItems.define("call_status_types"), constants are available:
$Const.CALL_STATUS_TYPE_NEW
$Const.CALL_STATUS_TYPE_ACCEPTED

// In SQL queries (often need Number() conversion):
queryParams = [Number($Const.CALL_STATUS_TYPE_NEW), Number($Const.CALL_STATUS_TYPE_ACCEPTED)];

// In comparisons:
if (currentStatus !== Number($Const.CALL_STATUS_TYPE_NEW)) { ... }

// String comparison with .includes():
if ([$Const.CALL_STATUS_TYPE_DONE, $Const.CALL_STATUS_TYPE_CANCELED].includes(`${call.status}`)) { ... }
```

### $Geolocation — Geocoding & Distance (Detailed)

**Instantiation patterns:**
```js
// From coordinates
let geo = new $Geolocation(lat, lon);

// Empty (for later setting)
let geo = new $Geolocation();

// Forward geocoding (address → coordinates)
geo.setLocationName(addressString);
const data = geo.jsondata;
if (!data || data.status !== 'OK' || data.results.length === 0) {
    return $ERRS.ERR_INVALID_ADDRESS;
}
const locationData = data.results[0];
const { lat, lng: lon } = locationData.geometry.location;

// Reverse geocoding (coordinates → address)
geo.setLocation(lat, lon);
if (geo.isStatusOK()) {
    const address = geo.getAllInfo().formatted_address;
}
```

**Key methods:**
```js
geo.isStatusOK()           // Check if geocoding was successful
geo.getAllInfo()            // Full geocoding result (address, timezone, etc.)
geo.getLat()               // Get latitude
geo.getLon()               // Get longitude
geo.getTimeZone()          // Get timezone info
geo.getTimeAndDistanceToDestination(destLat, destLon)  // ETA calculation
```

**Centroid and timezone from polygon:**
```js
const centroid = $Funcs.calculateCentroid(polygon);
const geo = new $Geolocation(centroid[0], centroid[1]);
const timezone = geo.getTimeZone();
const area = geo.getAllInfo();
```

### $Date — Usage Patterns (Detailed)

```js
// Current time with timezone
const now = new $Date().setTimeZone(timezone);

// Parse a date string with timezone
const date = new $Date(`${dateStr} ${timeStr}`, timezone);

// Date arithmetic
const fromDate = new $Date().addMinutes(-numOfMinutes).format();
const futureDate = new $Date().addSeconds(timeoutSecs).format();

// Date comparison (diff returns seconds)
if (now.diff(date) <= 0) {
    return $ERRS.ERR_INVALID_DATE;
}

// Formatting with timezone
const communityDate = new $Date().setTimeZone(comTimeZone).format("Y-m-d");
const formatted = date.format();  // Default format: "Y-m-d H:i:s"

// Date validation
if ($from_date && !($from_date = $Utils.validateDateStr($from_date))) {
    return $ERRS.ERR_INVALID_FROM_DATE_FORMAT;
}
```

### $Fcm — Push Notifications (Detailed)

**Standard notification pattern:**
```js
if (resident.length > 0 && !$Utils.empty(resident[0].USR_DEVICE_ID)) {
    const title = "Notification Title";
    const text = `Notification body text with ${variables}.`;

    const payload = {
        type: $Const.PN_TYPE_CALL_UPDATE,   // Notification type constant
        call_id: callId,                     // Context data
        call_action: $Const.CALL_STATUS_TYPE_ACCEPTED
    };

    $Fcm.sendNotification(deviceId, title, text, payload);
}
```

**Broadcast to multiple users:**
```js
const operators = $Db.executeQuery(
    `SELECT u.USR_DEVICE_ID FROM \`operator\` o
     JOIN \`user\` u ON o.OPR_ID = u.USR_ID
     WHERE o.OPR_COMMUNITY_ID = ? AND o.OPR_IS_CHECKED_IN = 1
     AND (USR_DEVICE_ID<>'' AND USR_DEVICE_ID is not null)`, [communityId]);

operators.forEach(operator => {
    if (!$Utils.empty(operator.USR_DEVICE_ID)) {
        $Fcm.sendNotification(operator.USR_DEVICE_ID, title, text, payload);
    }
});
```

**Key:** Always check device ID is non-empty before sending. Payload `type` field differentiates notification handling on the client.

### $SocketService — Real-time WebSocket (Detailed)

```js
const SocketService = new $SocketService($Config.get("socket"));

// Send to multiple users
admins.forEach(admin => {
    SocketService.sendMessage(admin.USR_ID, JSON.stringify({
        notification_id: notificationId,
        notification_group: "call",        // or "popup"
        notification_type: notificationType,
        call_id: callId,
        message: description,              // For popup type
        level: level                       // For popup type
    }));
});
```

**Key:** Instantiate with `$Config.get("socket")`. Messages are JSON-stringified objects with a `notification_group` to differentiate client-side handling.

### $JsonDb — JSON-Based Key-Value Store (Detailed)

```js
// Initialize from existing JSON string (from DB column) or fresh
const jdb = new $JsonDb(jsonString);                    // From existing data
const jdb = new $JsonDb({isAutoIncrement: false});      // Fresh with manual keys

// CRUD operations
jdb.get(key);          // Get value by key
jdb.set(key, value);   // Set value for key
jdb.delete(key);       // Remove key
jdb.hasId(key);        // Check if key exists
jdb.getAllIds();        // Get all keys
jdb.render();          // Serialize back to JSON string for DB storage

// Pattern: Sync data table keys with stored JSON
const jdbKeys = jdb.getAllIds();
const allKeys = $DataItems.getKeys("table_name");
const { added, removed } = $Utils.compareArrays(jdbKeys, allKeys);
added.forEach(id => jdb.set(id, "default_value"));
removed.forEach(id => jdb.delete(id));
if (needUpdate) {
    $Db.executeQuery(`UPDATE table SET COLUMN=? WHERE ID=?`, [jdb.render(), id]);
}
```

### $TimedMessages — Scheduled Message Queue (Detailed)

```js
// Push a timed message (scheduled for future processing)
new $TimedMessages(queueId).push(
    new $Date().addSeconds(timeoutSecs).format(),  // When to trigger
    JSON.stringify({call_id: callId}),              // Message payload
    callId                                          // Extra index (for lookup)
);

// Remove a timed message by extra index
const tm = new $TimedMessages(queueId);
const tim = tm.getByExtraIndexInt(callId);
if (tim.messages.length > 0) {
    tm.remove(tim.messages[0].timed_message_id);
}
```

**Key:** Queue IDs are constants like `$Const.MQID_CALLS_DONE_MONITOR`. Used for timeout-based workflows (e.g., auto-close after X seconds).

### $Db.executeMdQuery — Master-Detail Query (Detailed)

**Column naming convention:**
- `M_` prefix = Master (parent) fields
- `D_` prefix = Detail (child) fields
- Prefixes are stripped in the output

**Full signature:**
```js
$Db.executeMdQuery(sql, params, masterKeyFields, detailArrayName, detailKeyField?)
```

**Example with detail key field:**
```js
const result = $Db.executeMdQuery(
    `SELECT 
        fo.FEO_ID AS M_featured_operator_id,
        fo.FEO_DESCRIPTION AS M_description,
        fo.FEO_ACTIVE AS M_active,
        fol.FOL_ID AS D_log_id,
        fol.FOL_START_TIME AS D_start_time,
        fol.FOL_END_TIME AS D_end_time
    FROM featured_operator fo
        LEFT OUTER JOIN featured_operator_log fol ON fo.FEO_ID = fol.FOL_FEO_ID
    WHERE fo.FEO_COMMUNITY_ID = ?`,
    [$community_id],
    ["M_featured_operator_id"],  // Master key field(s) for grouping
    "activity_log",              // Name for the detail array property
    "D_log_id"                   // Detail key field (to detect empty LEFT JOIN rows)
);
// Returns: [{featured_operator_id: 1, description: "...", active: true,
//            activity_log: [{log_id: 10, start_time: "...", end_time: "..."}, ...]}, ...]
```

The 5th parameter (`detailKeyField`) is used to detect empty detail rows from LEFT OUTER JOINs — if the detail key is null, no detail entry is added.

### Filtering & Sorting Pattern (Detailed)

**Dynamic WHERE clause building:**
```js
// Approach 1: String concatenation
let baseQuery = `FROM \`table\` WHERE deleted_on IS NULL`;
let queryParams = [];
if ($filter_value) {
    baseQuery += ` AND COLUMN = ?`;
    queryParams.push($filter_value);
}

// Approach 2: Array of conditions (cleaner for many filters)
let wheres = [`c.STATUS IN (?, ?)`];
let queryParams = [status1, status2];
if (!$Utils.empty($filter_name)) {
    wheres.push(`NAME LIKE ?`);
    queryParams.push(`%${$filter_name}%`);
}
if (!$Utils.empty($filter_date_range)) {
    const [startDate, endDate] = $filter_date_range.split(' - ');
    wheres.push(`DATE_COL BETWEEN ? AND ?`);
    queryParams.push(startDate, endDate);
}
let where = wheres.join(" AND ");
```

**Safe sorting with column whitelist:**
```js
const validSortColumns = {
    full_name: 'r.RES_NAME',
    phone_number: 'u.USR_PHONE_NUM',
    email: 'u.USR_EMAIL',
    registration_date: 'u.USR_CREATED_ON',
    status: 'u.USR_STATUS'
};
const sortBy = validSortColumns[$sort_column] || 'r.RES_NAME';  // Default fallback
const direction = $sort_direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
query += ` ORDER BY ${sortBy} ${direction}`;
```

**Multi-column search pattern:**
```js
if ($search_text) {
    query += ` AND (COL1 LIKE ? OR COL2 LIKE ? OR COL3 LIKE ?)`;
    queryParams.push(...Array(3).fill(`%${$search_text}%`));
}
```

**Optional paging:** Some endpoints support an `is_need_paging` parameter. When false, all results are returned without LIMIT/OFFSET.

### SQL COALESCE/NULLIF Update Pattern

For updating only non-empty fields while retaining existing values:
```js
$Db.executeQuery(
    `UPDATE \`table\`
     SET COL1 = COALESCE(NULLIF(?, ''), COL1),
         COL2 = COALESCE(NULLIF(?, ''), COL2)
     WHERE ID = ?`,
    [newValue1, newValue2, id]
);
```
If the new value is empty string, the existing DB value is preserved.

### Dynamic UPDATE Query Building Pattern

When only some fields need updating:
```js
// Array-based approach
const updateFields = [];
const updateValues = [];
if ($field1) { updateFields.push('COL1 = ?'); updateValues.push($field1); }
if ($field2) { updateFields.push('COL2 = ?'); updateValues.push($field2); }

if (updateFields.length > 0) {
    updateValues.push(id);
    $Db.executeQuery(`UPDATE \`table\` SET ${updateFields.join(', ')} WHERE ID = ?`, updateValues);
}

// Object-based variant
let updateFields = {};
if (!$Utils.empty($name)) updateFields.COL_NAME = $name;
if (!$Utils.empty($email)) updateFields.COL_EMAIL = $email;

let setClause = Object.keys(updateFields).map(key => `${key} = ?`).join(", ");
let values = [...Object.values(updateFields), id];
$Db.executeQuery(`UPDATE \`table\` SET ${setClause} WHERE ID=?`, values);
```

### Bulk INSERT Pattern

For inserting multiple rows efficiently:
```js
const values = [];
const placeholders = [];
items.forEach(item => {
    values.push(item.col1, item.col2, item.col3);
    placeholders.push("(?,?,?)");
});
if (values.length > 0) {
    $Db.executeQuery(
        `INSERT INTO \`table\` (COL1, COL2, COL3) VALUES ${placeholders.join(",")}`, values
    );
}
```

### INSERT-SELECT Pattern

For inserting rows derived from a SELECT query:
```js
$Db.executeQuery(
    `INSERT INTO \`target_table\` (COL1, COL2)
     SELECT ?, SOURCE_COL
     FROM \`source_table\`
     WHERE CONDITION=? AND STATUS=?`,
    [staticValue, conditionValue, statusValue]
);
```

### Session Usage Patterns (Detailed)

```js
// Get current user ID
const userId = this.$Session.userId;

// Destructured form (common)
const { userId: operatorId } = this.$Session;
const { userId: adminId } = this.$Session;

// Check user roles
const isSuperAdmin = this.$Session.isCurrentUserHasRole($Const.USER_ROLE_SUPER_ADMIN);
```

### Error Handling Patterns (Detailed)

**Standard error return:**
```js
return $ERRS.ERR_SOME_ERROR_CODE;   // Returns {rc: N, message: "..."}
```

**DB error after write operations:**
```js
$Db.executeQuery(`UPDATE ...`, params);
if ($Db.isError()) {
    return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
}
```

**Transaction error handling:**
```js
$Db.beginTransaction();

$Db.executeQuery(`INSERT ...`, params);
if ($Db.isError()) { $Db.rollbackTransaction(); return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg()); }

$Db.executeQuery(`UPDATE ...`, params);
if ($Db.isError()) { $Db.rollbackTransaction(); return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg()); }

$Db.commitTransaction();
```

**Error checking from internal calls:**
```js
let rv = $executeAPI(this.$Session, "Module/method", params);
if ($Err.isERR(rv)) return rv;

let rv = $Utils.saveNewImageOrKeepOld(userId, image, null, "subfolder");
if ($Err.isERR(rv)) return rv;
```

**Parameterized error messages:**
```js
return $Err.errWithParams("ERR_CANNOT_CANCEL_CALL", $Config.get("call_max_cancel_time_mins"));
```

### $Utils — Detailed Method Reference

**Validation:**
```js
$Utils.empty(value)              // Check if null, undefined, empty string, empty array
$Utils.validateEmail(email)      // Email format validation
$Utils.validateDateStr(dateStr)  // Date string validation, returns formatted date or false
```

**Phone/User:**
```js
$Utils.formatPhone(phoneNum)     // Format phone number for display
$Utils.getUserTypesList()        // Get list of user types
$Utils.createAcronym(name, usedList)  // Create unique TLA/acronym from name
```

**Data manipulation:**
```js
$Utils.parseNamedImagesList(jsonString)  // Parse JSON image list to URL array
$Utils.compareArrays(arr1, arr2, getAdded, getRemoved, getCommon)
// Returns { added, removed, common }
$Utils.strFormat(template, ...params)    // String formatting with parameters
```

**Time:**
```js
$Utils.now()  // Current datetime string in standard format
```

**Image/File:**
```js
$Utils.saveNewImageOrKeepOld(userId, imageData, existingName, subfolder)
// Parameters:
//   - userId: User ID for file ownership
//   - imageData: Base64 encoded image string or image URL (to keep existing)
//   - existingName: Current image filename (pass null for new images)
//   - subfolder: Subfolder name within content/ directory (e.g., "medicine", "media")
// Returns: { image_name: "filename.jpg" } or error object
// Always check for error: if ($Err.isERR(rv)) return rv;
```

### $CountryUtils — Phone Formatting

```js
let phone = $CountryUtils.getIntlPhoneNumber(phoneNum, countryCode);
// Returns object: { dialingCode, intlFormat, ... } or null
if (phone.dialingCode == 1 && phone.intlFormat.length != 12) {
    return null;  // Invalid US phone
}
```

### $Logger — Usage

```js
$Logger.logString($Const.LL_DEBUG, `Found ${count} items: ${JSON.stringify(data)}`);
```

### User Module Pattern — `__initialize()` Hook

User modules in `platform/user_modules/` can export a **plain object** (not only a class) with methods:

```js
module.exports = {
    // Optional initialization hook — called once at startup
    __initialize() {
        $DataItems.define("some_data_table");
    },

    someHelper: function(param1, param2) {
        // Can use all $-globals: $Db, $Utils, $Config, $Const, $ERRS, $Err, etc.
        return result;
    },

    anotherHelper(param) { ... },
};
```

**Key:** `__initialize()` runs once at server startup. Used to register `$DataItems.define()` for data tables needed by the module.

### Helper Functions Outside Class (funcs files)

Utility functions can be defined outside the exported class in funcs files, accessible only within that file:
```js
module.exports = class {
    someMethod() {
        const code = getCodeForCommunity(comId, comName);
    }
}

function getCodeForCommunity(comId, comName) {
    const coms = $Db.executeQuery(`SELECT COM_CODE FROM \`community\` ...`);
    return $Utils.createAcronym(comName, usedCodes);
}
```
These private helpers can use all `$`-globals freely.

### Internal Method Calls Within Same Module

Methods within the same funcs class can call each other directly:
```js
this.set_my_location();  // Reuses this.$lat, this.$lon from API params

const rv = this.get_community_services_status();
if ($Err.isERR(rv)) return rv;
```

### Code Duplication - DRY Principle

**CRITICAL RULE:** Avoid code duplication. Follow the DRY (Don't Repeat Yourself) principle.

When you find identical or nearly identical code blocks in multiple methods within the same module, extract them into shared helper functions defined outside the `module.exports` class block.

**Bad practice - duplicated code:**
```js
module.exports = class
{
    method_one()
    {
        // Helper function defined inside method
        const helperFunc = (data) => {
            // 20 lines of logic
        };
        
        return helperFunc(someData);
    }
    
    method_two()
    {
        // Same helper function duplicated
        const helperFunc = (data) => {
            // Same 20 lines of logic
        };
        
        return helperFunc(otherData);
    }
};
```

**Good practice - extracted shared functions:**
```js
// Helper functions defined at module scope (outside the class)
function helperFunc(data)
{
    // 20 lines of logic - defined once
}

module.exports = class
{
    method_one()
    {
        return helperFunc(someData);
    }
    
    method_two()
    {
        return helperFunc(otherData);
    }
};
```

**Benefits of extracting shared functions:**
- **Single source of truth** - logic exists in only one place
- **Easier maintenance** - changes only need to be made once
- **Reduced bugs** - no risk of fixing a bug in one place but not another
- **Better testability** - shared functions can be tested independently
- **Cleaner code** - methods focus on their specific logic

**When to extract:**
- When the same logic appears in 2+ methods
- When a helper function exceeds ~10-15 lines
- When the logic is complex enough to deserve its own named function
- When the logic might be reused in future methods

**Scope considerations:**
- Module-level functions (outside class) can access all `$`-prefixed globals
- Pass method-specific data (like `this.$Session.userId` or computed values) as function parameters
- Keep functions pure when possible - same inputs produce same outputs

**Cross-module code reuse:**

When the same logic is needed across **multiple API modules** (not just within one module), create shared utility modules in the `platform/user_modules/` folder.

**General utilities - `user_modules/funcs.js`:**

For general-purpose helper functions used across many modules, create `platform/user_modules/funcs.js`. This will be accessible globally as `$Funcs`.

```js
// platform/user_modules/funcs.js
module.exports = class
{
    calculateDiscount(price, percentage)
    {
        return price * (1 - percentage / 100);
    }
    
    formatCurrency(amount)
    {
        return `$${amount.toFixed(2)}`;
    }
};

// Usage in any API module
const discountedPrice = $Funcs.calculateDiscount(100, 20);
const formatted = $Funcs.formatCurrency(discountedPrice);
```

**Topic-specific utilities - dedicated modules:**

When you have a **set of related functions** for a specific entity or topic (e.g., person-related operations, medication calculations, address formatting), create a dedicated module with a descriptive name.

```js
// platform/user_modules/person_utils.js
module.exports = class
{
    getAge(birthDate)
    {
        const today = new $Date();
        const birth = new $Date(birthDate);
        let age = today.getYear() - birth.getYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDay() < birth.getDay()))
        {
            age--;
        }
        return age;
    }
    
    setDetails(userId, firstName, lastName, email)
    {
        $Db.executeQuery(
            `UPDATE \`user\` SET USR_FIRST_NAME=?, USR_LAST_NAME=?, USR_EMAIL=? WHERE USR_ID=?`,
            [firstName, lastName, email, userId]);
        
        if ($Db.isError())
        {
            return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
        }
        
        return $ERRS.ERR_SUCCESS;
    }
    
    getFullName(firstName, lastName)
    {
        return `${firstName} ${lastName}`.trim();
    }
};

// Usage in any API module - accessible as $PersonUtils
const age = $PersonUtils.getAge(user.USR_BIRTH_DATE);
const fullName = $PersonUtils.getFullName(user.USR_FIRST_NAME, user.USR_LAST_NAME);
```

**Module naming convention:**
- File name: `snake_case.js` (e.g., `person_utils.js`, `medication_helper.js`)
- Global access: `$PascalCase` (e.g., `$PersonUtils`, `$MedicationHelper`)
- The infrastructure automatically converts the filename to the global variable name

**When to create a user module:**
- Logic is used in 2+ different API modules
- Functions are related to a common entity or topic
- Logic is complex enough to warrant centralization
- You want to avoid duplicating the same code across multiple API funcs files

**Benefits:**
- Single source of truth across the entire application
- Easier to maintain and test
- Consistent behavior across all API endpoints
- Cleaner API funcs files that focus on business logic

### Soft Deletion Conventions (Detailed)

**CRITICAL RULE:** Never use `DELETE FROM` on database tables except for these specific cases:
1. **Cache tables** — temporary data that doesn't need history
2. **Queue tables** — `queue`, `mailer_queue`, `timed_message`, etc.
3. **Temporary data** — `file_multipart`, `otp_auth`, `social_auth`, etc.

For all other tables, use **soft deletion** with the `*_DELETED_ON` column pattern.

**Two soft deletion approaches:**
1. **Timestamp-based (preferred):** Set `*_DELETED_ON = $Utils.now()` — always filter with `WHERE *_DELETED_ON IS NULL`
2. **Status-based:** Set `*_ACTIVE = FALSE/0` — used when the record needs to remain visible but inactive

**Benefits of soft deletion:**
- Complete audit trail of all deletions
- Ability to trace back deleted information
- Know exactly when something was deleted
- Can restore data if needed

**Implementation pattern:**

```js
// Table schema must include DELETED_ON column
CREATE TABLE `medication_group` (
  `MGR_ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `MGR_USR_ID` varchar(128) NOT NULL,
  `MGR_NAME` varchar(250) NOT NULL,
  `MGR_DELETED_ON` datetime DEFAULT NULL,  -- Soft deletion column
  PRIMARY KEY (`MGR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

// Delete operation - UPDATE instead of DELETE
delete_group() {
    const now = $Utils.now();
    
    // Soft delete - set DELETED_ON timestamp
    $Db.executeQuery(
        `UPDATE \`medication_group\` SET MGR_DELETED_ON=? WHERE MGR_ID=? AND MGR_USR_ID=?`,
        [now, this.$group_id, userId]);
}

// All SELECT queries must filter deleted records
$Db.executeQuery(
    `SELECT * FROM \`medication_group\` WHERE MGR_USR_ID=? AND MGR_DELETED_ON IS NULL`,
    [userId]);

// All JOIN queries must filter deleted records
$Db.executeQuery(
    `SELECT m.*, g.MGR_NAME
     FROM \`medication\` m
     LEFT JOIN \`medication_group\` g ON m.MED_MGR_ID = g.MGR_ID AND g.MGR_DELETED_ON IS NULL
     WHERE m.MED_USR_ID=?`,
    [userId]);

// All UPDATE queries should verify record is not deleted
$Db.executeQuery(
    `UPDATE \`medication_group\` SET MGR_NAME=? 
     WHERE MGR_ID=? AND MGR_USR_ID=? AND MGR_DELETED_ON IS NULL`,
    [newName, groupId, userId]);

// Duplicate checks must exclude deleted records
$Db.executeQuery(
    `SELECT MGR_ID FROM \`medication_group\` 
     WHERE MGR_USR_ID=? AND MGR_NAME=? AND MGR_DELETED_ON IS NULL`,
    [userId, groupName]);
```

**Cascading soft-delete:** When deactivating a parent entity, iterate children and update their status too (often using `$executeAPI` for complex child updates).

**Important:** Every query (SELECT, UPDATE, JOIN) involving soft-deletable tables MUST include the `*_DELETED_ON IS NULL` filter to exclude deleted records.

### Location Data Storage Convention

Locations are stored as JSON string arrays `[lat, lon]` in the database:
```js
// Storing
const locationString = JSON.stringify([lat, lon]);
$Db.executeQuery(`UPDATE \`table\` SET LOCATION=? WHERE ID=?`, [locationString, id]);

// Retrieving
const locationArray = JSON.parse(locationString);
const lat = locationArray[0];
const lon = locationArray[1];

// Full address info as JSON
const geo = new $Geolocation(lat, lon);
const addressJson = JSON.stringify(geo.getAllInfo());
```

### @mode API Attribute Values

| Value | Behavior |
|---|---|
| `"off"` | API method is completely disabled (returns error) |
| `"deprecated"` | API method still works but is marked for removal |
| `"test"` | Only accessible in test mode |
| `"superuser"` | Only accessible by superuser |
| `"unlogged"` | Request/response not logged |

Values can be comma-separated to combine modes.
