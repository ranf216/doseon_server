# DoseOn — Development Insights

**Document Version:** 1.2.0
**Last Updated:** March 10, 2026

---

This document captures architectural decisions, clarifications, and insights gathered during development that are not explicitly stated in the design specification.

---

## User Types & Contexts

The system has **2 user types**:

| User Type | Description |
|---|---|
| **Admin** | System administrator with access to the Admin Webpage / Management System |
| **Regular** | A standard app user (mobile) |

A Regular user operates in **2 contexts** — both available within the same account:

| Context | Role | Access |
|---|---|---|
| **Care Recipient** | Primary context. The user manages their own medications, schedules, reminders, and intake logging. | Full read/write on own data |
| **Care Taker** | Secondary context. The user monitors and supports another user (a Care Recipient) they were invited by. | Read-only on the Care Recipient's data |

**Key point:** Care Recipient and Care Taker are *not* separate user types or accounts. A single Regular user can simultaneously be a Care Recipient (for their own medications) and a Care Taker (for one or more other users). The context determines which data and capabilities are available, not the account type.
