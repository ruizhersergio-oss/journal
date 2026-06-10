import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary:     '#0d0f14',
        secondary:   '#13151c',
        card:        '#1a1d27',
        hover:       '#1f2230',
        border:      '#2a2d3a',
        green:       '#26de81',
        red:         '#fc5c65',
        blue:        '#4f8ef7',
        yellow:      '#f7c948',
        muted:       '#6b7280',
        textPrimary: '#e8eaf0',
      },
    },
  },
  plugins: [],
};
export default config;
