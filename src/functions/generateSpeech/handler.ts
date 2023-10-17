import {POLLY_REGION, S3_BUCKET_NAME, S3_WEBSITE_URL, S3_REGION} from "@private/aws-config";
import schema from './schema';

import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import {PollyClient, StartSpeechSynthesisTaskCommand} from '@aws-sdk/client-polly';
import {S3Client, PutObjectCommand} from '@aws-sdk/client-s3';
import {formatJSONResponse} from "@libs/api-gateway";

const polly = new PollyClient({region:POLLY_REGION});
const s3 = new S3Client({region:S3_REGION});

function _getVoiceIdForLanguageCode(languageCode:string):string|undefined {
  switch(languageCode) {
    case 'en-US': return 'Matthew';
    case 'es-ES': return 'Conchita';
    case 'es-MX': return 'Mia';
    default:return undefined;
  }
}

function _createS3WebsiteUrl(outputUri:string, s3WebsiteUrl:string):string {
  const filename = outputUri.split('/').pop();
  return `${s3WebsiteUrl}${filename}`;
}

function _getFilenameFromUrl(url:string, replaceExtension:string):string {
  const filename = url.split('/').pop();
  if (!filename) throw new Error(`Could not get filename from url ${url}`);
  const extensionPosition = filename.lastIndexOf('.');
  if (extensionPosition === -1) return filename;
  return `${filename.substr(0, extensionPosition)}.${replaceExtension}`;
}

const generateSpeech: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const {ssml, language, name} = event.body;
  const languageCode = language ?? 'en-US';
  const lessonName = name ?? 'default';
  try {
    const voiceId = _getVoiceIdForLanguageCode(languageCode);
    
    const pollyParams = {
      Engine: 'neural',
      LanguageCode: languageCode,
      OutputFormat: 'mp3',
      OutputS3BucketName: S3_BUCKET_NAME,
      Text: ssml,
      TextType: 'ssml',
      VoiceId: voiceId,
      SpeechMarkTypes: []
    };
    
    const pollyMp3Response = await polly.send(new StartSpeechSynthesisTaskCommand(pollyParams));
    const mp3url = _createS3WebsiteUrl(pollyMp3Response.SynthesisTask.OutputUri, S3_WEBSITE_URL);
    
    pollyParams.OutputFormat = 'json';
    pollyParams.SpeechMarkTypes = ['ssml'];
    const pollyJsonResponse = await polly.send(new StartSpeechSynthesisTaskCommand(pollyParams));
    const marksUrl = _createS3WebsiteUrl(pollyJsonResponse.SynthesisTask.OutputUri, S3_WEBSITE_URL);
    
    const lessonFilename = _getFilenameFromUrl(mp3url, 'json');
    
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: lessonFilename,
      Body: JSON.stringify({mp3url, marksUrl, languageCode, lessonName, ssml})
    }));
    const lessonUrl = _createS3WebsiteUrl(lessonFilename, S3_WEBSITE_URL);
    
    return formatJSONResponse({lessonUrl});
  } catch(e) {
    return formatJSONResponse({lessonUrl:null, error:e.toString(), languageCode, lessonName, ssml});
  }
};

export const main = middyfy(generateSpeech);
