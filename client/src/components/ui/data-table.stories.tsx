import type { Meta, StoryObj } from "@storybook/react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable, DataTableColumnHeader } from "./data-table";
import { Badge } from "./badge";
import { Button } from "./button";
import { MoreHorizontal, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./dropdown-menu";

/**
 * Enterprise DataTable Component
 *
 * A production-ready data table with sorting, filtering, pagination, and column visibility.
 * Perfect for admin panels, dashboards, and data-heavy interfaces.
 *
 * ## Features
 * - **Sorting**: Click column headers to sort
 * - **Filtering**: Built-in search functionality
 * - **Pagination**: Configurable page sizes
 * - **Column Visibility**: Show/hide columns
 * - **Compact Design**: Dense, information-rich layouts
 *
 * ## Usage
 * ```tsx
 * const columns: ColumnDef<User>[] = [
 *   {
 *     accessorKey: "email",
 *     header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
 *   },
 * ];
 *
 * <DataTable
 *   columns={columns}
 *   data={users}
 *   searchKey="email"
 *   searchPlaceholder="Search users..."
 * />
 * ```
 */
const meta = {
  title: "UI/DataTable",
  component: DataTable,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Enterprise-grade data table with sorting, filtering, pagination, and column visibility controls.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data
interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  department: string;
  status: "active" | "inactive";
  createdAt: string;
}

const sampleUsers: User[] = [
  {
    id: 1,
    email: "alice@example.com",
    name: "Alice Johnson",
    role: "admin",
    department: "Engineering",
    status: "active",
    createdAt: "2024-01-15",
  },
  {
    id: 2,
    email: "bob@example.com",
    name: "Bob Smith",
    role: "employee",
    department: "Sales",
    status: "active",
    createdAt: "2024-02-20",
  },
  {
    id: 3,
    email: "carol@example.com",
    name: "Carol Williams",
    role: "manager",
    department: "Marketing",
    status: "inactive",
    createdAt: "2024-03-10",
  },
  {
    id: 4,
    email: "david@example.com",
    name: "David Brown",
    role: "employee",
    department: "Engineering",
    status: "active",
    createdAt: "2024-04-05",
  },
  {
    id: 5,
    email: "emma@example.com",
    name: "Emma Davis",
    role: "admin",
    department: "Operations",
    status: "active",
    createdAt: "2024-05-12",
  },
];

// Basic columns
const basicColumns: ColumnDef<User>[] = [
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Mail className="h-3 w-3 text-muted-foreground" />
        <span className="font-medium">{row.original.email}</span>
      </div>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <Badge variant="secondary" className="text-xs">
        {row.original.role}
      </Badge>
    ),
  },
  {
    accessorKey: "department",
    header: "Department",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge variant={status === "active" ? "secondary" : "outline"} className="text-xs">
          {status}
        </Badge>
      );
    },
  },
];

// Columns with actions
const columnsWithActions: ColumnDef<User>[] = [
  ...basicColumns,
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-7 w-7 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>Edit {user.name}</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

/**
 * Default data table with all features enabled
 */
export const Default: Story = {
  args: {
    columns: basicColumns,
    data: sampleUsers,
    searchKey: "email",
    searchPlaceholder: "Search by email...",
    pageSize: 5,
    enableColumnVisibility: true,
    enablePagination: true,
  },
};

/**
 * Data table with action menu in each row
 */
export const WithActions: Story = {
  args: {
    columns: columnsWithActions,
    data: sampleUsers,
    searchKey: "name",
    searchPlaceholder: "Search by name...",
    pageSize: 5,
  },
};

/**
 * Compact table without pagination (good for small datasets)
 */
export const WithoutPagination: Story = {
  args: {
    columns: basicColumns,
    data: sampleUsers.slice(0, 3),
    enablePagination: false,
  },
};

/**
 * Table without column visibility controls
 */
export const WithoutColumnVisibility: Story = {
  args: {
    columns: basicColumns,
    data: sampleUsers,
    searchKey: "email",
    enableColumnVisibility: false,
  },
};

/**
 * Empty state
 */
export const Empty: Story = {
  args: {
    columns: basicColumns,
    data: [],
    searchKey: "email",
    searchPlaceholder: "Search users...",
    emptyMessage: "No users found. Try adjusting your search.",
  },
};

/**
 * Large dataset (10+ rows)
 */
export const LargeDataset: Story = {
  args: {
    columns: basicColumns,
    data: [
      ...sampleUsers,
      ...Array.from({ length: 15 }, (_, i) => ({
        id: i + 6,
        email: `user${i + 6}@example.com`,
        name: `User ${i + 6}`,
        role: i % 3 === 0 ? "admin" : "employee",
        department: ["Engineering", "Sales", "Marketing"][i % 3],
        status: (i % 2 === 0 ? "active" : "inactive") as "active" | "inactive",
        createdAt: `2024-0${(i % 9) + 1}-15`,
      })),
    ],
    searchKey: "email",
    searchPlaceholder: "Search users...",
    pageSize: 10,
  },
};
