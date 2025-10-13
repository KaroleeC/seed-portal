import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable, DataTableColumnHeader } from "../data-table";

/**
 * DataTable Component Tests
 *
 * Tests the enterprise data table component for:
 * - Rendering data correctly
 * - Search/filter functionality
 * - Sorting
 * - Pagination
 * - Column visibility
 * - Empty states
 */

interface TestUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

const mockUsers: TestUser[] = [
  { id: 1, name: "Alice", email: "alice@test.com", role: "admin" },
  { id: 2, name: "Bob", email: "bob@test.com", role: "user" },
  { id: 3, name: "Carol", email: "carol@test.com", role: "user" },
];

const mockColumns: ColumnDef<TestUser>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
  },
];

describe("DataTable", () => {
  describe("Rendering", () => {
    it("renders table with data", () => {
      render(<DataTable columns={mockColumns} data={mockUsers} enablePagination={false} />);

      // Check if all rows are rendered
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("Carol")).toBeInTheDocument();
    });

    it("renders column headers", () => {
      render(<DataTable columns={mockColumns} data={mockUsers} enablePagination={false} />);

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Role")).toBeInTheDocument();
    });

    it("renders empty message when no data", () => {
      render(<DataTable columns={mockColumns} data={[]} emptyMessage="No users found" />);

      expect(screen.getByText("No users found")).toBeInTheDocument();
    });

    it("renders custom empty message", () => {
      const customMessage = "Try adjusting your search";
      render(<DataTable columns={mockColumns} data={[]} emptyMessage={customMessage} />);

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });
  });

  describe("Search/Filter", () => {
    it("renders search input when searchKey provided", () => {
      render(
        <DataTable
          columns={mockColumns}
          data={mockUsers}
          searchKey="name"
          searchPlaceholder="Search by name..."
        />
      );

      const searchInput = screen.getByPlaceholderText("Search by name...");
      expect(searchInput).toBeInTheDocument();
    });

    it("does not render search input when searchKey not provided", () => {
      render(<DataTable columns={mockColumns} data={mockUsers} />);

      const searchInput = screen.queryByRole("textbox");
      expect(searchInput).not.toBeInTheDocument();
    });

    it("filters data based on search input", async () => {
      const user = userEvent.setup();
      render(
        <DataTable
          columns={mockColumns}
          data={mockUsers}
          searchKey="name"
          enablePagination={false}
        />
      );

      const searchInput = screen.getByRole("textbox");
      await user.type(searchInput, "Alice");

      // Alice should be visible
      expect(screen.getByText("Alice")).toBeInTheDocument();

      // Bob and Carol should not be visible
      expect(screen.queryByText("Bob")).not.toBeInTheDocument();
      expect(screen.queryByText("Carol")).not.toBeInTheDocument();
    });
  });

  describe("Pagination", () => {
    it("renders pagination controls when enabled", () => {
      render(
        <DataTable columns={mockColumns} data={mockUsers} enablePagination={true} pageSize={2} />
      );

      expect(screen.getByText("Previous")).toBeInTheDocument();
      expect(screen.getByText("Next")).toBeInTheDocument();
    });

    it("does not render pagination when disabled", () => {
      render(<DataTable columns={mockColumns} data={mockUsers} enablePagination={false} />);

      expect(screen.queryByText("Previous")).not.toBeInTheDocument();
      expect(screen.queryByText("Next")).not.toBeInTheDocument();
    });

    it("shows correct page count", () => {
      render(
        <DataTable columns={mockColumns} data={mockUsers} enablePagination={true} pageSize={2} />
      );

      // 3 users with pageSize 2 = 2 pages
      expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
    });

    it("shows correct row count", () => {
      render(<DataTable columns={mockColumns} data={mockUsers} enablePagination={true} />);

      expect(screen.getByText("3 row(s) total")).toBeInTheDocument();
    });

    it("navigates to next page when Next clicked", async () => {
      const user = userEvent.setup();
      render(
        <DataTable columns={mockColumns} data={mockUsers} enablePagination={true} pageSize={2} />
      );

      const nextButton = screen.getByText("Next");
      await user.click(nextButton);

      // Should now show page 2
      expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
    });

    it("disables Previous on first page", () => {
      render(
        <DataTable columns={mockColumns} data={mockUsers} enablePagination={true} pageSize={2} />
      );

      const previousButton = screen.getByText("Previous");
      expect(previousButton).toBeDisabled();
    });
  });

  describe("Column Visibility", () => {
    it("renders column visibility dropdown when enabled", () => {
      render(<DataTable columns={mockColumns} data={mockUsers} enableColumnVisibility={true} />);

      expect(screen.getByText("Columns")).toBeInTheDocument();
    });

    it("does not render column visibility dropdown when disabled", () => {
      render(<DataTable columns={mockColumns} data={mockUsers} enableColumnVisibility={false} />);

      expect(screen.queryByText("Columns")).not.toBeInTheDocument();
    });
  });

  describe("Sorting", () => {
    it("renders sortable headers with DataTableColumnHeader", () => {
      render(<DataTable columns={mockColumns} data={mockUsers} enablePagination={false} />);

      // Name column uses DataTableColumnHeader, should have sort button
      const nameHeader = screen.getByText("Name");
      expect(nameHeader).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has accessible table structure", () => {
      render(<DataTable columns={mockColumns} data={mockUsers} />);

      const table = screen.getByRole("table");
      expect(table).toBeInTheDocument();
    });

    it("has accessible search input", () => {
      render(
        <DataTable
          columns={mockColumns}
          data={mockUsers}
          searchKey="name"
          searchPlaceholder="Search users..."
        />
      );

      const searchInput = screen.getByPlaceholderText("Search users...");
      expect(searchInput).toBeInTheDocument();
      expect(searchInput.tagName).toBe("INPUT");
    });
  });
});

describe("DataTableColumnHeader", () => {
  it("renders non-sortable header without button", () => {
    const mockColumn = {
      getCanSort: () => false,
    };

    render(<DataTableColumnHeader column={mockColumn} title="Test Column" />);

    const button = screen.queryByRole("button");
    expect(button).not.toBeInTheDocument();
    expect(screen.getByText("Test Column")).toBeInTheDocument();
  });

  it("renders sortable header with button", () => {
    const mockColumn = {
      getCanSort: () => true,
      toggleSorting: vi.fn(),
      getIsSorted: () => false,
    };

    render(<DataTableColumnHeader column={mockColumn} title="Test Column" />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(within(button).getByText("Test Column")).toBeInTheDocument();
  });

  it("calls toggleSorting when clicked", async () => {
    const mockToggleSorting = vi.fn();
    const mockColumn = {
      getCanSort: () => true,
      toggleSorting: mockToggleSorting,
      getIsSorted: () => false,
    };

    const user = userEvent.setup();
    render(<DataTableColumnHeader column={mockColumn} title="Test Column" />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(mockToggleSorting).toHaveBeenCalled();
  });
});
