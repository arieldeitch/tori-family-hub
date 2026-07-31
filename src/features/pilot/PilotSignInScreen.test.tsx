import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PilotSignInScreen } from "./PilotSignInScreen";
import { classifyError } from "@/lib/errors/classifyError";

function setup(onSignIn = vi.fn().mockResolvedValue({ failure: null })) {
  render(<PilotSignInScreen onSignIn={onSignIn} defaultEmail="pilot-owner@tori.local" />);
  return { onSignIn };
}

describe("PilotSignInScreen", () => {
  it("renders accessible, labelled email and password fields", () => {
    setup();
    expect(screen.getByLabelText("דוא״ל")).toBeInTheDocument();
    expect(screen.getByLabelText("סיסמה")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "כניסה" })).toBeInTheDocument();
  });

  it("is marked as a local, non-production pilot", () => {
    setup();
    expect(screen.getByText(/פיילוט מקומי/)).toBeInTheDocument();
  });

  it("renders right-to-left", () => {
    setup();
    expect(screen.getByRole("main")).toHaveAttribute("dir", "rtl");
  });

  it("signs in with the submitted credentials", async () => {
    const { onSignIn } = setup();
    fireEvent.change(screen.getByLabelText("דוא״ל"), { target: { value: "someone@tori.local" } });
    fireEvent.change(screen.getByLabelText("סיסמה"), { target: { value: "a-password" } });
    fireEvent.click(screen.getByRole("button", { name: "כניסה" }));

    await waitFor(() => expect(onSignIn).toHaveBeenCalledWith("someone@tori.local", "a-password"));
  });

  it("shows a clear error for invalid credentials without echoing them", async () => {
    const failure = classifyError({
      online: true,
      error: { code: "invalid_credentials", message: "Invalid login credentials" },
    });
    const onSignIn = vi.fn().mockResolvedValue({ failure });
    setup(onSignIn);
    fireEvent.change(screen.getByLabelText("סיסמה"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: "כניסה" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/הפרטים שהוזנו אינם נכונים/);
    // The submitted password must never be reflected back into the DOM text.
    expect(document.body.textContent).not.toContain("wrong-password");
  });

  // The hosted project actually returned this for EVERY address, including the
  // existing confirmed owner account. Reporting it as a bad password is a fault
  // the person at the keyboard can never fix by retrying (ADR-042).
  it("says the server disabled email logins instead of blaming the password", async () => {
    const failure = classifyError({
      online: true,
      status: 422,
      error: { code: "email_provider_disabled", message: "Email logins are disabled" },
    });
    const onSignIn = vi.fn().mockResolvedValue({ failure });
    setup(onSignIn);
    fireEvent.change(screen.getByLabelText("סיסמה"), { target: { value: "the-right-password" } });
    fireEvent.click(screen.getByRole("button", { name: "כניסה" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/הכניסה עם דוא״ל מושבתת בשרת/);
    expect(alert).not.toHaveTextContent(/הפרטים שהוזנו אינם נכונים/);
    expect(document.body.textContent).not.toContain("the-right-password");
  });

  it("never claims the network is down when the browser is online", async () => {
    const onSignIn = vi
      .fn()
      .mockResolvedValue({ failure: classifyError({ online: true, status: 500 }) });
    setup(onSignIn);
    fireEvent.click(screen.getByRole("button", { name: "כניסה" }));

    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent(/אין חיבור לרשת/);
  });

  it("exposes no signup, password-recovery or account-management entry point", () => {
    setup();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/הרשמה נוספת|צור חשבון|שכחתי סיסמה/);
    expect(screen.queryByRole("link")).toBeNull();
    // Exactly one action exists on this screen: sign in.
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});
