import * as nodemailer from 'nodemailer';
import { TemplateService } from './template.service';
import { Inject } from '@nestjs/common';
import { MAIL_OPTS, MailModuleOptions } from './mail.token';

export type SendArgs = {
  to: string | string[];
  subject: string;
  template: string;
  vars?: Record<string, any>;
  cc?: string | string[];
  bcc?: string | string[];
};

export class MailService {
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor(
    @Inject(MAIL_OPTS) opts: MailModuleOptions,
    private templates: TemplateService,
  ) {
    this.from = opts.from;
    this.transporter = nodemailer.createTransport(opts.transport, {
      tls:
        process.env.NODE_ENV === 'development'
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }

  async verify() {
    return this.transporter.verify();
  }

  async send({ to, subject, template, vars = {}, cc, bcc }: SendArgs) {
    const { html, text } = this.templates.render(template, vars);
    return this.transporter.sendMail({
      from: this.from,
      to,
      cc,
      bcc,
      subject,
      html,
      text,
    });
  }

  async sendInvite(to: string, link: string) {
    return this.send({
      to,
      subject: 'Set up your password',
      template: 'invite',
      vars: { link },
    });
  }

  async sendReset(to: string, link: string) {
    return this.send({
      to,
      subject: 'Reset your password',
      template: 'reset',
      vars: { link },
    });
  }
}
