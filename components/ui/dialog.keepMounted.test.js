import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL, fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { JSDOM } from "jsdom";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(import.meta.url);

const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
  url: "http://localhost",
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.navigator = dom.window.navigator;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const outfile = path.join(here, ".dialog-keep-mounted-test.mjs");
await esbuild.build({
  absWorkingDir: root,
  stdin: {
    sourcefile: "dialog-entry.js",
    contents: `
      import { useState } from "react";
      import { Dialog } from ${JSON.stringify(path.join(root, "components/ui/dialog.js"))};
      export function Harness({ open, keepMounted }) {
        const [calls] = useState(1);
        return (
          <Dialog open={open} keepMounted={keepMounted} onClose={() => {}}>
            <p data-call={calls}>Call panel {calls}</p>
          </Dialog>
        );
      }
    `,
    resolveDir: root,
    loader: "jsx",
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  outfile,
  jsx: "automatic",
  loader: { ".js": "jsx" },
  alias: { "@": root },
  external: ["react", "react-dom", "react/jsx-runtime"],
});

const React = require("react");
const { createRoot } = require("react-dom/client");
const { act } = require("react");
const { Harness } = await import(pathToFileURL(outfile).href);
test.after(() => fs.rmSync(outfile, { force: true }));

function render(props) {
  const host = document.getElementById("root");
  if (!host._root) host._root = createRoot(host);
  act(() => {
    host._root.render(React.createElement(Harness, props));
  });
  return document.body;
}

test("closing a dialog keeps a live call mounted", () => {
  const body = render({ open: true, keepMounted: true });
  assert.match(body.textContent, /Call panel 1/);
  assert.equal(document.querySelector("[role='dialog']") != null, true);

  render({ open: false, keepMounted: true });
  assert.match(body.textContent, /Call panel 1/);
  assert.equal(document.querySelector("[role='dialog']"), null);
  assert.equal(document.querySelector("[data-call='1']") != null, true);
});

test("closing a dialog without a call removes it", () => {
  const body = render({ open: true, keepMounted: false });
  assert.match(body.textContent, /Call panel 1/);
  render({ open: false, keepMounted: false });
  assert.equal(document.querySelector("[data-call='1']"), null);
  assert.doesNotMatch(body.textContent, /Call panel/);
});
