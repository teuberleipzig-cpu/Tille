export class CaptchaProvider { async verify() { throw new Error('verify must be implemented'); } }
export class DisabledCaptchaProvider extends CaptchaProvider { async verify() { return true; } }
