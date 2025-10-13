import React from "react";

type Props = { children: React.ReactNode };

type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log and continue
    console.error("SeedQC ErrorBoundary caught: ", error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-md border bg-destructive/10 text-destructive text-sm">
          Something went wrong in this section. Please try a different selection or refresh. The
          error was logged to console.
        </div>
      );
    }
    return this.props.children;
  }
}
