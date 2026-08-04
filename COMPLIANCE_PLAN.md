# Compliance Plan: Work History Preservation on Member Removal

## Overview

This document explains the compliance requirement, the current (old) workflow, the proposed (new) workflow, and all changes required across the codebase when a workspace member (RM/user) is removed.

---

## The Compliance Requirement

When an admin or owner removes a member from a workspace:

1. **Activity logs must ALWAYS be preserved** — Every action the removed user performed (lead created, status changed, notes added, etc.) must remain in `ActivityLog` permanently. These are the audit/compliance records and must never be deleted or anonymized.
2. **Lead notes must ALWAYS be preserved** — Notes written by the removed user must remain on leads with the original author reference intact.
3. **Lead assignments must be handled explicitly** — The admin must choose what happens to leads currently assigned to the departing member: either reassign them to another active member, or leave them unassigned.
4. **A compliance log entry must be created** — The removal action must be logged with details of who was removed and what happened to their assigned leads.

---

## Old Workflow (Current — Broken)

```
Admin clicks ✕ on member
        │
        ▼
Browser shows browser confirm()
"Remove Jane from this workspace?"
        │
        ▼
DELETE /api/workspaces/:id/members/:userId
        │
        ▼
Controller: workspaceMember.delete()   ← Only this happens
        │
        ▼
Log: "Member Removed" (email + role only)
        │
        ▼
Response: 200 OK
```

### What the old flow does NOT do:

