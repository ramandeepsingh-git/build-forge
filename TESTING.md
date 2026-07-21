# BuildForge Testing

## Milestone 2
Build Planner + Compatibility Engine + Power Calculator

---

# Builder Initialization

- [x] Builder page loads successfully.
- [x] Skeleton placeholders appear before data loads.
- [x] All JSON files load successfully.
- [x] No unexpected console errors.

---

# Draft Management

## Initial Load

- [x] Empty draft loads correctly.
- [x] Existing draft restores correctly.
- [ ] Editing an existing build (`editBuildId`) works.
- [x] Build name loads correctly.
- [x] Build notes load correctly.
- [x] Created timestamp displays correctly.
- [x] Updated timestamp displays correctly.

## Autosave

- [x] Build name autosaves.
- [x] Notes autosave.
- [x] Refresh restores latest draft.

---

# Component Slots

For every category:

- [x] CPU
- [x] Motherboard
- [x] GPU
- [x] RAM
- [x] Storage
- [x] PSU
- [x] Case

Verify:

- [x] Empty slot renders correctly.
- [x] Choose button works.
- [x] Selected component renders correctly.
- [x] Change button works.
- [x] Remove button works.
- [x] Price displayed correctly.
- [x] Secondary metric displayed correctly.

---

# Build Summary

## Price

- [x] Total price updates immediately.

## Power Calculator

- [x] CPU power counted.
- [x] GPU power counted.
- [x] RAM power counted.
- [x] Storage power counted.
- [x] Motherboard fallback works.
- [x] Cooler fallback works.
- [x] Fan estimation works.
- [x] Total wattage calculated correctly.
- [x] Recommended PSU updates correctly.

## PSU Load

Without PSU selected:

- [x] Load shows "—"

With PSU selected:

- [x] Load percentage calculated correctly.
- [x] Progress bar updates.
- [x] Warning color above 80%.
- [x] Error color above 100%.

---

# Compatibility Engine

## CPU

- [x] Socket compatibility
- [x] Socket incompatibility

## RAM

- [x] Generation
- [x] Speed
- [x] Capacity
- [x] Slot count

## Storage

- [x] Interface
- [x] PCIe generation

## GPU

- [x] GPU length vs case

## Motherboard

- [x] Motherboard size vs case

## PSU

- [x] PSU size vs case
- [x] PSU wattage
- [x] GPU recommended PSU

## CPU Cooler

- [x] Socket support
- [x] Case clearance

---

# Compatibility UI

- [x] Pending checks display correctly.
- [x] Good checks display correctly.
- [x] Warning checks display correctly.
- [x] Error checks display correctly.

Overall badge:

- [x] Incomplete
- [x] Good
- [x] Warning
- [x] Error

---

# Build Actions

## Save

- [x] Build saves successfully.
- [x] Timestamps update.
- [x] Toast shown.

## Clear

- [x] Confirmation dialog appears.
- [x] Build resets correctly.
- [x] Summary resets.
- [x] Slots reset.
- [x] Draft cleared.

## Export

- [x] JSON downloads.
- [x] Filename generated correctly.
- [x] JSON contains build data.
- [x] JSON contains resolved component summary.

---

# Toasts

- [x] Add-to-build toast.
- [x] Remove part toast.
- [x] Save toast.
- [x] Export toast.

---

# Console Check

Expected:

- No runtime errors.
- No failed JSON requests.

Ignore:

- Live Server WebSocket warning.
- Chrome DevTools `.well-known` CSP warning.

---

# Known Issues (Post-MVP)

- [ ] Mobile navigation z-index.
- [ ] `aria-selected` sync.
- [ ] Stronger import validation.
- [ ] `duplicateBuild()` deep copy.

## Commit Information

Feature:Build Plannrer 
__________________________________________

Commit Message: Buildpanner added 
__________________________________________

Date: 30/06/2026
__________________________________________

Notes: Browseable Builder page with working links to the other pages along with components page carrying multiple compnents with working filters
__________________________________________

__________________________________________