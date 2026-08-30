import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import {
  createActivitySchema,
  createGroupSchema,
  createPostSchema,
  reactSchema,
  type CreateGroupInput,
} from '@yugo/shared';
import { CommunityService } from './community.service';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const commentSchema = z.object({ body: z.string().trim().min(1).max(600) });
const manageSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(['EXPEL', 'MUTE', 'UNMUTE', 'PROMOTE_MODERATOR']),
});

@Controller('community')
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get('groups/mine')
  myGroups(@CurrentUser() user: AuthUser) {
    return this.community.myGroups(user.id);
  }

  @Get('groups/suggested')
  suggested(@CurrentUser() user: AuthUser) {
    return this.community.suggestedGroups(user.id);
  }

  @Post('groups')
  createGroup(@CurrentUser() user: AuthUser, @Body(new ZodPipe(createGroupSchema)) body: CreateGroupInput) {
    return this.community.createGroup(user.id, body);
  }

  @Get('groups/:id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.community.groupDetail(id, user.id);
  }

  @Post('groups/:id/join')
  join(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.community.joinGroup(user.id, id);
  }

  @Post('posts')
  createPost(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(createPostSchema))
    body: { groupId: string; body: string; isPrayerRequest?: boolean; imageKey?: string },
  ) {
    return this.community.createPost(
      user.id,
      body.groupId,
      body.body,
      body.isPrayerRequest ?? false,
      body.imageKey,
    );
  }

  @Post('posts/react')
  react(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(reactSchema)) body: { postId: string; type: 'AMEN' | 'PRAYING' | 'LIKE' },
  ) {
    return this.community.react(user.id, body.postId, body.type);
  }

  @Put('posts/:id/answered')
  answered(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.community.markPrayerAnswered(user.id, id);
  }

  @Post('posts/:id/comments')
  comment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(commentSchema)) body: { body: string },
  ) {
    return this.community.comment(user.id, id, body.body);
  }

  @Post('activities')
  createActivity(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(createActivitySchema))
    body: { groupId: string; title: string; startsAt: Date; place?: string },
  ) {
    return this.community.createActivity(user.id, body);
  }

  @Post('activities/:id/attend')
  attend(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.community.attendActivity(user.id, id);
  }

  @Post('groups/:id/members/manage')
  manage(
    @CurrentUser() user: AuthUser,
    @Param('id') groupId: string,
    @Body(new ZodPipe(manageSchema)) body: z.infer<typeof manageSchema>,
  ) {
    return this.community.manageMember(user.id, groupId, body.userId, body.action);
  }
}
