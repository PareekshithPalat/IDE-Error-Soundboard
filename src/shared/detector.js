function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileMatchers(patterns) {
  return patterns
    .filter((pattern) => typeof pattern === "string" && pattern.trim())
    .map((pattern) => new RegExp(escapeRegExp(pattern.trim()), "i"));
}

function textContainsError(text, matchers) {
  // Strip ANSI escape codes to ensure clean pattern matching.
  const cleanText = text.replace(/\x1B[@-_][0-?]*[ -/]*[@-~]/g, "");
  return matchers.some((matcher) => matcher.test(cleanText));
}

module.exports = {
  compileMatchers,
  textContainsError
};
