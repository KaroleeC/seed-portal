import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AssignRoleDialog } from "../AssignRoleDialog";
import * as rbacApi from "@/lib/rbac-api";

/**
 * AssignRoleDialog Component Tests
 *
 * Tests role assignment dialog functionality:
 * - Display user information
 * - Show current roles
 * - Select and assign new roles
 * - Handle success/error states
 */

// Mock the rbac-api module
vi.mock("@/lib/rbac-api", () => ({
  getRoles: vi.fn(),
  assignRoleToUser: vi.fn(),
}));

// Mock toast
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockUser = {
  id: 1,
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  roles: [{ id: 1, name: "employee" }],
};

const mockRoles = [
  {
    id: 1,
    name: "employee",
    description: "Regular employee",
    isSystem: false,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: 2,
    name: "admin",
    description: "System administrator",
    isSystem: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: 3,
    name: "manager",
    description: "Team manager",
    isSystem: false,
    createdAt: "",
    updatedAt: "",
  },
];

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("AssignRoleDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rbacApi.getRoles).mockResolvedValue({ roles: mockRoles });
  });

  describe("Display", () => {
    it("renders dialog when open", () => {
      renderWithProviders(<AssignRoleDialog open={true} onOpenChange={vi.fn()} user={mockUser} />);

      expect(screen.getByText("Assign Role")).toBeInTheDocument();
    });

    it("does not render dialog when closed", () => {
      renderWithProviders(<AssignRoleDialog open={false} onOpenChange={vi.fn()} user={mockUser} />);

      expect(screen.queryByText("Assign Role")).not.toBeInTheDocument();
    });

    it("displays user name", () => {
      renderWithProviders(<AssignRoleDialog open={true} onOpenChange={vi.fn()} user={mockUser} />);

      expect(screen.getByText(/Test User/)).toBeInTheDocument();
    });

    it("displays user email when no name", () => {
      const userWithoutName = {
        ...mockUser,
        firstName: null,
        lastName: null,
      };

      renderWithProviders(
        <AssignRoleDialog open={true} onOpenChange={vi.fn()} user={userWithoutName} />
      );

      expect(screen.getByText(/test/)).toBeInTheDocument();
    });

    it("displays current roles", () => {
      renderWithProviders(<AssignRoleDialog open={true} onOpenChange={vi.fn()} user={mockUser} />);

      expect(screen.getByText("Current Roles")).toBeInTheDocument();
      expect(screen.getByText("employee")).toBeInTheDocument();
    });

    it("does not display current roles section when user has no roles", () => {
      const userWithoutRoles = {
        ...mockUser,
        roles: [],
      };

      renderWithProviders(
        <AssignRoleDialog open={true} onOpenChange={vi.fn()} user={userWithoutRoles} />
      );

      expect(screen.queryByText("Current Roles")).not.toBeInTheDocument();
    });
  });

  describe("Role Selection", () => {
    it("fetches and displays available roles", async () => {
      renderWithProviders(<AssignRoleDialog open={true} onOpenChange={vi.fn()} user={mockUser} />);

      await waitFor(() => {
        expect(rbacApi.getRoles).toHaveBeenCalled();
      });

      // Open the select dropdown
      const selectTrigger = screen.getByRole("combobox");
      await userEvent.click(selectTrigger);

      // Should show available roles (excluding already assigned "employee")
      await waitFor(() => {
        expect(screen.getByText("admin")).toBeInTheDocument();
        expect(screen.getByText("manager")).toBeInTheDocument();
      });
    });

    it("excludes already assigned roles from selection", async () => {
      renderWithProviders(<AssignRoleDialog open={true} onOpenChange={vi.fn()} user={mockUser} />);

      await waitFor(() => {
        expect(rbacApi.getRoles).toHaveBeenCalled();
      });

      const selectTrigger = screen.getByRole("combobox");
      await userEvent.click(selectTrigger);

      // "employee" is already assigned, so it should not appear in the dropdown
      await waitFor(() => {
        const options = screen.queryAllByText("employee");
        // One in "Current Roles", but not in the dropdown options
        expect(options.length).toBe(1);
      });
    });

    it("displays system role badge", async () => {
      renderWithProviders(<AssignRoleDialog open={true} onOpenChange={vi.fn()} user={mockUser} />);

      await waitFor(() => {
        expect(rbacApi.getRoles).toHaveBeenCalled();
      });

      const selectTrigger = screen.getByRole("combobox");
      await userEvent.click(selectTrigger);

      // Admin role should have "System" badge
      await waitFor(() => {
        const systemBadges = screen.getAllByText("System");
        expect(systemBadges.length).toBeGreaterThan(0);
      });
    });

    it("shows warning when role selected", async () => {
      renderWithProviders(<AssignRoleDialog open={true} onOpenChange={vi.fn()} user={mockUser} />);

      await waitFor(() => {
        expect(rbacApi.getRoles).toHaveBeenCalled();
      });

      const selectTrigger = screen.getByRole("combobox");
      await userEvent.click(selectTrigger);

      const adminOption = await screen.findByText("admin");
      await userEvent.click(adminOption);

      // Warning should appear
      expect(screen.getByText("Role Assignment")).toBeInTheDocument();
      expect(screen.getByText(/immediately gain all permissions/)).toBeInTheDocument();
    });
  });

  describe("Role Assignment", () => {
    it("calls assignRoleToUser when Assign Role clicked", async () => {
      vi.mocked(rbacApi.assignRoleToUser).mockResolvedValue({
        id: 1,
        userId: 1,
        roleId: 2,
        assignedBy: null,
        assignedAt: "",
        expiresAt: null,
      });

      const onOpenChange = vi.fn();
      renderWithProviders(
        <AssignRoleDialog open={true} onOpenChange={onOpenChange} user={mockUser} />
      );

      await waitFor(() => {
        expect(rbacApi.getRoles).toHaveBeenCalled();
      });

      // Select a role
      const selectTrigger = screen.getByRole("combobox");
      await userEvent.click(selectTrigger);

      const adminOption = await screen.findByText("admin");
      await userEvent.click(adminOption);

      // Click assign button
      const assignButton = screen.getByText("Assign Role");
      await userEvent.click(assignButton);

      await waitFor(() => {
        expect(rbacApi.assignRoleToUser).toHaveBeenCalledWith(1, 2);
      });
    });

    it("disables Assign button when no role selected", () => {
      renderWithProviders(<AssignRoleDialog open={true} onOpenChange={vi.fn()} user={mockUser} />);

      const assignButton = screen.getByText("Assign Role");
      expect(assignButton).toBeDisabled();
    });

    it("shows loading state during assignment", async () => {
      // Make the API call take some time
      vi.mocked(rbacApi.assignRoleToUser).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      renderWithProviders(<AssignRoleDialog open={true} onOpenChange={vi.fn()} user={mockUser} />);

      await waitFor(() => {
        expect(rbacApi.getRoles).toHaveBeenCalled();
      });

      // Select a role
      const selectTrigger = screen.getByRole("combobox");
      await userEvent.click(selectTrigger);

      const adminOption = await screen.findByText("admin");
      await userEvent.click(adminOption);

      // Click assign button
      const assignButton = screen.getByText("Assign Role");
      await userEvent.click(assignButton);

      // Should show loading text
      expect(screen.getByText("Assigning...")).toBeInTheDocument();
    });
  });

  describe("Dialog Actions", () => {
    it("calls onOpenChange when Cancel clicked", async () => {
      const onOpenChange = vi.fn();
      renderWithProviders(
        <AssignRoleDialog open={true} onOpenChange={onOpenChange} user={mockUser} />
      );

      const cancelButton = screen.getByText("Cancel");
      await userEvent.click(cancelButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("closes dialog after successful assignment", async () => {
      vi.mocked(rbacApi.assignRoleToUser).mockResolvedValue({
        id: 1,
        userId: 1,
        roleId: 2,
        assignedBy: null,
        assignedAt: "",
        expiresAt: null,
      });

      const onOpenChange = vi.fn();
      renderWithProviders(
        <AssignRoleDialog open={true} onOpenChange={onOpenChange} user={mockUser} />
      );

      await waitFor(() => {
        expect(rbacApi.getRoles).toHaveBeenCalled();
      });

      // Select and assign a role
      const selectTrigger = screen.getByRole("combobox");
      await userEvent.click(selectTrigger);

      const adminOption = await screen.findByText("admin");
      await userEvent.click(adminOption);

      const assignButton = screen.getByText("Assign Role");
      await userEvent.click(assignButton);

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });
});
