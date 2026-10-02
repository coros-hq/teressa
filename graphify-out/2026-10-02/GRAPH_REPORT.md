# Graph Report - teressa-app  (2026-10-01)

## Corpus Check
- 237 files · ~100,020 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1442 nodes · 3253 edges · 88 communities (76 shown, 12 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.79)
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
- [[_COMMUNITY_Root Route|Root Route]]
- [[_COMMUNITY_Home Route|Home Route]]
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
- [[_COMMUNITY_publishing.server.ts|publishing.server.ts]]
- [[_COMMUNITY_theme|theme]]
- [[_COMMUNITY_properties|properties]]
- [[_COMMUNITY_type|type]]
- [[_COMMUNITY_properties|properties]]
- [[_COMMUNITY_items|items]]
- [[_COMMUNITY_registry-item.schema.json|registry-item.schema.json]]
- [[_COMMUNITY_css|css]]
- [[_COMMUNITY_dependencies|dependencies]]
- [[_COMMUNITY_font|font]]
- [[_COMMUNITY_meta|meta]]
- [[_COMMUNITY_description|description]]
- [[_COMMUNITY_extends|extends]]
- [[_COMMUNITY_iconLibrary|iconLibrary]]
- [[_COMMUNITY_title|title]]
- [[_COMMUNITY_jsx-tree.ts|jsx-tree.ts]]
- [[_COMMUNITY_feedback-inbox.tsx|feedback-inbox.tsx]]
- [[_COMMUNITY_right-panel.tsx|right-panel.tsx]]
- [[_COMMUNITY_properties|properties]]
- [[_COMMUNITY_properties|properties]]
- [[_COMMUNITY_color-control.tsx|color-control.tsx]]
- [[_COMMUNITY_author|author]]
- [[_COMMUNITY_avatar-uploader.tsx|avatar-uploader.tsx]]
- [[_COMMUNITY_studio-top-bar.tsx|studio-top-bar.tsx]]
- [[_COMMUNITY_iconLibrary|iconLibrary]]
- [[_COMMUNITY_delete-account-dialog.tsx|delete-account-dialog.tsx]]
- [[_COMMUNITY_use-publish-checks.ts|use-publish-checks.ts]]
- [[_COMMUNITY_scripts|scripts]]
- [[_COMMUNITY_right-panel.tsx|right-panel.tsx]]
- [[_COMMUNITY_previews.server.ts|previews.server.ts]]
- [[_COMMUNITY_notifications-form.tsx|notifications-form.tsx]]
- [[_COMMUNITY_studio.tsx|studio.tsx]]
- [[_COMMUNITY_settings-delete.ts|settings-delete.ts]]
- [[_COMMUNITY_layers-to-code.test.ts|layers-to-code.test.ts]]
- [[_COMMUNITY_delete-account-dialog.tsx|delete-account-dialog.tsx]]
- [[_COMMUNITY_v|v]]
- [[_COMMUNITY_sonner.tsx|sonner.tsx]]
- [[_COMMUNITY_guard|guard]]
- [[_COMMUNITY_extends|extends]]
- [[_COMMUNITY_react|react]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_sign-in.tsx|sign-in.tsx]]
- [[_COMMUNITY_dependencies.ts|dependencies.ts]]
- [[_COMMUNITY_notifications.tsx|notifications.tsx]]

