import {
  CreatePageParameters,
  BlockObjectRequest,
} from '@notionhq/client/build/src/api-endpoints';

import {truncate} from './texts';

type Filter<T, U> = T extends U ? T : never;

type RichTextItemRequest =
  Filter<CreatePageParameters['properties'][string], {rich_text: unknown}>['rich_text'][number];

type LanguageRequest =
  Filter<BlockObjectRequest, {type?: 'code'}>['code']['language'];

// Default fields
const COL_TITLE_NAME = 'title';

// Custom fields
const COL_STATUS_NAME = 'Status';

interface TextAttribute {
  type: 'text';
  text: string;
}

interface LinkAttribute {
  type: 'link';
  url: string;
}

interface CodeAttribute {
  type: 'code';
  text: string;
  language?: LanguageRequest;
}

export type RichTextAttribute =
  | TextAttribute
  | LinkAttribute
  | CodeAttribute
;

interface PageAttributes {
  databaseId: string;
  title: string;
  status: 'Not started' | 'In progress' | 'Done';
}

interface ParagraphAttribute {
  type: 'paragraph';
  children: RichTextAttribute[];
}

interface BookmarkAttribute {
  type: 'bookmark';
  url: string;
}

interface FileAttribute {
  type: 'file';
  url: string;
  caption: string;
}

interface EmbedAttribute {
  type: 'embed';
  url: string;
}

interface HeadingAttribute {
  type: 'heading';
  level: 1 | 2 | 3;
  text: string;
  isToggleable?: boolean;
}

export type BlockAttributes =
  | ParagraphAttribute
  | BookmarkAttribute
  | CodeAttribute
  | FileAttribute
  | EmbedAttribute
  | HeadingAttribute
;

export const Status = {
  get NotStarted() { return 'Not started' as const; },
  get InProgress() { return 'In progress' as const; },
  get Done() { return 'Done' as const; }
};

export function makeBlockChildren(attr: BlockAttributes): BlockObjectRequest[] {
  switch (attr.type) {

    case 'bookmark':
      return [{
        type: 'bookmark',
        bookmark: {
          url: attr.url
        }
      }];


    case 'code':
      return [{
        type: 'code',
        code: {
          language: attr.language ?? 'plain text',
          rich_text: [{
            type: 'text',
            text: {
              content: truncate(attr.text, 2000),
            },
          }],
        }
      }];

    case 'embed':
      // https://developers.notion.com/reference/block#embed
      return [{
        type: 'embed',
        embed: {
          url: attr.url
        }
      }];

    case 'file':
      // https://developers.notion.com/reference/block#file
      return [{
        type: 'file',
        file: {
          caption: [{
            type: 'text',
            text: {
              content: attr.caption
            }
          }],
          type: 'external',
          external: {
            url: attr.url
          }
        }
      }];

    case 'heading':
      // https://developers.notion.com/reference/block#headings
      const content = {
        rich_text: toRichText({
          type: 'text',
          text: attr.text
        }),
        is_toggleable: attr.isToggleable ?? false
      };
      switch (attr.level) {
        case 1:
          return [{
            type: 'heading_1',
            heading_1: content
          }];
        case 2:
          return [{
            type: 'heading_2',
            heading_2: content
          }];
        case 3:
          return [{
            type: 'heading_3',
            heading_3: content
          }];
      }

    case 'paragraph':
      return attr.children.length > 0 ? [{
        type: 'paragraph',
        paragraph: {
          rich_text: attr.children.flatMap(toRichText)
        }
      }] : [];
  }
}

export function makePage(attr: PageAttributes): CreatePageParameters {
  return {
    parent: {
      database_id: attr.databaseId
    },
    properties: {
      [COL_TITLE_NAME]: {
        title: [
          {
            text: {
              content: attr.title
            }
          }
        ]
      },
      // [COL_DESCRIPTION_NAME]: { // Rich-Text property
      //   rich_text: attr.description.flatMap(toRichText)
      // },
      [COL_STATUS_NAME]: { // Status property
        status: {
          name: attr.status
        }
      }
    }
  };
}

function toRichText(attr: RichTextAttribute): RichTextItemRequest[] {
  switch (attr.type) {
    case 'text':
      return [{
        type: 'text',
        text: {
          content: attr.text,
          link: null
        }
      }];
    case 'code':
      return [{
        type: 'text',
        text: {
          content: truncate(attr.text, 2000),
          link: null
        },
        annotations: {
          code: true
        }
      }];
    case 'link':
      return [{
        type: 'text',
        text: {
          content: attr.url,
          link: {
            url: attr.url
          }
        },
      }]
  }
}

export function richize(text: string): RichTextAttribute[] {
  // Replace links starting with http(s)://
  // aaaa http//example.com bbbb
  // => aaaa <http//example.com> bbbb
  const linkRegex =
    /(?<before>[^\s]*)(?<url>https?:\/\/[\w/:%#\$&\?\(\)~\.=\+\-]+)(?<after>[^\s]*)/g;
  const richTexts: RichTextAttribute[] = [];
  let match: RegExpExecArray | null;
  while (match = linkRegex.exec(text)) {
    if (!match.groups) break;
    const {before, url, after} = match.groups;
    richTexts.push(
      {type: 'text', text: before},
      {type: 'link', url}
    );
    text = after;
  }
  richTexts.push({type: 'text', text});
  return richTexts;
}

