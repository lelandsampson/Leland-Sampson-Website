# Scheduling Web App Project (GitHub Pages + Excel Record Export + ICS Export)

## Overview
This project builds a **static GitHub Pages web app** (HTML + JavaScript) for creating and editing weekly weekday shift schedules for a fixed set of assets.

The app should help the user:
- Select the week to schedule
- Enter week-specific availability constraints in 30-minute chunks
- Combine those weekly constraints with default asset availability
- Generate a proposed Monday-Friday schedule
- Review and edit the proposed schedule with draggable calendar events
- Generate a formatted Excel workbook for record keeping
- Export assignments to Outlook `.ics`

### Key Design Choice: Web-First Static App
- Users enter schedule inputs in the webpage first
- App generates a proposed schedule in-browser
- Users can edit, warn on invalid manual moves, and lock assignments in the webpage
- Users can download a formatted `.xlsx` workbook for record keeping
- Users can export the schedule to Outlook `.ics`

No Python required  
No backend/server required  
Deployable on GitHub Pages

---

## Tech Stack

- HTML (UI)
- JavaScript (logic)
- SheetJS (`xlsx`) for Excel parsing and workbook creation
- ICS generation (plain JS)
- GitHub Pages for static hosting

---

## Assets To Schedule

The app should include these assets in the generated Excel record workbook:

| AssetID | AssetName | Active |
|---|---|---|
| BH | BH | TRUE |
| CH | CH | TRUE |
| JH | JH | TRUE |
| BL | BL | TRUE |
| CM | CM | TRUE |
| JM | JM | TRUE |
| LS | LS | TRUE |
| ES | ES | TRUE |
| JB | JB | TRUE |
| AD | AD | TRUE |
| JG | JG | TRUE |
| RT | RT | TRUE |
| JWT | JWT | TRUE |

---

## Workflow

1. User opens `index.html`
2. User selects the week to schedule
   - V1 schedules one week at a time only
   - The chosen week generates Monday-Friday schedule dates
3. App loads constant/default constraints:
   - Asset list
   - Default asset availability
   - Target hour ranges
   - Shift coverage requirements
4. User enters week-specific constraints:
   - Asset unavailable days
   - Asset unavailable time blocks in 30-minute chunks
   - Primary input should be a graphical weekly availability grid, similar to a desktop Outlook calendar
5. User confirms weekly availability for all assets
6. User clicks **Generate Schedule**
7. App proposes a schedule for work days only:
   - Monday
   - Tuesday
   - Wednesday
   - Thursday
   - Friday
8. User reviews and edits the proposed schedule
9. User can:
   - Save Excel -> download record-keeping `.xlsx`
   - Export ICS -> download `.ics` for Outlook
   - Save Session JSON -> download backup `.json`
   - Load Session JSON -> restore a previous weekly session

---

## Important Constraints

GitHub Pages is static hosting only.

Implications:
- No backend code runs on the server.
- The app cannot write changes back to the GitHub repository.
- Config CSV files can be loaded with `fetch()` because they are served over HTTP from GitHub Pages.
- Session data is stored in the user's browser `localStorage`.
- Excel, ICS, and JSON backups are generated as browser downloads.
- Updating default config means editing the CSV files in the repo and redeploying GitHub Pages.

---

## V1 Scope

V1 should schedule one week at a time.

Included:
- Monday-Friday scheduling only
- Graphical 30-minute availability grid
- Rolling six-week schedule selector
- Desktop browser target
- GitHub Pages deployment
- Constant default availability by asset
- Week-specific unavailability entered by the user
- Target hour range by asset
- Proposed schedule generation
- Excel export
- ICS export

Excluded from V1:
- Multi-week optimization
- Recurring schedule generation across several weeks
- Cloud storage
- User accounts
- Writing changes back to the GitHub repository

---

## Configuration Files

The app should keep constant scheduling inputs in static CSV configuration files served from the GitHub Pages site. These are not week-specific.

Recommended files:
- `config/default_availability.csv`
- `config/default_role_eligibility.csv`
- `config/asset_targets.csv`

Because the app is deployed on GitHub Pages, the V1 approach is to edit the CSV files in the repository, commit the changes, and let GitHub Pages redeploy the static site.

Browsers cannot silently overwrite files in the GitHub repository. Any app-generated update must be downloaded by the user and manually committed if it should become a new default config file.

The app may cache loaded config metadata in browser `localStorage`, but the CSV files in the repository should remain the durable source of truth.

For V1, load configuration CSV data with `fetch()` from:
- `config/default_availability.csv`
- `config/default_role_eligibility.csv`
- `config/asset_targets.csv`

The app should fail clearly if config files cannot be loaded.

---

## GitHub Pages Deployment

The app should be deployable as a static GitHub Pages site.

Recommended repo structure:

```text
/
  index.html
  styles.css
  app.js
  config/
    default_availability.csv
    default_role_eligibility.csv
    asset_targets.csv
  exports/
    excel.js
    ics.js
  ui/
    tabs.js
    toolbar.js
    week-selector.js
    setup-panel.js
    availability-editor.js
    phone-eligibility.js
    schedule-calendar.js
    target-summary.js
    warnings-panel.js
```

Deployment behavior:
- GitHub Pages serves the static files over HTTPS.
- JavaScript loads CSV config files with `fetch()`.
- Config updates are made by editing CSV files in the repository and redeploying.
- The app stores weekly working sessions in the user's browser `localStorage`.
- JSON, Excel, and ICS files are generated as browser downloads.
- The app should show a clear configuration load error if any required CSV cannot be fetched or parsed.

---

## Excel Record Workbook Structure

### Sheet: Instructions
Human-readable instructions explaining how to fill out each sheet.

### Sheet: ScheduleWeek
Defines the week represented by the workbook.

| WeekStartDate | WeekEndDate | Notes |
|---|---|---|
| 2026-05-04 | 2026-05-08 | Monday-Friday only |

### Sheet: Assets
Defines the assets that can be scheduled.

| AssetID | AssetName | Active | Notes |
|---|---|---|---|
| BH | BH | TRUE |  |
| CH | CH | TRUE |  |

### Sheet: Shifts
Defines the shift schedule.

