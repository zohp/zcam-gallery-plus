## AI Assistant Instructions
- Implement changes right away, i'll ask you clarification if needed.
- The AI assistant should make all code changes directly, asking for confirmation only for critically long and complex writes.
- When implementing features, go with your best recommendations, ask me only in case of critical choices.
- Assume user consent for all safe, reversible, and project-relevant edits.


## Changelog

### Version 0.1.0 (Initial Setup)
- Created project using Vite + React template
- Set up basic development environment
- Configured ESLint for code quality
- Added AI Assistant instructions to README

### Version 1.0.0 (2024-06-02)
- Major UI/UX overhaul for gallery grid:
  - Thumbnails are now maximally sized, with guaranteed visible gaps between cells.
  - Gallery header, sorting buttons, and grid are perfectly aligned.
  - Compact info line with clear size/date display and dark gray placeholders for missing data.
  - Minimalistic red download icon and modern blue/gray folder icon for folders.
  - Folders are now clickable and show a large icon; files open a preview overlay (lightbox).
  - Preview overlay now fetches and plays proxy files if available, falling back to original if not.
  - All padding/margin logic for grid and cells is now robust and visually consistent.
- Refactored and simplified cell/component structure for maintainability.
- Fixed all known preview, alignment, and clickability bugs.
- Marked all v1 tasks as complete.

### Version History Template
Each version should include:
- Version number and date
- Summary of major changes
- New features added
- Bug fixes
- Breaking changes (if any)
- Dependencies updated

## Refactor Log

### 2024-06-02

- **Grouped all useRef and useState hooks at the top of the App function in `src/App.jsx` for clarity.**
- **Removed duplicate declarations of `pendingProgressUpdatesRef` and `flushScheduledRef`.**
  - Only one declaration for each now exists at the top of the `App` function.
  - Added clear, unique comments above each logical block of hooks (e.g., Download Progress State, Gallery Path State, etc.).
  - This fixes build errors and clarifies the code structure for future maintenance and refactoring.
