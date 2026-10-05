export interface Environment {
  NODE_ENV: string;
  APP_PORT: number;
  DATABASE_URL?: string;
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
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
  const redisPort = Number(values.REDIS_PORT ?? 6379);
  if (
    !Number.isInteger(databasePort) ||
    databasePort < 1 ||
    databasePort > 65535
  )
    throw new Error('POSTGRES_PORT must be a valid TCP port');
  if (!Number.isInteger(redisPort) || redisPort < 1 || redisPort > 65535)
    throw new Error('REDIS_PORT must be a valid TCP port');
  if (!values.DATABASE_URL && !values.POSTGRES_DB)
    throw new Error('Configure DATABASE_URL or POSTGRES_DB in the environment');
  return {
    NODE_ENV: environment,
    APP_PORT: port,
    DATABASE_URL: values.DATABASE_URL ? String(values.DATABASE_URL) : undefined,
    POSTGRES_HOST: String(values.POSTGRES_HOST ?? 'localhost'),
    POSTGRES_PORT: databasePort,
    POSTGRES_USER: String(values.POSTGRES_USER ?? 'postgres'),
    POSTGRES_PASSWORD: String(values.POSTGRES_PASSWORD ?? ''),
    POSTGRES_DB: String(values.POSTGRES_DB ?? ''),
    JWT_SECRET: secret,
    JWT_EXPIRES_IN: String(values.JWT_EXPIRES_IN ?? '1h'),
    REDIS_HOST: String(values.REDIS_HOST ?? 'localhost'),
    REDIS_PORT: redisPort,
    REDIS_PASSWORD: values.REDIS_PASSWORD
      ? String(values.REDIS_PASSWORD)
      : undefined,
  };
}
