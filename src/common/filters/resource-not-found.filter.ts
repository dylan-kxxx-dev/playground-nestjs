import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ResourceNotFoundError } from '../exceptions/resource-not-found.error';

@Catch(ResourceNotFoundError)
export class ResourceNotFoundFilter implements ExceptionFilter {
    catch(exception: ResourceNotFoundError, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const notFoundStatus = HttpStatus.NOT_FOUND;

        response.status(notFoundStatus).json({
            error: {
                code: HttpStatus[notFoundStatus] || 'UNKNOWN_ERROR',
                message: [exception.message],
            },
        });
    }
}
