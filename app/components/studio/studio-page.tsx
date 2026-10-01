import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useFetcher } from "react-router";

import { offsetOfLine } from "~/lib/publish/lines.ts";
import type { PanelImperativeHandle } from "react-resizable-panels";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";

import { Canvas } from "./canvas";
import {
  canCreateComponent,
  canGroup,
  createComponent,
  createInstance,
  detachInstance,
  duplicateObjects,
  groupObjects,
  patchObjects,
  ungroupObjects,
  parseDesign,
  type DesignObject,
} from "./design-model";
import { instrument, parseJsx, type JsxNodeInfo } from "./jsx-tree";
import { LeftPanel } from "./left-panel";
import { RightPanel, type RightTab } from "./right-panel";
import { SAMPLE_CODE, SAMPLE_FILE } from "./sample-component";
import { StudioTopBar } from "./studio-top-bar";
import { attachCode, rebuildCode } from "./design-model";
import { hasLayers, layersToCode } from "./layers-to-code";
import { PublishDialog } from "./publish/publish-dialog";
import { usePublishChecks } from "./publish/use-publish-checks";
import { useDesignHistory } from "./use-design-history";
import { readStoredLayout, writeStoredLayout } from "./use-stored-layout";

// Full-screen workspace: top bar, then outline | canvas | editor. The page itself never scrolls;
// each panel scrolls on its own.
export type StudioComponent = {
  id: string;
  name: string;
  projectName: string;
  design: unknown;
  description: string;
  category: string;
  tags: string[];
  status: "draft" | "published";
  editor: "canvas" | "code";
};

type PublishDetails = { description: string; category: string; tags: string[] };

