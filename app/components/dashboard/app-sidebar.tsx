import {
  ChevronsUpDown,
  FolderKanban,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";

import { UserAvatar, UserMenuItems, useCurrentUser } from "./user-menu";

type NavItem = { label: string; to: string; icon: LucideIcon; badge?: string };

const NAV: NavItem[] = [
  { label: "Overview", to: "/overview", icon: LayoutDashboard },
  { label: "My components", to: "/components", icon: FolderKanban },
  { label: "Settings", to: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const user = useCurrentUser();

  // Close the drawer after navigating (Escape is handled by the drawer itself).
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b px-3 py-0">
        <Link
          to="/overview"
          className="focus-visible:ring-sidebar-ring flex items-center gap-2 rounded-md px-1 outline-none group-data-[collapsible=icon]:justify-center focus-visible:ring-2"
        >
          <img
            src="/logo.svg"
            alt=""
            width={47}
            height={44}
            className="h-8 w-auto shrink-0"
          />
          <span className="truncate text-lg font-semibold tracking-tight group-data-[collapsible=icon]:sr-only">
            Teressa
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav aria-label="Main">
              <SidebarMenu>
                {NAV.map(({ label, to, icon: Icon, badge }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      asChild
                      size="lg"
                      // tooltips are only for the collapsed rail; in the drawer they would swallow the first Escape
                      tooltip={isMobile ? undefined : label}
                      isActive={pathname === to}
                      className="data-active:bg-primary! data-active:text-primary-foreground! data-active:font-semibold group-data-[collapsible=icon]:mx-auto"
                    >
                      {/* NavLink sets aria-current="page" on the active item */}
                      <NavLink to={to} end>
                        <Icon />
                        <span className="group-data-[collapsible=icon]:sr-only">{label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                    {badge && <SidebarMenuBadge>{badge}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip={isMobile ? undefined : "Account menu"} className="group-data-[collapsible=icon]:mx-auto">
                  <UserAvatar className="size-8 rounded-lg" />
                  <div className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium">{user.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {user.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isMobile ? "top" : "right"}
                align="end"
                className="min-w-48"
              >
                <UserMenuItems />
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