| Data | Old Behavior | Problem |
|---|---|---|
| `Lead.assignedTo` (member's leads) | Left pointing to removed user | Leads show assigned to a non-member, broken state |
| `ActivityLog.performedBy` | Left intact (NoAction FK) | Logs are preserved — this is correct |
| `LeadNote.addedBy` | Left intact (NoAction FK) | Notes are preserved — this is correct |
| Lead reassignment choice | None — admin has no option | Admin cannot control what happens to leads |
| Compliance log detail | Only email + role in `oldValue`, no `newValue` | No record of what happened to leads |

### Problems Summary

- **Broken lead assignments**: After removal, the dashboard shows leads assigned to a ghost user (not a workspace member). The assigned user filter breaks for those leads.
- **No admin control**: The admin has no way to redistribute the departing member's workload during removal.
- **Incomplete audit trail**: The removal log does not record how many leads were affected or where they went.

---

## New Workflow (Proposed — Compliant)

```
Admin clicks ✕ on member
        │
        ▼
GET /api/workspaces/:id/members/:userId/removal-preview
Returns: { assignedLeadCount: 3, reassignCandidates: [...] }
        │
        ▼
Compliance Modal opens showing:
  - Member name + email
  - "This member has 3 assigned lead(s)"
  - Dropdown: "Reassign leads to" (list of active members) OR "Leave unassigned"
  - Notice: "Activity logs and notes are preserved for compliance"
        │
        ▼
Admin selects reassign target (or leaves blank) → Confirm
        │
        ▼
DELETE /api/workspaces/:id/members/:userId
Body: { reassignTo: <userId> | null }
        │
        ▼
Server validates reassignTo is an active member (if provided)
        │
        ▼
prisma.$transaction([
  lead.updateMany({ assignedTo: targetId } → { assignedTo: reassignTo | null }),
  workspaceMember.delete()
])   ← Atomic: both succeed or both fail
        │
        ├── ActivityLog rows (performedBy = removed user) → NEVER TOUCHED ✓
        └── LeadNote rows (addedBy = removed user)        → NEVER TOUCHED ✓
        │
        ▼
Compliance Log Entry:
  actionType : "Member Removed"
  oldValue   : "Jane Smith <jane@co.com> (editor)"
  newValue   : "3 lead(s) reassigned to John Doe <john@co.com>"
             OR "3 lead(s) unassigned"
             OR "no leads assigned"
        │
        ▼
Response: 200 OK
Modal closes, workspace refreshes
```

---

## Side-by-Side Comparison

| Step | Old Workflow | New Workflow |
|---|---|---|
| Trigger | Browser `confirm()` dialog | Compliance modal (proper UI) |
| Lead assignment preview | Not shown | Shows count of assigned leads |
| Reassign option | None | Dropdown with active members |
| Lead update | Not done | `lead.updateMany()` atomic with member delete |
| Member delete | `workspaceMember.delete()` | Same, inside `$transaction` |
| ActivityLog rows | Left intact (accidental) | Left intact (intentional compliance) |
| LeadNote rows | Left intact (accidental) | Left intact (intentional compliance) |
| Compliance log `newValue` | Empty | "3 lead(s) reassigned to..." or "unassigned" |
| Atomicity | No transaction | Full `$transaction` wrapping lead update + member delete |
| Error if reassignTo invalid | Not validated | Returns 400 before any writes |

---

## Data That Is Preserved (Compliance Records)

### ActivityLog
```
ActivityLog {
  id          : 42
  actionType  : "Status Changed"
  performedBy : 7          ← Jane's user ID — STAYS FOREVER
  leadId      : 15
  workspaceId : 3
  oldValue    : "New"
  newValue    : "Contacted"
  timestamp   : 2025-03-10T09:00:00Z
}
```
Even after Jane is removed, this log remains with `performedBy = 7`. When rendered on the Logs page, it still shows "Jane Smith" because the `User` record is not deleted — only the `WorkspaceMember` record is removed.

### LeadNote
```
LeadNote {
  id        : 19
  leadId    : 15
  text      : "Called client, follow up Friday"
  addedBy   : 7          ← Jane's user ID — STAYS FOREVER
  createdAt : 2025-03-10T10:30:00Z
}
```
The note remains on the lead. The author reference remains intact.

---

## Data That Changes

### Lead (on removal)
```
Before:
Lead { id: 15, assignedTo: 7, status: "In Progress" }

After (reassigned):
Lead { id: 15, assignedTo: 9, status: "In Progress" }   ← John takes over

After (unassigned):
Lead { id: 15, assignedTo: null, status: "In Progress" } ← Nobody assigned
```

### New Compliance Log Entry
```
ActivityLog {
  actionType  : "Member Removed"
  performedBy : 2          ← Admin who removed Jane
  workspaceId : 3
  leadId      : null       ← Workspace-level event
  oldValue    : "Jane Smith <jane@co.com> (editor)"
  newValue    : "3 lead(s) reassigned to John Doe <john@co.com>"
  timestamp   : 2025-03-29T14:00:00Z
}
```

---

## Files to Change

### Backend

**1. `server/src/controllers/workspaceController.js`**
- **Add** `getMemberRemovalPreview` function (new export):
  - `GET /api/workspaces/:id/members/:userId/removal-preview`
  - Returns `assignedLeadCount` and `reassignCandidates[]`
- **Replace** `removeMember` function:
  - Accept optional `reassignTo` in request body
  - Validate `reassignTo` is an active member (if provided)
  - Wrap `lead.updateMany()` + `workspaceMember.delete()` in `$transaction`
  - Create detailed compliance log with lead outcome in `newValue`

**2. `server/src/routes/workspaceRoutes.js`**
- **Add** one GET route before the existing DELETE route:
  ```
  GET  /:id/members/:userId/removal-preview  → getMemberRemovalPreview
  DELETE /:id/members/:userId               → removeMember (existing, unchanged path)
  ```

### Frontend

**3. `client/src/store/slices/workspaceSlice.js`**
- **Update** `removeMember` thunk to accept `reassignTo` parameter
- Pass `reassignTo` as request body: `api.delete(url, { data: { reassignTo } })`

**4. `client/src/pages/WorkspaceSettingsPage.jsx`**
- **Add** `import api from '../api/axios'`
- **Add** 5 new state variables for the modal
- **Replace** `handleRemove` (currently 9 lines using `confirm()`) with:
  - `handleRemove` — opens modal + fetches preview
  - `closeRemoveModal` — resets modal state
  - `handleConfirmRemove` — dispatches removal with reassignment
- **Update** remove button `onClick` to pass email and role
- **Add** Remove Member compliance modal JSX (after existing Transfer Ownership modal)

---

## No Schema Changes Required

The Prisma schema already uses `onDelete: NoAction` on all user-related foreign keys:

| Table | Field | onDelete |
|---|---|---|
| `activity_logs` | `performedBy` → User | NoAction |
| `activity_logs` | `leadId` → Lead | NoAction |
| `lead_notes` | `addedBy` → User | NoAction |
| `leads` | `assignedTo` → User | NoAction |

This means no database migration is needed. The foreign keys remain valid because the `User` record itself is never deleted — only the `WorkspaceMember` association is removed.

---

## Edge Cases Handled

| Scenario | Handling |
|---|---|
| Member has zero assigned leads | Modal shows green "no assigned leads" box, no dropdown shown |
| `reassignTo` user leaves workspace between preview and confirm | Server re-validates against live workspace members, returns 400 |
| `reassignTo` is same user being removed | Caught by `m.userId !== targetId` check, returns 400 |
| Two admins remove same user simultaneously | Second request gets Prisma `RecordNotFound`, returns 500 (acceptable) |
| Admin tries to remove workspace owner | Blocked at both preview and confirm endpoints (403) |
| Admin (non-owner) tries to remove another admin | Blocked (403) |

---

## Verification Steps

1. Go to **Workspace Settings** as admin
2. Click **✕** on a member who has assigned leads
   - Modal should open showing lead count and reassign dropdown
3. Select a reassign target → **Confirm Remove**
   - Member disappears from settings
   - Go to Dashboard → leads now assigned to the selected member
4. Repeat without selecting reassign target
   - Leads in Dashboard show as unassigned
5. Go to **Logs** page
   - "Member Removed" entry shows `oldValue` = removed member name/email/role
   - `newValue` = how many leads and where they went
6. Check **Logs** for old entries by the removed user
   - They still appear with the removed user's name (not deleted)
7. Open a lead's **Notes** tab in the detail modal
   - Notes written by the removed user still show with their name
