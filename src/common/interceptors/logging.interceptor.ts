import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const now = Date.now();
        console.log(`Before... ${context.getClass().name} ${context.getHandler().name}`);
        return next
            .handle()
            .pipe(
                tap(() =>
                    console.log(
                        `After... ${Date.now() - now}ms ${context.getClass().name} ${context.getHandler().name}`,
                    ),
                ),
            );
    }
}
