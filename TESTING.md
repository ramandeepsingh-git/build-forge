# BuildForge Testing

## Milestone 4
Compare Builds

---

# Page Loading

- [x] compare.html opens successfully.
- [x] Header renders correctly.
- [x] Footer renders correctly.
- [x] No console errors.
- [x] No missing CSS.

---

# Initial State

When there are:

## No Saved Builds

- [x] Friendly empty state shown.
- [x] User guided to create builds.

## One Saved Build

- [ ] Appropriate message displayed.
- [ ] Compare action disabled.

## Two or More Saved Builds

- [x] Build selectors appear.
- [x] Compare button enabled.

---

# Build Selection

## Left Build

- [x] Can select any saved build.
- [x] Selection updates correctly.

## Right Build

- [x] Can select any saved build.
- [x] Selection updates correctly.

---

# Prevent Invalid Selection

- [x] Cannot compare with empty selection.
- [x] Appropriate warning shown.

---

# Comparison Table

Verify each row displays correctly.

## General

- [x] Build name
- [x] Total price
- [x] Estimated power
- [x] Recommended PSU
- [x] Compatibility status

## Components

- [x] CPU
- [x] Motherboard
- [x] GPU
- [x] RAM
- [x] Storage
- [x] PSU
- [x] Case

---

# Differences

Verify differences are highlighted.

- [ ] Different CPU highlighted.
- [ ] Different GPU highlighted.
- [ ] Different RAM highlighted.
- [ ] Different Storage highlighted.
- [ ] Different PSU highlighted.
- [ ] Different Case highlighted.

Verify identical values are not highlighted.

---

# Price Comparison

- [x] Price difference correct.
- [x] More expensive build identified correctly.

---

# Power Comparison

- [x] Estimated wattage correct.
- [x] Recommended PSU correct.
- [x] Higher power build identified correctly.

---

# Compatibility

Compare builds with:

- [x] GOOD status
- [x] WARNING status
- [x] ERROR status

Verify badges display correctly.

---

# Loading Different Builds

Change selections repeatedly.

Verify:

- [x] Comparison updates immediately.
- [x] Old data removed.
- [x] No duplicated rows.
- [x] No stale values remain.

---

# Local Storage

- [x] Newly saved builds appear automatically.
- [x] Deleted builds disappear.
- [x] Renamed builds update correctly.
- [x] Refresh preserves available builds.

---

# Responsive Layout

## Desktop

- [x] Side-by-side comparison readable.
- [x] Table aligned correctly.

## Tablet

- [x] Layout adapts correctly.

## Mobile

- [x] No horizontal overflow beyond intended scrolling.
- [x] Table remains usable.
- [x] Build selectors usable.
- [x] Compare button accessible.

---

# Console Check

Expected:

- [x] No runtime errors.
- [x] No failed JSON requests.

Ignore:

- Live Server WebSocket warning.
- Chrome DevTools `.well-known` warning.

---

# Regression Check

Verify previous milestones still work.

- [x] Build Planner
- [x] Saved Builds
- [x] Favorites
- [x] Component Explorer
- [x] Compatibility Engine
- [x] Power Calculator
- [x] Theme persistence
- [x] Navigation

---

# Known Issues (Post-MVP)

- [ ] Add "Show only differences" option.
- [ ] Export comparison.
- [ ] Print-friendly comparison view.
- [ ] Sorting comparison categories.
- [x] Mobile navigation z-index..
- [x] Stronger import validation.
- [x] Duplicate build deep-copy review.
- [ ] Additional build sorting/filtering.
- [x] Update time and created time on imported build issue.

## Commit Information

Feature: Compare Builds and Components 
__________________________________________

Commit Message: Comparison Enabled for Saved Builds and Components 
__________________________________________

Date: 23/07/2026
__________________________________________

Notes: Users can Compare their saved builds and components   
__________________________________________

__________________________________________