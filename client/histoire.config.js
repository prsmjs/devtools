import { defineConfig } from "histoire"
import { HstVue } from "@histoire/plugin-vue"

export default defineConfig({
  plugins: [HstVue()],
  setupFile: "./src/ui/histoire-setup.js",
  theme: {
    title: "devtools components",
    favicon: undefined,
  },
  storyMatch: ["./src/ui/stories/**/*.story.vue"],
})
