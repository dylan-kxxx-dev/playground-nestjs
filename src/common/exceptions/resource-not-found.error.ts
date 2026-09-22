export class ResourceNotFoundError extends Error {
    constructor(readonly resource: string) {
        super(`${resource} not found`);
        this.name = 'ResourceNotFoundError';
    }
}
