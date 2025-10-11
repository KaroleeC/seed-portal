import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";

const config: StorybookConfig = {
  stories: [
    "../client/src/components/**/*.stories.@(js|jsx|ts|tsx)",
    "../client/src/pages/**/*.stories.@(js|jsx|ts|tsx)",
  ],

  addons: [
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
    "@storybook/addon-docs"
  ],

  framework: {
    name: "@storybook/react-vite",
    options: {},
  },

  async viteFinal(config) {
    // Merge with your existing Vite config
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          "@": path.resolve(__dirname, "../client/src"),
          "@shared": path.resolve(__dirname, "../shared"),
          "@assets": path.resolve(__dirname, "../client/src/assets"),
        },
      },
    };
  }
};

export default config;
