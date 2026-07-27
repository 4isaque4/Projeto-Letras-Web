import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<{ method: string; url: string }>();
    const response = ctx.getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : undefined;

    const details =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as Record<string, unknown>)
        : { message: exceptionResponse };

    const message =
      (details?.message as string | string[] | undefined) ??
      (exception instanceof Error ? exception.message : 'Unexpected error');

    const normalizedMessage = Array.isArray(message) ? message.join('; ') : message;

    this.logger.error(
      `${request.method} ${request.url} -> ${status} :: ${normalizedMessage}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      error: {
        statusCode: status,
        message: normalizedMessage,
        details,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
