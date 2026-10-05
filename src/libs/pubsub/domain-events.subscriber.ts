import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class DomainEventsSubscriber {
  private readonly logger = new Logger(DomainEventsSubscriber.name);

  @OnEvent('content.created')
  onContentCreated(event: { id: string; type: string }) {
    this.logger.log(`Content created: ${event.type}/${event.id}`);
  }

  @OnEvent('content.updated')
  onContentUpdated(event: { id: string; type: string }) {
    this.logger.log(`Content updated: ${event.type}/${event.id}`);
  }

  @OnEvent('content.deleted')
  onContentDeleted(event: { id: string; type: string }) {
    this.logger.log(`Content deleted: ${event.type}/${event.id}`);
  }

  @OnEvent('submission.created')
  onSubmissionCreated(event: { id: string; type: string }) {
    // Deliberately omit names, messages, and email addresses from logs.
    this.logger.log(`Visitor submission received: ${event.type}/${event.id}`);
  }
}
