import firebaseRulesPlugin from "@firebase/eslint-plugin-security-rules";

export default [
  {
    ignores: ["dist/**/*", "eslint.config.js"]
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
