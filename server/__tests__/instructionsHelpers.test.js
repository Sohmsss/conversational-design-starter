import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeGeneratedInstructions } from '../routes/instructions.js';

test('mergeGeneratedInstructions overwrites content and merges provided fields', () => {
  const existing = {
    audience: 'Retail staff',
    values: 'Empathy',
    extraField: 'preserve',
    content: 'Old content',
    updatedAt: '2024-01-01T00:00:00.000Z'
  };

  const overrides = {
    audience: 'Support agents',
    toneVoice: 'Friendly'
  };

  const timestamp = '2025-12-03T15:00:00.000Z';
  const merged = mergeGeneratedInstructions(existing, overrides, 'Fresh content', timestamp);

  assert.equal(merged.content, 'Fresh content');
  assert.equal(merged.audience, 'Support agents');
  assert.equal(merged.values, 'Empathy');
  assert.equal(merged.toneVoice, 'Friendly');
  assert.equal(merged.extraField, 'preserve');
  assert.equal(merged.updatedAt, timestamp);
});

test('mergeGeneratedInstructions keeps previous values when overrides are undefined but accepts empty strings', () => {
  const existing = {
    audience: 'Existing audience',
    values: 'Innovation',
    content: 'Old',
    updatedAt: '2024-01-01T00:00:00.000Z'
  };

  const overrides = {
    audience: '',
    values: undefined
  };

  const merged = mergeGeneratedInstructions(existing, overrides, 'Generated content');

  assert.equal(merged.audience, '');
  assert.equal(merged.values, 'Innovation');
  assert.equal(merged.content, 'Generated content');
  assert.notEqual(merged.updatedAt, existing.updatedAt);
  assert.match(merged.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

