import { describe, it, expect } from "vitest";
import {
  cancelRemindersForEntity,
  computeDedupeKey,
  dedupe,
  DEFAULT_PREFERENCES,
  hasAction,
  isWithinQuietHours,
  nextEscalationStage,
  renderPreview,
  shouldSuppress,
  SENSITIVE_LOCK_TITLE,
  type Notification,
  type NotificationPreferences,
} from "./notification";

function n(overrides: Partial<Notification> & { id: string; category: Notification["category"] }): Notification {
  return {
    id: overrides.id,
    category: overrides.category,
    title: overrides.title ?? "כותרת",
    body: overrides.body ?? "גוף",
    createdAt: overrides.createdAt ?? "2026-03-05T10:00:00.000Z",
    sensitivity: overrides.sensitivity ?? "normal",
    action: overrides.action ?? { kind: "none", label: "" },
    entityRef: overrides.entityRef,
    readAt: overrides.readAt,
    cancelledAt: overrides.cancelledAt,
    dedupeKey:
      overrides.dedupeKey ??
      computeDedupeKey({ category: overrides.category, entityRef: overrides.entityRef }),
  };
}

describe("notification.dedupe", () => {
  it("collapses same-entity, same-category events to the newest", () => {
    const list = [
      n({
        id: "a",
        category: "overdue_task",
        createdAt: "2026-03-05T10:00:00.000Z",
        entityRef: { kind: "task", id: "t1" },
      }),
      n({
        id: "b",
        category: "overdue_task",
        createdAt: "2026-03-05T11:00:00.000Z",
        entityRef: { kind: "task", id: "t1" },
      }),
      n({
        id: "c",
        category: "overdue_task",
        createdAt: "2026-03-05T10:30:00.000Z",
        entityRef: { kind: "task", id: "t2" },
      }),
    ];
    const out = dedupe(list);
    expect(out).toHaveLength(2);
    // Newest for t1 kept.
    expect(out.find((x) => x.entityRef?.id === "t1")?.id).toBe("b");
  });
});

describe("notification.quietHours", () => {
  const prefs: NotificationPreferences = {
    ...DEFAULT_PREFERENCES,
    quietHours: { enabled: true, startHHMM: "22:00", endHHMM: "07:00" },
  };
  it("treats a cross-midnight window as one continuous quiet range", () => {
    expect(isWithinQuietHours("23:30", prefs.quietHours)).toBe(true);
    expect(isWithinQuietHours("03:00", prefs.quietHours)).toBe(true);
    expect(isWithinQuietHours("06:59", prefs.quietHours)).toBe(true);
    expect(isWithinQuietHours("07:00", prefs.quietHours)).toBe(false);
    expect(isWithinQuietHours("21:59", prefs.quietHours)).toBe(false);
    expect(isWithinQuietHours("12:00", prefs.quietHours)).toBe(false);
  });
  it("respects a normal same-day window", () => {
    const day = { enabled: true, startHHMM: "13:00", endHHMM: "15:00" };
    expect(isWithinQuietHours("14:00", day)).toBe(true);
    expect(isWithinQuietHours("15:00", day)).toBe(false);
    expect(isWithinQuietHours("12:59", day)).toBe(false);
  });
});

describe("notification.suppress", () => {
  it("suppresses a category the user disabled", () => {
    const prefs: NotificationPreferences = {
      ...DEFAULT_PREFERENCES,
      categoryEnabled: { ...DEFAULT_PREFERENCES.categoryEnabled, urgent_shopping: false },
    };
    const d = shouldSuppress({ category: "urgent_shopping" }, prefs, "12:00");
    expect(d).toEqual({ suppressed: true, reason: "category_disabled" });
  });
  it("suppresses a non-digest during quiet hours but lets digests through", () => {
    const prefs = DEFAULT_PREFERENCES; // 22:00 → 07:00
    expect(shouldSuppress({ category: "overdue_task" }, prefs, "23:00")).toEqual({
      suppressed: true,
      reason: "quiet_hours",
    });
    expect(shouldSuppress({ category: "morning_digest" }, prefs, "23:00").suppressed).toBe(false);
  });
});

describe("notification.cancelRemindersForEntity", () => {
  it("cancels reminders for a completed entity and leaves unrelated ones", () => {
    const list = [
      n({
        id: "r1",
        category: "transport_reminder",
        entityRef: { kind: "transport", id: "tr1" },
      }),
      n({
        id: "r2",
        category: "overdue_task",
        entityRef: { kind: "task", id: "t1" },
      }),
      n({
        id: "d1",
        category: "morning_digest",
        entityRef: { kind: "transport", id: "tr1" },
      }),
    ];
    const at = "2026-03-05T12:00:00.000Z";
    const out = cancelRemindersForEntity(list, {
      entity: { kind: "transport", id: "tr1" },
      at,
    });
    expect(out.find((x) => x.id === "r1")?.cancelledAt).toBe(at);
    expect(out.find((x) => x.id === "r2")?.cancelledAt).toBeUndefined();
    // Digests are never cancelled by an entity completion.
    expect(out.find((x) => x.id === "d1")?.cancelledAt).toBeUndefined();
  });
});

describe("notification.renderPreview", () => {
  it("redacts sensitive content on lock-screen but shows in-app", () => {
    const item = n({
      id: "s1",
      category: "follow_up_due",
      title: "בדיקות רפואיות של אבא",
      body: "לתאם עם המרפאה",
      sensitivity: "sensitive",
    });
    expect(renderPreview(item, "lock_screen")).toEqual({ title: SENSITIVE_LOCK_TITLE, body: "" });
    expect(renderPreview(item, "in_app")).toEqual({ title: item.title, body: item.body });
  });
});

describe("notification.hasAction", () => {
  it("returns false when action kind is 'none'", () => {
    expect(hasAction(n({ id: "x", category: "morning_digest" }))).toBe(false);
    expect(
      hasAction(
        n({
          id: "y",
          category: "overdue_task",
          action: { kind: "open_task", label: "פתיחת המשימה" },
        }),
      ),
    ).toBe(true);
  });
});

describe("notification.nextEscalationStage", () => {
  it("stops at 'self' when family escalation is disabled", () => {
    const prefs = DEFAULT_PREFERENCES; // family disabled by default
    expect(nextEscalationStage("none", prefs)).toBe("self");
    expect(nextEscalationStage("self", prefs)).toBe("self");
  });
  it("progresses through stages when family escalation is enabled", () => {
    const prefs: NotificationPreferences = {
      ...DEFAULT_PREFERENCES,
      familyEscalation: { enabled: true, stageDelayMinutes: 10 },
    };
    expect(nextEscalationStage("self", prefs)).toBe("family_partner");
    expect(nextEscalationStage("family_partner", prefs)).toBe("all_family");
    expect(nextEscalationStage("all_family", prefs)).toBe("all_family");
  });
});
