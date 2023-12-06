import {LambdaFunctionURLHandler} from 'aws-lambda';

import {Client as NotionClient} from '@notionhq/client';

import {getEnvironment} from './environment';
import {fetchParameters} from './parameters';
import * as notiondb from './notiondb';

import * as slack from './slack';

import {ors, orCase, orDefault} from './ors';
import {isText, toText} from './texts';

const env = getEnvironment(process.env);


export const handler: LambdaFunctionURLHandler = async (event, _context) => {
  console.debug('event:', JSON.stringify(event, null, 2));

  try {
    const body = getBody(event);
    switch (body.type) {
      // Slack URL verification
      // https://api.slack.com/events/url_verification
      // This should be filtered by invoke.ts
      case 'url_verification':
        return {
          statusCode: 200,
          body: body.challenge
        };
      case 'event_callback':
        const parameters =
          await fetchParameters({
            parameterStoreId: env.get('SLACK2NOTION_PARAMETER_STORE_ID')
          });
        const notion = getNotionClient({token: parameters.notion.token});
        await addTaskToNotion({
          notion,
          databaseId: parameters.notion.databaseId,
          data: body
        });
        return {
          statusCode: 200,
          body: ''
        };
      default:
        return {
          statusCode: 200,
          body: JSON.stringify('Hello from Lambda!'),
        };
    }
  } catch (e) {
    console.error(e);
  }
  const response = {
    statusCode: 200,
    body: JSON.stringify('Hello from Lambda!'),
  };
  return response;
}

function getBody(event: {body?: string | undefined}): slack.EventBody {
  if (!event.body)
    throw new Error('Event body is undefined.');
  const obj = JSON.parse(event.body);
  return {
    ...obj,
    raw: event.body // Embed raw body
  };
}

// async function searchDatabase() {
//   const notion = getNotionClient();
//   const response = await notion.search({
//     sort: {
//       direction: 'ascending',
//       timestamp: 'last_edited_time'
//     },
//   });
//   console.log(response);
// }

type Action =
  | {type: 'deleted', event: slack.MessageDeletedEvent}
  | {type: 'message-created', event: slack.MessageCreatedEvent}
  | {type: 'message-forwarded', event: slack.MessageCreatedEvent}
  | {type: 'file-shared', event: slack.MessageCreatedEvent}
;

function getAction(data: slack.CallbackEventBody): Action {
  const {event} = data;
  if ('subtype' in event && event.subtype === 'message_deleted')
    return {type: 'deleted', event};
  if ('files' in event && event.files)
    return {type: 'file-shared', event};
  if ('attachments' in event && event.attachments)
    return {type: 'message-forwarded', event};
  return {type: 'message-created', event: event as slack.MessageCreatedEvent};
}

async function addTaskToNotion({notion, databaseId, data}: {
  notion: NotionClient,
  databaseId: string,
  data: slack.CallbackEventBody
}) {
  const action = getAction(data);
  console.debug('action:', action);

  switch (action.type) {
    case 'deleted':
      return;
  }
  const {event} = action;

  const title = ors([
    orCase({
      input: event.text,
      pred: isText,
      output: toText({header: 3})
    }),
    orCase({
      input: (event.blocks ?? [])
               .flatMap(b => b.elements)
               .flatMap(e => e.elements)
               .flatMap(e => e.type === 'text' ? e.text : null)
               .join('\n'),
      pred: isText,
      output: toText({header: 3})
    }),
    orCase({
      input: (event.attachments ?? []).flatMap(a => a.text).join('\n'),
      pred: isText,
      output: toText({header: 3})
    }),
    orCase({
      input: (event.files ?? []).flatMap(f => f.title).join('\n'),
      pred: isText,
      output: toText({header: 3})
    }),
    orDefault('No title')
  ]);
  console.debug('title:', title);

  const children: notiondb.BlockAttributes[] = [
    // Text to paragraph
    isText(event.text) ? {
      type: 'paragraph' as const,
      children: [{
        type: 'text' as const,
        text: event.text
      }]
    } : null,

    // Blocks to paragraphs
    ...(event.blocks ?? [])
         .flatMap(b => b.elements)
         .flatMap(e => {
           const children = e.elements
             .map(e => e.type === 'text' ? e.text : JSON.stringify(e));
           return children.length === 0
             ? []
             : [{
               type: 'paragraph' as const,
               children: children.map(c => ({
                 type: 'text' as const,
                 text: c
               }))
             }];
          }),

    // Attachments to paragraphs
    ...(event.attachments ?? []).flatMap(showAttachment),

    // Files to upload
    ...(event.files ?? []).flatMap(showFile),,

    // Paste raw event data for debug
    {
      type: 'heading' as const,
      level: 3 as const,
      text: 'Event'
    },
    {
      type: 'code' as const,
      language: 'json' as const,
      text: JSON.stringify(JSON.parse(data.raw), null, 2)
    }
  ].flatMap(item => item ? [item] : []);

  console.debug('children:', JSON.stringify(children, null, 2));

  const responseCreated = await notion.pages.create(notiondb.makePage({
    databaseId,
    title,
    status: notiondb.Status.NotStarted,
  }));
  console.log('created:', JSON.stringify(responseCreated, null, 2));

  const pageId = responseCreated.id;
  const response = await notion.blocks.children.append({
    block_id: pageId,
    children: children.flatMap(notiondb.makeBlockChildren)
  });
  console.log('response:', response);
}

