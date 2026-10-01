# Graph Report - teressa-app  (2026-09-30)

## Corpus Check
- 100 files · ~37,347 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 632 nodes · 1157 edges · 43 communities (31 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.71)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_App Shell (Sidebar & Layout)|App Shell (Sidebar & Layout)]]
- [[_COMMUNITY_Header & User Menu|Header & User Menu]]
- [[_COMMUNITY_Page Layout & Empty State|Page Layout & Empty State]]
- [[_COMMUNITY_UI Primitives (Button, Field)|UI Primitives (Button, Field)]]
- [[_COMMUNITY_React Router Docs|React Router Docs]]
- [[_COMMUNITY_Auth Illustration|Auth Illustration]]
- [[_COMMUNITY_shadcn Config|shadcn Config]]
- [[_COMMUNITY_studio-top-bar.tsx|studio-top-bar.tsx]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Brand Logo|Brand Logo]]
- [[_COMMUNITY_Checkbox|Checkbox]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_studio-page.tsx|studio-page.tsx]]
- [[_COMMUNITY_studio-top-bar.tsx|studio-top-bar.tsx]]
- [[_COMMUNITY_Framework Mode|Framework Mode]]
- [[_COMMUNITY_Welcome to React Router!|Welcome to React Router!]]
- [[_COMMUNITY_Data Mode|Data Mode]]
- [[_COMMUNITY_Identify the Mode|Identify the Mode]]
- [[_COMMUNITY_Declarative Mode|Declarative Mode]]
- [[_COMMUNITY_user-menu.tsx|user-menu.tsx]]
- [[_COMMUNITY_code-editor.tsx|code-editor.tsx]]
- [[_COMMUNITY_authenticated.tsx|authenticated.tsx]]
- [[_COMMUNITY_Form vs Fetcher Rules|Form vs Fetcher Rules]]
- [[_COMMUNITY_Loaders and Actions|Loaders and Actions]]
- [[_COMMUNITY_createBrowserRouter and RouterProvider|createBrowserRouter and RouterProvider]]
- [[_COMMUNITY_BrowserRouter, Routes and Route JSX|BrowserRouter, Routes and Route JSX]]
- [[_COMMUNITY_approot.tsx Root Route|app/root.tsx Root Route]]
- [[_COMMUNITY_approutes.ts Route Configuration|app/routes.ts Route Configuration]]
- [[_COMMUNITY_RSC Data Mode|RSC Data Mode]]
- [[_COMMUNITY_RSC Framework Mode|RSC Framework Mode]]
- [[_COMMUNITY_Installed Docs as Source of Truth (node_modulesreact-routerdocs)|Installed Docs as Source of Truth (node_modules/react-router/docs)]]
- [[_COMMUNITY_Server-side Rendering and HMR Features|Server-side Rendering and HMR Features]]
- [[_COMMUNITY_TailwindCSS Styling|TailwindCSS Styling]]
- [[_COMMUNITY_canvas.tsx|canvas.tsx]]
- [[_COMMUNITY_sheet.tsx|sheet.tsx]]
- [[_COMMUNITY_dashboard-layout.tsx|dashboard-layout.tsx]]
- [[_COMMUNITY_react|react]]

## God Nodes (most connected - your core abstractions)
1. `Canvas()` - 21 edges
2. `Button()` - 18 edges
3. `StudioPage()` - 16 edges
4. `getUser()` - 16 edges
5. `compilerOptions` - 15 edges
6. `Framework Mode` - 13 edges
7. `DesignObject` - 11 edges
8. `isLineKind()` - 10 edges
9. `absBox()` - 10 edges
10. `Data Mode` - 9 edges

## Surprising Connections (you probably didn't know these)
- `useSidebar()` --references--> `react`  [EXTRACTED]
  app/components/ui/sidebar.tsx → package.json
- `SidebarMenuSkeleton()` --references--> `react`  [EXTRACTED]
  app/components/ui/sidebar.tsx → package.json
- `SidebarProvider()` --references--> `react`  [EXTRACTED]
  app/components/ui/sidebar.tsx → package.json
- `useIsMobile()` --references--> `react`  [EXTRACTED]
  app/hooks/use-mobile.ts → package.json
- `AppSidebar()` --calls--> `useSidebar()`  [EXTRACTED]
  app/components/dashboard/app-sidebar.tsx → app/components/ui/sidebar.tsx

## Import Cycles
- None detected.

## Communities (43 total, 12 thin omitted)

### Community 0 - "App Shell (Sidebar & Layout)"
Cohesion: 0.11
Nodes (18): NAV, NavItem, Sidebar(), SidebarContent(), SidebarContext, SidebarContextProps, SidebarFooter(), SidebarGroup() (+10 more)

