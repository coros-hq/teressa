import { CircleUser, LogOut } from "lucide-react";
import { Form, Link, useRouteLoaderData } from "react-router";

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

// The signed-in user, from the loader of the auth guard route.
export function useCurrentUser() {
  const d = useRouteLoaderData<{ user: { id: string; email: string; name: string; avatarUrl: string | null } }>(
    "routes/app/authenticated",
  );
  return d?.user ?? { id: "", email: "", name: "", avatarUrl: null };
}

export function UserAvatar({ className }: { className?: string }) {
  const { name, email, avatarUrl } = useCurrentUser();
  return (
    <Avatar className={className}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
      <AvatarFallback>{(name || email || "U").charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

// Items shared by the sidebar user menu and the header avatar menu.
export function UserMenuItems() {
  return (
    <>
      <DropdownMenuItem asChild>
        <Link to="/settings">
          <CircleUser />
          Account
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <Form method="post" action="/sign-out">
        <DropdownMenuItem asChild>
          <button type="submit" className="w-full">
            <LogOut />
            Sign out
          </button>
        </DropdownMenuItem>
      </Form>
    </>
  );
}
