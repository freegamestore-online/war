import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

const stat = (label: string) => Number(screen.getByText(label).previousSibling?.textContent);
const space = () => fireEvent.keyDown(window, { code: "Space", key: " " });

describe("App", () => {
  it("Space draws a card", () => {
    render(<App />);
    expect(screen.getByText("Tap Draw to start.")).toBeInTheDocument();
    space();
    expect(screen.queryByText("Tap Draw to start.")).not.toBeInTheDocument();
  });

  it("Reset clears the win count", () => {
    render(<App />);
    for (let i = 0; i < 200 && stat("Win") === 0; i++) space();
    expect(stat("Win")).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /^(reset|new game)$/i }));
    expect(stat("Win")).toBe(0);
  });
});