| ShiftID | Label | StartTime | EndTime | Hours | Active | Notes |
|---|---|---|---|---:|---|---|
| MORNING | Morning | 08:00 | 12:00 | 4 | TRUE | Default block |
| AFTERNOON | Afternoon | 12:00 | 16:00 | 4 | TRUE | Default block |
| EVENING | Evening | 16:00 | 19:30 | 3.5 | TRUE | Default block |
| PHONE_0800 | Phone 8-10 | 08:00 | 10:00 | 2 | TRUE | Default phone block |
| PHONE_1000 | Phone 10-12 | 10:00 | 12:00 | 2 | TRUE | Default phone block |
| PHONE_1200 | Phone 12-2 | 12:00 | 14:00 | 2 | TRUE | Default phone block |
| PHONE_1400 | Phone 2-4 | 14:00 | 16:00 | 2 | TRUE | Default phone block |

`Hours` should usually equal the time between `StartTime` and `EndTime`, but keeping it explicit makes reporting and validation easier.

Default assignment blocks should favor:
- `08:00-12:00`
- `12:00-16:00`
- `16:00-19:30`

Splits inside these windows are allowed, but the scheduler should prefer a minimum assignment length of 2 hours per asset per day.

Phone shifts should default to 2-hour blocks.

### Sheet: CoverageRequirements
Defines how many assets are needed for each position, day, and shift.

| DayOfWeek | ShiftID | Position | RequiredAssets | Notes |
|---|---|---|---:|---|
| Monday | MORNING | Info Desk | 2 | 8:00 AM-12:00 PM |
| Monday | AFTERNOON | Info Desk | 2 | 12:00 PM-4:00 PM |
| Monday | EVENING | Info Desk | 2 | 4:00 PM-7:30 PM |
| Monday | PHONE_0800 | Phone | 1 | 8:00 AM-10:00 AM |
| Monday | PHONE_1000 | Phone | 1 | 10:00 AM-12:00 PM |
| Monday | PHONE_1200 | Phone | 1 | 12:00 PM-2:00 PM |
| Monday | PHONE_1400 | Phone | 1 | 2:00 PM-4:00 PM |
| Tuesday | MORNING | Info Desk | 2 | 8:00 AM-12:00 PM |
| Tuesday | AFTERNOON | Info Desk | 2 | 12:00 PM-4:00 PM |
| Tuesday | EVENING | Info Desk | 2 | 4:00 PM-7:30 PM |
| Wednesday | MORNING | Info Desk | 2 | 8:00 AM-12:00 PM |
| Wednesday | AFTERNOON | Info Desk | 2 | 12:00 PM-4:00 PM |
| Wednesday | EVENING | Info Desk | 2 | 4:00 PM-7:30 PM |
| Thursday | MORNING | Info Desk | 2 | 8:00 AM-12:00 PM |
| Thursday | AFTERNOON | Info Desk | 2 | 12:00 PM-4:00 PM |
| Thursday | EVENING | Info Desk | 2 | 4:00 PM-7:30 PM |
| Friday | MORNING | Info Desk | 2 | 8:00 AM-12:00 PM |
| Friday | AFTERNOON | Info Desk | 2 | 12:00 PM-4:00 PM |
| Friday | EVENING | Info Desk | 2 | 4:00 PM-7:30 PM |

V1 coverage rules:
- Monday-Friday require 2 assets assigned to `Info Desk` from 8:00 AM-7:30 PM.
- Monday also requires 1 asset assigned to `Phone` from 8:00 AM-4:00 PM.
- Monday `Phone` coverage should be broken into default 2-hour shifts.
- No `Phone` coverage is required Tuesday-Friday unless added later.
- All assets are equally qualified for `Info Desk`.
- Only assets marked phone-eligible for the selected week can be assigned to `Phone`.
- Phone eligibility can change week to week and should be entered as part of the weekly scheduling session.
- An asset cannot work both `Info Desk` and `Phone` on the same day.
- Some assets may be available for `Phone` on Mondays but not available for `Info Desk` shifts. Role eligibility must be checked separately from time availability.
- If all required assignments cannot be filled, prioritize `Info Desk` assignments over `Phone` assignments.

### Sheet: AssetTargets
Defines the target range of total scheduled hours for each asset.

| AssetID | MinHours | TargetHours | MaxHours | Notes |
|---|---:|---:|---:|---|
| BH | 20 | 24 | 28 |  |
| CH | 20 | 24 | 28 |  |

Scheduling should aim for `TargetHours`, while treating `MinHours` and `MaxHours` as the acceptable range.

Targets are weekly. `Info Desk` and `Phone` hours count toward the same weekly total. If target-hour constraints conflict with required coverage, the app should fill required coverage where possible and alert the user about the target conflict.

### Sheet: DefaultAvailability
Defines each asset's normal available working windows. These are constant constraints and should be pre-filled in the app.

| AssetID | DayOfWeek | AvailableStart | AvailableEnd | Timezone | Notes | Reviewer |
|---|---|---|---|---|---|---|
| JG | Monday | 11:00 | 19:30 | America/New_York | Default availability | FALSE |
| JG | Tuesday | 11:00 | 19:30 | America/New_York | Default availability | FALSE |
| JG | Thursday | 11:00 | 19:30 | America/New_York | Default availability | FALSE |
| JG | Friday | 11:00 | 19:30 | America/New_York | Default availability | FALSE |

If an asset is normally unavailable on a day, omit that day from `DefaultAvailability`.

If an asset row exists but `AvailableStart` and `AvailableEnd` are blank, that means the asset is unavailable all day for that day.

The graphical grid should use Eastern US time. The earliest visible time is `08:00`; the latest visible time is `19:30`.

`Reviewer` marks whether the asset can serve as the reviewer for that day and shift. Use `TRUE` for reviewer-qualified assets, leave blank or use `FALSE` otherwise, or specify shift IDs separated by semicolons when reviewer eligibility is shift-specific.

Examples:
- `TRUE` means reviewer-eligible for all available shifts that day.
- `FALSE` or blank means not reviewer-eligible that day.
- `MORNING;AFTERNOON` means reviewer-eligible only for those shifts.

For compatibility, the parser should accept either `Reviewer` or `Reviewer?` as the column name.

