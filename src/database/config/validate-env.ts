export interface Environment {
  NODE_ENV: string;
  CORS_ORIGINS: string;
  APP_PORT: number;
  CLOUDINARY_URL: string;
  CLOUDINARY_DELIVERY_HOST?: string;
  DATABASE_URL?: string;
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  MAIL_TRANSPORT: 'file' | 'smtp' | 'resend' | 'sendgrid';
  MAIL_FROM?: string;
  MAIL_DIRECTORY: string;
  SMTP_URL?: string;
  RESEND_API_KEY?: string;
  SENDGRID_API_KEY?: string;
}
export function validateEnvironment(
  values: Record<string, unknown>,
): Environment {
  const environment = String(values.NODE_ENV ?? 'local');
  const secret = String(
    values.JWT_SECRET ?? 'local-development-only-secret-change-me',
  );
  if (
    environment === 'production' &&
    (secret.length < 32 || secret.includes('development-only'))
  )
    throw new Error(
      'Production requires a JWT_SECRET with at least 32 characters',
    );
  const port = Number(values.APP_PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('APP_PORT must be a valid TCP port');
  const databasePort = Number(values.POSTGRES_PORT ?? 5432);
  if (
    !Number.isInteger(databasePort) ||
    databasePort < 1 ||
    databasePort > 65535
  )
    throw new Error('POSTGRES_PORT must be a valid TCP port');
  if (!values.DATABASE_URL && !values.POSTGRES_DB)
    throw new Error('Configure DATABASE_URL or POSTGRES_DB in the environment');
  if (!values.CLOUDINARY_URL)
    throw new Error('Configure CLOUDINARY_URL for required Cloudinary media storage');
  const sendgridApiKey = values.SENDGRID_API_KEY
    ? String(values.SENDGRID_API_KEY).trim()
    : undefined;
  const resendApiKey = values.RESEND_API_KEY
    ? String(values.RESEND_API_KEY).trim()
    : undefined;
  const mailTransport = String(
    values.MAIL_TRANSPORT ??
      (sendgridApiKey
        ? 'sendgrid'
        : resendApiKey
          ? 'resend'
          : environment === 'production'
            ? 'smtp'
            : 'file'),
  );
  if (
    mailTransport !== 'file' &&
    mailTransport !== 'smtp' &&
    mailTransport !== 'resend' &&
    mailTransport !== 'sendgrid'
  )
    throw new Error('MAIL_TRANSPORT must be either "file", "smtp", "resend", or "sendgrid"');
  const smtpUrl = values.SMTP_URL ? String(values.SMTP_URL).trim() : undefined;
  const defaultMailFrom =
    mailTransport === 'sendgrid'
      ? 'Gilbert nshimyimana <gilbertnshimyimana130@gmail.com>'
      : mailTransport === 'resend'
        ? 'Church Portal <onboarding@resend.dev>'
        : undefined;
  const mailFrom = values.MAIL_FROM
    ? String(values.MAIL_FROM).trim()
    : defaultMailFrom;
  if (mailTransport === 'sendgrid' && !sendgridApiKey)
    throw new Error('Configure SENDGRID_API_KEY when MAIL_TRANSPORT=sendgrid');
  if (mailTransport === 'resend' && !resendApiKey)
    throw new Error('Configure RESEND_API_KEY when MAIL_TRANSPORT=resend');
  if (mailTransport === 'smtp' && !smtpUrl)
    throw new Error('Configure SMTP_URL when MAIL_TRANSPORT=smtp');
  if (mailTransport === 'smtp' && !mailFrom)
    throw new Error('Configure MAIL_FROM when MAIL_TRANSPORT=smtp');
  if (
    environment === 'production' &&
    mailTransport !== 'smtp' &&
    mailTransport !== 'resend' &&
    mailTransport !== 'sendgrid'
  )
    throw new Error('Production must use a valid cloud mail transport (sendgrid, resend, or smtp)');
  if (environment === 'production' && !mailFrom)
    throw new Error('Configure MAIL_FROM in production');
  return {
    NODE_ENV: environment,
    CORS_ORIGINS: String(values.CORS_ORIGINS ?? ''),
    APP_PORT: port,
    CLOUDINARY_URL: String(values.CLOUDINARY_URL),
    CLOUDINARY_DELIVERY_HOST: values.CLOUDINARY_DELIVERY_HOST
      ? String(values.CLOUDINARY_DELIVERY_HOST).trim().toLowerCase()
      : undefined,
    DATABASE_URL: values.DATABASE_URL ? String(values.DATABASE_URL) : undefined,
    POSTGRES_HOST: String(values.POSTGRES_HOST ?? 'localhost'),
    POSTGRES_PORT: databasePort,
    POSTGRES_USER: String(values.POSTGRES_USER ?? 'postgres'),
    POSTGRES_PASSWORD: String(values.POSTGRES_PASSWORD ?? ''),
    POSTGRES_DB: String(values.POSTGRES_DB ?? ''),
    JWT_SECRET: secret,
    JWT_EXPIRES_IN: String(values.JWT_EXPIRES_IN ?? '1h'),
    MAIL_TRANSPORT: mailTransport as 'file' | 'smtp' | 'resend' | 'sendgrid',
    MAIL_FROM: mailFrom,
    MAIL_DIRECTORY: String(values.MAIL_DIRECTORY ?? 'var/mail'),
    SMTP_URL: smtpUrl,
    RESEND_API_KEY: resendApiKey,
    SENDGRID_API_KEY: sendgridApiKey,
  };
}
