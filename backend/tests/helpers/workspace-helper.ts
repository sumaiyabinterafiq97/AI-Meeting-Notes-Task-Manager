import { api } from '../setup';
import { testUser } from './auth-helper';
import { workspaceRepository } from '../../src/modules/workspaces/workspace.repository';
import { generateOpaqueToken, hashToken } from '../../src/lib/token';

export const workspacePayload = {
  name: 'Engineering Team',
  description: 'Core product engineering workspace',
};

export async function registerAndLogin(user = testUser) {
  const register = await api.post('/api/v1/auth/register').send(user);
  return {
    accessToken: register.body.accessToken as string,
    user: register.body.user as { id: string; email: string; displayName: string },
  };
}

export async function createWorkspace(accessToken: string, payload = workspacePayload) {
  return api
    .post('/api/v1/workspaces')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(payload);
}

export async function seedInvitation(
  ownerId: string,
  workspaceId: string,
  email: string,
): Promise<string> {
  const rawToken = generateOpaqueToken();
  await workspaceRepository.createInvitation({
    workspaceId,
    email: email.toLowerCase(),
    role: 'MEMBER',
    tokenHash: hashToken(rawToken),
    invitedById: ownerId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  return rawToken;
}
