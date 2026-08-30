import { Global, Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { MailerService } from './mailer.service';

@Global()
@Module({
  providers: [QueueService, MailerService],
  exports: [QueueService, MailerService],
})
export class QueuesModule {}
