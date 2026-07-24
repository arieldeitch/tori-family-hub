import {
  CalendarDays,
  CheckSquare,
  Home,
  LayoutGrid,
  ShoppingCart,
  Car,
  ClipboardList,
  Users,
  Bell,
  Settings,
  Baby,
  Repeat,
  MapPin,
  type LucideIcon,
} from "lucide-react";

export type NavKey =
  | "today"
  | "calendar"
  | "tasks"
  | "shopping"
  | "more"
  | "transport"
  | "followUps"
  | "shifts"
  | "errands"
  | "household"
  | "notifications"
  | "settings"
  | "child";

export interface NavItem {
  key: NavKey;
  to: string;
  labelKey: `nav.${NavKey}`;
  icon: LucideIcon;
}

export const primaryNav: NavItem[] = [
  { key: "today", to: "/today", labelKey: "nav.today", icon: Home },
  { key: "calendar", to: "/calendar", labelKey: "nav.calendar", icon: CalendarDays },
  { key: "tasks", to: "/tasks", labelKey: "nav.tasks", icon: CheckSquare },
  { key: "shopping", to: "/shopping", labelKey: "nav.shopping", icon: ShoppingCart },
  { key: "more", to: "/more", labelKey: "nav.more", icon: LayoutGrid },
];

export const secondaryNav: NavItem[] = [
  { key: "transport", to: "/transport", labelKey: "nav.transport", icon: Car },
  { key: "errands", to: "/errands", labelKey: "nav.errands", icon: MapPin },
  { key: "followUps", to: "/follow-ups", labelKey: "nav.followUps", icon: ClipboardList },
  { key: "shifts", to: "/shifts", labelKey: "nav.shifts", icon: Repeat },
  { key: "household", to: "/household", labelKey: "nav.household", icon: Users },
  { key: "notifications", to: "/notifications", labelKey: "nav.notifications", icon: Bell },
  { key: "settings", to: "/settings", labelKey: "nav.settings", icon: Settings },
  { key: "child", to: "/child", labelKey: "nav.child", icon: Baby },
];

export const allNav: NavItem[] = [...primaryNav, ...secondaryNav];
