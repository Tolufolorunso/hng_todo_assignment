import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "react-native": path.resolve(__dirname, "./src/test/react-native-mock.ts"),
      "expo-notifications": path.resolve(__dirname, "./src/test/expo-notifications-mock.ts"),
    },
  },
});
