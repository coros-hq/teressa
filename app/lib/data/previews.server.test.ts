import assert from "node:assert/strict";
import { test } from "node:test";

import { PREVIEW_MAX_BYTES, PREVIEW_PATH, previewUrl, previewsExist, removePreviewsOf, storePreviews } from "./previews.server.ts";

const CID = "c0c0c0c0-0000-4000-8000-000000000001";
const WEBP = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 1, 2]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1]);

function fake(opts: { failSecond?: boolean; listed?: string[] } = {}) {
  const log: string[] = [];
  let uploads = 0;
  const client = { storage: { from: () => ({
    upload: async (p: string) => (log.push(`upload ${p}`), ++uploads === 2 && opts.failSecond ? { error: { message: "x" } } : { error: null }),
    remove: async (p: string[]) => (log.push(`remove ${p.join(",")}`), { error: null }),
    list: async () => ({ data: (opts.listed ?? []).map((name) => ({ name })), error: null }),
  }) } };
  return { client: client as never, log };
}

test("stores a light and a dark picture in the component's own folder", async () => {
  const f = fake();
  const r = await storePreviews(f.client, CID, { light: WEBP, dark: PNG });
  assert.ok(r.ok);
  assert.match(r.previewLight, PREVIEW_PATH);
  assert.match(r.previewDark, PREVIEW_PATH);
  assert.ok(r.previewLight.startsWith(`${CID}/`) && r.previewLight.endsWith("-light.webp"));
  assert.ok(r.previewDark.endsWith("-dark.png"), "the extension follows the real file type");
});

test("only real webp or png pictures of a sensible size are accepted", async () => {
  for (const [light, dark] of [[JPEG, WEBP], [WEBP, new TextEncoder().encode("<svg onload=alert(1)>")], [new Uint8Array(), WEBP], [WEBP, new Uint8Array(PREVIEW_MAX_BYTES + 1).fill(1)]]) {
    const f = fake();
    const r = await storePreviews(f.client, CID, { light, dark });
    assert.ok(!r.ok);
    assert.equal(f.log.length, 0, "nothing is stored when either picture is bad");
  }
  assert.ok(!(await storePreviews(fake().client, "not-an-id", { light: WEBP, dark: WEBP })).ok);
});

test("if the second picture fails, the first is removed (no half pair left behind)", async () => {
  const f = fake({ failSecond: true });
  const r = await storePreviews(f.client, CID, { light: WEBP, dark: WEBP });
  assert.ok(!r.ok);
  assert.ok(f.log.some((l) => l.startsWith("remove ") && l.includes("-light.")));
});

test("a preview must be in this component's folder, match its theme, and really exist", async () => {
  const L = `${CID}/aaaaaaaa-0000-4000-8000-000000000001-light.webp`;
  const D = `${CID}/aaaaaaaa-0000-4000-8000-000000000002-dark.png`;
  const listed = ["aaaaaaaa-0000-4000-8000-000000000001-light.webp", "aaaaaaaa-0000-4000-8000-000000000002-dark.png"];
  assert.equal(await previewsExist(fake({ listed }).client, CID, L, D), true);
  assert.equal(await previewsExist(fake({ listed: [listed[0]] }).client, CID, L, D), false, "missing file");
  assert.equal(await previewsExist(fake({ listed }).client, CID, D, L), false, "themes swapped");
  assert.equal(await previewsExist(fake({ listed }).client, "c1c1c1c1-0000-4000-8000-000000000009", L, D), false, "someone else's folder");
});

test("deleting components removes all their preview files", async () => {
  const f = fake({ listed: ["a-light.webp", "a-dark.webp"] });
  assert.ok(await removePreviewsOf(f.client, [CID, "not-an-id"]));
  assert.deepEqual(f.log, [`remove ${CID}/a-light.webp,${CID}/a-dark.webp`]);
});

test("public addresses point at the previews bucket", () => {
  process.env.SUPABASE_URL = "https://x.supabase.co";
  assert.equal(previewUrl(`${CID}/a-light.webp`), `https://x.supabase.co/storage/v1/object/public/previews/${CID}/a-light.webp`);
  assert.equal(previewUrl(null), null);
});
