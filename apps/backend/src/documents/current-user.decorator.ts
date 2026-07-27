import { BadRequestException, ExecutionContext, createParamDecorator } from '@nestjs/common';
import { USER_ID_HEADER } from '@ajaia/shared';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ headers: Record<string, unknown> }>();
    const raw = request.headers[USER_ID_HEADER.toLowerCase()];
    if (typeof raw !== 'string' || raw.length === 0) {
      throw new BadRequestException(`Missing ${USER_ID_HEADER} header`);
    }
    if (!UUID_RE.test(raw)) {
      throw new BadRequestException(`Invalid ${USER_ID_HEADER} header`);
    }
    return raw;
  },
);
