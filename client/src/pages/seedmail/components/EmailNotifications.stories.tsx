/**
 * SeedMail Email Notifications Stories
 * 
 * Demonstrates toast notifications for email events
 */

import type { Meta, StoryObj } from "@storybook/react";
import { useEffect } from "react";
import { within, expect, waitFor } from "storybook/test";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Mail, FileText, Trash2 } from "lucide-react";

/**
 * Component that triggers email notification toasts
 */
function EmailNotificationDemo({ autoTrigger = false }: { autoTrigger?: boolean }) {
  const { toast } = useToast();

  // Auto-trigger on mount for "play" function tests
  useEffect(() => {
    if (autoTrigger) {
      // Trigger after a delay to simulate SSE event
      const timer = setTimeout(() => {
        triggerSyncCompleted();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoTrigger]);

  const triggerSyncCompleted = () => {
    toast({
      title: "✅ Sync completed",
      description: "150 messages processed in 2.5 seconds",
      duration: 5000,
    });
  };

  const triggerEmailReceived = () => {
    toast({
      title: "📧 New email received",
      description: "From: john@example.com - Re: Project Update",
      duration: 8000,
      action: (
        <Button size="sm" variant="default" onClick={() => console.log("View email")}>
          View
        </Button>
      ),
    });
  };

  const triggerDraftSaved = () => {
    toast({
      title: "💾 Draft saved",
      description: "Your reply has been saved as a draft",
      duration: 3000,
    });
  };

  const triggerEmailDeleted = () => {
    toast({
      title: "🗑️ Email deleted",
      description: "Moved to trash",
      duration: 4000,
    });
  };

  const triggerMultipleEmails = () => {
    toast({
      title: "📬 3 new emails",
      description: "You have new messages in your inbox",
      duration: 8000,
      action: (
        <Button size="sm" variant="default" onClick={() => console.log("View inbox")}>
          View All
        </Button>
      ),
    });
  };

  const triggerDraftWithAction = () => {
    toast({
      title: "📝 Draft found",
      description: "You have a draft for this conversation",
      action: (
        <div className="flex gap-2">
          <Button size="sm" variant="default" onClick={() => console.log("Load draft")}>
            Load Draft
          </Button>
        </div>
      ),
      duration: 8000,
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">SeedMail Notifications</h1>
          <p className="text-muted-foreground">
            Real-time email event notifications via Server-Sent Events
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Event Types</h2>

          <div className="grid gap-3">
            <Button onClick={triggerSyncCompleted} variant="outline" className="justify-start">
              <Mail className="mr-2" />
              Sync Completed
            </Button>

            <Button onClick={triggerEmailReceived} variant="outline" className="justify-start">
              <Mail className="mr-2" />
              New Email Received
            </Button>

            <Button onClick={triggerDraftSaved} variant="outline" className="justify-start">
              <FileText className="mr-2" />
              Draft Saved
            </Button>

            <Button onClick={triggerEmailDeleted} variant="outline" className="justify-start">
              <Trash2 className="mr-2" />
              Email Deleted
            </Button>

            <Button onClick={triggerMultipleEmails} variant="outline" className="justify-start">
              <Mail className="mr-2" />
              Multiple Emails
            </Button>

            <Button onClick={triggerDraftWithAction} variant="outline" className="justify-start">
              <FileText className="mr-2" />
              Draft with Action
            </Button>
          </div>
        </div>

        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h3 className="font-semibold">Implementation Notes</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Notifications appear in bottom-right corner</li>
            <li>• Auto-dismiss after duration expires</li>
            <li>• Can include action buttons for user interaction</li>
            <li>• Multiple toasts are queued (TOAST_LIMIT = 1)</li>
          </ul>
        </div>
      </div>

      <Toaster />
    </div>
  );
}

const meta = {
  title: "SeedMail/Notifications",
  component: EmailNotificationDemo,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof EmailNotificationDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Interactive demo of all email notification types.
 * Click buttons to trigger different toast notifications.
 */
export const Interactive: Story = {
  args: {
    autoTrigger: false,
  },
};

/**
 * Sync completed notification appears automatically.
 * Simulates the SSE sync-completed event.
 */
export const SyncCompleted: Story = {
  args: {
    autoTrigger: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for the toast to appear
    await waitFor(
      async () => {
        const toastTitle = await canvas.findByText(/sync completed/i);
        expect(toastTitle).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Verify content
    const description = canvas.getByText(/150 messages processed/i);
    expect(description).toBeInTheDocument();
  },
};

/**
 * New email received notification with action button.
 */
export const EmailReceived: Story = {
  render: () => {
    const Component = () => {
      const { toast } = useToast();

      useEffect(() => {
        const timer = setTimeout(() => {
          toast({
            title: "📧 New email received",
            description: "From: jane@example.com - Urgent: Budget Review",
            duration: 8000,
            action: (
              <Button size="sm" variant="default">
                View
              </Button>
            ),
          });
        }, 500);
        return () => clearTimeout(timer);
      }, []);

      return (
        <div className="min-h-screen bg-background p-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Email Received Notification</h1>
            <p className="text-muted-foreground">
              Notification will appear automatically with action button
            </p>
          </div>
          <Toaster />
        </div>
      );
    };

    return <Component />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(
      async () => {
        const title = await canvas.findByText(/new email received/i);
        expect(title).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Verify action button exists
    const viewButton = canvas.getByRole("button", { name: /view/i });
    expect(viewButton).toBeInTheDocument();
  },
};

/**
 * Draft saved notification (quick, auto-dismiss).
 */
export const DraftSaved: Story = {
  render: () => {
    const Component = () => {
      const { toast } = useToast();

      useEffect(() => {
        const timer = setTimeout(() => {
          toast({
            title: "💾 Draft saved",
            description: "Your reply has been saved automatically",
            duration: 3000,
          });
        }, 500);
        return () => clearTimeout(timer);
      }, []);

      return (
        <div className="min-h-screen bg-background p-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Draft Saved Notification</h1>
            <p className="text-muted-foreground">
              Quick confirmation toast (3 second duration)
            </p>
          </div>
          <Toaster />
        </div>
      );
    };

    return <Component />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(
      async () => {
        const title = await canvas.findByText(/draft saved/i);
        expect(title).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  },
};

/**
 * Draft found notification with load action.
 * Allows user to load an existing draft.
 */
export const DraftFoundWithAction: Story = {
  render: () => {
    const Component = () => {
      const { toast } = useToast();

      useEffect(() => {
        const timer = setTimeout(() => {
          toast({
            title: "📝 Draft found",
            description: "You have a draft for this recipient",
            action: (
              <Button size="sm" variant="default">
                Load Draft
              </Button>
            ),
            duration: 8000,
          });
        }, 500);
        return () => clearTimeout(timer);
      }, []);

      return (
        <div className="min-h-screen bg-background p-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Draft Found Notification</h1>
            <p className="text-muted-foreground">
              User can choose to load existing draft or continue with new message
            </p>
          </div>
          <Toaster />
        </div>
      );
    };

    return <Component />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(
      async () => {
        const title = await canvas.findByText(/draft found/i);
        expect(title).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Verify load draft button
    const loadButton = canvas.getByRole("button", { name: /load draft/i });
    expect(loadButton).toBeInTheDocument();
  },
};

/**
 * Email deleted notification.
 */
export const EmailDeleted: Story = {
  render: () => {
    const Component = () => {
      const { toast } = useToast();

      useEffect(() => {
        const timer = setTimeout(() => {
          toast({
            title: "🗑️ Email deleted",
            description: "Message moved to trash",
            duration: 4000,
          });
        }, 500);
        return () => clearTimeout(timer);
      }, []);

      return (
        <div className="min-h-screen bg-background p-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Email Deleted Notification</h1>
            <p className="text-muted-foreground">
              Confirmation when email is moved to trash
            </p>
          </div>
          <Toaster />
        </div>
      );
    };

    return <Component />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(
      async () => {
        const title = await canvas.findByText(/email deleted/i);
        expect(title).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  },
};

/**
 * Multiple emails notification for batch events.
 */
export const MultipleEmails: Story = {
  render: () => {
    const Component = () => {
      const { toast } = useToast();

      useEffect(() => {
        const timer = setTimeout(() => {
          toast({
            title: "📬 5 new emails",
            description: "You have new messages in your inbox",
            duration: 8000,
            action: (
              <Button size="sm" variant="default">
                View All
              </Button>
            ),
          });
        }, 500);
        return () => clearTimeout(timer);
      }, []);

      return (
        <div className="min-h-screen bg-background p-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Multiple Emails Notification</h1>
            <p className="text-muted-foreground">
              Aggregated notification for multiple new messages
            </p>
          </div>
          <Toaster />
        </div>
      );
    };

    return <Component />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(
      async () => {
        const title = await canvas.findByText(/5 new emails/i);
        expect(title).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Verify view all button
    const viewAllButton = canvas.getByRole("button", { name: /view all/i });
    expect(viewAllButton).toBeInTheDocument();
  },
};
