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
  | "chores"
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

// Five primary items is the ceiling for a thumb-reachable bottom bar, so the
// weekly chores module takes the slot that best matches it. `/tasks` is the
// mock-backed one-off task prototype and moves to the secondary list; `/chores`
// is the real, Supabase-backed weekly family view and is what the pilot is for.
export const primaryNav: NavItem[] = [
  { key: "today", to: "/today", labelKey: "nav.today", icon: Home },
  { key: "chores", to: "/chores", labelKey: "nav.chores", icon: CheckSquare },
  { key: "calendar", to: "/calendar", labelKey: "nav.calendar", icon: CalendarDays },
  { key: "shopping", to: "/shopping", labelKey: "nav.shopping", icon: ShoppingCart },
  { key: "more", to: "/more", labelKey: "nav.more", icon: LayoutGrid },
];

export const secondaryNav: NavItem[] = [
  { key: "tasks", to: "/tasks", labelKey: "nav.tasks", icon: CheckSquare },
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
