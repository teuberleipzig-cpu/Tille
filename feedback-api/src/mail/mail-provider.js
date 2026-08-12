export class MailProvider { async send() { throw new Error('MailProvider must be implemented'); } }
export class UnconfiguredMailProvider extends MailProvider { async send() { throw new Error('SMTP mail provider is not configured'); } }