Reviewer coverage is only relevant to `Info Desk`. Phone shifts should ignore reviewer status.

Reviewer coverage is a soft scheduling preference, not a hard constraint. The scheduler should make a best effort to place at least one reviewer on each `Info Desk` shift, but it may still create the schedule if no reviewer is available. `EVENING` Info Desk shifts should not consider reviewer status; only availability, role eligibility, and other hard generation rules apply.

### Sheet: DefaultRoleEligibility
Defines an asset's normal eligibility by role and day. This is separate from time availability.

| AssetID | DayOfWeek | Role | Eligible | Notes |
|---|---|---|---|---|
| BH | Monday | Info Desk | TRUE |  |
| BH | Monday | Phone | FALSE |  |
| CH | Monday | Info Desk | FALSE | Phone only Monday example |
| CH | Monday | Phone | TRUE | Phone only Monday example |

Use this sheet to represent assets who are available for `Phone` on Mondays but not available for Monday `Info Desk` shifts. For those assets, set Monday `Info Desk` to `FALSE` and Monday `Phone` to `TRUE`.

### Sheet: WeeklyPhoneEligibility
Defines which assets can work `Phone` for the selected week. This can change week to week.

| AssetID | EligibleForPhone | Notes |
|---|---|---|
| BH | TRUE |  |
| CH | FALSE |  |

If an asset is not marked `TRUE`, the scheduler must not assign that asset to `Phone`.

Weekly phone eligibility is a per-session UI value, not a separate source config file. It should default from `DefaultRoleEligibility`, then the user can edit it for the selected week in the UI. Phone eligibility applies to the whole Monday in V1, not to individual 2-hour phone blocks.

Phone availability should use the same availability logic as Info Desk availability. The asset must be time-available after default availability and weekly unavailability are applied.

To be scheduled on `Phone`, an asset must pass both:
- `DefaultRoleEligibility`
- weekly phone eligibility selected in the UI
- availability after applying default availability and weekly unavailability

### Sheet: WeeklyUnavailability
Defines week-specific exceptions entered by the user for the selected week.

Recommended format:

| AssetID | Date | DayOfWeek | UnavailableStart | UnavailableEnd | AllDay |
|---|---|---|---|---|---|
| BH | 2026-05-04 | Monday |  |  | TRUE |
| CH | 2026-05-05 | Tuesday | 09:00 | 10:30 | FALSE |

How to denote unavailability:
- Use one row per unavailable asset/date/time block.
- If the asset is unavailable for the full day, set `AllDay` to `TRUE` and leave `UnavailableStart` and `UnavailableEnd` blank.
- If the asset is unavailable only for part of a day, set `AllDay` to `FALSE` and enter the unavailable time window.
- Time windows should align to 30-minute boundaries, such as `09:00`, `09:30`, `10:00`, or `10:30`.
- `Date` should be the source of truth; `DayOfWeek` is mainly for readability.
- Unavailable blocks are hard constraints.

Examples:
- BH unavailable all day Monday: `BH | 2026-05-04 | Monday | blank | blank | TRUE`
- CH unavailable Tuesday from 9:00-10:30: `CH | 2026-05-05 | Tuesday | 09:00 | 10:30 | FALSE`

### Sheet: AvailabilityGrid
Optional machine-friendly representation of available 30-minute chunks for the selected week.

| Date | DayOfWeek | Time | BH | CH | JH | BL | CM | JM | LS | ES | JB | AD | JG | RT | JWT |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-05-04 | Monday | 08:00 | TRUE | TRUE | TRUE | TRUE | TRUE | TRUE | TRUE | TRUE | TRUE | TRUE | FALSE | TRUE | TRUE |
| 2026-05-04 | Monday | 08:30 | TRUE | TRUE | TRUE | TRUE | TRUE | TRUE | TRUE | TRUE | TRUE | TRUE | FALSE | TRUE | TRUE |

This sheet can be generated by the app after combining `DefaultAvailability` and `WeeklyUnavailability`.

The webpage should present this as an editable 30-minute grid, not as raw spreadsheet rows.

---

## Graphical Availability UI

The primary V1 input method for weekly availability should be a graphical calendar-style grid, similar to the desktop Outlook calendar UI.

This is a week-to-week view. The user must confirm all assets' availability for the selected week before auto-generating that week's schedule.

Each active asset should start the selected week with an `Unconfirmed` availability status. The user must check an **Availability confirmed** checkbox for each asset before schedule generation is allowed. **Generate Schedule** should remain disabled until every active asset is confirmed.

### Layout

- Show one schedule week at a time.
- Let the user toggle through a rolling six future weeks.
- Display Monday-Friday as columns.
- Display time as vertical rows in 30-minute increments.
- Show `08:00-19:30` Eastern US time.
- Let the user select one asset at a time using a dropdown, tabs, or asset list.
- When an asset is selected, show that asset's availability for the selected week.
- Pre-fill the grid from `DefaultAvailability`.
- Apply `WeeklyUnavailability` visually as blocked/unavailable time.

### Interaction

The user should be able to:
- Click a 30-minute block to toggle availability.
- Click and drag across multiple 30-minute blocks to mark a time range unavailable.
- Mark an entire day unavailable for the selected asset.
- Clear unavailable blocks for a selected day or range.

### Visual States

Recommended visual states:

| State | Meaning |
|---|---|
| Available | Asset can be scheduled in this block |
| Default Unavailable | Asset is normally unavailable based on default availability |
| Weekly Unavailable | Asset is unavailable due to a user-entered weekly exception |
| Selected Range | User is currently selecting or editing these blocks |
| Scheduled | Asset has been assigned to a position during this block |

The UI should make the difference between default unavailability and weekly exceptions clear, because weekly exceptions are user-entered and may need to be edited before generating the schedule.

### Data Output

The graphical grid should write user-entered exceptions into `WeeklyUnavailability`.

Example interaction:
- User selects asset `JG`.
- User blocks Tuesday from `09:00` to `10:30`.
- App stores:

| AssetID | Date | DayOfWeek | UnavailableStart | UnavailableEnd | AllDay |
|---|---|---|---|---|---|
| JG | 2026-05-05 | Tuesday | 09:00 | 10:30 | FALSE |

