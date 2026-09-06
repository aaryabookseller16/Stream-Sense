import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App routes", () => {
  it("renders the About experience as the landing page", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /operational data should feel obvious/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
  });

  it("navigates from About to Product without a reload", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("link", { name: "Product" }));
    expect(screen.getByRole("heading", { name: /every signal,?made legible/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/product");
  });
});
