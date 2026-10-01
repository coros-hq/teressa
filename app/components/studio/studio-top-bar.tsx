import { AlertCircle, ArrowLeft, Check, Loader2, Moon, PanelLeft, PanelRight, Redo2, Sun, Undo2 } from "lucide-react";
import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";

import { InlineTitle } from "./inline-title";

export function StudioTopBar({
  projectName,
  onProjectNameChange,
  title,
  onTitleChange,
  previewTheme,
  onPreviewThemeChange,
  leftOpen,
  rightOpen,
  onToggleLeft,
  onToggleRight,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  saveStatus,
  onPublish,
}: {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  title: string;
  onTitleChange: (title: string) => void;
  previewTheme: "light" | "dark";
  onPreviewThemeChange: (t: "light" | "dark") => void;
  // The canvas studio has side panels and its own undo. The code editor has neither, so these are optional.
  leftOpen?: boolean;
  rightOpen?: boolean;
  onToggleLeft?: () => void;
  onToggleRight?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  saveStatus: "saving" | "saved" | "error";
  onPublish: () => void;
}) {

  return (
    <header className="bg-background flex h-12 shrink-0 items-center gap-2 border-b px-2 sm:px-3">
      <Button asChild variant="ghost" size="icon" aria-label="Back to dashboard">
        <Link to="/overview">
          <ArrowLeft />
        </Link>
      </Button>
      {onToggleLeft && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Files and outline panel"
          aria-pressed={leftOpen}
          onClick={onToggleLeft}
          className="hidden md:inline-flex"
        >
          <PanelLeft />
        </Button>
      )}
      <div className="flex min-w-0 items-center">
        <InlineTitle
          value={projectName}
          onChange={onProjectNameChange}
          label="Project name"
          className="text-muted-foreground max-w-32 sm:max-w-44"
        />
        <span aria-hidden="true" className="text-muted-foreground">
          /
        </span>
        <InlineTitle value={title} onChange={onTitleChange} label="Component name" />
      </div>

      <p role="status" className="text-muted-foreground mx-auto hidden items-center gap-1.5 text-sm sm:flex">
        {saveStatus === "saving" && <Loader2 className="size-3.5 animate-spin" />}
        {saveStatus === "saved" && <Check className="size-3.5" />}
        {saveStatus === "error" && <AlertCircle className="text-destructive size-3.5" />}
        {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Couldn't save"}
      </p>

      <div className="ml-auto flex items-center gap-1 sm:ml-0 sm:gap-2">
        {onUndo && onRedo && (
          <>
            <Button variant="ghost" size="icon" aria-label="Undo" title="Undo (Ctrl/Cmd+Z)" disabled={!canUndo} onClick={onUndo}>
              <Undo2 />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Redo"
              title="Redo (Ctrl/Cmd+Shift+Z)"
              disabled={!canRedo}
              onClick={onRedo}
            >
              <Redo2 />
            </Button>
            <Separator orientation="vertical" className="h-5 self-center!" />
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Preview theme: ${previewTheme}. Switch to ${previewTheme === "light" ? "dark" : "light"}`}
          onClick={() => onPreviewThemeChange(previewTheme === "light" ? "dark" : "light")}
        >
          {previewTheme === "light" ? <Sun /> : <Moon />}
        </Button>

        <Separator orientation="vertical" className="hidden h-5 self-center! sm:block" />
        <Button onClick={onPublish}>Publish</Button>
        {onToggleRight && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Editor panel"
            aria-pressed={rightOpen}
            onClick={onToggleRight}
            className="hidden md:inline-flex"
          >
            <PanelRight />
          </Button>
        )}
      </div>

    </header>
  );
}
