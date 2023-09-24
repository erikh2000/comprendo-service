import { S3_BUCKET_NAME} from "@private/aws-config";
import schema from './schema';

import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { Polly, S3 } from 'aws-sdk';
import { v1 as uuid1 } from 'uuid';
import {formatJSONResponse} from "@libs/api-gateway";

const polly = new Polly();
const s3 = new S3();

function _getVoiceIdForLanguageCode(languageCode:string):string {
  if (languageCode === 'es-MX') return 'Mia';
  return 'Joanna';
}

const generateSpeech: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  try {
    const {text} = event.body;
    const languageCode = event.body.language ?? 'en-US';
    const voiceId = _getVoiceIdForLanguageCode(languageCode);
    
    const pollyParams = {
      Engine: 'neural',
      LanguageCode: languageCode,
      OutputFormat: 'mp3',
      Text: text,
      VoiceId: voiceId
    };
    
    const pollyResponse = await polly.synthesizeSpeech(pollyParams).promise();
    const audioStream = pollyResponse.AudioStream;
    
    const key = `${uuid1()}.mp3`;
    
    await s3.putObject({Bucket:S3_BUCKET_NAME, Key:key, Body:audioStream}).promise();
    const url = await s3.getSignedUrlPromise('getObject', {Bucket:S3_BUCKET_NAME, Key:key});
    
    return formatJSONResponse({
      message: `Stored "${text}".`,
      url: url,
      event,
    });
  } catch(err) {
    return formatJSONResponse({
      message: `Exception ${err}. Stack: ${err.stack}`,
      event,
    });
  }
};

export const main = middyfy(generateSpeech);
