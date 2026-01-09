// Lightweight embedded SVG logos to avoid external asset dependency in production builds.
// If you want to swap these with real image files later, import them here and export with the same names.

// Light mode: dark text on transparent background
export const logoLight =
  `data:image/svg+xml;utf8,${ 
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='160' viewBox='0 0 600 160'>
      <rect width='100%' height='100%' fill='transparent'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' font-size='40' font-weight='700' fill='#0f172a'>Seed Financial</text>
    </svg>`
  )}`;

// Dark mode: light text on transparent background
export const logoDark =
  `data:image/svg+xml;utf8,${ 
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='160' viewBox='0 0 600 160'>
      <rect width='100%' height='100%' fill='transparent'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' font-size='40' font-weight='700' fill='#ffffff'>Seed Financial</text>
    </svg>`
  )}`;