The app may also generate `AvailabilityGrid` as a machine-friendly sheet after combining default availability and weekly exceptions, but users should not need to edit raw grid rows manually.

---

## Visual Schedule UI

After the user clicks **Generate Schedule**, the app should preview the proposed schedule in a calendar-style view.

Requirements:
- The target device is a desktop browser.
- Show Monday-Friday.
- Show `08:00-19:30` Eastern US time.
- Render each assignment as a floating event block.
- Each event should show role, asset, time, lock state, reviewer indicator, and warning state if applicable.
- Events should be draggable so the user can adjust assignments manually.
- Dragging an event should revalidate availability, role eligibility, daily role conflicts, and weekly target hours.
- Dragging an event should also recheck whether each shift still has reviewer coverage.
- Hard constraints are hard only for auto-generation. Invalid manual moves should be allowed, but the event and warning panel must clearly show the violated rule.
- Users should be able to lock assignments.
- Users should be able to confirm and lock auto-generated assignments.
- Manual edits should be lockable.
- Regenerating the schedule should preserve locked assignments.
- The target-hour summary should always be visible while the user reviews or drags assignments.
- Warnings should be shown directly on the affected event and in a summary panel.
- Dragging an asset onto an already-filled assignment block should keep all assigned assets in that block and surface a `TOO_MANY_ASSIGNED_TO_SHIFT` warning when the block exceeds required coverage.
- Every assignment block should show an `x` remove control next to each assigned asset.
- The user should be able to remove any or all assigned assets from a block using those `x` controls.
- Every assignment block should provide a manual asset selector so the user can add or replace an asset after removing one.
- Assigned asset pills should be draggable onto another assignment block.
- Dragging an asset pill onto an occupied block should add the asset to the target block without removing existing assigned assets.
- Dragging an asset pill onto an empty block should fill that block.
- If removing assets causes required coverage to become unfilled, surface an `UNCOVERED_SLOT` warning for that block.
- Calendar drag/drop should snap to 30-minute increments.
- Drag/drop should not silently split assignments.
- Manual drag moves should lock the moved assignment by default.
- The user should be able to unlock manually moved assignments.
- Removing an asset from an assignment block should mark the block as manually edited and locked by default.
- The user should be able to unlock the block afterward if they want regeneration to refill it.

### First Screen

The first screen should present a compact six-week calendar selector. The current week workspace should appear below it.

When the user selects a week to edit:
- The calendar selector should minimize.
- The user should be able to expand it again with a click.
- The workspace should load the selected week's localStorage session if one exists.
- If no local session exists, the workspace should start from default config.

Availability editing should be asset-first.

The UI should track whether each asset's weekly availability has been confirmed. **Generate Schedule** should remain disabled until all active assets have been confirmed for the selected week.

If the user edits an asset's availability after confirming it, the asset should return to `Unconfirmed` until the user confirms it again.

### Sheet: Assignments
Stores the working schedule.

| Date | DayOfWeek | ShiftID | Position | SlotNumber | AssetID | StartTime | EndTime | Hours | Notes |
|---|---|---|---|---:|---|---|---|---:|---|
| 2026-05-04 | Monday | MORNING | Info Desk | 1 | BH | 08:00 | 12:00 | 4 |  |
| 2026-05-04 | Monday | MORNING | Info Desk | 2 | CH | 08:00 | 12:00 | 4 |  |
| 2026-05-04 | Monday | PHONE_0800 | Phone | 1 | JH | 08:00 | 10:00 | 2 |  |

Only Monday-Friday dates should be created or validated.

The V1 Excel export should omit internal `Locked`, `Warning`, `IsReviewer`, and `GeneratedManual` fields. Those values remain in JSON/session state and UI state only.

Internal assignment object shape:

```json
{
  "id": "2026-05-04-MORNING-INFO-1",
  "date": "2026-05-04",
  "dayOfWeek": "Monday",
  "shiftId": "MORNING",
  "position": "Info Desk",
  "slotNumber": 1,
  "assetId": "CH",
  "startMinute": 480,
  "endMinute": 720,
  "locked": false,
  "isReviewer": true,
  "source": "generated",
  "warningCodes": []
}
```

### Sheet: Summary
Calculated/reporting sheet showing total scheduled hours by asset.

| AssetID | ScheduledHours | MinHours | TargetHours | MaxHours | Status |
|---|---:|---:|---:|---:|---|
| BH | 24 | 20 | 24 | 28 | On Target |

Possible `Status` values:
- Under Min
- On Target
- Over Max

---

## Scheduling Logic

For the selected schedule week:
- Schedule only Monday-Friday
- Include only active assets
- Include only active shifts
- Create required assignment slots from `CoverageRequirements`
- Generate 30-minute availability slots for each asset using `DefaultAvailability`
- Apply `WeeklyUnavailability` as exceptions to the default availability
- Exclude assets unavailable for any part of a candidate assignment
- Prevent assigning the same asset to overlapping shifts
- Prevent assigning an asset to both `Info Desk` and `Phone` on the same day
- Enforce a maximum of 4 scheduled hours per asset per day across `Info Desk` and `Phone`
- Prevent assigning an asset to multiple Monday phone blocks
- Allow only assets that pass `DefaultRoleEligibility`, weekly phone eligibility selected in the UI, and availability checks to be assigned to `Phone`
- Respect `DefaultRoleEligibility` so an asset can be available for `Phone` but blocked from `Info Desk` on the same day
- Prefer default assignment blocks of `08:00-12:00`, `12:00-16:00`, and `16:00-19:30`
- Prefer default `Phone` blocks of 2 hours
- Prefer a minimum assignment length of 2 hours per asset per day when splits are needed
- Prefer keeping an asset on one continuous block when possible
- A shift should default to one continuous block:
  - Info Desk: `08:00-12:00`, `12:00-16:00`, `16:00-19:30`
  - Phone: `08:00-10:00`, `10:00-12:00`, `12:00-14:00`, `14:00-16:00`
