module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
  },
  extends: ["airbnb-base", "prettier"],
  parserOptions: {
    ecmaVersion: 12,
  },
  ignorePatterns: ["examples/"],
  rules: {
    "no-use-before-define": ["error", { functions: false, classes: false }],
  },
};
