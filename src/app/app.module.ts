import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MailModule, FileMailTransport, SmtpTransport } from '@nestjs/mail';
import { validateEnvironment } from '../database/config/validate-env';
import { InitialChurchSchema1760000000000 } from '../database/migrations/1760000000000-InitialChurchSchema';
import { DropRoleColumns1791190000000 } from '../database/migrations/1791190000000-DropRoleColumns';
import { CreateUsersTable1791200000000 } from '../database/migrations/1791200000000-CreateUsersTable';
import { ExtendChurchEventDetails1791210000000 } from '../database/migrations/1791210000000-ExtendChurchEventDetails';
import { ExtendSermonsAndAddSpeakers1791220000000 } from '../database/migrations/1791220000000-ExtendSermonsAndAddSpeakers';
import { ExtendMinistryDetails1791230000000 } from '../database/migrations/1791230000000-ExtendMinistryDetails';
import { AddUserRoles1791240000000 } from '../database/migrations/1791240000000-AddUserRoles';
import { AddNestOutboxSchema1791250000000 } from '../database/migrations/1791250000000-AddNestOutboxSchema';
import { PubSubModule } from '../libs/pubsub/pubsub.module';
import { CacheModule } from '../libs/cache/cache.module';
import { StorageModule } from '../libs/storage/storage.module';
import { RedisModule } from '../libs/redis/redis.module';
import { OtpModule } from '../libs/otp/otp.module';
import { JwtTokenModule } from '../libs/jwt/jwt-token.module';
import { I18nModule } from '../libs/i18n/i18n.module';
import { AuthModule } from './modules/auth/auth.module';
import { SermonsModule } from './modules/sermons/sermons.module';
import { EventsModule } from './modules/events/events.module';
import { MinistriesModule } from './modules/ministries/ministries.module';
import { InquiriesModule } from './modules/inquiries/inquiries.module';
import { AuditModule } from './modules/audit/audit.module';
import { ContentModule } from './modules/content/content.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { AdminManagementModule } from './modules/admin/admin-management.module';
import { DomainEventsSubscriber } from '../libs/pubsub/domain-events.subscriber';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    MailModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const transport =
          config.get<string>('MAIL_TRANSPORT') === 'smtp'
            ? new SmtpTransport({
                url: config.getOrThrow<string>('SMTP_URL'),
                pool: true,
                timeouts: {
                  connect: '8s',
                  greeting: '8s',
                  command: '8s',
                  data: '30s',
                },
              })
            : new FileMailTransport({
                directory: config.get<string>('MAIL_DIRECTORY', 'var/mail'),
              });
        return {
          transport,
          from: config.get<string>(
            'MAIL_FROM',
            'Church Website <no-reply@example.com>',
          ),
          retry: false,
        };
      },
    }),
    PubSubModule,
    RedisModule,
    OtpModule,
    JwtTokenModule,
    I18nModule,
    CacheModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.get<string>('DATABASE_URL') || undefined,
        host: config.get<string>('POSTGRES_HOST', 'localhost'),
        port: config.get<number>('POSTGRES_PORT', 5432),
        username: config.get<string>('POSTGRES_USER', 'postgres'),
        password: config.get<string>('POSTGRES_PASSWORD'),
        database: config.get<string>('POSTGRES_DB'),
        ssl:
          config.get<string>('DATABASE_SSL_CONNECTION') === 'true'
            ? { rejectUnauthorized: false }
            : false,
        // Keep startup schema changes opt-in; run reviewed migrations explicitly.
        synchronize: false,
        migrations: [
          InitialChurchSchema1760000000000,
          DropRoleColumns1791190000000,
          CreateUsersTable1791200000000,
          ExtendChurchEventDetails1791210000000,
          ExtendSermonsAndAddSpeakers1791220000000,
          ExtendMinistryDetails1791230000000,
          AddUserRoles1791240000000,
          AddNestOutboxSchema1791250000000,
        ],
        migrationsRun: config.get<string>('TYPEORM_MIGRATIONS_RUN') === 'true',
        autoLoadEntities: true,
      }),
    }),
    AuthModule,
    SermonsModule,
    EventsModule,
    MinistriesModule,
    InquiriesModule,
    AuditModule,
    StorageModule,
    ContentModule,
    SubmissionsModule,
    AdminManagementModule,
  ],
  providers: [
    DomainEventsSubscriber,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
