import {POLLY_REGION, S3_BUCKET_NAME, S3_WEBSITE_URL} from "@private/aws-config";
import schema from './schema';

import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import {PollyClient, StartSpeechSynthesisTaskCommand} from '@aws-sdk/client-polly';
import {formatJSONResponse} from "@libs/api-gateway";

const polly = new PollyClient({region:POLLY_REGION});

function _getVoiceIdForLanguageCode(languageCode:string):string|undefined {
  switch(languageCode) {
    case 'en-US': return 'Matthew';
    case 'es-MX': return 'Mia';
    default:return undefined;
  }
}

function _createS3WebsiteUrl(outputUri:string, s3WebsiteUrl:string):string {
  const filename = outputUri.split('/').pop();
  return `${s3WebsiteUrl}${filename}`;
}

const generateSpeech: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const {text} = event.body;
  const languageCode = event.body.language ?? 'en-US';
  const voiceId = _getVoiceIdForLanguageCode(languageCode);
  
  const pollyParams = {
    Engine: 'neural',
    LanguageCode: languageCode,
    OutputFormat: 'mp3',
    OutputS3BucketName: S3_BUCKET_NAME,
    Text: text,
    VoiceId: voiceId
  };
  
  const pollyResponse = await polly.send(new StartSpeechSynthesisTaskCommand(pollyParams));
  const url = _createS3WebsiteUrl(pollyResponse.SynthesisTask.OutputUri, S3_WEBSITE_URL);
  console.log(pollyResponse);
  
  return formatJSONResponse({
    message: `Stored "${text}".`,
    url,
    event,
  });
};

export const main = middyfy(generateSpeech);
