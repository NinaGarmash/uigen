import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup, waitFor } from "@testing-library/react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import * as anonTracker from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock actions
vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

// Test component that uses the hook
function TestComponent({
  onAuthResult,
}: {
  onAuthResult?: (result: any) => void;
}) {
  const { signIn, signUp, isLoading } = useAuth();

  return (
    <div>
      <div data-testid="loading">{isLoading ? "true" : "false"}</div>
      <button
        data-testid="sign-in"
        onClick={async () => {
          const result = await signIn("test@example.com", "password123");
          onAuthResult?.(result);
        }}
      >
        Sign In
      </button>
      <button
        data-testid="sign-up"
        onClick={async () => {
          const result = await signUp("test@example.com", "password123");
          onAuthResult?.(result);
        }}
      >
        Sign Up
      </button>
    </div>
  );
}

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("initial state", () => {
    test("isLoading is false initially", () => {
      render(<TestComponent />);
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
  });

  describe("signIn", () => {
    test("sets isLoading to true during sign in", async () => {
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });

      vi.mocked(signInAction).mockReturnValue(signInPromise as any);

      render(<TestComponent />);

      act(() => {
        screen.getByTestId("sign-in").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("true");
      });

      await act(async () => {
        resolveSignIn!({ success: false });
      });

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });
    });

    test("calls signInAction with email and password", async () => {
      vi.mocked(signInAction).mockResolvedValue({ success: false });

      render(<TestComponent />);

      await act(async () => {
        screen.getByTestId("sign-in").click();
      });

      expect(signInAction).toHaveBeenCalledWith(
        "test@example.com",
        "password123"
      );
    });

    test("returns result from signInAction", async () => {
      const expectedResult = { success: false, error: "Invalid credentials" };
      vi.mocked(signInAction).mockResolvedValue(expectedResult);

      let capturedResult: any;
      render(
        <TestComponent onAuthResult={(result) => (capturedResult = result)} />
      );

      await act(async () => {
        screen.getByTestId("sign-in").click();
      });

      expect(capturedResult).toEqual(expectedResult);
    });

    test("sets isLoading to false after sign in failure", async () => {
      vi.mocked(signInAction).mockResolvedValue({
        success: false,
        error: "Error",
      });

      render(<TestComponent />);

      await act(async () => {
        screen.getByTestId("sign-in").click();
      });

      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    test("sets isLoading to false even when error is thrown", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.mocked(signInAction).mockRejectedValue(new Error("Network error"));

      // Component that catches the error
      function ErrorBoundaryTestComponent() {
        const { signIn, isLoading } = useAuth();
        const [error, setError] = useState<string | null>(null);

        const handleSignIn = async () => {
          try {
            await signIn("test@example.com", "password123");
          } catch (e) {
            setError((e as Error).message);
          }
        };

        return (
          <div>
            <div data-testid="loading">{isLoading ? "true" : "false"}</div>
            <div data-testid="error">{error || "none"}</div>
            <button data-testid="sign-in" onClick={handleSignIn}>
              Sign In
            </button>
          </div>
        );
      }

      render(<ErrorBoundaryTestComponent />);

      await act(async () => {
        screen.getByTestId("sign-in").click();
      });

      // Wait for the component to settle
      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      expect(screen.getByTestId("error").textContent).toBe("Network error");
      consoleError.mockRestore();
    });
  });

  describe("signUp", () => {
    test("sets isLoading to true during sign up", async () => {
      let resolveSignUp: (value: any) => void;
      const signUpPromise = new Promise((resolve) => {
        resolveSignUp = resolve;
      });

      vi.mocked(signUpAction).mockReturnValue(signUpPromise as any);

      render(<TestComponent />);

      act(() => {
        screen.getByTestId("sign-up").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("true");
      });

      await act(async () => {
        resolveSignUp!({ success: false });
      });

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });
    });

    test("calls signUpAction with email and password", async () => {
      vi.mocked(signUpAction).mockResolvedValue({ success: false });

      render(<TestComponent />);

      await act(async () => {
        screen.getByTestId("sign-up").click();
      });

      expect(signUpAction).toHaveBeenCalledWith(
        "test@example.com",
        "password123"
      );
    });

    test("returns result from signUpAction", async () => {
      const expectedResult = { success: false, error: "Email already exists" };
      vi.mocked(signUpAction).mockResolvedValue(expectedResult);

      let capturedResult: any;
      render(
        <TestComponent onAuthResult={(result) => (capturedResult = result)} />
      );

      await act(async () => {
        screen.getByTestId("sign-up").click();
      });

      expect(capturedResult).toEqual(expectedResult);
    });

    test("sets isLoading to false after sign up failure", async () => {
      vi.mocked(signUpAction).mockResolvedValue({
        success: false,
        error: "Error",
      });

      render(<TestComponent />);

      await act(async () => {
        screen.getByTestId("sign-up").click();
      });

      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
  });

  describe("handlePostSignIn - with anonymous work", () => {
    test("creates project with anonymous work and redirects", async () => {
      const anonWork = {
        messages: [{ id: "1", role: "user", content: "Hello" }],
        fileSystemData: { "/App.tsx": { type: "file", content: "test" } },
      };

      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(anonWork);
      vi.mocked(createProject).mockResolvedValue({
        id: "new-project-123",
        name: "Test",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "user-1",
        messages: "[]",
        data: "{}",
      });
      vi.mocked(signInAction).mockResolvedValue({ success: true });

      render(<TestComponent />);

      await act(async () => {
        screen.getByTestId("sign-in").click();
      });

      expect(createProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
      expect(anonTracker.clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/new-project-123");
    });

    test("clears anonymous work after creating project", async () => {
      const anonWork = {
        messages: [{ id: "1", role: "user", content: "Hello" }],
        fileSystemData: {},
      };

      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(anonWork);
      vi.mocked(createProject).mockResolvedValue({
        id: "project-456",
        name: "Test",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "user-1",
        messages: "[]",
        data: "{}",
      });
      vi.mocked(signInAction).mockResolvedValue({ success: true });

      render(<TestComponent />);

      await act(async () => {
        screen.getByTestId("sign-in").click();
      });

      expect(anonTracker.clearAnonWork).toHaveBeenCalled();
    });

    test("does not process empty anonymous messages", async () => {
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue({
        messages: [],
        fileSystemData: {},
      });
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue({
        id: "new-project",
        name: "New Design",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "user-1",
        messages: "[]",
        data: "{}",
      });
      vi.mocked(signInAction).mockResolvedValue({ success: true });

      render(<TestComponent />);

      await act(async () => {
        screen.getByTestId("sign-in").click();
      });

      // Should not have been called with anon work data
      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [],
          data: {},
        })
      );
    });
  });

  describe("handlePostSignIn - without anonymous work, with existing projects", () => {
    test("redirects to most recent project", async () => {
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([
        {
          id: "recent-project",
          name: "Recent",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "old-project",
          name: "Old",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      vi.mocked(signInAction).mockResolvedValue({ success: true });

      render(<TestComponent />);

      await act(async () => {
        screen.getByTestId("sign-in").click();
      });

      expect(mockPush).toHaveBeenCalledWith("/recent-project");
      expect(createProject).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn - without anonymous work, no existing projects", () => {
    test("creates new project and redirects", async () => {
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue({
        id: "brand-new-project",
        name: "New Design #12345",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "user-1",
        messages: "[]",
        data: "{}",
      });
      vi.mocked(signInAction).mockResolvedValue({ success: true });

      render(<TestComponent />);

      await act(async () => {
        screen.getByTestId("sign-in").click();
      });

      expect(createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/brand-new-project");
    });
  });

  describe("handlePostSignIn - for signUp", () => {
    test("handles post sign up flow with anonymous work", async () => {
      const anonWork = {
        messages: [{ id: "1", role: "user", content: "Test" }],
        fileSystemData: { "/index.tsx": { type: "file", content: "code" } },
      };

      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(anonWork);
      vi.mocked(createProject).mockResolvedValue({
        id: "signup-project",
        name: "Design",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "user-1",
        messages: "[]",
        data: "{}",
      });
      vi.mocked(signUpAction).mockResolvedValue({ success: true });

      render(<TestComponent />);

      await act(async () => {
        screen.getByTestId("sign-up").click();
      });

      expect(createProject).toHaveBeenCalled();
      expect(anonTracker.clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/signup-project");
    });

    test("creates new project when no anonymous work or existing projects", async () => {
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([]);
      vi.mocked(createProject).mockResolvedValue({
        id: "new-user-project",
        name: "New Design",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "user-1",
        messages: "[]",
        data: "{}",
      });
      vi.mocked(signUpAction).mockResolvedValue({ success: true });

      render(<TestComponent />);

      await act(async () => {
        screen.getByTestId("sign-up").click();
      });

      expect(createProject).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/new-user-project");
    });
  });

  describe("handlePostSignIn - not called on failure", () => {
    test("does not redirect on sign in failure", async () => {
      vi.mocked(signInAction).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      render(<TestComponent />);

      await act(async () => {
        screen.getByTestId("sign-in").click();
      });

      expect(mockPush).not.toHaveBeenCalled();
      expect(getProjects).not.toHaveBeenCalled();
      expect(createProject).not.toHaveBeenCalled();
    });

    test("does not redirect on sign up failure", async () => {
      vi.mocked(signUpAction).mockResolvedValue({
        success: false,
        error: "Email already exists",
      });

      render(<TestComponent />);

      await act(async () => {
        screen.getByTestId("sign-up").click();
      });

      expect(mockPush).not.toHaveBeenCalled();
      expect(getProjects).not.toHaveBeenCalled();
      expect(createProject).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    test("handles null anonymous work data", async () => {
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjects).mockResolvedValue([
        {
          id: "existing",
          name: "Existing",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      vi.mocked(signInAction).mockResolvedValue({ success: true });

      render(<TestComponent />);

      await act(async () => {
        screen.getByTestId("sign-in").click();
      });

      expect(anonTracker.clearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing");
    });

    test("handles concurrent sign in attempts", async () => {
      let resolveFirst: (value: any) => void;
      let resolveSecond: (value: any) => void;

      vi.mocked(signInAction)
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveFirst = resolve;
          }) as any
        )
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveSecond = resolve;
          }) as any
        );

      render(<TestComponent />);

      // Start first sign in
      act(() => {
        screen.getByTestId("sign-in").click();
      });

      // Start second sign in while first is still pending
      act(() => {
        screen.getByTestId("sign-in").click();
      });

      expect(signInAction).toHaveBeenCalledTimes(2);

      // Resolve both
      await act(async () => {
        resolveFirst!({ success: false });
        resolveSecond!({ success: false });
      });

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });
    });
  });
});
