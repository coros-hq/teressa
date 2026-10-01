import { Link, useLocation } from "react-router";

import { Button } from "~/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "~/components/ui/sidebar";

import { NotificationsBell } from "./notifications-bell";
import { UserAvatar, UserMenuItems } from "./user-menu";

const TITLES: Record<string, string> = {
  "/overview": "Overview",
  "/components": "My components",
  "/new": "New component",
  "/notifications": "Notifications",
  "/settings": "Settings",
};

// Stays at the top while the content scrolls.
export function AppHeader() {
  const { pathname } = useLocation();
  // A page inside a section (Settings → Profile) is titled by its section.
  const title = TITLES[pathname] ?? TITLES["/" + pathname.split("/")[1]] ?? "Page";

  return (
    <header className="bg-background flex h-14 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
      <SidebarTrigger className="-ml-2 size-9" />
      <Separator orientation="vertical" className="mr-1 h-5 self-center!" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap">
          <BreadcrumbItem className="hidden sm:inline-flex">
            <BreadcrumbLink asChild>
              <Link to="/overview">Teressa</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden sm:block" />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <NotificationsBell />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Account menu"
          >
            <UserAvatar className="size-8" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <UserMenuItems />
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
