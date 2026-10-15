import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import LoginPage from "../src/domains/auth/pages/LoginPage";

afterEach(() => {
  delete window.__CLICKVISUAL_V2_CONFIG__;
  vi.unstubAllGlobals();
});

describe("login home destination", () => {
  it.each([
    ["full", "", "/v2/ask"],
    ["private-lite", "", "/v2/query"],
    ["full", "?redirect=%2Fv2%2Fask%3FsessionId%3D37", "/v2/ask?sessionId=37"],
    ["full", "?redirect=https%3A%2F%2Fexample.com", "/v2/ask"]
  ])("redirects %s login with %s to %s", async (edition, search, expected) => {
    window.__CLICKVISUAL_V2_CONFIG__ = { edition };
    const assign = vi.fn();
    vi.stubGlobal("location", { assign, pathname: "/v2/login" });
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ code: 0, data: "" })));
    const router = createMemoryRouter([{ path: "/v2/login", element: <LoginPage /> }], {
      initialEntries: [`/v2/login${search}`]
    });
    render(<RouterProvider router={router} />);
    fireEvent.change(screen.getByLabelText("密码"), { target: { value: "test-password" } });
    fireEvent.click(screen.getByRole("button", { name: "登录" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith(expected));
  });
});
