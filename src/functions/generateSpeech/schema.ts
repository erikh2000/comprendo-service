export default {
  type: "object",
  properties: {
    ssml: { type: 'string' },
    language: { type: 'string' },
    name: { type: 'string' },
  },
  required: ['ssml']
} as const;