## God Nodes (most connected - your core abstractions)
1. `Button()` - 45 edges
2. `getUser()` - 38 edges
3. `StudioPage()` - 23 edges
4. `Canvas()` - 21 edges
5. `usePublishChecks()` - 17 edges
6. `guard()` - 17 edges
7. `compilerOptions` - 16 edges
8. `writeNode()` - 15 edges
9. `layersToCode()` - 15 edges
10. `publishComponent()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `useSidebar()` --references--> `react`  [EXTRACTED]
  app/components/ui/sidebar.tsx → package.json
- `SidebarMenuSkeleton()` --references--> `react`  [EXTRACTED]
  app/components/ui/sidebar.tsx → package.json
- `opts()` --calls--> `label()`  [INFERRED]
  app/components/studio/class-groups.ts → app/components/settings/connected-accounts.tsx
- `NotificationsList()` --indirect_call--> `v()`  [INFERRED]
  app/components/settings/notifications-form.tsx → app/lib/publish/checks/accessibility.test.ts
- `ProfileForm()` --indirect_call--> `v()`  [INFERRED]
  app/components/settings/profile-form.tsx → app/lib/publish/checks/accessibility.test.ts

## Import Cycles
- None detected.

## Communities (88 total, 12 thin omitted)

### Community 0 - "App Shell (Sidebar & Layout)"
Cohesion: 0.11
Nodes (18): NAV, NavItem, Sidebar(), SidebarContent(), SidebarContext, SidebarContextProps, SidebarFooter(), SidebarGroup() (+10 more)

### Community 1 - "Header & User Menu"
Cohesion: 0.14
Nodes (10): isPayload(), NotificationsBell(), CanvasToolbar(), DropdownMenu(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuTrigger() (+2 more)

### Community 2 - "Page Layout & Empty State"
Cohesion: 0.17
Nodes (9): getProfile(), getUser(), action(), loader(), loader(), loader(), loader(), action() (+1 more)

### Community 3 - "UI Primitives (Button, Field)"
Cohesion: 0.16
Nodes (12): FeedbackInbox(), FeedbackSkeleton(), ORDER_CLASS, OverviewBody(), OverviewHeader(), OverviewSkeleton(), PublishedList(), PublishedSkeleton() (+4 more)

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
Cohesion: 0.17
Nodes (18): LIMITS, normalizeTags(), sha256Hex(), good, validateCode(), validateDetails(), codeOfObject(), DB_ERRORS (+10 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 9 - "Runtime Dependencies"
Cohesion: 0.04
Nodes (48): dependencies, axe-core, class-variance-authority, cn, codemirror, @codemirror/lang-javascript, @codemirror/language, @codemirror/state (+40 more)

### Community 10 - "Brand Logo"
Cohesion: 0.50
Nodes (4): Blue to Orange Gradient (#4D8BF0 to #FF5A1F), Brand Logo, Brush/Feather Mark, Dark Rounded Square Background (#141414)

### Community 11 - "Root Route"
Cohesion: 0.15
Nodes (11): AppearanceForm(), OPTIONS, applyTheme(), getStoredTheme(), isThemeChoice(), resolveTheme(), setTheme(), systemQuery() (+3 more)

### Community 12 - "Home Route"
Cohesion: 0.24
Nodes (12): ICONS, NotificationItem(), RelativeTime(), isUnread(), Notification, notificationHref(), NotificationKind, notificationText() (+4 more)

### Community 13 - "Checkbox"
Cohesion: 0.06
Nodes (56): r(), LivePreview(), buildSrcDoc(), CaptureResult, PreviewApi, PreviewFrame(), PreviewStatus, FontPayload (+48 more)

### Community 17 - "studio-page.tsx"
Cohesion: 0.33
Nodes (7): TITLES, Breadcrumb(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList(), BreadcrumbPage(), BreadcrumbSeparator()

### Community 18 - "studio-top-bar.tsx"
Cohesion: 0.15
Nodes (24): Canvas(), ElementSelection, absBox(), adoptingFrame(), boundsOf(), Box, canCreateComponent(), contains() (+16 more)

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
Cohesion: 0.13
Nodes (22): CodeViewer(), CopyCode(), ComponentDetail(), EMPTY, CopyInstall(), EMPTY, GalleryCard(), PreviewImage() (+14 more)

### Community 25 - "code-editor.tsx"
Cohesion: 0.47
Nodes (4): CodeEditor(), highlight, isDark(), lightTheme()

### Community 26 - "authenticated.tsx"
Cohesion: 0.15
Nodes (21): BLOCKING_IMPACTS, evaluateAccessibility(), PLAIN, toFindings(), AuditFn, AuditUnavailable, runAudits(), run() (+13 more)

### Community 39 - "canvas.tsx"
Cohesion: 0.13
Nodes (17): childrenOf(), DesignObject, holdsChildren(), ObjectKind, JsxNodeInfo, LeftPanel(), ICONS, OutlineTab() (+9 more)

### Community 40 - "sheet.tsx"
Cohesion: 0.18
Nodes (5): Sheet(), SheetContent(), SheetDescription(), SheetHeader(), SheetTitle()

### Community 41 - "dashboard-layout.tsx"
Cohesion: 0.24
Nodes (6): AppHeader(), DashboardLayout(), Tooltip(), TooltipContent(), TooltipProvider(), TooltipTrigger()

### Community 42 - "react"
Cohesion: 0.11
Nodes (27): Ctx, Discussion(), FILTERS, Meta(), Person(), tab(), ThreadView(), ActionReply (+19 more)

### Community 43 - "publishing.server.ts"
Cohesion: 0.08
Nodes (26): ComponentRow, ComponentSummary, createComponent(), DeleteResult, getComponent(), recordCopy(), Schema, typeOf() (+18 more)

### Community 44 - "theme"
Cohesion: 0.10
Nodes (21): type, description, properties, type, additionalProperties, description, type, additionalProperties (+13 more)

### Community 45 - "properties"
Cohesion: 0.08
Nodes (24): description, type, description, type, properties, description, type, dependency (+16 more)

### Community 46 - "type"
Cohesion: 0.11
Nodes (19): items, description, items, type, description, items, type, description (+11 more)

### Community 47 - "properties"
Cohesion: 0.07
Nodes (28): description, type, description, type, type, description, type, description (+20 more)

### Community 48 - "items"
Cohesion: 0.14
Nodes (14): required, description, items, type, properties, else, if, then (+6 more)

### Community 49 - "registry-item.schema.json"
Cohesion: 0.25
Nodes (7): allOf, oneOf, definitions, cssValue, required, $schema, type

### Community 50 - "css"
Cohesion: 0.40
Nodes (5): $ref, additionalProperties, description, type, css

### Community 51 - "dependencies"
Cohesion: 0.08
Nodes (43): arb(), borderWidth(), boxLook(), buildNodes(), childrenOf(), classAttr(), Cls, colorClass() (+35 more)

### Community 52 - "font"
Cohesion: 0.12
Nodes (20): GalleryPage(), PublicLayout(), cleanSearch(), cleanTag(), GalleryItem, GalleryParams, GalleryResult, GallerySort (+12 more)

### Community 53 - "meta"
Cohesion: 0.15
Nodes (21): EmptyState(), Block(), BlockError(), BlockLink(), RowCard(), RowsSkeleton(), FeedbackRow(), count() (+13 more)

### Community 54 - "description"
Cohesion: 0.12
Nodes (21): GettingStartedChecklist(), CATEGORY_LABELS, Checklist, ChecklistStep, deriveChecklist(), DraftItem, failedOverview(), isObj() (+13 more)

### Community 55 - "extends"
Cohesion: 0.20
Nodes (15): CanvasObject(), Tool, boxShadowCss(), Handle, isContainer(), isLineKind(), minSizeOf(), originOf() (+7 more)

### Community 56 - "iconLibrary"
Cohesion: 0.07
Nodes (36): NotificationsList(), ClassGroup, COLOR_TOKENS, currentClass(), FILL_TOKENS, GROUPS, opts(), scale() (+28 more)

### Community 57 - "title"
Cohesion: 0.34
Nodes (11): ActionResult, changePassword(), getAccount(), requestEmailChange(), sendReauthCode(), signOutOtherDevices(), startLinkGithub(), unlinkIdentity() (+3 more)

### Community 58 - "jsx-tree.ts"
Cohesion: 0.22
Nodes (15): AvatarUploader(), cropToSquare(), AVATAR, cleanGithub(), isNotificationKey(), normalizeProfile(), NOTIFICATION_COLUMNS, NOTIFICATION_KEYS (+7 more)

### Community 59 - "feedback-inbox.tsx"
Cohesion: 0.18
Nodes (24): attachCode(), canGroup(), cloneWithNewIds(), createComponent(), createInstance(), detachInstance(), duplicateObjects(), groupObjects() (+16 more)

### Community 60 - "right-panel.tsx"
Cohesion: 0.67
Nodes (3): description, type, extends

### Community 61 - "properties"
Cohesion: 0.18
Nodes (11): description, items, type, properties, description, type, content, path (+3 more)

### Community 62 - "properties"
Cohesion: 0.20
Nodes (10): properties, type, items, type, config, plugins, tailwind, description (+2 more)

### Community 63 - "color-control.tsx"
Cohesion: 0.14
Nodes (16): ProfileSection(), AvatarResult, CONSTRAINT_FIELD, EXTENSION, mapProfileError(), removeAvatar(), Row, SaveResult (+8 more)

### Community 64 - "author"
Cohesion: 0.10
Nodes (18): DeleteComponent(), Result, CanvasControls(), AlertDialog(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter() (+10 more)

### Community 65 - "avatar-uploader.tsx"
Cohesion: 0.12
Nodes (21): CheckRow(), ChecksStep(), LABEL, PreviewProgress, statusOf(), DetailsStep(), fieldId(), SUGGESTED_CATEGORIES (+13 more)

### Community 66 - "studio-top-bar.tsx"
Cohesion: 0.13
Nodes (15): UsernameStatus, Field(), FieldDescription(), FieldError(), FieldGroup(), FieldLabel(), fieldVariants, Input() (+7 more)

### Community 67 - "iconLibrary"
Cohesion: 0.17
Nodes (10): columns(), StatsRow(), StatsSkeleton(), Card(), CardContent(), CardFooter(), CardHeader(), CardTitle() (+2 more)

### Community 69 - "delete-account-dialog.tsx"
Cohesion: 0.17
Nodes (16): State, Choice, DeleteAccountZone(), PublishedDialog(), PublishedInfo, Dialog(), DialogContent(), DialogDescription() (+8 more)

### Community 70 - "use-publish-checks.ts"
Cohesion: 0.23
Nodes (20): applyEdits(), Edit, instrument(), JsxAttr, parseJsx(), setText(), usePublishChecks(), canPublish() (+12 more)

### Community 71 - "scripts"
Cohesion: 0.22
Nodes (6): PageContainer(), SettingsLayout(), SECTIONS, SettingsNav(), Toaster(), sonner

### Community 72 - "right-panel.tsx"
Cohesion: 0.15
Nodes (17): AccountSection(), Info, ConnectedAccounts(), label(), LABELS, EmailChangeDialog(), ConfirmDialog(), Deferred() (+9 more)

### Community 73 - "previews.server.ts"
Cohesion: 0.17
Nodes (13): deleteAccount(), DeleteResult, check(), EXTENSION, previewsExist(), removePreviewsOf(), storePreviews(), StoreResult (+5 more)

### Community 74 - "notifications-form.tsx"
Cohesion: 0.22
Nodes (17): deleteOwnComment(), DiscussionResult, fail(), getComponentPage(), mapDiscussionError(), postFeedback(), postReply(), PublicComponent (+9 more)

### Community 75 - "studio.tsx"
Cohesion: 0.67
Nodes (3): title, description, type

### Community 76 - "settings-delete.ts"
Cohesion: 0.47
Nodes (3): InlineTitle(), StudioTopBar(), Separator()

### Community 77 - "layers-to-code.test.ts"
Cohesion: 0.24
Nodes (10): byId(), depthOf(), outerGroup(), syncGroups(), Action, empty, reducer(), State (+2 more)

### Community 78 - "delete-account-dialog.tsx"
Cohesion: 0.40
Nodes (5): AppSidebar(), useCurrentUser(), UserAvatar(), UserMenuItems(), DropdownMenuSeparator()

### Community 79 - "v"
Cohesion: 0.20
Nodes (13): fieldId(), ProfileForm(), SaveReply, toInput(), UsernameField(), useUsernameCheck(), Textarea(), Profile (+5 more)

### Community 80 - "sonner.tsx"
Cohesion: 0.27
Nodes (7): PageHeader(), getNotifications(), markNotificationsSeen(), action(), loader(), action(), loader()

### Community 81 - "guard"
Cohesion: 0.31
Nodes (8): checkUsername(), setNotificationPref(), clearAuthCookies(), guard(), createAdminClient(), action(), action(), loader()

### Community 82 - "extends"
Cohesion: 0.50
Nodes (4): description, required, type, font

### Community 83 - "react"
Cohesion: 0.50
Nodes (4): SidebarMenuSkeleton(), SidebarProvider(), useIsMobile(), react

### Community 84 - "package.json"
Cohesion: 0.27
Nodes (9): ComponentActions, CodeEditor, RightPanel(), RightTab, Tabs(), TabsContent(), TabsList(), tabsListVariants (+1 more)

### Community 85 - "sign-in.tsx"
Cohesion: 0.31
Nodes (4): AuthHeader(), safeNextPath(), action(), loader()

### Community 86 - "dependencies.ts"
Cohesion: 0.52
Nodes (5): ALWAYS_PROVIDED, classifyImports(), Dependencies, detectImports(), packageName()

### Community 90 - "notifications.tsx"
Cohesion: 0.19
Nodes (8): ITEMS, NotificationsForm(), Switch(), getNotificationPrefs(), NOTIFICATION_DEFAULTS, NotificationKey, NotificationPrefs, loader()

## Knowledge Gaps
- **358 isolated node(s):** `CODE`, `ICON`, `TOOLS`, `ROWS`, `HANDLES` (+353 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Button()` connect `author` to `App Shell (Sidebar & Layout)`, `Header & User Menu`, `UI Primitives (Button, Field)`, `Checkbox`, `studio-page.tsx`, `studio-top-bar.tsx`, `user-menu.tsx`, `sheet.tsx`, `react`, `font`, `meta`, `iconLibrary`, `jsx-tree.ts`, `avatar-uploader.tsx`, `studio-top-bar.tsx`, `iconLibrary`, `delete-account-dialog.tsx`, `right-panel.tsx`, `notifications-form.tsx`, `settings-delete.ts`, `v`, `sonner.tsx`, `package.json`, `sign-in.tsx`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime Dependencies` to `react`, `scripts`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `App Shell (Sidebar & Layout)`, `Runtime Dependencies`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **What connects `CODE`, `ICON`, `TOOLS` to the rest of the system?**
  _358 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell (Sidebar & Layout)` be split into smaller, more focused modules?**
  _Cohesion score 0.10837438423645321 - nodes in this community are weakly interconnected._
- **Should `Header & User Menu` be split into smaller, more focused modules?**
  _Cohesion score 0.13852813852813853 - nodes in this community are weakly interconnected._
- **Should `Auth Illustration` be split into smaller, more focused modules?**
  _Cohesion score 0.12318840579710146 - nodes in this community are weakly interconnected._