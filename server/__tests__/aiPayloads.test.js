import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInstructionGenerationRequest } from '../routes/instructions.js';
import { buildFunctionMockGenerationRequest } from '../routes/functions.js';

test('instruction generation payload uses max_completion_tokens', () => {
  const prompt = 'Demo prompt';
  const payload = buildInstructionGenerationRequest(prompt);

  assert.equal(payload.max_completion_tokens, 2000);
  assert.equal(payload.messages[1].content, prompt);
  assert.ok(!('max_tokens' in payload), 'payload should not include max_tokens');
});

test('function mock payload uses max_completion_tokens', () => {
  const prompt = 'Mock function prompt';
  const payload = buildFunctionMockGenerationRequest(prompt);

  assert.equal(payload.max_completion_tokens, 2000);
  assert.equal(payload.messages[1].content, prompt);
  assert.ok(!('max_tokens' in payload), 'payload should not include max_tokens');
});

