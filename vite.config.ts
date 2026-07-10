import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/golden-mind/",
  server: {
    port: 4200,
  },
});
