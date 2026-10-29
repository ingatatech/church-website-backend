import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { UsersService } from '../users/users.service';
import { InquiryRecord } from './entities/inquiry.entity';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: '/',
})
export class InquiriesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(InquiriesGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.debug(
          `Socket ${client.id} connected without token - guest session`,
        );
        return;
      }

      const secret = this.configService.get<string>(
        'JWT_SECRET',
        'secret-key-change-me-in-production',
      );

      const payload = await this.jwtService
        .verifyAsync<{ sub: string; email?: string }>(token, { secret })
        .catch(() => null);

      if (!payload || !payload.sub) {
        this.logger.debug(`Socket ${client.id} provided invalid/expired token`);
        return;
      }

      const user = await this.usersService.findById(payload.sub);
      if (user && user.role === 'admin' && user.status === 'active') {
        await client.join('admin-inquiries');
        client.data.user = { id: user.id, email: user.email, role: user.role };
        this.logger.log(
          `[WebSocket] Admin ${user.email} joined admin-inquiries room (${client.id})`,
        );
        client.emit('connected', {
          status: 'authenticated',
          role: 'admin',
          room: 'admin-inquiries',
        });
      } else {
        this.logger.debug(
          `Socket ${client.id} authenticated but not an active administrator`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Socket connection auth error for ${client.id}: ${(err as Error).message}`,
      );
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket ${client.id} disconnected`);
  }

  private extractToken(client: Socket): string | null {
    if (client.handshake.auth?.token) {
      return String(client.handshake.auth.token).replace(/^Bearer\s+/i, '');
    }
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader) {
      return String(authHeader).replace(/^Bearer\s+/i, '');
    }
    const cookieHeader = client.handshake.headers?.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/access_token=([^;]+)/);
      if (match) return decodeURIComponent(match[1]);
    }
    return null;
  }

  emitInquiryCreated(type: string, inquiry: InquiryRecord) {
    const payload = {
      id: inquiry.id,
      type,
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      message: inquiry.message,
      status: inquiry.status,
      createdAt: inquiry.createdAt,
    };

    const notification = {
      id: crypto.randomUUID(),
      inquiryId: inquiry.id,
      inquiryType: type,
      title: `New ${
        type === 'prayer'
          ? 'Prayer Request'
          : type === 'visitor'
          ? 'Visitor Inquiry'
          : 'Contact Message'
      }`,
      senderName: inquiry.name,
      message: inquiry.message.slice(0, 140),
      createdAt: new Date().toISOString(),
      read: false,
    };

    if (this.server) {
      this.server.to('admin-inquiries').emit('inquiry.created', payload);
      this.server.to('admin-inquiries').emit('notification.created', notification);
      this.logger.log(
        `[WebSocket] Broadcasted inquiry.created and notification.created for ${type}/${inquiry.id}`,
      );
    }
  }

  emitStatusChanged(
    type: string,
    id: string,
    status: string,
    previousStatus: string,
  ) {
    const payload = {
      id,
      type,
      status,
      previousStatus,
      updatedAt: new Date().toISOString(),
    };

    if (this.server) {
      this.server.to('admin-inquiries').emit('inquiry.status_changed', payload);
      this.logger.log(
        `[WebSocket] Broadcasted inquiry.status_changed for ${type}/${id}: ${previousStatus} -> ${status}`,
      );
    }
  }

  emitReplyCreated(
    type: string,
    id: string,
    reply: string,
    repliedAt: Date,
    status: string,
  ) {
    const payload = {
      id,
      type,
      reply,
      repliedAt: repliedAt.toISOString(),
      status,
    };

    if (this.server) {
      this.server.to('admin-inquiries').emit('inquiry.reply_created', payload);
      this.logger.log(
        `[WebSocket] Broadcasted inquiry.reply_created for ${type}/${id}`,
      );
    }
  }
}

