# Use top navigation and page-owned filters in the v2 shell

## One-Line Conclusion
> The global `ui-v2` shell should use a compact top navigation bar, while search, time range, and other task-specific controls stay inside the page that owns them.

## Context Links
- Based on: [[project-architecture]]
- Leads to: [[run-when-committing]]

## Context
The v2 workspace had been using a left sidebar plus shell-level search and time range controls. During iterative UI adjustments, the query workspace repeatedly ran out of horizontal space, and the user explicitly chose to move the primary navigation to the top and remove the shell-level search/time switcher.

## Problem
The left sidebar permanently consumed width across all v2 pages, even when the active task needed a wide operational canvas. Shell-level controls also mixed cross-app chrome with page-specific query behavior, which made layout changes harder and created repeated confusion about where filters should live.

## Alternatives Considered
- Keep the left sidebar and continue tuning individual pages: rejected because it preserves the structural width loss on every route.
- Keep a top header but retain global search and time range switching: rejected because those controls are not universally useful and still steal space from page-owned workflows.

## Decision
Use a single compact top shell for `ui-v2` with brand, horizontal navigation, and version switching only. Move or keep operational filters inside the owning page, so query, permission, and report pages can spend their width on task content instead of shared chrome.

## Consequence
- Query and admin-style pages get more usable content area without route-specific shell hacks.
- Future shell changes can focus on navigation and versioning only.
- Page owners are responsible for search, time range, and task filters, which keeps state boundaries clearer.

## Exploration Reduction
- What questions can be skipped next time: whether a new page-level search or time filter belongs in `AppShell`; it does not unless it is truly global.
- What searches can be skipped next time: scanning sidebar CSS or shell topbar controls when the request is only about query/report workspace density; start from page layout first.
- Invalidation conditions (must re-evaluate when these appear): if v2 adds a genuinely cross-page global command palette or an always-on shared temporal context.

## Key Files
- `ui-v2/src/shared/layout/AppShell.tsx` - Global shell structure
- `ui-v2/src/styles.css` - Shared shell layout and navigation styling
- `ui-v2/src/domains/query/pages/QueryPage.tsx` - Query workspace that benefits from page-owned controls
