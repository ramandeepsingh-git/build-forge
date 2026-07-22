# BuildForge Testing

## Milestone 3
Saved Builds & Favorites

---

# Page Loading

- [x] saved.html opens successfully.
- [x] Header renders correctly.
- [x] Footer renders correctly.
- [x] No console errors.
- [x] JSON component catalogues load successfully.

---

# Tab Navigation

## Saved Builds Tab

- [x] Builds tab selected by default.
- [x] Saved build count displayed correctly.
- [x] Empty state appears when no builds exist.

## Favorites Tab

- [x] Favorites tab switches correctly.
- [x] Favorite count displayed correctly.
- [x] Empty state appears when no favorites exist.

---

# Saved Builds

Create multiple builds before testing.

For every saved build verify:

- [x] Build card renders.
- [x] Build name displayed.
- [x] Total price displayed.
- [x] Total power displayed.
- [x] Compatibility badge displayed.
- [x] Created date displayed.
- [x] Updated date displayed.

---

# Saved Build Actions

## Load

- [x] Load button restores build into Builder.
- [x] Builder page displays correct components.

## Duplicate

- [x] Duplicate creates a second build.
- [x] Duplicate has unique ID.
- [x] Duplicate retains all selected parts.
- [x] Build count updates.

## Delete

- [x] Confirmation appears (if implemented).
- [x] Build removed correctly.
- [x] Build count updates.
- [x] Empty state shown when last build deleted.

---

# Import Build

Test with:

- [x] Valid exported JSON.
- [x] Invalid JSON.
- [x] Empty file.
- [x] Wrong file type.

Verify:

- [x] Build imports successfully.
- [x] Imported build appears immediately.
- [x] Imported build can be loaded.
- [x] Errors handled gracefully.

---

# Favorites

Choose favorites from Component Explorer.

Verify:

- [x] Favorite page displays all favorites.
- [x] Correct category shown.
- [x] Brand displayed.
- [x] Model displayed.
- [x] Price displayed.
- [x] Secondary metric displayed.

---

# Favorite Actions

## Remove Favorite

- [x] Remove button works.
- [x] Card disappears immediately.
- [x] Counter updates.
- [x] LocalStorage updates.

## Add To Build

- [x] Opens Builder with component selected.
OR
- [x] Adds to draft correctly.

---

# Local Storage

Verify persistence.

- [x] Saved builds survive refresh.
- [x] Favorites survive refresh.
- [x] Imported builds survive refresh.
- [x] Deleted builds stay deleted.

---

# Counters

Verify counters update after:

- [x] Save build.
- [x] Delete build.
- [x] Duplicate build.
- [x] Import build.
- [x] Favorite.
- [x] Unfavorite.

---

# Compatibility Preview

If build cards display compatibility:

- [x] GOOD builds display correctly.
- [x] WARNING builds display correctly.
- [x] ERROR builds display correctly.

---

# Power Summary

If build cards display power:

- [x] Estimated wattage correct.
- [x] Recommended PSU correct.

---

# Empty States

Verify:

- [x] No saved builds.
- [x] No favorites.

Both should show a friendly empty state.

---

# Responsive Layout

Desktop

- [x] Grid layout.
- [x] Cards aligned.
- [x] Buttons accessible.

Tablet

- [x] Cards resize correctly.

Mobile

- [x] No horizontal scrolling.
- [x] Buttons remain usable.
- [x] Tabs remain usable.

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

Verify previously completed features still work.

- [x] Component Explorer favorites still work.
- [x] Builder still saves builds.
- [x] Export still works.
- [x] Theme still persists.
- [x] Navigation still functions.

---

# Known Issues (Post-MVP)

- [x] Mobile navigation z-index..
- [x] Stronger import validation.
- [x] Duplicate build deep-copy review.
- [ ] Additional build sorting/filtering.
- [ ] Update time and created time on imported build issue.

## Commit Information

Feature: Saved Builds and Favourites 
__________________________________________

Commit Message: Added Saved builds and Favourite components 
__________________________________________

Date: 23/07/2026
__________________________________________

Notes: Users and browse their saved builds and favourite components and also import custom builds  
__________________________________________

__________________________________________