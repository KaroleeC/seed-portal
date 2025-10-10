/**
 * Template for creating new Storybook stories
 *
 * Usage:
 * 1. Copy this file to your component directory
 * 2. Rename to match your component: ComponentName.stories.tsx
 * 3. Update imports and meta configuration
 * 4. Add stories for each variant/state
 */

import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
// Import your component
// import { YourComponent } from "./your-component";

/**
 * Brief description of what this component does.
 * Explain when and where it should be used.
 */
const meta = {
  title: "Category/ComponentName", // e.g., "UI/Button" or "Features/EmailComposer"
  component: YourComponent,
  parameters: {
    layout: "centered", // centered, fullscreen, or padded
    // Add custom backgrounds if needed
    // backgrounds: {
    //   default: "dark",
    //   values: [
    //     { name: "dark", value: "#0a0a0a" },
    //     { name: "light", value: "#ffffff" },
    //   ],
    // },
  },
  tags: ["autodocs"], // Generates automatic documentation
  // Add argTypes for better controls
  // argTypes: {
  //   variant: {
  //     control: "select",
  //     options: ["primary", "secondary", "destructive"],
  //   },
  //   onClick: { action: "clicked" },
  // },
  // Default args for all stories
  args: {
    onClick: fn(), // Mock function for event handlers
  },
} satisfies Meta<typeof YourComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state - the most common use case.
 */
export const Default: Story = {
  args: {
    // Add your component props here
    children: "Default State",
  },
};

/**
 * Add more stories for different variants, states, and use cases.
 * Examples:
 */

// export const WithIcon: Story = {
//   args: {
//     children: (
//       <>
//         <IconComponent />
//         With Icon
//       </>
//     ),
//   },
// };

// export const Disabled: Story = {
//   args: {
//     disabled: true,
//     children: "Disabled State",
//   },
// };

// export const Loading: Story = {
//   args: {
//     isLoading: true,
//     children: "Loading...",
//   },
// };

// For complex examples with multiple components:
// export const ComplexExample: Story = {
//   render: () => (
//     <div className="space-y-4">
//       <YourComponent variant="primary">First</YourComponent>
//       <YourComponent variant="secondary">Second</YourComponent>
//     </div>
//   ),
// };

// For interactive examples with state:
// const InteractiveExample = () => {
//   const [value, setValue] = useState("");
//   return <YourComponent value={value} onChange={setValue} />;
// };
//
// export const Interactive: Story = {
//   render: () => <InteractiveExample />,
// };