- If needed, a 4-hour Info Desk block can be divided into two 2-hour assignments to work around 30-minute availability exceptions
- Splitting a 4-hour block is allowed but not preferred
- Make a best effort to assign at least one `Reviewer` asset to each non-evening `Info Desk` shift
- Ignore reviewer status for `Phone` and `EVENING` Info Desk shifts
- Treat reviewer coverage as a soft preference; do not leave a required shift uncovered only because no reviewer is available
- Track each asset's scheduled hours
- Prioritize target hours when choosing between valid assignments
- If a reviewer is at or closer to target hours than a non-reviewer, prefer the non-reviewer
- Avoid exceeding `MaxHours`
- Warn if an asset remains below `MinHours`
- Warn if any required `CoverageRequirements` slot cannot be filled
- Warn if a non-evening `Info Desk` shift has no reviewer assigned
- Alert the user if target-hour constraints conflict with required coverage
- If full coverage is not possible, prioritize `Info Desk` over `Phone`
- If an asset can fill either an open `Info Desk` assignment or an open `Phone` assignment but not both, prefer the `Info Desk` assignment regardless of day
- If the schedule cannot fill all required assignments because of constraints, surface a clear error to the user
- Do not allow auto-generation to schedule an asset over `MaxHours`; surface a warning/unfilled coverage error instead
- Preserve locked assignments even when they violate rules, and show warnings on those assignments
- Locked assignments count against daily max hours and weekly target hours
- Locked invalid assignments block auto-generation from using that asset elsewhere on the same day
- Manually moving an assignment should lock it by default
- The user can unlock a manually moved assignment if they want it to be eligible for regeneration

Weekend dates should be ignored or flagged as invalid.

Scheduling priority order:
1. Fill required `Info Desk` slots.
2. Fill required `Phone` slots.
3. Prefer assets furthest below weekly target.
4. Avoid assets near `MaxHours`.
5. Prefer reviewer coverage for non-evening `Info Desk` only when it does not harm target-hour balance.
6. Prefer unsplit continuous blocks.

Hard constraints:
- Availability.
- Role eligibility.
- Maximum 4 scheduled hours per asset per day.
- No `Info Desk` and `Phone` on the same day.
- No multiple Monday phone blocks for the same asset.

For auto-generation, hard constraints must be enforced. For manual edits, the UI may allow violations but must show clear warnings.

Soft preferences:
- Hit weekly target hours.
- Use reviewer coverage when doing so does not materially harm target-hour balance.
- Keep assignments continuous.

`Closer to target` means `TargetHours - ScheduledHours`. Larger positive values are further below target and should be preferred over assets already near or at target.

### Split Shift Rules

- Split only `MORNING` and `AFTERNOON` Info Desk blocks.
- Do not split `EVENING` Info Desk blocks in V1.
- Do not split `Phone` blocks.
- Split `MORNING` into `08:00-10:00` and `10:00-12:00`.
- Split `AFTERNOON` into `12:00-14:00` and `14:00-16:00`.
- A split block still requires 2 assets at all times.
- If the same asset can cover both halves, treat it as the normal unsplit 4-hour assignment.
- Splitting is allowed only when needed to work around weekly 30-minute availability exceptions or otherwise improve feasibility.
- A 2-hour split assignment satisfies the daily assignment rule.
- The effective daily limit is a maximum of 4 scheduled hours per asset per day, rather than an absolute one-shift-per-day rule.

### Warning Codes

Warnings should use stable codes so UI, JSON session data, and internal validation stay consistent. V1 Excel export should omit warnings.

| Code | Meaning |
|---|---|
| `UNAVAILABLE` | Assignment overlaps unavailable time |
| `ROLE_INELIGIBLE` | Asset is not eligible for the assigned role/day |
| `PHONE_NOT_WEEKLY_ELIGIBLE` | Asset is not phone-eligible for the selected week |
| `DAILY_MAX_EXCEEDED` | Assignment causes asset to exceed daily max hours |
| `INFO_AND_PHONE_SAME_DAY` | Asset is assigned to both Info Desk and Phone on the same day |
| `MULTIPLE_PHONE_BLOCKS` | Asset is assigned to more than one Monday phone block |
| `NO_REVIEWER` | Non-evening Info Desk shift has no reviewer |
| `UNDER_TARGET` | Asset is below weekly minimum or target range |
| `OVER_TARGET` | Asset is over weekly max hours |
| `UNCOVERED_SLOT` | Required coverage slot could not be filled |
| `TOO_MANY_ASSIGNED_TO_SHIFT` | More assets are assigned to a shift block than required |

Warning severity:

| Severity | Codes |
|---|---|
| Informational | All warning codes |

Warnings should not block Excel export or ICS export. They are informational and should help the user understand schedule quality or rule violations.

### Internal Data Model

Use one canonical internal data model and export Excel, ICS, JSON, and UI state from it.

Recommended top-level collections:
- `assets`
- `defaultAvailability`
- `roleEligibility`
- `weeklyPhoneEligibility`
- `weeklyUnavailability`
- `availabilityConfirmations`
- `coverageRequirements`
- `assignments`
- `warnings`

Store times internally as minutes after midnight. Convert to display strings such as `08:00` only for UI, Excel, JSON readability, and ICS export.

---

## ICS Export

Each covered shift should become one calendar event:

- `MORNING` Info Desk title format: `Ref AM: asset 1 & asset 2`
- `AFTERNOON` Info Desk title format: `Ref PM: asset 1 & asset 2`
- `EVENING` Info Desk title format: `Ref x 4:30: asset 1 & asset 2`
- `PHONE_0800` title format: `Phone 8-10: asset`
- `PHONE_1000` title format: `Phone 10-12: asset`
- `PHONE_1200` title format: `Phone 12-2: asset`
- `PHONE_1400` title format: `Phone 2-4: asset`
- Start/end time based on assignment date and shift time
- Export as `.ics`
- Import into Outlook
- Monday phone coverage should export as four separate phone shift events.
- Info Desk events should use the category/tag `Reference Desk Schedule`.
- Phone events should use the category/tag `Phone coverage`.
- Desired category colors are yellow for `Reference Desk Schedule` and peach for `Phone coverage`.
- ICS can include categories, but default event color/shading is not reliable across Outlook imports. V1 should include the categories and treat category names and colors as best-effort/client-dependent.
- Export assignments only.
- Do not export warnings.
- Do not include locked/manual status in ICS descriptions.
- Do not require extra confirmation before ICS export.
- If invalid assignments are skipped during export, show an export summary such as `Exported 18 events. Skipped 2 invalid assignments.`

