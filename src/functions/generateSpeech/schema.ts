export default {
  type: "object",
  properties: {
    text: { type: 'string' },
    language: { type: 'string' }
  },
  required: ['text']
} as const;
