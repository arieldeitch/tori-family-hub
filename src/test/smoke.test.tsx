import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { t } from "@/lib/i18n";

describe("infrastructure smoke", () => {
  it("renders Hebrew string from i18n layer", () => {
    render(<div>{t("home.title")}</div>);
    expect(screen.getByText("ברוכים הבאים ל‑Tori")).toBeInTheDocument();
  });
});