Only valid Monday-Friday assignments should be exported.

Before export, the UI should show which assignments will be included and which will be skipped. Warnings do not block export, but invalid or incomplete assignment records may be skipped if they cannot produce a valid calendar event.

If an Info Desk event has only one assigned asset, export the event with `XX` in the second asset position.

Examples:
- `Ref AM: CH & XX`
- `Ref PM: CH & JWT`

---

## Weekly Session Persistence

Each schedule week should be treated as a session.

Session data should include:
- `schemaVersion: 1`
- Week start date
- Weekly unavailability
- Weekly phone eligibility
- Asset weekly availability confirmation status
- Generated assignments
- Manual drag/drop edits
- Validation warnings

Because browsers cannot silently write local files, V1 should support:
- `localStorage` as the trusted working save for each weekly session.
- Autosave to `localStorage` whenever the user changes weekly inputs, assignments, or locks.
- **Save Session JSON**: download a `.json` file for the selected week as a durable backup.
- **Load Session JSON**: upload a previously saved weekly session.
- Auto-recover previous work from `localStorage` when the selected week has cached data.
- Delete stored values for the selected week and restart from scratch.

The app should provide a rolling six-week selector so the user can move between the next six schedule weeks. For each week, the app should either load an existing session from browser cache/uploaded JSON or start a new session from default config.

Browsers cannot reliably and silently download JSON backups during a session without user interaction or browser prompts. Silent working persistence should use `localStorage`. Fully automated file backup can be revisited in V2 using browser-specific file-system APIs if needed.

Session file naming convention:
- `schedule-session-YYYY-MM-DD.json`

localStorage key naming:
- `referenceScheduler.session.YYYY-MM-DD`

When loading a session:
- Session data wins by default for that selected week.
- The UI should offer a restore/import action so the user can restore from a JSON session file.
- If loaded session data conflicts with current config, show a warning and let the user continue with the session data or restart from current config.
- If the app detects config changes after a session was created, show: `session uses saved config snapshot`.
- Offer a `rebase onto current config` action, but this can be a guarded V1 workflow.
- Persistence is a convenience for V1, not a critical durability guarantee. If a user loses a week's schedule, they can start over.

---

## UI Structure

V1 should use a tabbed desktop layout to avoid crowding too many panels onto one page.

### Tab 1: Weekly Setup

Includes:
- Compact six-week selector
- Weekly setup panel
- Asset-first availability editor
- Weekly phone eligibility editor

Behavior:
- Selecting a week updates the weekly setup panel.
- Availability editing is asset-first.
- The user must confirm weekly availability for each active asset before schedule generation.
- The selected week's session is loaded from localStorage when available.
- Each active asset should show `Unconfirmed` until the user checks **Availability confirmed**.
- **Generate Schedule** should be disabled until all active assets are confirmed.

### Tab 2: Schedule Review

Includes:
- Schedule calendar
- Always-visible target-hours summary
- Warnings panel
- Collapsed availability editor

Behavior:
- Availability editor is collapsed by default.
- User can expand the availability editor and view it side-by-side with the schedule calendar.
- Schedule events can be dragged.
- Manual drag moves lock the assignment by default.
- User can unlock manually moved assignments.
- Manual split controls should be available in V1.
- A visible split action should appear on eligible assignment blocks.
- Split controls should only appear for eligible 4-hour Info Desk blocks.

### Shared Toolbar

The export/actions toolbar should float or remain persistently available on both tabs. Session recovery and export controls should live here.

Actions:
- Generate Schedule
- Regenerate Unlocked Assignments
- Save Excel
- Save Session JSON
- Load Session JSON
- Export ICS
- Delete Week Session / Restart Week

Regeneration should only change unlocked assignments.

Before regenerating, show a concise summary such as: `12 locked assignments will be preserved. 18 unlocked assignments may change.`

---

## Development Steps

### Step 1: Setup UI
- Week picker
- Compact six-week calendar selector
- Asset availability intake form
- 30-minute availability grid
- Generate Schedule button
- Session JSON upload input
- Schedule grid display
- Always-visible target-hour summary
- Buttons:
  - Save Excel
  - Save Session JSON
  - Load Session JSON
  - Delete Week Session / Restart Week
  - Export ICS

### Step 2: Capture Weekly Inputs
- Ask the user to select the schedule week
- Show Monday-Friday only
- Load constant asset defaults
- Let the user mark week-specific unavailability:
  - Full day unavailable
  - Time range unavailable
  - 30-minute chunk unavailable
- Validate that entered times align to 30-minute increments
- Require the user to confirm each active asset's weekly availability before enabling schedule generation

### Step 3: Generate Proposed Schedule
- Combine default availability and weekly unavailability
- Evaluate schedule coverage requirements
- Assign assets while respecting:
  - Availability
  - Target hours
  - Maximum hours
  - No overlapping assignments
- Show warnings when constraints cannot be satisfied

### Step 4: Generate Excel Record Workbook
- Use SheetJS to create workbook
- Add sheets:
  - Instructions
  - ScheduleWeek
  - Assets
  - Shifts
  - CoverageRequirements
  - AssetTargets
  - DefaultAvailability
  - DefaultRoleEligibility
  - WeeklyPhoneEligibility
  - WeeklyUnavailability
  - AvailabilityGrid
  - Assignments
  - Summary
- Pre-fill the known assets
- Apply useful column widths and headers
- Include raw data sheets and a human-readable `WeeklySchedule` sheet
- Freeze headers
- Set practical column widths
- Apply modest colors for readability
- Do not show warnings or manual/locked flags in the V1 Excel export

### Step 5: Build Scheduler UI
- Render Monday-Friday grid
- Allow assignment selection
- Validate unavailability and target-hour constraints

### Step 6: Save Excel Record
- Convert updated data to workbook
- Refresh Assignments and Summary
- Trigger download

### Step 7: Export ICS
- Loop valid assignments
- Generate `.ics` string
- Download file
- Show exported/skipped assignment counts

---

## Coding Milestones

Implementation should be split into small, reviewable tasks that keep the code clean, efficient, and testable.

