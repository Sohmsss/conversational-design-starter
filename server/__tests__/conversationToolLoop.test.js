import test from 'node:test';
import assert from 'node:assert/strict';
import { runOpenAIConversation } from '../routes/conversation.js';

const baseMessages = [
  { role: 'system', content: 'Be helpful' },
  { role: 'user', content: 'Hello' }
];

test('runOpenAIConversation returns final response when no tool calls occur', async () => {
  const aiCaller = async () => ({
    choices: [
      {
        message: {
          content: 'Hi there!',
          tool_calls: []
        }
      }
    ]
  });

  const result = await runOpenAIConversation({
    provider: 'openai',
    initialMessages: baseMessages,
    functions: [],
    model: 'gpt-4',
    aiCaller
  });

  assert.equal(result.assistantMessage, 'Hi there!');
  assert.equal(result.functionCalls.length, 0);
  assert.equal(result.functionResults.length, 0);
});

test('runOpenAIConversation executes tool calls until final response arrives', async () => {
  const responses = [
    {
      choices: [
        {
          message: {
            content: 'Let me fetch that.',
            tool_calls: [
              {
                id: 'call_1',
                function: {
                  name: 'getExchangeRate',
                  arguments: '{"baseCurrency":"GBP","targetCurrency":"VND"}'
                }
              }
            ]
          }
        }
      ]
    },
    {
      choices: [
        {
          message: {
            content: '1 GBP equals 31,348.75 VND.',
            tool_calls: []
          }
        }
      ]
    }
  ];

  const aiCaller = async () => {
    const response = responses.shift();
    if (!response) {
      throw new Error('No more mock responses available');
    }
    return response;
  };

  const result = await runOpenAIConversation({
    provider: 'openai',
    initialMessages: baseMessages,
    functions: [
      {
        name: 'getExchangeRate',
        mockResponse: { rate: 31348.75 }
      }
    ],
    model: 'gpt-4-turbo',
    aiCaller
  });

  assert.equal(result.assistantMessage, '1 GBP equals 31,348.75 VND.');
  assert.equal(result.functionCalls.length, 1);
  assert.deepEqual(result.functionCalls[0].function.arguments, {
    baseCurrency: 'GBP',
    targetCurrency: 'VND'
  });
  assert.equal(result.functionResults.length, 1);
  assert.deepEqual(result.functionResults[0].function.result, { rate: 31348.75 });
});

test('runOpenAIConversation stops after max iterations when no final response', async () => {
  const aiCaller = async () => ({
    choices: [
      {
        message: {
          content: '',
          tool_calls: [
            {
              id: `call_${Date.now()}`,
              function: {
                name: 'getCustomerContext',
                arguments: '{"customer_id":"123"}'
              }
            }
          ]
        }
      }
    ]
  });

  await assert.rejects(
    () =>
      runOpenAIConversation({
        provider: 'openai',
        initialMessages: baseMessages,
        functions: [
          { name: 'getCustomerContext', mockResponse: { customer_id: '123' } }
        ],
        model: 'gpt-4o',
        maxIterations: 2,
        aiCaller
      }),
    /Exceeded OpenAI tool-call iteration limit/
  );
});

