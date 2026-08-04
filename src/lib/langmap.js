// Maps platform language identifiers to file extensions + human names.
// Exported for the background module; the object literal is also duplicated
// inside the content scripts (which cannot use ES imports).
export const LANG_MAP = {
  // LeetCode lang slugs
  python: "py", python3: "py", cpp: "cpp", c: "c", java: "java",
  csharp: "cs", javascript: "js", typescript: "ts", golang: "go", go: "go",
  kotlin: "kt", swift: "swift", rust: "rs", ruby: "rb", scala: "scala",
  php: "php", racket: "rkt", erlang: "erl", elixir: "ex", dart: "dart",
  mysql: "sql", mssql: "sql", oraclesql: "sql", pythondata: "py", bash: "sh",
  // Codeforces / CodeChef friendly names
  "gnu c++": "cpp", "gnu c": "c", "ms c++": "cpp", pypy: "py",
  python2: "py", nodejs: "js", "c++": "cpp", "c#": "cs", "f#": "fs",
  pascal: "pas", perl: "pl", haskell: "hs", ocaml: "ml", d: "d",
  fortran: "f90", r: "r", clojure: "clj", groovy: "groovy"
};

export function extFor(lang) {
  if (!lang) return "txt";
  const key = String(lang).toLowerCase().trim();
  if (LANG_MAP[key]) return LANG_MAP[key];
  // fuzzy: pick the first map key contained in the language string
  for (const k of Object.keys(LANG_MAP)) {
    if (key.includes(k)) return LANG_MAP[k];
  }
  return "txt";
}