1. App shell and layout
   - Static HTML/CSS/JS structure
   - Two-tab desktop layout
   - Shared floating toolbar

2. Static config loading and parsing
   - Fetch CSV files from the GitHub Pages site
   - Parse assets, availability, role eligibility, targets, and coverage
   - Convert times to minutes after midnight

3. Session foundation
   - `schemaVersion: 1`
   - Six-week selector
   - localStorage key `referenceScheduler.session.YYYY-MM-DD`
   - Create/load/delete weekly session

4. Weekly setup UI
   - Asset-first availability editor
   - Weekly phone eligibility UI
   - Availability confirmed checkbox per asset
   - Disable Generate Schedule until all active assets are confirmed

5. Validation and warnings
   - Implement warning codes and severities
   - Warnings panel
   - Assignment/event warning indicators

6. Scheduler core
   - Generate required coverage slots
   - Apply hard auto-generation constraints
   - Apply priority scoring
   - Surface uncovered slot errors

7. Schedule review UI
   - Calendar rendering
   - Target-hour summary
   - Reviewer indicators
   - Lock/unlock controls

8. Manual editing
   - Drag/drop with 30-minute snapping
   - Manual moves lock by default
   - Allow invalid moves with warnings
   - Too-many-assigned warning and per-asset remove controls

9. Split shift controls
   - Hover split affordance for eligible 4-hour Info Desk blocks
   - Split into allowed 2-hour halves
   - Preserve validation and warning behavior

10. Regeneration
   - Preserve locked assignments
   - Regenerate only unlocked assignments
   - Show locked/unlocked impact summary

11. Excel record export
   - Raw data sheets
   - Human-readable `WeeklySchedule`
   - Frozen headers, widths, modest colors
   - No warnings/manual/locked flags in V1 export

12. ICS export
   - Valid assignments only
   - Category names and best-effort colors
   - Exported/skipped summary

13. Final verification
   - Scheduler fixtures
   - Manual invalid edits
   - JSON save/load/delete
   - Excel and ICS smoke tests

---

## Implementation Checklist And Module Boundaries

The first code pass should keep responsibilities separated by file/module. Avoid putting all behavior into one large script.

### Root Files

#### `index.html`
Purpose: app shell.

Responsibilities:
- Load CSS and JavaScript modules.
- Define the main app container.
- Provide static landmarks for:
  - shared toolbar
  - tab navigation
  - Weekly Setup tab
  - Schedule Review tab
  - modal/dialog root if needed

Should not contain scheduling logic.

#### `styles.css`
Purpose: layout, calendar styling, and visual states.

Responsibilities:
- Desktop layout.
- Two-tab layout.
- Shared floating toolbar.
- Six-week selector styling.
- Availability grid styling.
- Schedule calendar styling.
- Assignment block styling.
- Warning, locked, reviewer, selected, unavailable, and overfilled visual states.
- Modest Excel-like color palette alignment where helpful.

Should not encode business rules beyond CSS class presentation.

#### `app.js`
Purpose: bootstrapping and state wiring.

Responsibilities:
- Load static config.
- Initialize current session/week.
- Wire UI components together.
- Register global toolbar actions.
- Coordinate schedule generation, validation, session save, and exports.
- Own top-level app state transitions.

Should delegate parsing, scheduling, validation, persistence, and exports to focused modules.

---

### Data And Utility Modules

#### `config.js`
Purpose: static config loading and config constants.

Responsibilities:
- Define config file paths:
  - `config/default_availability.csv`
  - `config/default_role_eligibility.csv`
  - `config/asset_targets.csv`
- Store static coverage requirements and shift definitions.
- Fetch CSV files from the deployed GitHub Pages site.
- Store config version/hash inputs for session snapshot comparison.

Should not mutate runtime session state.

#### `csv.js`
Purpose: CSV parsing.

Responsibilities:
- Parse fetched CSV strings into arrays/objects.
- Normalize headers.
- Trim values.
- Preserve blank fields where meaningful.
- Support `Reviewer` and `Reviewer?` header aliases.
- Report malformed rows.

Should not know scheduling rules.

#### `time.js`
Purpose: time conversion helpers.

Responsibilities:
- Convert `HH:mm` strings to minutes after midnight.
- Convert minutes back to display strings.
- Validate 30-minute increments.
- Calculate duration hours.
- Provide constants such as:
  - `DAY_START_MINUTE = 480`
  - `DAY_END_MINUTE = 1170`

Should be pure utility code.

#### `model.js`
Purpose: canonical data model creation and normalization.

Responsibilities:
- Build normalized runtime model from parsed config.
- Normalize assets.
- Normalize default availability.
- Normalize role eligibility.
- Normalize target hours.
- Normalize coverage requirements.
- Create default weekly session data.
- Provide assignment object factory.

Should keep one canonical internal model that UI, scheduler, validation, JSON, Excel, and ICS use.

---

### Session And Persistence Modules

#### `session.js`
Purpose: localStorage and JSON session handling.

Responsibilities:
- Create weekly sessions with `schemaVersion: 1`.
- Read/write localStorage key:
  - `referenceScheduler.session.YYYY-MM-DD`
- Autosave sessions.
- Delete/reset selected week session.
- Export session JSON.
- Import session JSON.
- Track config snapshot/hash.
- Detect config mismatch and expose status to UI.

Should not perform scheduling.

---

### Scheduling And Validation Modules

#### `scheduler.js`
Purpose: schedule generation.

Responsibilities:
- Generate required coverage slots.
- Preserve locked assignments.
- Clear/regenerate unlocked assignments.
- Apply auto-generation hard constraints.
- Prioritize:
  1. Info Desk coverage
  2. Phone coverage
  3. assets furthest below target
  4. avoiding max hours
  5. non-evening Info Desk reviewer coverage
  6. unsplit continuous blocks
- Split eligible Info Desk blocks only when useful.
- Never auto-schedule above `MaxHours`.
- Return assignments plus uncovered slot information.

Should not directly manipulate DOM.

#### `validation.js`
Purpose: warning generation and rule checks.

