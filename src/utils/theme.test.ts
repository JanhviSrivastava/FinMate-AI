import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveInitialTheme } from './theme';

test('resolveInitialTheme honors explicit stored theme over system preference', () => {
  assert.equal(resolveInitialTheme('dark', false), 'dark');
  assert.equal(resolveInitialTheme('light', true), 'light');
});

test('resolveInitialTheme falls back to system preference when stored value is empty or invalid', () => {
  assert.equal(resolveInitialTheme(null, true), 'dark');
  assert.equal(resolveInitialTheme(null, false), 'light');
  assert.equal(resolveInitialTheme('unknown', true), 'dark');
});
