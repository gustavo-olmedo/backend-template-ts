import { Inject, Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { join, resolve } from 'path';
import glob from 'glob';
import { readFileSync } from 'fs';
import mjml2html from 'mjml';

import { MAIL_OPTS, MailModuleOptions } from './mail.module';

@Injectable()
export class TemplateService {
  private cache = new Map<string, Handlebars.TemplateDelegate>();
  private templateDir: string;
  private useCache: boolean;

  constructor(@Inject(MAIL_OPTS) opts: MailModuleOptions) {
    this.templateDir = opts.templateDir ?? resolve(__dirname, 'templates');
    this.useCache = opts.cache ?? process.env.NODE_ENV === 'production';

    // Register partials (all files under templates/partials)
    const partialsDirs = join(this.templateDir, 'partials');
    const partialFiles = glob.sync(`${partialsDirs}/**/*.mjml`);
    partialFiles.forEach((file) => {
      const name = file.replace(partialsDirs + '/', '').replace('.mjml', '');
      const content = readFileSync(file, 'utf8');
      Handlebars.registerPartial(name, content);
    });

    Handlebars.registerHelper('upper', (v: string) => (v ?? '').toUpperCase());
    Handlebars.registerHelper('fallback', (v: any, fb: any) => v ?? fb);
  }

  private loadTemplate(name: string): Handlebars.TemplateDelegate {
    if (this.useCache && this.cache.has(name)) return this.cache.get(name)!;

    const file = join(this.templateDir, `${name}.mjml`);
    const raw = readFileSync(file, 'utf8');

    // compile the MJML
    const hbs = Handlebars.compile(raw, { noEscape: true });
    if (this.useCache) this.cache.set(name, hbs);
    return hbs;
  }

  render(
    name: string,
    vars: Record<string, any>,
  ): { html: string; text?: string; subject?: string } {
    const hbs = this.loadTemplate(name);
    const mjmlFilled = hbs(vars);

    const { html, errors } = mjml2html(mjmlFilled, {
      keepComments: false,
      validationLevel: 'strict',
      minify: true,
    });

    if (errors?.length) {
      console.error('MJML errors:', errors);
    }

    const text = html
      .replace(/<\/?[^>]+(>|$)/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return { html, text };
  }
}
