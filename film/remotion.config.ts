// Renders with the headless Chromium that Playwright already installed, when it is there, so nothing else has to
// be downloaded. Elsewhere Remotion fetches its own.
import { Config } from "@remotion/cli/config";
import { existsSync } from "node:fs";

const SHELL = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
if (existsSync(SHELL)) Config.setBrowserExecutable(SHELL);
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setConcurrency(null); // as many as the machine has
