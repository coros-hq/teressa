import { lazy, Suspense } from "react";

import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { DesignTab, type ComponentActions } from "./design-tab";
import type { DesignObject } from "./design-model";
import type { JsxNodeInfo } from "./jsx-tree";

// The editor is heavy and needs the DOM, so it loads on demand and only in the browser.
const CodeEditor = lazy(() => import("./code-editor"));

export type RightTab = "code" | "design";

export function RightPanel({
  tab,
  onTabChange,
  component,
  onCodeChange,
  onAddCode,
  fileName,
  reveal,
  selectedNode,
  selectedObjects,
  allObjects,
  onObjectChange,
  actions,
}: {
  tab: RightTab;
  onTabChange: (tab: RightTab) => void;
  /** The component whose code is shown, when a component is selected. */
  component: DesignObject | null;
  onCodeChange: (code: string) => void;
  onAddCode: () => void;
  fileName: string;
  reveal: { pos: number; nonce: number } | null;
  selectedNode: JsxNodeInfo | null;
  selectedObjects: DesignObject[];
  allObjects: DesignObject[];
  onObjectChange: (patch: Partial<DesignObject>) => void;
  actions: ComponentActions;
}) {
  return (
    <aside aria-label="Editor" className="bg-background flex h-full min-w-0 flex-col">
      <Tabs
        value={tab}
        onValueChange={(v) => onTabChange(v as RightTab)}
        className="flex h-full min-h-0 flex-col gap-0"
      >
        <TabsList className="m-2 mb-0 w-auto">
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
        </TabsList>

        {/* Stays mounted while another tab is showing, so the cursor and undo history are kept. */}
        <TabsContent
          value="code"
          forceMount
          className="mt-2 min-h-0 flex-1 border-t data-[state=inactive]:hidden"
        >
          {component?.code !== undefined ? (
            <Suspense
              fallback={
                <div className="grid gap-2 p-4" aria-busy="true">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              }
            >
              <CodeEditor
                key={component.id}
                value={component.code}
                onChange={onCodeChange}
                label={`Code for ${component.name} (${fileName})`}
                reveal={reveal}
              />
            </Suspense>
          ) : component ? (
            <div className="grid justify-items-start gap-3 p-4">
              <p className="text-sm font-semibold">{component.name} is made of layers</p>
              <p className="text-muted-foreground text-sm">
                Add code to draw this component live from code instead. Your layers are kept, and
                you can remove the code later.
              </p>
              <Button onClick={onAddCode}>Add code</Button>
            </div>
          ) : (
            <p className="text-muted-foreground p-4 text-sm">
              Select a component to see its code. To make one, select your finished layers and
              choose Create component.
            </p>
          )}
        </TabsContent>
        <TabsContent value="design" className="min-h-0 flex-1 overflow-y-auto">
          <DesignTab
            code={component?.code ?? ""}
            node={selectedNode}
            onCodeChange={onCodeChange}
            objects={selectedObjects}
            allObjects={allObjects}
            onObjectChange={onObjectChange}
            actions={actions}
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
