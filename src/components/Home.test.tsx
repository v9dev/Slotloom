// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "./Home";

afterEach(cleanup);

describe("Home", () => {
  it("describes the instant provider-booking journey", () => {
    render(<Home />);

    expect(
      screen.getByText(
        /send a Google Meet or Microsoft Teams invitation immediately/i,
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "From open slot to confirmed meeting.",
      }),
    ).toBeTruthy();
    expect(screen.getByText("A visitor books")).toBeTruthy();
    expect(screen.getByText("The invitation arrives")).toBeTruthy();
    expect(screen.queryByText(/review every response/i)).toBeNull();
    expect(screen.queryByText(/review before creating/i)).toBeNull();
  });
});
