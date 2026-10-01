// Placeholder component shown until components are loaded from the data layer.
export const SAMPLE_FILE = "notification-card.tsx";

export const SAMPLE_CODE = `import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function NotificationCard() {
  return (
    <div className="flex w-96 items-center gap-4 rounded-3xl border bg-card p-4 text-card-foreground shadow-sm">
      <Avatar>
        <AvatarFallback>D</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 gap-0.5">
        <p className="font-semibold leading-tight">New Comment</p>
        <p className="text-sm text-muted-foreground">From DesignGuru22</p>
      </div>
      <Button size="sm">Mark as read</Button>
    </div>
  );
}
`;

// What a new component made in the code editor starts with: small, plain Tailwind, nothing to import.
export const STARTER_CODE = `export default function MyComponent() {
  return (
    <button className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
      Click me
    </button>
  );
}
`;
