declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        id: string;
        email: string;
        token?: string;
      };
      workspace?: {
        id: string;
        role: 'OWNER' | 'MEMBER';
        membershipId: string;
      };
    }
  }
}

export {};
