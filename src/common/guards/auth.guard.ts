import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();

        /**
         * - 역할을 클라이언트 헤더에서 그대로 받음 → 누구나 admin 자칭 가능, 실서비스 금지
         * - 11단계 Configuration에서 환경변수 + timingSafeEqual로 교체 예정 (state 이월 항목)
         */
        if (!request.headers['x-api-key']) {
            throw new UnauthorizedException('x-api-key header required');
        }

        const raw = request.headers['x-roles'];
        request.user = {
            roles: raw
                ? Array.isArray(raw)
                    ? raw.map((s) => s.trim())
                    : raw.split(',').map((s) => s.trim())
                : [],
        };

        return true;
    }
}
