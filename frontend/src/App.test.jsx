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
  it("renders the About page from a direct route", () => {
    window.history.replaceState({}, "", "/about");
    render(<App />);

    expect(screen.getByRole("heading", { name: /operational data should feel obvious/i })).toBeInTheDocument();
  });

  it("navigates from the landing page to About without a reload", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("link", { name: "About" })[0]);
    expect(screen.getByText(/about streamsense/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/about");
  });
});
