import schema from './schema';
import { handlerPath } from '@libs/handler-resolver';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      http: {
        method: 'post',
        path: 'generateSpeech',
        cors: true,
        authorizer: 'aws_iam',
        request: {
          schemas: {
            'application/json': schema,
          },
        },
      },
    },
  ],
};
