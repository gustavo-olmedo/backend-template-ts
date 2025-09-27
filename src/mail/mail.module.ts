import { DynamicModule, Global, Module } from '@nestjs/common';
import { TemplateService } from './template.service';
import { MailService } from './mail.service';
import { MAIL_OPTS, MailModuleOptions } from './mail.token';

@Global()
@Module({})
export class MailModule {
  static forRoot(options: MailModuleOptions): DynamicModule {
    return {
      global: true,
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
