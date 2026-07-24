// In-memory typed repository for household + members. UI must NOT read
// mock arrays directly; go through this repo (or an application service).
//
// State is process-memory only. No localStorage, no server, no persistence.
// Subscribers are notified via useSyncExternalStore-compatible API.

import { type Household, type Member, type Role, pickColor, toInitials } from "@/domain/household";

interface State {
  household: Household | null;
  members: Member[];
}

let state: State = {
  household: null,
  members: [],
};

const listeners = new Set<() => void>();

function emit() {
  state = { ...state, members: [...state.members] };
  listeners.forEach((l) => l());
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export const householdRepo = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): State {
    return state;
  },
  createHousehold(input: { name: string; timezone: string; locale: string }): Household {
    const household: Household = {
      id: uid("hh"),
      name: input.name,
      timezone: input.timezone,
      locale: input.locale,
      createdAt: new Date().toISOString(),
    };
    state = { ...state, household };
    emit();
    return household;
  },
  addMember(input: {
    name: string;
    role: Role;
    hasLogin?: boolean;
    status?: Member["status"];
    birthDate?: string;
    pinEnabled?: boolean;
    accessWindow?: { start: string; end: string };
    restrictedToChildIds?: string[];
  }): Member {
    const existingColors = state.members.map((m) => m.color);
    const member: Member = {
      id: uid("m"),
      name: input.name,
      role: input.role,
      color: pickColor(existingColors),
      initials: toInitials(input.name),
      status: input.status ?? (input.role === "adult" ? "invited" : "active"),
      hasLogin: input.hasLogin ?? (input.role === "child" ? false : true),
      birthDate: input.birthDate,
      pinEnabled: input.pinEnabled,
      accessWindow: input.accessWindow,
      restrictedToChildIds: input.restrictedToChildIds,
    };
    state = { ...state, members: [...state.members, member] };
    emit();
    return member;
  },
  removeMember(id: string): void {
    state = { ...state, members: state.members.filter((m) => m.id !== id) };
    emit();
  },
  reset(): void {
    state = { household: null, members: [] };
    emit();
  },
  seedDemo(): void {
    if (state.household) return;
    const household: Household = {
      id: uid("hh"),
      name: "בית לוי",
      timezone: "Asia/Jerusalem",
      locale: "he-IL",
      createdAt: new Date().toISOString(),
    };
    state = { household, members: [] };
    emit();
    this.addMember({ name: "דנה לוי", role: "owner", status: "active" });
    this.addMember({ name: "יואב לוי", role: "adult", status: "active" });
    this.addMember({ name: "נועה לוי", role: "child", birthDate: "2015-04-12" });
    this.addMember({ name: "איתי לוי", role: "child", birthDate: "2018-09-03" });
  },
};
