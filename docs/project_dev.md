# DoseOn Server Implementation Documentation

**Document Version:** 1.3  
**Last Updated:** 2026-03-22  
**Purpose:** Comprehensive documentation of the DoseOn server business logic implementation

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Active Configuration](#2-active-configuration)
3. [Database Schema](#3-database-schema)
4. [Data Items (Static Lookups)](#4-data-items-static-lookups)
5. [Error Codes](#5-error-codes)
6. [API Modules](#6-api-modules)
    - 6.1 [Medicine Module](#61-medicine-module)
    - 6.2 [MedicineGroup Module](#62-medicinegroup-module)
    - 6.3 [Care Module](#63-care-module)
    - 6.4 [User Module](#64-user-module)
    - 6.5 [System Module](#65-system-module)
    - 6.6 [File Module](#66-file-module)
    - 6.7 [SocialLogin Module](#67-sociallogin-module)
    - 6.8 [TwoFactorAuth Module](#68-twofactorauth-module)
    - 6.9 [UserRole Module](#69-userrole-module)
7. [Background Jobs](#7-background-jobs)
8. [User Modules](#8-user-modules)

---

## 1. Project Overview

DoseOn is a **medication management** mobile application backend. It allows users to:

- Track medications with flexible scheduling (daily, specific days, intervals)
- Group medications into custom groups
- Confirm doses taken and track dosage history
- Manage user accounts via email/password, OTP (phone/email), or social login (Facebook, Google, Apple)

The server is built on the **InfraJS** Node.js/Express framework (infra v3.8.18) with a MySQL database. It follows the standard API module pattern where each module has:

- **Schema file** in `backend/platform/api/` — defines parameters, ACL, documentation
- **Implementation file** in `backend/platform/funcs/` — contains the business logic class

---

## 2. Active Configuration

### Active APIs (`config/using_api.js`)

| API Module       | Status   |
|------------------|----------|
| `file`           | Active   |
| `system`         | Active   |
| `user`           | Active   |
| `medicine`       | Active   |
| `medicine_group` | Active   |
| `care`           | Active   |
| `social_login`   | Disabled |
| `user_role`      | Disabled |

### Active System Modules (`config/using_modules.js`)

| Module     | Status   |
|------------|----------|
| `mailer`   | Active   |
| `sendgrid` | Active   |
| All others | Disabled |

---

## 3. Database Schema

### 3.1 Project-Specific Tables

#### `medication_group`

Stores user-defined groups for organizing medications.

| Column          | Type              | Description                           |
|-----------------|-------------------|---------------------------------------|
| `MGR_ID`        | bigint PK AI      | Group ID                              |
| `MGR_USR_ID`    | varchar(128) FK   | Owner user ID → `user.USR_ID`         |
| `MGR_NAME`      | varchar(250)      | Group name                            |
| `MGR_NOTE`      | text              | Optional note                         |
| `MGR_CREATED_ON`| datetime          | Creation timestamp                    |
| `MGR_DELETED_ON`| datetime NULL     | Soft-delete timestamp                 |

#### `medication`

Stores individual medication records with scheduling information.

| Column               | Type              | Description                                           |
|----------------------|-------------------|-------------------------------------------------------|
| `MED_ID`             | bigint PK AI      | Medication ID                                         |
| `MED_USR_ID`         | varchar(128) FK   | Owner user ID → `user.USR_ID`                         |
| `MED_NAME`           | varchar(250)      | Medication name                                       |
| `MED_TYPE`           | varchar(50)       | Type: pill, liquid, injection, other                  |
| `MED_DOSAGE_AMOUNT`  | decimal(10,2)     | Numeric amount per intake                             |
| `MED_FREQUENCY_TYPE` | varchar(50)       | Schedule type (see frequency_type data item)          |
| `MED_FREQUENCY_DATA` | text              | JSON with schedule details: times, days, intervals    |
| `MED_START_DATE`     | date              | Start date (defaults to current date)                 |
| `MED_DURATION`       | int unsigned NULL  | Duration in days for calculating end date             |
| `MED_AVAILABLE_AMOUNT`| decimal(10,2) NULL| Amount of medicine on hand                           |
| `MED_MGR_ID`         | bigint NULL FK    | FK → `medication_group.MGR_ID` (ON DELETE SET NULL)   |
| `MED_NOTES`          | text NULL         | Optional notes                                        |
| `MED_IMAGE`          | varchar(200)      | Image file reference (default '')                     |
| `MED_CREATED_ON`     | datetime          | Creation timestamp                                    |
| `MED_DELETED_ON`     | datetime NULL     | Soft-delete timestamp                                 |

#### `care_request`

Stores care relationships between care recipients and care takers.

| Column                          | Type              | Description                                           |
|---------------------------------|-------------------|-------------------------------------------------------|
| `CRQ_ID`                        | bigint PK AI      | Care request ID                                       |
| `CRQ_RECIPIENT_USR_ID`          | varchar(128) FK   | Care recipient user ID → `user.USR_ID`                |
| `CRQ_TAKER_USR_ID`              | varchar(128) FK   | Care taker user ID → `user.USR_ID`                    |
| `CRQ_STATUS`                    | smallint          | 1=Requested, 2=Accepted, 3=Declined, 4=Removed       |
| `CRQ_FRIENDLY_NAME_BY_RECIPIENT`| varchar(250) NULL | Friendly name given by care recipient to the care taker |
| `CRQ_FRIENDLY_NAME_BY_TAKER`    | varchar(250) NULL | Friendly name given by care taker to the care recipient |
| `CRQ_MESSAGE`                   | text NULL         | Message sent with the request                         |
| `CRQ_CREATED_ON`                | datetime          | Creation timestamp                                    |
| `CRQ_LAST_UPDATE`               | datetime          | Last update timestamp                                 |
| `CRQ_DELETED_ON`                | datetime NULL     | Soft-delete timestamp                                 |

#### `medication_taken`

Records each dose confirmation event.

| Column              | Type              | Description                                    |
|---------------------|-------------------|------------------------------------------------|
| `MTK_ID`            | bigint PK AI      | Record ID                                      |
| `MTK_MED_ID`        | bigint FK         | FK → `medication.MED_ID` (ON DELETE CASCADE)   |
| `MTK_USR_ID`        | varchar(128) FK   | FK → `user.USR_ID`                             |
| `MTK_TAKEN_ON`      | datetime          | When the medication was actually taken          |
| `MTK_SCHEDULED_TIME`| datetime NULL     | The scheduled time for this dose               |
| `MTK_DOSAGE_AMOUNT` | decimal(10,2)     | Amount taken                                   |
| `MTK_NOTES`         | text NULL         | Optional notes                                 |
| `MTK_CREATED_ON`    | datetime          | Record creation timestamp                      |

### 3.2 Infrastructure Tables

| Table                | Purpose                                                  |
|----------------------|----------------------------------------------------------|
| `user`               | Core user authentication (ID, email, password, token, device info, 2FA fields) |
| `user_details`       | Extended user profile (first/last name, image). Updates trigger sync to `user` table |
| `user_mem`           | MEMORY engine table for fast user token validation cache  |
| `file`               | Uploaded file metadata                                   |
| `file_multipart`     | Multipart upload tracking                                |
| `social_auth`        | Temporary social login auth keys                         |
| `otp_auth`           | OTP verification codes with expiration                   |
| `system_user`        | Admin system users (separate from regular users)         |
| `login_log`          | Login event history                                      |
| `log`                | API request/response logs                                |
| `debug_log`          | Debug-level logs                                         |
| `change_log`         | Record-level change audit trail (INSERT/UPDATE/DELETE)   |
| `bulk_action`        | Bulk action queue metadata                               |
| `queue`              | Generic message queue                                    |
| `timed_message`      | Scheduled/delayed messages                               |
| `mailer_queue`       | Queued emails for batch sending                          |
| `service`            | Background service heartbeat tracking                    |
| `user_online_status` | WebSocket user presence                                  |
| `user_online_log`    | WebSocket connection history                             |

### 3.3 Database Triggers

- **`deny_update_user_details_from_user`** (BEFORE UPDATE on `user`): Prevents direct updates to synced fields (USR_TYPE, USR_EMAIL, USR_PHONE_NUM, USR_PHONE_COUNTRY_CODE, USR_STATUS, USR_ROLE_ALLOW, USR_ROLE_DENY, USR_DELETED_ON) unless `@skip_user_update` is set. These fields must be updated through `user_details`.
- **`update_user_from_details`** (BEFORE UPDATE on `user_details`): Auto-syncs changed fields from `user_details` to `user` table, setting `@skip_user_update = 1` to bypass the guard trigger.

### 3.4 Stored Procedures

| Procedure                        | Purpose                                                |
|----------------------------------|--------------------------------------------------------|
| `prc_queue_set_lock`             | Atomically locks the next unprocessed queue message    |
| `prc_queue_set_lock_all`         | Atomically locks all unprocessed queue messages        |
| `prc_timed_message_set_lock`     | Atomically locks the next due timed message            |
| `prc_timed_message_set_lock_all` | Atomically locks all due timed messages                |

---

## 4. Data Items (Static Lookups)

### `medication_type`

| Key          | Display Name | Constant Define      |
|--------------|--------------|----------------------|
| `pill`       | Pill         | `MED_TYPE_PILL`      |
| `liquid`     | Liquid       | `MED_TYPE_LIQUID`    |
| `injection`  | Injection    | `MED_TYPE_INJECTION` |
| `other`      | Other        | `MED_TYPE_OTHER`     |

### `frequency_type`

| Key              | Display Name       | Constant Define               |
|------------------|--------------------|-------------------------------|
| `daily`          | Daily              | `FREQ_TYPE_DAILY`             |
| `specific_days`  | Specific Days      | `FREQ_TYPE_SPECIFIC_DAYS`     |
| `every_x_days`   | Every X Days       | `FREQ_TYPE_EVERY_X_DAYS`      |
| `every_x_weeks`  | Every X Weeks      | `FREQ_TYPE_EVERY_X_WEEKS`     |
| `every_x_months` | Every X Months     | `FREQ_TYPE_EVERY_X_MONTHS`    |
| `when_necessary`  | Use When Necessary | `FREQ_TYPE_WHEN_NECESSARY`    |

### `care_request_status`

| Key | Display Name | Constant Define        |
|-----|--------------|------------------------|
| `1` | Requested    | `CARE_STATUS_REQUESTED`|
| `2` | Accepted     | `CARE_STATUS_ACCEPTED` |
| `3` | Declined     | `CARE_STATUS_DECLINED` |
| `4` | Removed      | `CARE_STATUS_REMOVED`  |

### Frequency Data JSON Formats

The `MED_FREQUENCY_DATA` field stores JSON whose structure depends on `MED_FREQUENCY_TYPE`:

- **daily**: `{"times": ["08:00", "20:00"]}` — array of time strings
- **specific_days**: `{"days": [1, 3, 5], "times": ["08:00"]}` — day-of-week numbers + times
- **every_x_days**: `{"interval": 3, "times": ["08:00"]}` — interval in days + times
- **every_x_weeks**: `{"interval": 2, "times": ["08:00"]}` — interval in weeks + times
- **every_x_months**: `{"interval": 1, "times": ["08:00"]}` — interval in months + times
- **when_necessary**: no frequency data required (nullable)

---

## 5. Error Codes

### Medication-Specific Errors (500-510)

| Code | Constant                           | Message                                           |
|------|------------------------------------|----------------------------------------------------|
| 500  | `ERR_INVALID_MEDICATION_TYPE`      | invalid medication type                            |
| 501  | `ERR_INVALID_FREQUENCY_TYPE`       | invalid frequency type                             |
| 502  | `ERR_INVALID_FREQUENCY_DATA`       | invalid frequency data format                      |
| 503  | `ERR_INVALID_START_DATE`           | invalid start date                                 |
| 504  | `ERR_INVALID_MEDICATION_GROUP`     | invalid medication group                           |
| 505  | `ERR_MEDICATION_NOT_FOUND`         | medication not found                               |
| 506  | `ERR_MEDICATION_GROUP_NOT_FOUND`   | medication group not found                         |
| 507  | `ERR_MEDICATION_GROUP_NAME_REQUIRED`| medication group name is required                 |
| 508  | `ERR_MEDICATION_GROUP_DUPLICATE_NAME`| a medication group with this name already exists |
| 509  | `ERR_INVALID_DOSAGE_AMOUNT`        | invalid dosage amount                              |
| 510  | `ERR_INVALID_TAKEN_TIME`           | invalid taken time format                          |

### Care-Specific Errors (520-527)

| Code | Constant                            | Message                                                    |
|------|-------------------------------------|------------------------------------------------------------|
| 520  | `ERR_CARE_TAKER_NOT_FOUND`          | care taker user not found                                  |
| 521  | `ERR_CARE_REQUEST_NOT_FOUND`        | care request not found                                     |
| 522  | `ERR_CARE_CANNOT_REQUEST_SELF`      | you cannot send a care request to yourself                 |
| 523  | `ERR_CARE_REQUEST_ALREADY_EXISTS`   | an active care request already exists for this user        |
| 524  | `ERR_CARE_INVALID_ACTION`           | invalid action, must be 2 (accept) or 3 (decline)         |
| 525  | `ERR_CARE_REQUEST_NOT_PENDING`      | care request is not in pending status                      |
| 526  | `ERR_CARE_RECIPIENT_NOT_FOUND`      | care recipient not found                                   |
| 527  | `ERR_CARE_INVALID_FRIENDLY_NAME_TYPE`| invalid friendly name type, must be 1 or 2                |

For infrastructure error codes (0-454), see the `errorcodes.en.js` file.

---

## 6. API Modules

### 6.1 Medicine Module

**Files:** `api/medicine.js` (schema), `funcs/medicine.js` (implementation)  
**Request prefix:** `Medicine/`

#### `Medicine/get_medication_list`

- **ACL:** Regular user
- **Parameters:** None (uses session user ID)
- **Logic:**
    1. Fetches all medication groups for the user (`MGR_DELETED_ON is null`)
    2. Fetches all medications for the user (`MED_DELETED_ON is null`) with image URLs via `$Files.SQL`
    3. Parses `MED_FREQUENCY_DATA` JSON for each medication
    4. Calculates `status` ("active" or "completed") based on `MED_START_DATE`, `MED_DURATION`, and current date
    5. Calculates `next_taken_time` by calling `_calculateNextTakenTime()` which examines frequency type and times array
    6. Organizes medications into `groups[]` (each with nested `medications[]`) and `ungrouped_medications[]`
- **Returns:** `{groups: [...], ungrouped_medications: [...]}`

#### `Medicine/add_medication`

- **ACL:** Regular user
- **Parameters:** `name` (s), `medication_type` (s), `dosage_amount` (d), `frequency_type` (s), `frequency_data` (s, optional), `start_date` (s, optional), `duration` (i, optional), `available_amount` (d, optional), `group_id` (i, optional), `notes` (s, optional), `image` (s, optional)
- **Logic:**
    1. Validates `medication_type` against `$DataItems` lookup
    2. Validates `frequency_type` against `$DataItems` lookup
    3. Validates `frequency_data` JSON structure (must have `times` array; validates `days`/`interval` per type)
    4. Validates `start_date` format (defaults to today)
    5. Validates `group_id` exists and belongs to user (if provided)
    6. Validates `dosage_amount > 0`
    7. Handles image upload via `$Files.saveFromBase64()` if provided
    8. Inserts into `medication` table
- **Returns:** `{medication_id: <id>}`

#### `Medicine/get_medication_detail`

- **ACL:** Regular user
- **Parameters:** `medication_id` (i)
- **Logic:** Fetches single medication with image URL, verifies ownership and not deleted
- **Returns:** Full medication record with parsed `frequency_data` and `image_url`

#### `Medicine/update_medication`

- **ACL:** Regular user
- **Parameters:** `medication_id` (i), plus all same optional fields as `add_medication`
- **Logic:** Partial update — only provided fields are updated. Same validations as add. Handles image replacement/removal. Uses dynamic SET clause construction.
- **Returns:** Success

#### `Medicine/delete_medication`

- **ACL:** Regular user
- **Parameters:** `medication_id` (i)
- **Logic:** Soft-deletes by setting `MED_DELETED_ON`. Verifies ownership.
- **Returns:** Success

#### `Medicine/confirm_taken`

- **ACL:** Regular user
- **Parameters:** `medication_id` (i), `dosage_amount` (d, optional), `scheduled_time` (s, optional), `taken_on` (s, optional), `notes` (s, optional)
- **Logic:**
    1. Verifies medication exists and belongs to user
    2. Defaults `dosage_amount` to medication's `MED_DOSAGE_AMOUNT` if not provided
    3. Defaults `taken_on` to current time if not provided
    4. Validates `taken_on` format
    5. Within a **transaction**: inserts into `medication_taken` and decrements `MED_AVAILABLE_AMOUNT` (if set)
- **Returns:** `{taken_id: <id>}`

#### `Medicine/get_taken_history`

- **ACL:** Regular user
- **Parameters:** `medication_id` (i, optional), `date_from` (s, optional), `date_to` (s, optional), `page` (i, optional), `page_size` (i, optional)
- **Logic:**
    1. Builds dynamic WHERE clause with optional filters
    2. Joins `medication_taken` with `medication` to include `MED_NAME` and `MED_TYPE`
    3. Applies pagination (default page_size: 20)
    4. Orders by `MTK_TAKEN_ON DESC`
- **Returns:** `{history: [...], total_count: <n>, page: <n>, page_size: <n>}`

---

### 6.2 MedicineGroup Module

**Files:** `api/medicine_group.js` (schema), `funcs/medicine_group.js` (implementation)  
**Request prefix:** `MedicineGroup/`

#### `MedicineGroup/get_group_list`

- **ACL:** Regular user
- **Parameters:** None
- **Logic:**
    1. Fetches all groups for the user (not deleted)
    2. Fetches all medications for the user (not deleted) with image URLs
    3. For each group, summarizes its medications: count, status breakdown, next taken time
- **Returns:** `{groups: [...]}`

#### `MedicineGroup/add_group`

- **ACL:** Regular user
- **Parameters:** `name` (s), `note` (s, optional)
- **Logic:** Validates name is not empty and not duplicate for user, then inserts
- **Returns:** `{group_id: <id>}`

#### `MedicineGroup/update_group`

- **ACL:** Regular user
- **Parameters:** `group_id` (i), `name` (s, optional), `note` (s, optional)
- **Logic:** Validates group exists and belongs to user; checks for duplicate name if name provided; updates fields
- **Returns:** Success

#### `MedicineGroup/delete_group`

- **ACL:** Regular user
- **Parameters:** `group_id` (i)
- **Logic:** Within a **transaction**:
    1. Soft-deletes the group (`MGR_DELETED_ON`)
    2. Sets `MED_MGR_ID = NULL` on all medications in that group (moves them to ungrouped)
- **Returns:** Success

#### `MedicineGroup/get_group_details`

- **ACL:** Regular user
- **Parameters:** `group_id` (i)
- **Logic:** Fetches group details plus all its medications with calculated status and next taken time
- **Returns:** Group record with nested `medications[]`

---

### 6.3 Care Module

**Files:** `api/care.js` (schema), `funcs/care.js` (implementation)  
**Request prefix:** `Care/`

The Care module manages the caretaker relationship between users. A care recipient invites a care taker by phone number. The care taker can accept or decline. Once accepted, the care taker has read-only access to the care recipient's medication data.

**Status values:** 1=Requested, 2=Accepted, 3=Declined, 4=Removed

#### `Care/send_request`

- **ACL:** Regular user
- **Parameters:** `phone_number` (s, optional), `email` (s, optional), `friendly_name` (s, optional), `message` (s, optional)
- **Note:** At least one of `phone_number` or `email` must be provided. If both are provided, `phone_number` takes priority.
- **Logic:**
    1. Validates at least one of phone_number or email is provided (ERR_CARE_MISSING_PHONE_OR_EMAIL)
    2. Looks up the care taker user by phone number or email
    3. Validates the target is not the current user
    4. Checks no active (Requested/Accepted) care request already exists for this pair
    5. Inserts a new `care_request` record with status=Requested
- **Returns:** `{request_id, request_status}`

#### `Care/respond_request`

- **ACL:** Regular user
- **Parameters:** `request_id` (i), `action` (i — 2=accept, 3=decline)
- **Logic:**
    1. Validates action is 2 or 3
    2. Fetches the request where current user is the care taker
    3. Verifies request is in Requested status
    4. Updates status to Accepted or Declined
- **Returns:** `{request_id, request_status}`

#### `Care/get_pending_requests`

- **ACL:** Regular user
- **Parameters:** None (uses session user ID)
- **Logic:** Fetches all care requests addressed to the current user (as care taker) with status=Requested. Joins `user`/`user_details` to get care recipient info.
- **Returns:** `{pending_requests: [{request_id, care_recipient_id, care_recipient_name, message, phone_number, created_at}]}`

#### `Care/get_care_recipients`

- **ACL:** Regular user
- **Parameters:** None (uses session user ID)
- **Logic:** Fetches all accepted care requests where current user is the care taker. Joins user data for each care recipient.
- **Returns:** `{care_recipients: [{care_recipient_id, friendly_name, phone_number, status}]}`

#### `Care/get_care_recipient_detail`

- **ACL:** Regular user
- **Parameters:** `care_recipient_id` (s)
- **Logic:**
    1. Verifies the current user is an accepted care taker for this recipient
    2. Fetches care recipient user info
    3. Fetches all medications of the care recipient with frequency/dosage/dates
    4. Fetches recent 20 medication taken records with on_time/late status calculation (≤30 min = on_time, >30 min = late)
    5. Calculates statistics: total_scheduled_passed, on_time_taken, lated_taken, missed_taken
- **Returns:** `{friendly_name, phone_number, adding_date, medications: [...], recent_reminders: [...], statistic: {...}}`

#### `Care/remove_care_recipient`

- **ACL:** Regular user
- **Parameters:** `care_recipient_id` (s)
- **Logic:** Finds the accepted care request where current user is care taker, sets status=Removed
- **Returns:** Success

#### `Care/get_care_takers`

- **ACL:** Regular user
- **Parameters:** None (uses session user ID)
- **Logic:** Fetches all non-removed care requests where current user is the care recipient. Joins user data for each care taker.
- **Returns:** `{caretakers: [{care_taker_id, friendly_name, phone_number, request_status}]}`

#### `Care/update_friendly_name`

- **ACL:** Regular user
- **Parameters:** `user_id` (s), `friendly_name` (s), `friendly_name_type` (i — 1=care taker name set by recipient, 2=care recipient name set by taker)
- **Logic:**
    1. Validates friendly_name_type is 1 or 2
    2. If type=1: `user_id` is the care taker; finds the care request where current user is recipient and `user_id` is taker; updates `CRQ_FRIENDLY_NAME_BY_RECIPIENT`
    3. If type=2: `user_id` is the care recipient; finds the care request where current user is taker and `user_id` is recipient; updates `CRQ_FRIENDLY_NAME_BY_TAKER`
- **Returns:** Success

#### `Care/remove_care_taker`

- **ACL:** Regular user
- **Parameters:** `care_taker_id` (s)
- **Logic:** Finds the Requested/Accepted care request where current user is care recipient, sets status=Removed
- **Returns:** Success

---

### 6.4 User Module

**Files:** `api/user.js` (schema), `funcs/user.js` (implementation)  
**Request prefix:** `User/`

#### Authentication Flows

**Email/Password Login (`User/login`):**
1. Sets user language
2. Looks up user by email with `USR_LOGIN_AUTHORITY_EMAIL` and `USR_STATUS_ACTIVE`
3. Checks failed login cooldown (`failed_login_cooldown_time` config) and max retries (`max_failed_login_retries`)
4. Validates password via `$Utils.isCorrectPwd()`
5. If 2FA enabled: generates `second_factor_key` with expiry, returns obscured phone/email
6. If 2FA disabled: calls `_performLogin()` directly

**Email/Password Registration (`User/register`):**
1. Validates first name, last name, email format, password criteria
2. Checks for duplicate email
3. Within a **transaction**: inserts into `user` and `user_details`
4. Updates device info
5. If 2FA: returns `second_factor_key`; else returns `token`

**OTP-Based Flows:**
- `User/send_sms_code` / `User/send_email_code` — sends OTP via SMS or email, stores in `otp_auth`
- `User/resend_sms_code` / `User/resend_email_code` — resends existing OTP if not expired
- `User/verify_sms_code` / `User/verify_email_code` — verifies OTP code with retry limits, returns `auth_key`
- `User/login_with_phone` / `User/login_with_email` — logs in using verified `auth_key`
- `User/register_with_phone` / `User/register_with_email` — registers using verified `auth_key`

**Auth Grant Flow:**
- `User/get_login_auth_grant` — generates an encrypted auth grant for authenticated users
- `User/login_with_auth_grant` — decrypts and validates the grant, then performs login

**OTP Verification Special Cases:**
- Predefined phone numbers (`predef_phone_nums`) use a fixed OTP code for testing
- Backdoor code option (`enable_backdoor_code`) for development
- Virtual phone numbers with individual codes
- Override OTP verification flag for development

#### Session & Device Management

- `User/update_device_info` — updates device_id, os_type, os_version, device_model, app_version
- `User/update_user_language` — updates user language preference, clears user cache
- `User/logout` — clears token and device_id, removes from user cache

#### Password Management

- `User/forgot_password` — generates reset code, sends email with reset link using `EMAIL_TEMPLATE_FORGOT_PASSWORD`
- `User/reset_password` — validates activation code and updates password hash

#### Profile Management

- `User/delete_profile` — self-delete: clears token/device, marks `user_details` as deleted, appends "/DELETED" to phone/email

#### Admin Operations

- `User/add_user` — admin creates a new user (admin or regular type)
- `User/update_user` — admin updates user details (name, email, type, status)
- `User/delete_user` — admin soft-deletes a user
- `User/get_users` — admin lists all non-deleted users

#### System User Operations (superuser mode)

- `User/system_login` — authenticates system users from `system_user` table with cooldown protection
- `User/system_logout` — clears system user token
- `User/__set_system_user` — creates or updates a system user (off mode — deployment only)
- `User/__create_admin` — creates an admin user (off mode)
- `User/__create_null_user` — creates a null user placeholder (off mode)

#### Internal Helper Methods

- `_performLogin(user, ...)` — core login logic: generates/reuses token, updates last_login/access, resets failed count, updates device info, logs login
- `_updateDeviceInfo(userId, ...)` — dynamically builds UPDATE SET clause for non-empty device fields
- `_logLogin(userId, token)` — inserts into `login_log` if enabled
- `_getOtpByAuthKey(otpType, authKey)` — validates OTP auth key from `otp_auth`, checks expiry
- `_send_otp_code(otpType, field1, field2)` — sends OTP via SMS or email, stores in `otp_auth`
- `_resend_otp_code(otpType, field1, field2)` — resends existing OTP
- `_verify_otp_code(otpType, field1, field2, code)` — verifies code with retry tracking

---

### 6.4 System Module

**Files:** `api/system.js` (schema), `funcs/system.js` (implementation)  
**Request prefix:** `System/`

#### Active Endpoints

| Method                  | ACL / Mode   | Description                                                |
|-------------------------|--------------|------------------------------------------------------------|
| `api_ver`               | NA (public)  | Returns system name, DB status, API/infra version, environment, deployment version, start time |
| `get_system_config`     | superuser    | Returns full system config                                 |
| `get_runtime_config`    | superuser    | Returns runtime config                                     |
| `log_test`              | superuser    | Writes test log entries at all levels                      |
| `debug`                 | superuser    | Writes a log entry at specified level (e/w/i/d/p)         |
| `test_crash`            | off          | Throws an error for crash testing                          |
| `send_mail`             | superuser    | Sends an email via mailer or sendgrid (with attachments)   |
| `send_socket_message`   | superuser    | Sends a WebSocket message to a specific user               |
| `send_test_notification`| superuser    | Sends a test FCM push notification                         |
| `get_token_logs`        | superuser    | Searches request logs by token, with API include/exclude filters |
| `perform_upgrade`       | superuser    | Triggers system upgrade to specified version               |
| `clear_debug_log`       | superuser    | Deletes all records from `debug_log` table                 |
| `analyze_logs`          | superuser    | Analyzes API call frequency by date, IP, and request name  |
| `query_logs`            | superuser    | Queries `log` table with filters (date range, type, substring, error flags) |
| `get_record_change_log` | superuser    | Retrieves change history for a specific DB record from `change_log` |
| `get_user_by_param`     | superuser    | Looks up user by ID or token, returns user info with calculated roles |
| `get_otp_debug_logs`    | superuser    | Retrieves recent OTP debug logs (last 24h)                 |
| `run_query`             | superuser    | Executes arbitrary SQL (blocked in production)             |

---

### 6.5 File Module

**Files:** `api/file.js` (schema), `funcs/file.js` (implementation)  
**Request prefix:** `File/`

#### `File/upload_file_base64`

- **ACL:** Regular user
- **Parameters:** `file_name` (s), `file_data` (s), `access_level` (s, optional, if configured)
- **Logic:** Saves base64-encoded file via `$Files.saveFromBase64()`
- **Returns:** `{file_id: <id>, file_url: <url>}`

#### Multipart Upload Flow

1. **`File/begin_multipart_file_upload`** — Initializes upload: creates `file_multipart` record with metadata (file_name, mime_type, access_level), returns `upload_id`
2. **`File/upload_file_part`** — Uploads individual parts: stores each part in temp directory, updates parts metadata in `file_multipart`, validates part numbers and prevents duplicates
3. **`File/get_multipart_upload_status`** — Returns list of uploaded parts for a given `upload_id`
4. **`File/end_multipart_file_upload`** — Reassembles parts into final file: validates all parts present and sequential, concatenates them, saves to final destination, creates `file` record, cleans up temp parts
5. **`File/abort_multipart_upload`** — Cleans up temp parts and deletes `file_multipart` record

---

### 6.6 SocialLogin Module

**Files:** `api/social_login.js` (schema), `funcs/social_login.js` (implementation)  
**Request prefix:** `SocialLogin/`  
**Status:** Disabled in `using_api.js`

#### Flow Overview

1. **Verify** (`verify_facebook_auth`, `verify_google_auth`, `verify_apple_auth`):
    - Check config flag (e.g., `enable_fb_login`)
    - Validate user ID and access token parameters
    - Server-side token validation is commented out (client-side verification assumed)
    - Call `_createSocialAuthKey()` → hashes social user ID, stores temporary auth key in `social_auth` table with expiry
    - Returns `auth_key` (and optionally `is_registered` flag)

2. **Login** (`login_with_social`):
    - Validates `auth_key` via `_getSocialByAuthKey()` (checks expiry)
    - Deletes auth key from `social_auth`
    - Looks up user by hashed social ID and login authority
    - Delegates to `$User._performLogin()`

3. **Register** (`register_with_social`):
    - Validates auth key and checks user doesn't already exist
    - Within a **transaction**: creates `user` + `user_details` records with social login authority
    - Password field stores the hashed social user ID
    - Updates device info and logs login

---

### 6.7 TwoFactorAuth Module

**Files:** `api/two_factor_auth.js` (schema), `funcs/two_factor_auth.js` (implementation)  
**Request prefix:** `TwoFactorAuth/`

#### Post-Login 2FA Flow

After a login returns `second_factor_key`:

1. **`TwoFactorAuth/send_otp_code`** — Validates `second_factor_key`, retrieves user's phone/email, delegates to `$User._send_otp_code()`, stores verification data (`VerData` JSON) in `USR_2ND_FACTOR_VERIFICATION`
2. **`TwoFactorAuth/resend_otp_code`** — Re-sends the OTP using the same second factor key
3. **`TwoFactorAuth/verify_otp_code`** — Verifies code, clears 2FA fields, performs full login via `$User._performLogin()`. Also checks if password needs changing (`need_change_password` flag based on age or "X" prefix)

#### Factor Change Flow (Authenticated Users)

1. **`TwoFactorAuth/change_factor`** — Validates current password, then accepts new phone/email/password. Generates a `second_factor_key` and stores `USR_PENDING_FACTOR` JSON
2. **`TwoFactorAuth/change_factor_send_otp_code`** — Sends OTP to current contact method for verification
3. **`TwoFactorAuth/change_factor_resend_otp_code`** — Resends OTP
4. **`TwoFactorAuth/change_factor_verify_otp_code`** — Verifies OTP, then applies the pending change (updates phone in `user_details`, email in `user_details`, or password in `user`)

#### `TwoFactorAuth/mandatory_change_password`

- For users flagged with expired password or "X"-prefixed password
- Validates current password, checks new password criteria and non-sameness
- Updates password hash and `USR_PASSWORD_CREATED_ON`, then re-performs login

#### Internal: `VerData` Class

Serializes/deserializes `{field1, field2, authKey}` JSON stored in `USR_2ND_FACTOR_VERIFICATION`.

---

### 6.8 UserRole Module

**Files:** `api/user_role.js` (schema), `funcs/user_role.js` (implementation)  
**Request prefix:** `UserRole/`  
**Status:** Disabled in `using_api.js`

#### Methods

| Method          | ACL   | Description                                             |
|-----------------|-------|---------------------------------------------------------|
| `allow`         | Admin | Adds a role to a user's allow bitmask                   |
| `unallow`       | Admin | Removes a role from a user's allow bitmask              |
| `deny`          | Admin | Adds a role to a user's deny bitmask                    |
| `undeny`        | Admin | Removes a role from a user's deny bitmask               |
| `get_user_roles`| Admin | Gets calculated roles for a specific user               |
| `get_my_roles`  | Regular | Gets calculated roles for the current session user    |

All methods delegate to the `$UserRoles` infrastructure module.

---

## 7. Background Jobs

Located in `backend/platform/jobs/`. These are standalone Node.js processes that initialize the infrastructure via `init_server_config.js` in stand-alone mode.

### Templates (Boilerplate)

| File                       | Type           | Description                                                |
|----------------------------|----------------|------------------------------------------------------------|
| `basic_cron_job.js`        | Cron template  | Template for creating scheduled cron jobs with `$Utils.createCron()` |
| `basic_service.js`         | Queue service  | Template for queue-based message processing service        |
| `basic_socket.js`          | Socket         | Template for starting a WebSocket server                   |
| `basic_socket_service.js`  | Socket service | Template for WebSocket message processing service          |

### Active Jobs

| File                         | Schedule/Trigger | Description                                              |
|------------------------------|------------------|----------------------------------------------------------|
| `cron_monitor_logs.js`       | Every minute (`* * * * *`) | Marks crashes/errors in logs, reports crashes immediately, sends error summaries at configured hours |
| `cron_remove_logs.js`        | Daily at 11:00 (`0 11 * * *`) | Removes log files older than `remove_logs_older_than_days` config. Optionally archives to S3 before deletion |
| `cron_send_mail_from_queue.js` | Queue service | Processes the mailer queue by calling `$MailerQueue.batchSend()` |
| `bulk_action_service.js`     | Queue service  | Processes bulk actions by calling `$BulkAction.execute(actionId)` |

---

## 8. User Modules

Located in `backend/platform/user_modules/`.

This folder contains project-specific reusable modules. User modules are automatically loaded by the infrastructure and accessible via `$ModuleName` global.

### 8.1 Funcs Module

**File:** `user_modules/funcs.js`  
**Global Access:** `$Funcs`  
**Purpose:** Common utility functions shared across multiple API modules

#### `$Funcs.getNextTakenTime(med, today)`

Calculates the next scheduled medication time based on frequency configuration.

- **Parameters:**
    - `med` (object) — Medication record with `MED_FREQUENCY_TYPE` and `MED_FREQUENCY_DATA` fields
    - `today` (string) — Current date in "Y-m-d" format
- **Returns:** (string|null) — Next scheduled datetime in "Y-m-d H:i" format, or null if "when_necessary"
- **Logic:**
    1. Returns null for "when_necessary" frequency type
    2. Parses `MED_FREQUENCY_DATA` JSON to extract `times` array
    3. Compares current time against sorted scheduled times
    4. Returns first future time today, or first time tomorrow if all times have passed
- **Used By:** `Medicine/get_medication_list`, `MedicineGroup/get_group_list`, `MedicineGroup/get_group_details`

**Implementation Note:** This function was refactored from duplicate implementations in `funcs/medicine.js` and `funcs/medicine_group.js` to follow DRY (Don't Repeat Yourself) principles.

---
