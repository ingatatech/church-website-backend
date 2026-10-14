import 'dotenv/config';
import { DataSource } from 'typeorm';
import { AdminUser } from '../app/modules/auth/entities/admin-user.entity';
import { Sermon } from '../app/modules/sermons/entities/sermon.entity';
import { ChurchEvent } from '../app/modules/events/entities/church-event.entity';
import { Ministry } from '../app/modules/ministries/entities/ministry.entity';
import { ContactInquiry } from '../app/modules/inquiries/entities/contact-inquiry.entity';
import { VisitorInquiry } from '../app/modules/inquiries/entities/visitor-inquiry.entity';
import { PrayerRequest } from '../app/modules/inquiries/entities/prayer-request.entity';
import { AuditLog } from '../app/modules/audit/entities/audit-log.entity';
import { ContentRecord } from '../app/modules/content/content.entity';
import { Submission } from '../app/modules/submissions/submission.entity';
import { InitialChurchSchema1760000000000 } from './migrations/1760000000000-InitialChurchSchema';
import { DropRoleColumns1791190000000 } from './migrations/1791190000000-DropRoleColumns';
import { CreateUsersTable1791200000000 } from './migrations/1791200000000-CreateUsersTable';
import { ExtendChurchEventDetails1791210000000 } from './migrations/1791210000000-ExtendChurchEventDetails';
import { ExtendSermonsAndAddSpeakers1791220000000 } from './migrations/1791220000000-ExtendSermonsAndAddSpeakers';
import { ExtendMinistryDetails1791230000000 } from './migrations/1791230000000-ExtendMinistryDetails';
import { AddUserRoles1791240000000 } from './migrations/1791240000000-AddUserRoles';
import { AddNestOutboxSchema1791250000000 } from './migrations/1791250000000-AddNestOutboxSchema';
import { Speaker } from '../app/modules/sermons/entities/speaker.entity';
import { User } from '../app/modules/users/entities/user.entity';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || undefined,
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER ?? 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  ssl:
    process.env.DATABASE_SSL_CONNECTION === 'true'
      ? { rejectUnauthorized: false }
      : false,
  entities: [
    AdminUser,
    User,
    Sermon,
    Speaker,
    ChurchEvent,
    Ministry,
    ContactInquiry,
    VisitorInquiry,
    PrayerRequest,
    AuditLog,
    ContentRecord,
    Submission,
  ],
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
  synchronize: false,
});
export default dataSource;
