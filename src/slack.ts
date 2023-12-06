interface TextElement {
  type: 'text';
  text: string;
}

interface LinkElement {
  type: 'link';
  url: string;
}

interface UserElement {
  type: 'user';
  user_id: string;
}

interface ChannelElement {
  type: 'channel';
  channel_id: string;
}

interface EmojiElement {
  type: 'emoji';
  name: string;
  unicode: string;
}

export type BlockElement =
  | TextElement
  | LinkElement
  | UserElement
  | ChannelElement
  | EmojiElement
;

interface RichTextSectionParagraph {
  type: 'rich_text_section';
  elements: Array<BlockElement>;
}

interface RichTextPreformattedParagraph {
  type: 'rich_text_preformatted';
  elements: Array<TextElement>;
}

interface RichTextQuoteParagraph {
  type: 'rich_text_quote';
  elements: Array<TextElement>;
}

type RichTextParagraph =
  | RichTextSectionParagraph
  | RichTextPreformattedParagraph
  | RichTextQuoteParagraph
;

interface Block {
  type: 'rich_text';
  block_id: string;
  elements: Array<RichTextParagraph>;
}

interface EmailAddress {
  address: string;
  name: string;
  original: string;
}

interface EmailHeaders {
  date: string;
  in_reply_to: string;
  reply_to: string;
  message_id: string;
}

export interface Attachment {
  ts: string; // 1701399614.629749

  channel_id: string;
  channel_team: string;

  is_msg_unfurl: boolean; // true
  is_reply_unfurl?: boolean; // false

  msg_subtype?: 'bot_message';

  message_blocks: Array<{
    team: string;
    channel: string;
    ts: string;
    message: {
      blocks: Array<Block>;
    };
  }>;
  files?: Array<File>;

  private_channel_prompt?: boolean; // true

  color: string; // D0D0D0
  from_url: string;
  is_share: boolean; // true

  fallback: string;
  text: string;

  author_id: string;
  author_name: string;
  author_link: string;
  author_icon: string;
  author_subname: string;

  mrkdwn_in: Array<string>;
  footer: string; // Slack の会話
}

export interface File {
  id: string;
  created: number;
  timestamp: number;
  name: string;
  title: string;

  mimetype: string;
  filetype: string; // email
  pretty_type: string; // Email from Slack for Gmail

  user: string;
  user_team?: string;
  username: string;

  editable: boolean;
  size: number;
  mode: string;

  is_external: boolean;
  external_type: string;

  is_public: boolean;
  public_url_shared: boolean;
  display_as_bot: boolean;

  url_private: string;
  url_private_download: string;

  permalink: string;
  permalink_public: string;

  comments_count?: number;
  shares?: {
    public: {
      [key: string]: {
        reply_users: Array<string>;
        reply_users_count: number;
        reply_count: number;
        ts: string;
      }
    }
  };
  channels?: Array<string>;
  groups?: Array<string>;
  ims?: Array<string>;
  has_more_shares?: boolean;

  app_id: string;
  app_name: string;

  has_more: boolean;

  sent_to_self: boolean;

  has_rich_preview: boolean;

  file_access: string;

  // Images
  media_display_type?: string;
  thumb_64?: string;
  thumb_80?: string;
  thumb_360?: string;
  thumb_360_w?: number;
  thumb_360_h?: number;
  thumb_480?: string;
  thumb_480_w?: number;
  thumb_480_h?: number;
  thumb_160?: string;
  thumb_720?: string;
  thumb_720_w?: number;
  thumb_720_h?: number;
  thumb_800?: string;
  thumb_800_w?: number;
  thumb_800_h?: number;
  thumb_960?: string;
  thumb_960_w?: number;
  thumb_960_h?: number;
  thumb_1024?: string;
  thumb_1024_w?: number;
  thumb_1024_h?: number;
  original_w?: number;
  original_h?: number;
  thumb_tiny?: string;

  // Email
  headers?: EmailHeaders;

  to: Array<EmailAddress>;
  from: Array<EmailAddress>;
  cc: Array<EmailAddress>;

  attachments: Array<unknown>;
  original_attachment_count: number;

  plain_text?: string;
  preview?: string;
  preview_plain_text?: string;
}

interface MessageEventBase {
  type: 'message';
  channel: string;
  event_ts: string;
  ts: string;
  channel_type: 'channel';
}

export interface MessageCreatedEvent extends MessageEventBase {
  text: string;
  user: string;
  client_msg_id?: string;
  display_as_bot?: boolean;

  blocks?: Array<Block>;

  attachments?: Array<Attachment>;

  files?: Array<File>;
  upload: boolean;

  team?: string;
}

export interface MessageDeletedEvent extends MessageEventBase {
  subtype: 'message_deleted';
  hidden: boolean;
  deleted_ts: string;
  previous_message: MessageCreatedEvent,
}

export type MessageEvent =
  | MessageCreatedEvent
  | MessageDeletedEvent
;

export interface ChallengeEventBody {
  type: 'url_verification';
  token: string;
  challenge: string;
}

export interface CallbackEventBody {
  type: 'event_callback';
  raw: string;
  api_app_id: string;
  team_id: string;
  context_team_id: string;
  context_enterprise_id: string | null;
  event_id: string;
  event_time: number;
  event_context: string;
  event: MessageEvent;
  token: string;
  authorizations: Array<{
    enterprise_id: string | null;
    team_id: string;
    user_id: string;
    is_bot: boolean;
    is_enterprise_install: boolean;
  }>;
  is_ext_shared_channel: boolean;
}

export type EventBody = ChallengeEventBody | CallbackEventBody;
