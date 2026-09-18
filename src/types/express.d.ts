import { AuthUser } from '../common/types/auth-user';

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

export {};
