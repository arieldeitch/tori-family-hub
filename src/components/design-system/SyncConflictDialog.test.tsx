import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SyncConflictDialog } from "./SyncConflictDialog";

function setup(onResolve = vi.fn()) {
  render(
    <SyncConflictDialog
      open
      onOpenChange={() => {}}
      entityLabel="משימה: קניות שבועיות"
      fields={[{ label: "כותרת", local: "קניות של שישי", server: "קניות שבועיות" }]}
      onResolve={onResolve}
    />,
  );
  return { onResolve };
}

describe("SyncConflictDialog", () => {
  it("shows both local and server values without picking one", () => {
    setup();
    expect(screen.getByText("קניות של שישי")).toBeInTheDocument();
    expect(screen.getByText("קניות שבועיות")).toBeInTheDocument();
  });

  it("forces a conscious choice — no silent overwrite option is present", () => {
    setup();
    // Only three explicit resolutions are exposed:
    expect(screen.getByRole("button", { name: "שמור את שלי" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "השתמש בערך מהשרת" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "ביטול" })).toBeEnabled();
    // Nothing that would silently overwrite.
    expect(screen.queryByRole("button", { name: /דרוס/ })).toBeNull();
  });

  it("emits keep_local when the user picks their own value", () => {
    const { onResolve } = setup();
    fireEvent.click(screen.getByRole("button", { name: "שמור את שלי" }));
    expect(onResolve).toHaveBeenCalledWith("keep_local");
  });

  it("emits use_server when the user picks the server value", () => {
    const { onResolve } = setup();
    fireEvent.click(screen.getByRole("button", { name: "השתמש בערך מהשרת" }));
    expect(onResolve).toHaveBeenCalledWith("use_server");
  });

  it("emits cancel when the user cancels", () => {
    const { onResolve } = setup();
    fireEvent.click(screen.getByRole("button", { name: "ביטול" }));
    expect(onResolve).toHaveBeenCalledWith("cancel");
  });
});
