import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import pluginReact from "eslint-plugin-react";
import * as regexpPlugin from "eslint-plugin-regexp";
import { defineConfig } from "eslint/config";
import globals from "globals";
import { dirname } from "path";
import tseslint, { parser as typescriptEslintParser } from "typescript-eslint";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

const eslintConfig = [
  ...compat.extends(
    "eslint:recommended",
    "next",
    "next/core-web-vitals",
    "next/typescript"
  ),
];

export default defineConfig({
  root: true,
  ...eslintConfig,
  ignores: [
    "node_modules/",
    "out/",
    "coverage*/",
    "lib/",
    ".next/",
    "next-env.d.ts",
    "next.config.js",
    "postcss.config.js",
    ".config/*",
    "public/sw.js",
    "public/workbox-*.js",
    "public/pdf.worker.min.mjs",
  ],
  ...tseslint.configs.recommended,
  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.node,
      document: true,
      window: true,
      React: true,
      Digio: true,
    },
    parser: typescriptEslintParser,
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
      ecmaVersion: 12,
      sourceType: "module",
    },
  },
  plugins: { js },
  extends: ["js/recommended"],
  rules: {
    "no-undef": "off",
    "require-jsdoc": "off",
    "no-console": ["error", { allow: ["warn", "error", "table", "info"] }],
    "no-multi-spaces": ["error"],
    "spaced-comment": [
      "error",
      "always",
      {
        markers: [
          "//",
          "/",
          "?",
          "*",
          "!",
          "[]:",
          "[ ]:",
          "[x]:",
          "TODO:",
          "todo:",
        ],
        exceptions: [],
      },
    ],
    "no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        args: "all",
        argsIgnorePattern: "^_",
        caughtErrors: "all",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      },
    ],
    "react-hooks/exhaustive-deps": "off",
  },
  ...pluginReact.configs.flat.recommended,
  settings: {
    react: {
      version: "detect",
    },
  },
  ...regexpPlugin.configs["flat/recommended"],
  ...eslintConfigPrettier,
});