Responsibilities:
- Validate assignments against hard rules.
- Validate manual invalid assignments.
- Generate stable warning codes:
  - `UNAVAILABLE`
  - `ROLE_INELIGIBLE`
  - `PHONE_NOT_WEEKLY_ELIGIBLE`
  - `DAILY_MAX_EXCEEDED`
  - `INFO_AND_PHONE_SAME_DAY`
  - `MULTIPLE_PHONE_BLOCKS`
  - `NO_REVIEWER`
  - `UNDER_TARGET`
  - `OVER_TARGET`
  - `UNCOVERED_SLOT`
  - `TOO_MANY_ASSIGNED_TO_SHIFT`
- Treat all warnings as informational for export purposes.
- Provide per-assignment and global warning summaries.

Should be deterministic and testable with fixture data.

---

### Export Modules

#### `exports/excel.js`
Purpose: Excel record workbook export.

Responsibilities:
- Generate `.xlsx` using SheetJS.
- Include raw data sheets.
- Include human-readable `WeeklySchedule`.
- Include:
  - `Instructions`
  - `ScheduleWeek`
  - `Assets`
  - `Shifts`
  - `CoverageRequirements`
  - `AssetTargets`
  - `DefaultAvailability`
  - `DefaultRoleEligibility`
  - `WeeklyPhoneEligibility`
  - `WeeklyUnavailability`
  - `AvailabilityGrid`
  - `Assignments`
  - `Summary`
  - `WeeklySchedule`
- Freeze headers.
- Set practical column widths.
- Apply modest colors.
- Omit internal warning/manual/locked fields from V1 Excel export.

Should consume canonical model/session data only.

#### `exports/ics.js`
Purpose: Outlook calendar export.

Responsibilities:
- Generate `.ics` text.
- Export valid assignment events.
- Skip invalid/incomplete records that cannot produce a valid calendar event.
- Use event titles:
  - `Ref AM: asset 1 & asset 2`
  - `Ref PM: asset 1 & asset 2`
  - `Ref x 4:30: asset 1 & asset 2`
  - `Phone 8-10: asset`
  - `Phone 10-12: asset`
  - `Phone 12-2: asset`
  - `Phone 2-4: asset`
- Use `XX` for missing second Info Desk asset.
- Include categories:
  - `Reference Desk Schedule`
  - `Phone coverage`
- Treat colors as best-effort/client-dependent.
- Return exported/skipped counts.

Should not include warnings or locked/manual status in descriptions.

---

### UI Modules

#### `ui/tabs.js`
Purpose: tab navigation.

Responsibilities:
- Switch between Weekly Setup and Schedule Review.
- Preserve selected week/session context.

#### `ui/toolbar.js`
Purpose: shared floating toolbar.

Responsibilities:
- Render toolbar actions:
  - Generate Schedule
  - Regenerate Unlocked Assignments
  - Save Excel
  - Save Session JSON
  - Load Session JSON
  - Export ICS
  - Delete Week Session / Restart Week
- Disable Generate Schedule until all active assets are confirmed.
- Show regeneration impact summary before regenerating.
- Surface export counts.

#### `ui/week-selector.js`
Purpose: compact six-week selector.

Responsibilities:
- Render rolling six future weeks.
- Show selected week.
- Show session/cache status.
- Minimize after week selection.
- Expand on click.

#### `ui/setup-panel.js`
Purpose: selected-week setup summary.

Responsibilities:
- Show week date range.
- Show localStorage/session status.
- Show config snapshot status.
- Show confirmation progress.
- Show phone eligibility summary.
- Expose rebase/restart messaging where applicable.

#### `ui/availability-editor.js`
Purpose: asset-first availability editing.

Responsibilities:
- Show selected asset's Monday-Friday grid.
- Display 30-minute increments from `08:00-19:30`.
- Show default unavailable, weekly unavailable, selected, and scheduled states.
- Toggle individual blocks.
- Drag-select ranges.
- Mark full-day unavailable.
- Clear day/range.
- Track **Availability confirmed** checkbox per asset.
- Reset asset to `Unconfirmed` when edited.

#### `ui/phone-eligibility.js`
Purpose: weekly phone eligibility editing.

Responsibilities:
- Default from `DefaultRoleEligibility`.
- Let user mark weekly phone eligibility.
- Disable or explain unavailable default phone eligibility.
- Use same availability model as Info Desk for final scheduling eligibility.

#### `ui/schedule-calendar.js`
Purpose: schedule review calendar.

Responsibilities:
- Render Monday-Friday schedule.
- Render assignment blocks.
- Show role, time, assets, reviewer indicator, lock state, warnings.
- Show `x` next to each assigned asset.
- Allow removing any/all assets from a block.
- Mark removed/edited block as locked by default.
- Drag/drop assignments with 30-minute snapping.
- Allow invalid manual moves with warnings.
- Lock manual moves by default.
- Allow unlock.
- Surface hover split control on eligible 4-hour Info Desk blocks.

#### `ui/target-summary.js`
Purpose: always-visible target-hour summary.

Responsibilities:
- Show scheduled hours by asset.
- Show min/target/max.
- Show remaining-to-target calculation.
- Show target status.
- Treat all-zero target rows as pending config until CSV is finalized.

#### `ui/warnings-panel.js`
Purpose: warning display and navigation.

Responsibilities:
- Show warning list.
- Group or filter by warning code.
- Treat all warnings as informational.
- Focus related assignment/slot when clicked.
- Highlight uncovered slots and skipped export records clearly.

---

### Testing And Fixtures

Recommended test fixture areas:
- Config parsing.
- Time conversion.
- Availability grid generation.
- Phone eligibility requiring default eligibility plus weekly eligibility plus availability.
- Info Desk priority over Phone.
- Max 4 hours per asset per day.
- Split shift generation.
- Locked assignment preservation.
- Manual invalid assignment warnings.
- Too-many-assigned blocks.
- JSON save/load/delete.
- Excel export smoke test.
- ICS export smoke test.

---

## Future Enhancements

- Validation rules
- Recurring schedules
- Multi-week scheduling
- Holiday exclusion list
- Hard versus soft hour targets
- Upgrade to cloud backend later

---

## Summary

This approach prioritizes:
- Simplicity
- Portability
- No backend dependencies
- Web-first scheduling inputs
- Excel record export
- Full control of scheduling data