### Community 1 - "Header & User Menu"
Cohesion: 0.15
Nodes (6): CanvasToolbar(), DropdownMenu(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuTrigger()

### Community 2 - "Page Layout & Empty State"
Cohesion: 0.11
Nodes (11): EmptyState(), PageContainer(), PageHeader(), PlaceholderGrid(), Card(), CardContent(), CardHeader(), CardTitle() (+3 more)

### Community 3 - "UI Primitives (Button, Field)"
Cohesion: 0.07
Nodes (25): AuthHeader(), Field(), FieldDescription(), FieldError(), FieldGroup(), FieldLabel(), fieldVariants, Input() (+17 more)

### Community 4 - "React Router Docs"
Cohesion: 0.22
Nodes (8): Client/Server Boundaries, Data Loading in RSC, Detect RSC Data Mode, Detect RSC Framework Mode, React Server Components (RSC), Read the Local RSC Docs, RSC Route Module Differences, Stability

### Community 5 - "Auth Illustration"
Cohesion: 0.12
Nodes (14): AuthBackdrop(), AuthIllustration(), CODE, DesignStage(), HANDLES, ICON, ROWS, TOOLS (+6 more)

### Community 6 - "shadcn Config"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 7 - "studio-top-bar.tsx"
Cohesion: 0.12
Nodes (14): CanvasControls(), InlineTitle(), StudioTopBar(), clamp(), useCanvasTransform(), View, Button(), buttonVariants (+6 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.11
Nodes (17): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit, paths (+9 more)

### Community 9 - "Runtime Dependencies"
Cohesion: 0.04
Nodes (45): dependencies, class-variance-authority, cn, codemirror, @codemirror/lang-javascript, @codemirror/language, @codemirror/state, @codemirror/view (+37 more)

### Community 10 - "Brand Logo"
Cohesion: 0.50
Nodes (4): Blue to Orange Gradient (#4D8BF0 to #FF5A1F), Brand Logo, Brush/Feather Mark, Dark Rounded Square Background (#141414)

### Community 13 - "Checkbox"
Cohesion: 0.08
Nodes (37): LivePreview(), buildSrcDoc(), PreviewApi, PreviewFrame(), PreviewStatus, FontPayload, FromFrame, isFromFrame() (+29 more)

### Community 17 - "studio-page.tsx"
Cohesion: 0.33
Nodes (7): TITLES, Breadcrumb(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList(), BreadcrumbPage(), BreadcrumbSeparator()

### Community 18 - "studio-top-bar.tsx"
Cohesion: 0.06
Nodes (42): ClassGroup, COLOR_TOKENS, currentClass(), FILL_TOKENS, GROUPS, opts(), scale(), setClass() (+34 more)

### Community 19 - "Framework Mode"
Cohesion: 0.14
Nodes (13): Data and Mutations, Forms, Fetchers, and Pending UI, Framework Mode, Framework Shape, Layout and Root Route Rules, Metadata, Middleware, Sessions, and Auth, Read the Local Docs by Mode (+5 more)

### Community 20 - "Welcome to React Router!"
Cohesion: 0.18
Nodes (10): Building for Production, Deployment, Development, DIY Deployment, Docker Deployment, Features, Getting Started, Installation (+2 more)

### Community 21 - "Data Mode"
Cohesion: 0.20
Nodes (9): Data and Mutations, Data Mode, Data Router Shape, Forms, Fetchers, and Pending UI, Navigation and URL State, Read the Local Docs by Mode, Route Objects and Routing, RSC Data (+1 more)

### Community 22 - "Identify the Mode"
Cohesion: 0.20
Nodes (9): Data Mode, Declarative Mode, Framework Mode, Identify the Mode, Mode Migration Doc Index, React Router, RSC Framework and RSC Data Modes, Skill References (+1 more)

### Community 23 - "Declarative Mode"
Cohesion: 0.25
Nodes (7): Declarative Mode, Declarative Router Shape, Mode Boundary, Navigation, Read the Local Docs by Mode, Routing, URL Values

### Community 24 - "user-menu.tsx"
Cohesion: 0.19
Nodes (7): AppSidebar(), useCurrentUser(), UserAvatar(), UserMenuItems(), Avatar(), AvatarFallback(), DropdownMenuSeparator()

### Community 25 - "code-editor.tsx"
Cohesion: 0.47
Nodes (4): CodeEditor(), highlight, isDark(), lightTheme()

### Community 26 - "authenticated.tsx"
Cohesion: 0.18
Nodes (12): ColorPopover(), ColorToken, loadSavedColors(), parseHex(), Rgba, storeSavedColors(), toColorValue(), THEME_COLORS (+4 more)

### Community 39 - "canvas.tsx"
Cohesion: 0.07
Nodes (78): Canvas(), ElementSelection, CanvasObject(), Tool, absBox(), adoptingFrame(), boundsOf(), Box (+70 more)

### Community 40 - "sheet.tsx"
Cohesion: 0.18
Nodes (5): Sheet(), SheetContent(), SheetDescription(), SheetHeader(), SheetTitle()

### Community 41 - "dashboard-layout.tsx"
Cohesion: 0.24
Nodes (6): AppHeader(), DashboardLayout(), Tooltip(), TooltipContent(), TooltipProvider(), TooltipTrigger()

### Community 42 - "react"
Cohesion: 0.50
Nodes (4): SidebarMenuSkeleton(), SidebarProvider(), useIsMobile(), react

## Knowledge Gaps
- **177 isolated node(s):** `CODE`, `ICON`, `TOOLS`, `ROWS`, `HANDLES` (+172 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Runtime Dependencies` to `react`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `App Shell (Sidebar & Layout)`, `Runtime Dependencies`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `Button()` connect `studio-top-bar.tsx` to `App Shell (Sidebar & Layout)`, `Header & User Menu`, `Page Layout & Empty State`, `UI Primitives (Button, Field)`, `canvas.tsx`, `sheet.tsx`, `Checkbox`, `studio-page.tsx`, `studio-top-bar.tsx`, `authenticated.tsx`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **What connects `CODE`, `ICON`, `TOOLS` to the rest of the system?**
  _177 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell (Sidebar & Layout)` be split into smaller, more focused modules?**
  _Cohesion score 0.10837438423645321 - nodes in this community are weakly interconnected._
- **Should `Page Layout & Empty State` be split into smaller, more focused modules?**
  _Cohesion score 0.11363636363636363 - nodes in this community are weakly interconnected._
- **Should `UI Primitives (Button, Field)` be split into smaller, more focused modules?**
  _Cohesion score 0.06862745098039216 - nodes in this community are weakly interconnected._