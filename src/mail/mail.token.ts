export type MailModuleOptions = {
  transport: string;
  from: string;
  cache?: boolean;
  templateDir?: string;
};

export const MAIL_OPTS = Symbol('MAIL_OPTS');
