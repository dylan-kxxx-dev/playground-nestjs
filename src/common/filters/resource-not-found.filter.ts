import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { ResourceNotFoundError } from '../exceptions/resource-not-found.error';

@Catch(ResourceNotFoundError)
export class ResourceNotFoundFilter implements ExceptionFilter {
    catch(exception: ResourceNotFoundError, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();
        response.status(HttpStatus.NOT_FOUND).json({
            timestamp: new Date().toISOString(),
            statusCode: HttpStatus.NOT_FOUND,
            path: request.url,
            message: exception.message,
        });
    }
}
