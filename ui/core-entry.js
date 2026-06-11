// core-entry.js — esbuild bundles this (and, through it, all of ../src) into the
// page, exposing the domain core as window.DZ. This makes src/ the single source
// of truth: the same code is unit-tested by vitest and run in the app.
import * as Core from '../src/index.ts';
window.DZ = Core;
