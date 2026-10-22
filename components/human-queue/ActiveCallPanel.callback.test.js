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

const outfile = path.join(here, ".active-call-panel-test.mjs");
await esbuild.build({
  absWorkingDir: root,
  stdin: {
    sourcefile: "callback-call-panel-entry.js",
    contents: `export { default } from ${JSON.stringify(path.join(root, "components/human-queue/ActiveCallPanel.js"))};`,
    resolveDir: root,
    loader: "js",
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  outfile,
  jsx: "automatic",
  loader: { ".js": "jsx" },
  alias: { "@": root },
  external: ["react", "react-dom", "react/jsx-runtime"],
  plugins: [
    {
      name: "stub-twilio",
      setup(build) {
        build.onResolve({ filter: /twilioVoiceClient$/ }, () => ({
          path: "twilio-stub",
          namespace: "stub",
        }));
        build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
          contents: `
            export function disconnectConnection() {}
            export function isConnectionMuted() { return false }
            export function muteConnection() {}
            export function subscribeToConnectionEvents() { return () => {} }
          `,
          loader: "js",
        }));
      },
    },
  ],
});

const React = require("react");
const { createRoot } = require("react-dom/client");
const { act } = require("react-dom/test-utils");
const statusOut = path.join(here, ".outbound-call-status-test.mjs");
await esbuild.build({
  absWorkingDir: root,
  entryPoints: [path.join(root, "lib/outboundCallStatus.js")],
  bundle: true,
  format: "esm",
  platform: "neutral",
  outfile: statusOut,
});
const { isPersistedCallId, nextOutboundPanelStatus } = await import(pathToFileURL(statusOut).href);
const mod = await import(pathToFileURL(outfile).href);
const ActiveCallPanel = mod.default;
test.after(() => {
  fs.rmSync(outfile, { force: true });
  fs.rmSync(statusOut, { force: true });
});

test("callback panel stays connecting until the customer answers", () => {
  assert.equal(nextOutboundPanelStatus("ringing", "connecting"), "connecting");
  assert.equal(nextOutboundPanelStatus("initiated", "connecting"), "connecting");
  assert.equal(nextOutboundPanelStatus("in-progress", "connecting"), "connected");
  assert.equal(nextOutboundPanelStatus("in-progress", "on_hold"), "on_hold");
  assert.equal(nextOutboundPanelStatus("ringing", "connected"), "connected");
  assert.equal(nextOutboundPanelStatus("completed", "connected"), "ended");
  assert.equal(nextOutboundPanelStatus("no-answer", "connecting"), "ended");
  assert.equal(nextOutboundPanelStatus("busy", "on_hold"), "ended");
  assert.equal(isPersistedCallId("507f1f77bcf86cd799439011"), true);
  assert.equal(isPersistedCallId("pending-callback"), false);
});

function renderPanel(overrides = {}) {
  const host = document.getElementById("root");
  host.innerHTML = "";
  const rootEl = createRoot(host);
  const props = {
    mode: "outbound",
    layerZIndex: 500,
    canManage: true,
    callStatus: "connected",
    call: {
      id: "call-1",
      leadName: "Ava Brooks",
      callerPhone: "+14045550123",
      createdAt: "2026-10-22T12:00:00.000Z",
      escalationReason: "Asked for a person",
      aiSummary: "Wants the Saturday class.",
    },
    onEndCall: () => {},
    onResolve: () => {},
    onHoldChange: async () => {},
    onClose: () => {},
    ...overrides,
  };
  act(() => {
    rootEl.render(React.createElement(ActiveCallPanel, props));
  });
  return host;
}

test("callback call panel matches the live human call controls", () => {
  const host = renderPanel();
  const labels = [...host.querySelectorAll("button")].map((b) => b.textContent);
  assert.ok(labels.some((t) => t.includes("Mute")));
  assert.ok(labels.some((t) => t.includes("Hold")));
  assert.ok(labels.some((t) => t.includes("Hang up")));
  assert.equal(labels.some((t) => t.includes("Resolve & close")), false);
  assert.equal(labels.some((t) => t.includes("Leave call")), false);
  assert.match(host.textContent, /Asked for a person/);
  assert.match(host.textContent, /Live call/);
  assert.equal(host.firstElementChild.style.zIndex, "500");
  const hangup = [...host.querySelectorAll("button")].find((b) => b.textContent.includes("Hang up"));
  assert.equal(hangup.disabled, false);
  assert.match(hangup.className, /\bbg-destructive\b/);
  assert.doesNotMatch(hangup.className, /bg-destructive\/10/);
});

test("minimize collapses the callback call panel and restore brings it back", () => {
  const host = renderPanel();
  const minimize = host.querySelector("button[title='Minimize']");
  assert.ok(minimize);
  act(() => {
    minimize.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
  assert.equal(host.querySelector("button[title='Minimize']"), null);
  assert.match(host.textContent, /Ava Brooks/);
  assert.match(host.textContent, /Live/);
  assert.equal(host.firstElementChild.style.zIndex, "500");

  const restore = host.querySelector("button");
  act(() => {
    restore.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
  assert.ok(host.querySelector("button[title='Minimize']"));
  assert.match(host.textContent, /Hang up/);
  assert.doesNotMatch(host.textContent, /Resolve & close/);
});

test("hold stays disabled until the customer answers", () => {
  const host = renderPanel({ callStatus: "connecting", canManage: false });
  const hold = [...host.querySelectorAll("button")].find((b) => b.textContent.includes("Hold"));
  const hangup = [...host.querySelectorAll("button")].find((b) => b.textContent.includes("Hang up"));
  assert.ok(hold);
  assert.equal(hold.disabled, true);
  assert.equal(hangup.disabled, false);
  assert.match(host.textContent, /Connecting/);
  assert.equal([...host.querySelectorAll("button")].some((b) => b.textContent.includes("Resolve & close")), false);
});
