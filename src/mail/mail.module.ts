import { DynamicModule, Module } from '@nestjs/common';
import { TemplateService } from './template.service';
import { MailService } from './mail.service';

export type MailModuleOptions = {
  transport: string;
  from: string;
  cache?: boolean;
  templateDir?: string;
};

export const MAIL_OPTS = Symbol('MAIL_OPTS');

@Module({})
export class MailModule {
  static forRoot(options: MailModuleOptions): DynamicModule {
    return {
      module: MailModule,
      providers: [
        { provide: MAIL_OPTS, useValue: options },
        TemplateService,
        MailService,
      ],
      exports: [MailService],
    };
  }
}
