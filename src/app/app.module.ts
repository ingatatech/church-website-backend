import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentModule } from './modules/content/content.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { ContentRecord } from './modules/content/content.entity';
import { Submission } from './modules/submissions/submission.entity';
import { DomainEventsSubscriber } from '../libs/pubsub/domain-events.subscriber';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        host: config.get<string>('POSTGRES_HOST', 'localhost'),
        port: config.get<number>('POSTGRES_PORT', 5432),
        username: config.get<string>('POSTGRES_USER', 'postgres'),
        password: config.get<string>('POSTGRES_PASSWORD'),
        database: config.get<string>('POSTGRES_DB'),
        ssl: config.get<string>('DATABASE_SSL_CONNECTION') === 'true' ? { rejectUnauthorized: false } : false,
        entities: [ContentRecord, Submission],
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        autoLoadEntities: true,
      }),
    }),
    ContentModule,
    SubmissionsModule,
  ],
  providers: [DomainEventsSubscriber],
})
export class AppModule {}
