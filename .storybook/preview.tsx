import type { Preview } from "@storybook/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import "../client/src/index.css";
import { initializeMSW } from "../test/mocks/browser";

// Initialize MSW for Storybook
initializeMSW();

// Create a client for Storybook
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 0,
    },
  },
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      options: {
        dark: {
          name: "dark",
          value: "hsl(222.2 84% 4.9%)",
        },

        light: {
          name: "light",
          value: "hsl(0 0% 100%)",
        },
      },
    },
  },

  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || "dark";

      React.useEffect(() => {
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
      }, [theme]);

      return (
        <ThemeProvider attribute="class" forcedTheme={theme} enableSystem={false}>
          <QueryClientProvider client={queryClient}>
            <div className="min-h-screen bg-background text-foreground p-4">
              <Story />
            </div>
          </QueryClientProvider>
        </ThemeProvider>
      );
    },
  ],

  globalTypes: {
    theme: {
      description: "Global theme for components",
      defaultValue: "dark",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", icon: "sun", title: "Light" },
          { value: "dark", icon: "moon", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },

  initialGlobals: {
    backgrounds: {
      value: "dark",
    },
  },
};

export default preview;
