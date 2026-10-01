// How the Settings forms talk to the server: small JSON requests to our own endpoints. Components
// never call the database directly. A failed or unreadable reply always comes back as a plain message.

export type ApiResult = { ok: boolean; message?: string; fieldErrors?: Record<string, string>; [key: string]: unknown };

const NETWORK = "We couldn't reach the server. Check your connection and try again.";
const GENERIC = "Something went wrong. Try again.";

async function read(res: Response): Promise<ApiResult> {
  const json = await res.json().catch(() => null);
  return json && typeof json.ok === "boolean" ? json : { ok: false, message: GENERIC };
}

export async function postJson(url: string, body: unknown, method: "POST" | "DELETE" = "POST"): Promise<ApiResult> {
  try {
    return await read(await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
  } catch {
    return { ok: false, message: NETWORK };
  }
}

export async function sendFile(url: string, file: Blob, name: string): Promise<ApiResult> {
  try {
    const form = new FormData();
    form.append("file", file, name);
    return await read(await fetch(url, { method: "POST", body: form }));
  } catch {
    return { ok: false, message: NETWORK };
  }
}

export async function removeAvatarRequest(): Promise<ApiResult> {
  try {
    return await read(await fetch("/api/settings/avatar", { method: "DELETE" }));
  } catch {
    return { ok: false, message: NETWORK };
  }
}
