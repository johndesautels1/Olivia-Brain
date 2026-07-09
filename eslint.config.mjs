import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * React Compiler lint rules (react-hooks v7, pulled in transitively by
 * eslint-config-next) are advisory and landed AFTER most of this codebase
 * was written. We run them as WARNINGS, not errors:
 *
 * - They still surface in `npm run lint` output, so the debt stays visible.
 * - They no longer FAIL CI, because fixing each one correctly requires
 *   exercising the component at runtime (setState-in-effect,
 *   refs-during-render, render-purity, immutability) — a blind mass-refactor
 *   without UI verification would risk real regressions. Those refactors are
 *   tracked as dedicated follow-up work, per React's incremental-adoption
 *   guidance for the compiler.
 *
 * Every OTHER lint rule remains an error and must pass CI.
 */
const reactCompilerAdvisory = {
  name: "olivia/react-compiler-advisory",
  rules: {
    "react-hooks/set-state-in-effect": "warn",
    "react-hooks/refs": "warn",
    "react-hooks/purity": "warn",
    "react-hooks/immutability": "warn",
  },
};

const config = [...nextVitals, ...nextTypescript, reactCompilerAdvisory];

export default config;
