import type { DesignObject } from "./design-model";
import type { JsxNodeInfo } from "./jsx-tree";
import { OutlineTab } from "./outline-tab";

// The outline: one list of everything on the canvas.
export function LeftPanel({
  objects,
  selectedIds,
  onSelectObject,
  codeComponentId,
  nodes,
  selectedSid,
  onPickElement,
}: {
  objects: DesignObject[];
  selectedIds: string[];
  onSelectObject: (id: string, additive: boolean) => void;
  codeComponentId: string | null;
  nodes: JsxNodeInfo[];
  selectedSid: number | null;
  onPickElement: (sid: number) => void;
}) {
  return (
    <aside aria-label="Outline" className="bg-sidebar flex h-full min-w-0 flex-col">
      <h2 className="text-muted-foreground shrink-0 border-b px-4 py-3 text-xs font-medium tracking-wide uppercase">
        Outline
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <OutlineTab
          objects={objects}
          selectedIds={selectedIds}
          onSelectObject={onSelectObject}
          codeComponentId={codeComponentId}
          nodes={nodes}
          selectedSid={selectedSid}
          onPickElement={onPickElement}
        />
      </div>
    </aside>
  );
}
