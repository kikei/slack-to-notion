// Invoke the target function and immediately return the result.

import {LambdaFunctionURLHandler} from 'aws-lambda';
import {InvokeCommand, LambdaClient} from '@aws-sdk/client-lambda';

import * as slack from './slack';

const HEADER_SLACK_RETRY_COUNT = 'x-slack-retry-num';
const ENV_TARGET_FUNCTION_NAME = 'TARGET_FUNCTION_NAME';

function ignoreSlackRetry(
  event: {headers: Record<string, string | undefined>},
  count: number = 0
): boolean {
  const retried = Number(event.headers?.[HEADER_SLACK_RETRY_COUNT] ?? '0');
  return retried > count;
}

export const handler: LambdaFunctionURLHandler = async (event, _context) => {
  console.debug('event:', JSON.stringify(event, null, 2));

  if (ignoreSlackRetry(event, 0)) {
    console.info(
      'Ignore Slack retry: ',
      event.headers?.[HEADER_SLACK_RETRY_COUNT]
    );
    return {
      statusCode: 200,
      body: ''
    };
  }

  const body = getBody(event);
  console.info('type:', body.type);

  switch (body.type) {
    // Slack URL verification
    // https://api.slack.com/events/url_verification
    case 'url_verification':
      return {
        statusCode: 200,
        body: body.challenge
      };

    case 'event_callback':
      const targetName = process.env[ENV_TARGET_FUNCTION_NAME];
      if (!targetName) {
        console.error(`Environment variable ${ENV_TARGET_FUNCTION_NAME} is not set.`);
        return {
          statusCode: 500,
          body: ''
        };
      }

      console.info(`Invoke ${targetName}.`);
      const command = new InvokeCommand({
        FunctionName: targetName,
        InvocationType: 'Event',
        Payload: JSON.stringify(event)
      });
      const res = await new LambdaClient().send(command);
      console.info(`Result: ${JSON.stringify(res, null, 2)}`);

      return {
        statusCode: res.StatusCode ?? 500,
        body: ''
      };

    default:
      console.warn(`Unknown event type: ${body}`);
      return {
        statusCode: 200,
        body: ''
      };
  }
};

function getBody(event: {body?: string | undefined}): slack.EventBody {
  if (!event.body)
    throw new Error('Event body is undefined.');
  const obj = JSON.parse(event.body);
  return {
    ...obj,
    raw: event.body // Embed raw body
  };
}
