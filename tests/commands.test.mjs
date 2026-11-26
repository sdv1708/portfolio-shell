import assert from "node:assert/strict";
import test from "node:test";

import { runShellCommand } from "../src/commands.ts";
import { applyTheme } from "../src/themes.ts";

test("a listed theme name can be entered as a command", async () => {
  const themes = [];
  const output = [];
  const ctx = {
    term: { println: (text) => output.push(text) },
    applyThemeAndTitle(name) {
      themes.push(name);
      return true;
    },
  };

  await runShellCommand(ctx, "dracula");
  await runShellCommand(ctx, "theme MATRIX");
  assert.deepEqual(themes, ["dracula", "matrix"], output.join("\n"));
});

test("theme names are restricted to the displayed palette", () => {
  assert.equal(applyTheme("constructor"), false);
});
