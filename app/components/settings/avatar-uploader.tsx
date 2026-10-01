import { useRef, useState } from "react";
import { useRevalidator } from "react-router";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { removeAvatarRequest, sendFile } from "~/lib/settings/client";
import { cropToSquare } from "~/lib/settings/crop";
import { AVATAR, validateAvatar } from "~/lib/settings/validation";
import { toast } from "sonner";

// Upload and Remove save straight away (they aren't part of the form's Save button). The picture
// is cut to a square in the browser first. If anything fails, the previous avatar stays.
export function AvatarUploader({ initialUrl, name }: { initialUrl: string | null; name: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  // The header and sidebar show this picture too, so they reload it after a change.
  const { revalidate } = useRevalidator();
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  async function onFile(file: File | undefined) {
    if (!file) return; // the picker was cancelled
    setError(null);
    const problem = validateAvatar(file);
    if (problem) return setError(problem);

    setBusy("upload");
    try {
      const square = await cropToSquare(file);
      const result = await sendFile("/api/settings/avatar", square, "avatar");
      if (result.ok && typeof result.avatarUrl === "string") {
        setUrl(result.avatarUrl);
        void revalidate();
        toast.success("Avatar updated");
      } else {
        setError(result.message ?? "The upload didn't work. Your current avatar is unchanged.");
      }
    } catch {
      setError("We couldn't read that image. Try a different one.");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = ""; // lets the same file be chosen again
    }
  }

  async function remove() {
    setError(null);
    setBusy("remove");
    const result = await removeAvatarRequest();
    setBusy(null);
    if (result.ok) {
      setUrl(null);
      void revalidate();
      toast.success("Avatar removed");
    } else setError(result.message ?? "Couldn't remove your avatar. Try again.");
  }

  return (
    <div className="grid gap-2">
      <p id="avatar-label" className="text-sm leading-snug font-medium">
        Avatar
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="size-20">
          {url && <AvatarImage src={url} alt="" />}
          <AvatarFallback className="text-xl">{initial}</AvatarFallback>
        </Avatar>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="avatar-label">
          <input
            ref={input}
            type="file"
            accept={AVATAR.types.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <Button type="button" variant="outline" className="min-h-11" disabled={busy !== null} onClick={() => input.current?.click()}>
            {busy === "upload" ? "Uploading…" : url ? "Upload new" : "Upload"}
          </Button>
          <Button type="button" variant="ghost" className="min-h-11" disabled={busy !== null || !url} onClick={() => void remove()}>
            {busy === "remove" ? "Removing…" : "Remove"}
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground text-sm">PNG, JPG or WebP, up to 2 MB. We&apos;ll crop it to a square.</p>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