export function StudioPage({ component }: { component: StudioComponent }) {
  const componentId = component.id;
  // Everything here needs the browser (panel sizes, the editor, the sandboxed preview).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [projectName, setProjectName] = useState(component.projectName);
  const [title, setTitle] = useState(component.name);
  const [details, setDetails] = useState<PublishDetails>({
    description: component.description,
    category: component.category,
    tags: component.tags,
  });
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishPrep, setPublishPrep] = useState<"saving" | "ready" | "failed">("ready");
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");
  const [rightTab, setRightTab] = useState<RightTab>("design");
  const [reveal, setReveal] = useState<{ pos: number; nonce: number } | null>(
    null,
  );
  const [focusRequest, setFocusRequest] = useState<{
    id: string;
    nonce: number;
  } | null>(null);

  // The canvas starts from what was saved in the database and autosaves back to it.
  const { objects, setObjects, seal, undo, redo, reset, canUndo, canRedo } =
    useDesignHistory();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fetcher = useFetcher<{ ok: boolean }>();
  const submitRef = useRef(fetcher.submit);
  submitRef.current = fetcher.submit;
  // The canvas as last loaded or saved, so only real changes trigger a save.
  const saved = useRef<{
    objects: DesignObject[] | null;
    title: string;
    projectName: string;
    details: PublishDetails;
  }>({
    objects: null,
    title: component.name,
    projectName: component.projectName,
    details,
  });
  const latest = useRef({ objects, title, projectName, details });
  latest.current = { objects, title, projectName, details };
  const fetcherState = useRef(fetcher.state);
  fetcherState.current = fetcher.state;
  // `reset` lands one render after this runs, so the baseline is taken once `objects` has changed
  // from what it was at mount (or straight away when the saved design is empty).
  const mountObjects = useRef(objects);
  const loadedCount = useRef(0);
  useEffect(() => {
    const parsed = parseDesign(component.design);
    loadedCount.current = parsed.length;
    saved.current.objects = null;
    reset(parsed);
  }, [component.design, reset]);

  const saveUrl = `/api/components/${componentId}`;
  // Stable: it reads everything through refs, so it never re-triggers the effects below.
  const flush = useCallback(
    (keepalive: boolean) => {
      const { objects, title, projectName, details } = latest.current;
      saved.current = { objects, title, projectName, details };
      const body = JSON.stringify({ name: title, projectName, objects, ...details });
      if (keepalive) {
        // The page is going away: a fetcher would be cancelled, a keepalive request is not.
        void fetch(saveUrl, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
      } else {
        submitRef.current(body, { method: "POST", action: saveUrl, encType: "application/json" });
      }
    },
    [saveUrl],
  );
  const isDirty = () => {
    const s = saved.current;
    const l = latest.current;
    return (
      s.objects !== null &&
      (s.objects !== l.objects || s.title !== l.title || s.projectName !== l.projectName || s.details !== l.details)
    );
  };

  // Saves right now and waits for the answer. Publishing uses the saved draft, so it saves first.
  const saveNow = useCallback(async (): Promise<boolean> => {
    // Let an autosave that's already on its way land first, so an older copy can't arrive later.
    for (let i = 0; i < 100 && fetcherState.current !== "idle"; i++) await new Promise((r) => setTimeout(r, 50));
    const { objects, title, projectName, details } = latest.current;
    saved.current = { objects, title, projectName, details };
    try {
      const res = await fetch(saveUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: title, projectName, objects, ...details }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [saveUrl]);
  useEffect(() => {
    // The first canvas after loading is the baseline, not a change.
    if (saved.current.objects === null) {
      if (loadedCount.current > 0 && objects === mountObjects.current) return;
      saved.current.objects = objects;
      return;
    }
    if (!isDirty()) return;
    const t = window.setTimeout(() => flush(false), 800);
    return () => window.clearTimeout(t);
  }, [objects, title, projectName, details, flush]);
  // Don't lose pending edits when leaving the studio or closing the tab.
  useEffect(() => {
    const onHide = () => isDirty() && flush(true);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      onHide();
    };
  }, [flush]);
  const saveStatus: "saving" | "saved" | "error" =
    fetcher.state !== "idle" || isDirty()
      ? "saving"
      : fetcher.data && !fetcher.data.ok
        ? "error"
        : "saved";
  const selectedObjects = objects.filter((o) => selectedIds.includes(o.id));

  // ---- code: each component can carry its own -----------------------------------------------------
  // The element ids the preview needs are added here. Parsing is redone only when code changes.
  const codeKey = objects
    .filter((o) => o.kind === "component" && o.code !== undefined)
    .map((o) => `${o.id}\u0000${o.code}`)
    .join("\u0001");
  const parsed = useMemo(() => {
    const out: Record<string, { nodes: JsxNodeInfo[]; preview: string }> = {};
    for (const entry of codeKey ? codeKey.split("\u0001") : []) {
      const [id, code] = entry.split("\u0000");
      const nodes = parseJsx(code);
      out[id] = { nodes, preview: instrument(code, nodes) };
    }
    return out;
  }, [codeKey]);
  const previews = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(parsed).map(([id, v]) => [id, v.preview]),
      ),
    [parsed],
  );

  // The element picked inside a component's preview.
  const [pickedElement, setPickedElement] = useState<{
    objectId: string;
    sid: number;
  } | null>(null);
  const pickedTag = useRef<string | null>(null);

  // The component the code panel and outline are about: the one you picked an element in, or the
  // single component that is selected.
  const activeComponent =
    objects.find(
      (o) =>
        o.id ===
        (pickedElement?.objectId ??
          (selectedObjects.length === 1 ? selectedObjects[0].id : "")),
    ) ?? null;
  const activeCodeComponent =
    activeComponent?.kind === "component" ? activeComponent : null;
  const activeNodes =
    (activeCodeComponent && parsed[activeCodeComponent.id]?.nodes) || [];
  const selectedNode =
    pickedElement && pickedElement.objectId === activeCodeComponent?.id
      ? (activeNodes[pickedElement.sid] ?? null)
      : null;

  // Drop the picked element if edits removed or replaced it.
  useEffect(() => {
    if (
      pickedElement &&
      activeNodes[pickedElement.sid]?.tag !== pickedTag.current
    )
      setPickedElement(null);
  }, [activeNodes, pickedElement]);

  // ---- publishing ---------------------------------------------------------------------------------
  // The component to publish: the one selected, or the only one with code.
  // A component made of layers is published with code written from them, the same code the Code
  // tab would show, so there is nothing extra to do first.
  const codeComponents = objects.filter(
    (o) => o.kind === "component" && (o.code !== undefined || hasLayers(objects, o.id)),
  );
  const selectedComponent = codeComponents.find((o) => selectedIds.length === 1 && o.id === selectedIds[0]);
  const publishTarget =
    selectedComponent ?? activeCodeComponent ?? (codeComponents.length === 1 ? codeComponents[0] : null);
  const publishCode = publishTarget ? (publishTarget.code ?? layersToCode(objects, publishTarget.id)) : null;
  const publishProblem =
    codeComponents.length > 1
      ? "You have more than one component. Select the one you want to publish, then try again."
      : "There's no component to publish yet. Select your layers, choose Create component, then publish it.";
  const publishChecks = usePublishChecks(publishCode);
  const [everPublished, setEverPublished] = useState(component.status === "published");

  const openPublish = async () => {
    setPublishOpen(true);
    setPublishPrep("saving");
    // Write the code down first when the component only has layers, so the saved draft has it.
    if (publishTarget && publishTarget.code === undefined) {
      flushSync(() => setObjects((all) => attachCode(all, publishTarget.id)));
    }
    setPublishPrep((await saveNow()) ? "ready" : "failed");
  };
  const goToLine = (line: number) => {
    if (!publishTarget) return;
    setSelectedIds([publishTarget.id]);
    setPickedElement(null);
    setRightTab("code");
    right.current?.expand();
    setReveal((r) => ({ pos: offsetOfLine(publishCode ?? "", line), nonce: (r?.nonce ?? 0) + 1 }));
  };

  const right = useRef<PanelImperativeHandle>(null);
  const left = useRef<PanelImperativeHandle>(null);

  const selectElement = useCallback(
    (objectId: string | null, sid: number | null) => {
      if (objectId === null || sid === null) {
        setPickedElement(null);
        pickedTag.current = null;
        return;
      }
      const node = parsed[objectId]?.nodes[sid];
      if (!node) return;
      setPickedElement({ objectId, sid });
      pickedTag.current = node.tag;
      setRightTab("design");
      right.current?.expand();
      setReveal((r) => ({ pos: node.openFrom, nonce: (r?.nonce ?? 0) + 1 }));
    },
    [parsed],
  );

  const setCode = (id: string, code: string) =>
    setObjects(
      (all) => all.map((o) => (o.id === id ? { ...o, code } : o)),
      `code:${id}`,
    );

  // Starter code needs some room, so a small component grows to fit it (it never shrinks).
  const addCode = (id: string) =>
    setObjects((all) =>
      hasLayers(all, id)
        ? attachCode(all, id) // written from the layers, so it matches what was drawn
        : all.map((o) =>
        o.id === id
          ? {
              ...o,
              code: SAMPLE_CODE,
              width: Math.max(o.width, 480),
              height: Math.max(o.height, 320),
            }
          : o,
      ),
    );

  // ---- components and instances ---------------------------------------------------------------
  const selectOnly = (ids: string[]) => {
    setSelectedIds(ids);
    setPickedElement(null);
    if (ids.length) {
      setRightTab("design");
      right.current?.expand();
    }
  };

  const makeComponent = () => {
    const made = createComponent(objects, selectedIds);
    if (!made) return;
    setObjects(made.objects);
    selectOnly([made.id]);
  };
  const makeInstance = (componentIdToUse: string) => {
    const made = createInstance(objects, componentIdToUse);
    if (!made) return;
    setObjects(made.objects);
    selectOnly([made.id]);
    setFocusRequest((r) => ({ id: made.id, nonce: (r?.nonce ?? 0) + 1 }));
  };
  const detach = (id: string) => {
    setObjects((all) => detachInstance(all, id));
    selectOnly([id]);
  };
  const goToMain = (id: string) => {
    selectOnly([id]);
    setFocusRequest((r) => ({ id, nonce: (r?.nonce ?? 0) + 1 }));
  };
  const group = () => {
    const made = groupObjects(objects, selectedIds);
    if (!made) return;
    setObjects(made.objects);
    selectOnly([made.id]);
  };
  const ungroup = () => {
    const made = ungroupObjects(objects, selectedIds);
    if (!made) return;
    setObjects(made.objects);
    selectOnly(made.ids);
  };
  const duplicate = () => {
    if (!selectedIds.length) return;
    const made = duplicateObjects(objects, selectedIds);
    setObjects(made.objects);
    if (made.ids.length) selectOnly(made.ids);
  };

  // Undo and redo. The code editor and text being typed on the canvas have their own history, so
  // those are left alone.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t?.closest?.(".cm-editor") ||
        t?.matches?.(
          'textarea, input[aria-label$="name"], input[aria-label="Name"]',
        )
      )
        return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // What was selected may no longer exist after an undo.
  useEffect(() => {
    setSelectedIds((ids) =>
      ids.every((id) => objects.some((o) => o.id === id))
        ? ids
        : ids.filter((id) => objects.some((o) => o.id === id)),
    );
  }, [objects]);

  const toggle = (panel: React.RefObject<PanelImperativeHandle | null>) => {
    const p = panel.current;
    if (!p) return;
    if (p.isCollapsed()) p.expand();
    else p.collapse();
  };
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  if (!mounted) return <div className="bg-background h-svh" aria-busy="true" />;

  return (
    <div className="bg-background text-foreground flex h-svh flex-col overflow-hidden">
      <StudioTopBar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        title={title}
        onTitleChange={setTitle}
        previewTheme={previewTheme}
        onPreviewThemeChange={setPreviewTheme}
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        onToggleLeft={() => toggle(left)}
        onToggleRight={() => toggle(right)}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        saveStatus={saveStatus}
        onPublish={() => void openPublish()}
      />
      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        componentId={componentId}
        target={
          publishTarget && publishCode !== null
            ? { id: publishTarget.id, name: publishTarget.name, code: publishCode }
            : null
        }
        problem={publishProblem}
        prep={publishPrep}
        onRetrySave={() => void openPublish()}
        details={{ title, ...details }}
        onDetailsChange={(d) => {
          setTitle(d.title);
          setDetails({ description: d.description, category: d.category, tags: d.tags });
        }}
        checks={publishChecks}
        onGoToLine={goToLine}
        isUpdate={everPublished}
        onPublished={() => setEverPublished(true)}
      />
      <ResizablePanelGroup
        orientation="horizontal"
        defaultLayout={readStoredLayout()}
        onLayoutChanged={writeStoredLayout}
        className="min-h-0 flex-1"
        data-component-id={componentId}
      >
        <ResizablePanel
          id="left"
          panelRef={left}
          defaultSize={240}
          minSize={200}
          maxSize={420}
          collapsible
          collapsedSize={0}
          onResize={(size) => setLeftOpen(size.inPixels > 0)}
        >
          <LeftPanel
            objects={objects}
            selectedIds={selectedIds}
            onSelectObject={(id, additive) =>
              selectOnly(
                additive
                  ? selectedIds.includes(id)
                    ? selectedIds.filter((x) => x !== id)
                    : [...selectedIds, id]
                  : [id],
              )
            }
            codeComponentId={
              activeCodeComponent?.code !== undefined
                ? activeCodeComponent.id
                : null
            }
            nodes={activeNodes}
            selectedSid={
              pickedElement?.objectId === activeCodeComponent?.id
                ? (pickedElement?.sid ?? null)
                : null
            }
            onPickElement={(sid) => {
              if (!activeCodeComponent) return;
              setSelectedIds([activeCodeComponent.id]);
              selectElement(activeCodeComponent.id, sid);
            }}
          />
        </ResizablePanel>
        <ResizableHandle aria-label="Resize outline" />
        <ResizablePanel id="center" minSize={320}>
          <Canvas
            objects={objects}
            onObjectsChange={setObjects}
            onCommit={seal}
            selectedIds={selectedIds}
            onSelectObjects={(ids) => {
              setSelectedIds(ids);
              if (ids.length >= 1) {
                setRightTab("design");
                right.current?.expand();
              }
            }}
            previews={previews}
            theme={previewTheme}
            selectedElement={
              pickedElement && selectedNode
                ? {
                    objectId: pickedElement.objectId,
                    sid: selectedNode.sid,
                    tag: selectedNode.tag,
                  }
                : null
            }
            onSelectElement={selectElement}
            onCreateComponent={makeComponent}
            onCreateInstance={makeInstance}
            onDuplicate={duplicate}
            onGroup={group}
            onUngroup={ungroup}
            focusRequest={focusRequest}
          />
        </ResizablePanel>
        <ResizableHandle aria-label="Resize editor panel" />
        <ResizablePanel
          id="right"
          panelRef={right}
          defaultSize={480}
          minSize={320}
          maxSize={900}
          collapsible
          collapsedSize={0}
          onResize={(size) => setRightOpen(size.inPixels > 0)}
        >
          <RightPanel
            tab={rightTab}
            onTabChange={setRightTab}
            component={activeCodeComponent}
            onCodeChange={(code) =>
              activeCodeComponent && setCode(activeCodeComponent.id, code)
            }
            onAddCode={() =>
              activeCodeComponent && addCode(activeCodeComponent.id)
            }
            fileName={SAMPLE_FILE}
            reveal={reveal}
            selectedNode={selectedNode}
            selectedObjects={selectedObjects}
            allObjects={objects}
            onObjectChange={(patch) =>
              setObjects(
                (all) => patchObjects(all, selectedIds, patch),
                `props:${selectedIds.join(",")}:${Object.keys(patch).join(",")}`,
              )
            }
            actions={{
              createComponent: makeComponent,
              canCreateComponent: canCreateComponent(objects, selectedIds),
              createInstance: makeInstance,
              rebuildCode: (id: string) => setObjects((all) => rebuildCode(all, id)),
              detach,
              goToMain,
              canGroup: canGroup(objects, selectedIds),
              group,
              ungroup,
            }}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