function showAttachment(attachment: slack.Attachment): notiondb.BlockAttributes[] {
  type Block = notiondb.BlockAttributes;
  type Child = notiondb.RichTextAttribute;
  return [
    ...ors([
      orCase({
        input: attachment.author_name,
        pred: isText,
        output: text => [{
          type: 'paragraph' as const,
          children: [{type: 'text' as const, text}]
        }]
      }),
      orDefault([])
    ]),
    ...(
      (attachment.message_blocks ?? [])
        .flatMap(b => b.message?.blocks ?? [])
        .flatMap(b => b.elements ?? [])
        .flatMap(e => {
          switch (e.type) {
            case 'rich_text_section':
              const children = e.elements.flatMap<slack.BlockElement, Child>(e => {
                switch (e.type) {
                  case 'text':
                    const text = toText({trim: 'both'})(e.text);
                    return isText(text) ? [{type: 'text' as const, text}] : [];
                  case 'link':
                    return [{type: 'link' as const, url: e.url}];
                  case 'user': // Omit user mention
                  case 'channel': // Omit channel mention
                    return []; // Omit mention
                  case 'emoji':
                    return [{
                      type: 'text' as const,
                      text: String.fromCodePoint(parseInt(e.unicode, 16))
                    }];
                  default:
                    console.warn('Unknown element of rich_text_section:', e);
                    return [];
                }
              });
              return children.length > 0 ? [{
                type: 'paragraph' as const,
                children
              } as Block] : [];
            case 'rich_text_preformatted':
              return e.elements.map<Block>(e => ({
                type: 'code' as const,
                text: e.text
              }));
            case 'rich_text_quote':
              return e.elements.map<Block>(e => ({
                type: 'code' as const,
                text: e.text
              }));
             default:
              console.warn('Unknown element of message_blocks:', e);
              return [];
          }
        })
    ),
    ...(attachment.files ?? []).flatMap(showFile),
    {type: 'heading' as const, level: 3, text: 'URL'},
    {type: 'bookmark' as const, url: attachment.from_url}
  ];
}

function showFile(file: slack.File): notiondb.BlockAttributes[] {
  console.debug('file:', JSON.stringify(file, null, 2));
  return [
    {
      type: 'bookmark' as const,
      url: file.url_private,
    },
    // TODO Support preview in HTML format
    ...(file.plain_text ?? '').split(/\r?\n/).flatMap(t => {
      const text = toText({trim: 'both'})(t);
      return isText(text) ? [{
        type: 'paragraph' as const,
        children: notiondb.richize(text)
      }] : [];
    }),
    // {
    //   type: 'embed' as const,
    //   url: file.url_private
    // },
  ]
}

/**
 * Get Notion client.
 * @see https://developers.notion.com/reference/intro
  */
function getNotionClient({token}: {token: string}): NotionClient {
  return new NotionClient({auth: token});
}


