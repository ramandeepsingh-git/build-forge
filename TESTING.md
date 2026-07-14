# BuildForge Testing Checklist

> **Purpose:**  
> This checklist is used before every Git commit to ensure new features work correctly and existing functionality hasn't been broken.

---

# Test Environment

- [x] Project runs using Live Server (NOT file://)
- [x] No red errors in the browser console on implemented pages
- [x] No missing CSS, JS, JSON, or image files
- [x] Navigation between pages works

---

# Global UI

## Layout

- [x] Header renders correctly
- [x] Navigation links work
- [x] Footer renders correctly
- [x] Page is responsive (Desktop)
- [x] No broken alignment

## Theme

- [x] Theme toggle works
- [x] Theme persists after refresh
- [x] Theme works on every page

---

# Component Explorer

## Loading

- [x] components.html opens successfully
- [X] All component data loads
- [X] No loading errors
- [X] No console errors

## Categories

- [x] All category tab
- [x] CPU
- [x] GPU
- [x] Motherboard
- [x] RAM
- [x] Storage
- [x] PSU
- [x] Case

## Search

- [x] Search finds existing components
- [x] Search is case insensitive
- [x] Empty search restores all items
- [x] Random text shows empty state correctly

## Filters

- [x] Brand filter works
- [x] Brand list updates when category changes
- [x] Price filter works
- [x] Multiple filters work together

## Sorting

- [x] Popularity
- [x] Price Low → High
- [x] Price High → Low
- [x] Newest

## Favorites

- [x] Add favorite
- [x] Remove favorite
- [x] Favorite persists after refresh

## Compare

- [x] Select first component
- [x] Select second component
- [x] Cannot exceed compare limit
- [x] Compare selection persists while browsing

## Add To Build

- [x] Button opens Builder page
- [x] Correct component information is passed

---

# Regression Testing

After completing the new feature, verify existing functionality.

## Home Page

- [x] Home page opens
- [x] Hero section displays correctly
- [x] Navigation works

## Existing Features

- [x] Theme still works
- [x] Favorites still work
- [x] Storage still works
- [x] Search still works (where applicable)

---

# Edge Cases

## Search

- [x] Empty input
- [x] One character
- [x] Very long input
- [x] Spaces only
- [x] Special characters

## Filters

- [x] Reset filters
- [x] Maximum price = 0
- [x] Maximum price = very high
- [x] Switch categories repeatedly

## Refresh

- [x] Refresh page after filtering
- [x] Refresh after favoriting
- [x] Refresh after compare selection

---

# Performance

- [x] Page loads quickly
- [x] No noticeable lag while searching
- [x] Scrolling remains smooth

---

# Final Verification

Before committing:

- [x] Feature works as intended
- [x] No console errors
- [x] Regression testing completed
- [x] Code reviewed
- [x] Ready for Git commit

---

## Commit Information

Feature:Home page and Components page 
__________________________________________

Commit Message: Home page and components page added with real components info
__________________________________________

Date: 30/06/2026
__________________________________________

Notes: Browseable Home page with working links to the other pages along with components page carrying multiple compnents with working filters
__________________________________________

__________________________________________