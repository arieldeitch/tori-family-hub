import { describe, it, expect } from "vitest";
import { canRoleSee, isPrivilegedRole, pickColor, toInitials } from "@/domain/household";

describe("household domain", () => {
  it("hides adults-only items from child role (UX layer)", () => {
    expect(canRoleSee("child", { adultsOnly: true })).toBe(false);
    expect(canRoleSee("child", {})).toBe(true);
    expect(canRoleSee("adult", { adultsOnly: true })).toBe(true);
    expect(canRoleSee("owner", { adultsOnly: true })).toBe(true);
    expect(canRoleSee("guest", { adultsOnly: true })).toBe(true);
  });

  it("marks owner and adult as privileged", () => {
    expect(isPrivilegedRole("owner")).toBe(true);
    expect(isPrivilegedRole("adult")).toBe(true);
    expect(isPrivilegedRole("child")).toBe(false);
    expect(isPrivilegedRole("guest")).toBe(false);
  });

  it("picks a distinct color when possible", () => {
    const first = pickColor([]);
    const second = pickColor([first]);
    expect(second).not.toBe(first);
  });

  it("computes initials for Hebrew names", () => {
    expect(toInitials("דנה לוי")).toBe("דל");
    expect(toInitials("נועה")).toBe("נו");
    expect(toInitials("")).toBe("?");
  });
});
