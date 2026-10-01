// Messages between the app and the sandboxed preview iframe. Both sides import this file and
// validate every incoming message with the guards below before acting on it.

import type { AuditResult } from "~/lib/publish/checks/types.ts";

export type ThemeVars = Record<string, string>;

export type FontPayload = { family: string; weight: string; data: ArrayBuffer };

export type ToFrame =
  | {
      source: "studio";
      type: "init";
      theme: "light" | "dark";
      vars: { light: ThemeVars; dark: ThemeVars };
      fonts: FontPayload[];
    }
  | { source: "studio"; type: "render"; id: number; code: string }
  | { source: "studio"; type: "theme"; theme: "light" | "dark" }
  // Draw `code` in `theme`, run the accessibility scan on it, and reply with an "audit-result".
  | { source: "studio"; type: "audit"; req: number; code: string; theme: "light" | "dark" }
  // Draw `code` in `theme` and reply with a picture of it (the preview image for publishing).
  | { source: "studio"; type: "capture"; req: number; code: string; theme: "light" | "dark" }
  // Ask which element is at a point (frame pixels), or where element `sid` is.
  | { source: "studio"; type: "query"; req: number; kind: "hit"; x: number; y: number }
  | { source: "studio"; type: "query"; req: number; kind: "measure"; sid: number };

export type Rect = { x: number; y: number; width: number; height: number };

export type FromFrame =
  | { source: "studio-preview"; type: "ready" }
  | { source: "studio-preview"; type: "rendered"; id: number }
  | { source: "studio-preview"; type: "audit-result"; req: number; result: AuditResult }
  | {
      source: "studio-preview";
      type: "capture-result";
      req: number;
      result: { ok: true; mime: string; data: ArrayBuffer } | { ok: false; message: string };
    }
  | { source: "studio-preview"; type: "query-result"; req: number; sid: number | null; rect: Rect | null }
  | {
      source: "studio-preview";
      type: "error";
      id: number;
      phase: "compile" | "runtime";
      message: string;
    };

export const MAX_CODE_LENGTH = 200_000;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const isRect = (v: unknown): v is Rect =>
  isObject(v) && isNum(v.x) && isNum(v.y) && isNum(v.width) && isNum(v.height);

const isVars = (v: unknown): v is ThemeVars =>
  isObject(v) &&
  Object.entries(v).every(
    ([k, val]) => k.startsWith("--") && typeof val === "string" && val.length < 500
  );

export function isToFrame(data: unknown): data is ToFrame {
  if (!isObject(data) || data.source !== "studio") return false;
  switch (data.type) {
    case "init":
      return (
        (data.theme === "light" || data.theme === "dark") &&
        isObject(data.vars) &&
        isVars(data.vars.light) &&
        isVars(data.vars.dark) &&
        Array.isArray(data.fonts) &&
        data.fonts.every(
          (f) =>
            isObject(f) &&
            typeof f.family === "string" &&
            typeof f.weight === "string" &&
            f.data instanceof ArrayBuffer
        )
      );
    case "render":
      return (
        typeof data.id === "number" &&
        typeof data.code === "string" &&
        data.code.length <= MAX_CODE_LENGTH
      );
    case "theme":
      return data.theme === "light" || data.theme === "dark";
    case "audit":
    case "capture":
      return (
        typeof data.req === "number" &&
        (data.theme === "light" || data.theme === "dark") &&
        typeof data.code === "string" &&
        data.code.length <= MAX_CODE_LENGTH * 2 // instrumented code is a little longer than the source
      );
    case "query":
      if (typeof data.req !== "number") return false;
      if (data.kind === "hit") return isNum(data.x) && isNum(data.y);
      if (data.kind === "measure") return isNum(data.sid);
      return false;
    default:
      return false;
  }
}

const IMPACTS = ["minor", "moderate", "serious", "critical"];

function isAuditResult(v: unknown): v is AuditResult {
  if (!isObject(v) || (v.theme !== "light" && v.theme !== "dark") || typeof v.empty !== "boolean") return false;
  if (!Array.isArray(v.violations) || !isObject(v.render) || typeof v.render.ok !== "boolean") return false;
  return v.violations.every(
    (x) =>
      isObject(x) &&
      typeof x.id === "string" &&
      (x.impact === null || IMPACTS.includes(x.impact as string)) &&
      typeof x.help === "string" &&
      Array.isArray(x.nodes) &&
      x.nodes.every((n) => isObject(n) && typeof n.html === "string" && (n.sid === null || isNum(n.sid)))
  );
}

export function isFromFrame(data: unknown): data is FromFrame {
  if (!isObject(data) || data.source !== "studio-preview") return false;
  switch (data.type) {
    case "ready":
      return true;
    case "rendered":
      return typeof data.id === "number";
    case "audit-result":
      return isNum(data.req) && isAuditResult(data.result);
    case "capture-result": {
      const r = data.result;
      return (
        isNum(data.req) &&
        isObject(r) &&
        (r.ok === true ? typeof r.mime === "string" && r.data instanceof ArrayBuffer : r.ok === false && typeof r.message === "string")
      );
    }
    case "query-result":
      return (
        isNum(data.req) &&
        (data.sid === null || isNum(data.sid)) &&
        (data.rect === null || isRect(data.rect))
      );
    case "error":
      return (
        typeof data.id === "number" &&
        (data.phase === "compile" || data.phase === "runtime") &&
        typeof data.message === "string"
      );
    default:
      return false;
  }
}
