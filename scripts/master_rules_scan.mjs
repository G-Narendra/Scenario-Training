// Master Rules Scanner for Scenario-Training project
// Based directly on Master/Master/harness/rules-scan.mjs standards.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(".");
const warnOnly = process.argv.includes("--warn-only");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  "Master",
  "Master.zip",
  ".claude",
  "project",
  "playwright-report",
  "test-results",
  ".turbo",
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  ".ruff_cache",
  ".mypy_cache",
  "backups",
  "hf_repo",
  "scripts"
]);

const CODE = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".sql"]);
const DOCS = new Set([".md", ".mdx", ".txt"]);
const TEST_FILE = /(\.|\/)(test|spec|stories)\.|__tests__|\/tests?\//;

const codeRules = [
  ["error", "empty-catch", /catch\s*(\([^)]*\))?\s*\{\s*(\/\/[^\n]*)?\s*\}/g, "empty catch block swallows errors"],
  ["error", "py-except-pass", /except[^\n:]*:\s*\n?\s*pass\b/g, "bare except/pass swallows errors"],
  ["error", "ts-any", /(:\s*any\b|\bas\s+any\b|<any>)/g, "`any` defeats type safety; use a schema or unknown"],
  ["error", "ts-ignore", /@ts-(ignore|nocheck)\b(?![^\n]*\S{12,})/g, "@ts-ignore without a reason"],
  ["error", "todo-stub", /\b(TODO|FIXME|HACK|XXX)\b/g, "placeholder marker; implement or track in a ticket"],
  ["error", "sql-concat", /(query|execute|raw|\$queryRaw|\$executeRaw)\w*\s*\(\s*(`[^`]*\$\{|["'][^"']*(SELECT|INSERT|UPDATE|DELETE)[^"']*["']\s*\+)/gi, "SQL built from strings; use parameters"],
  ["error", "eval", /\beval\s*\(|new Function\s*\(/g, "dynamic code execution"],
  ["error", "cors-star", /origin\s*:\s*["']\*["']/g, "wildcard CORS origin"],
  ["error", "hardcoded-secret", /(api[_-]?key|secret|passwd|password|token)\s*[:=]\s*["'][A-Za-z0-9_\-/+=]{16,}["']/gi, "possible hardcoded secret"],
  ["error", "placeholder-text", /lorem ipsum|\bfoo@example\.com\b|test user\b/gi, "placeholder content"],
  ["warn", "console-log", /\bconsole\.(log|debug)\s*\(/g, "use structured logger"],
  ["warn", "inner-html", /dangerouslySetInnerHTML|\.innerHTML\s*=/g, "unsanitized HTML sink"],
  ["warn", "tautology-comment", /\/\/\s*(gets?|sets?|returns?|constructor|increments?)\b[^\n]{0,30}$/gim, "comment restates code"],
];

const testRules = [
  ["error", "disabled-test", /\b(describe|it|test)\.(skip|only|todo)\s*\(|\bx(describe|it)\s*\(|\bfit\s*\(|\bfdescribe\s*\(/g, "disabled or focused test"],
  ["warn", "empty-assert", /expect\(\s*true\s*\)\.toBe\(\s*true\s*\)|assert\(\s*true\s*\)/g, "assertion that cannot fail"],
];

const docRules = [
  ["warn", "slop-phrase", /\b(in today'?s (fast-paced|rapidly)|it is worth noting|it goes without saying|here'?s the thing|delve|tapestry|pivotal|game-?changing|groundbreaking|revolutionary|seamless(ly)?|foundational backbone|serves as|beacon of|underscores|testament to)\b/gi, "filler or inflated wording"],
  ["warn", "negative-parallelism", /\bnot (just|only) [^.\n]{2,60}, (but )?(it'?s|it is|but)\b/gi, "'not just X, it is Y' construction"],
  ["warn", "em-dash", /—/g, "em dash in technical writing"],
  ["error", "placeholder-text", /lorem ipsum|\[(insert|your) [^\]]+\]/gi, "placeholder content"],
];

const findings = [];

function scan(file, rules) {
  const text = readFileSync(file, "utf8");
  for (const [level, id, re, why] of rules) {
    for (const m of text.matchAll(re)) {
      const line = text.slice(0, m.index).split("\n").length;
      findings.push({ level, id, why, file: relative(root, file).replaceAll("\\", "/"), line });
    }
  }
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    try {
      const stat = statSync(p);
      if (stat.isDirectory()) {
        walk(p);
        continue;
      }
      const ext = extname(name);
      if (CODE.has(ext) && !name.endsWith(".d.ts")) {
        const isTest = TEST_FILE.test(p.replaceAll("\\", "/"));
        scan(p, isTest ? [...codeRules.filter(([, id]) => id !== "ts-any" && id !== "placeholder-text" && id !== "hardcoded-secret"), ...testRules] : codeRules);
      } else if (DOCS.has(ext) && !/^(CHANGELOG|LICENSE|CLAUDE|AGENTS)/i.test(name)) {
        scan(p, docRules);
      }
    } catch {
      // ignore unreadable files
    }
  }
}

walk(root);

const errors = findings.filter((f) => f.level === "error");
const warnings = findings.filter((f) => f.level === "warn");

console.log("=== MASTER RULES SCAN RESULTS ===");
console.log(`Scanned root: ${root}`);
console.log(`Total Findings: ${findings.length} (${errors.length} errors, ${warnings.length} warnings)`);
console.log("---------------------------------");
console.log("ALL ERRORS:");
for (const f of errors) {
  console.log(`${f.level.toUpperCase().padEnd(5)} ${f.file}:${f.line} [${f.id}] ${f.why}`);
}
console.log("---------------------------------");
console.log(`Final Result: ${errors.length === 0 ? "PASSED (0 Errors)" : "FAILED (" + errors.length + " Errors)"}`);
console.log("---------------------------------");
console.log(`SAMPLE WARNINGS (${warnings.length} total):`);
for (const f of warnings.slice(0, 30)) {
  console.log(`${f.level.toUpperCase().padEnd(5)} ${f.file}:${f.line} [${f.id}] ${f.why}`);
}

process.exit(errors.length && !warnOnly ? 1 : 0);
