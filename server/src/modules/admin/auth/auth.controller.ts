import { Request, Response } from 'express';
import * as authService from './auth.service';
import { recordAuditLog } from '../audit/audit.service';
import { safeErrorMessage } from '../users/validation';

export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body ?? {};
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Identifier and password are required' });
    }
    const data = await authService.loginAdmin(identifier, password);
    const profile = await authService
      .getProfileById(data.user.id)
      .catch(() => null);

    // Best-effort audit log (does not block login).
    void recordAuditLog({
      actorId: data.user.id,
      actorRole: 'admin',
      actorName: profile?.name_en ?? 'System Administrator',
      action: 'Admin login',
      module: 'Auth',
      targetId: data.user.id,
      targetType: 'admin',
      status: 'success',
      details: { email: profile?.email },
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    return res.status(200).json({
      success: true,
      message: 'Admin login successful',
      token: data.session?.access_token,
      user: data.user,
      profile,
    });
  } catch (error: any) {
    // Safe message: login failures are business-rule messages ("Invalid admin
    // credentials"); raw Supabase errors fall back to the generic text.
    return res.status(401).json({ message: safeErrorMessage(error, 'Admin login failed') });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const profile = await authService.getProfileById(req.user.id);
    return res.status(200).json({
      success: true,
      data: req.user,
      profile,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch admin profile' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { currentPassword, newPassword } = req.body ?? {};
    await authService.changeAdminPassword(currentPassword, newPassword);

    void recordAuditLog({
      actorId: req.user.id,
      actorRole: 'admin',
      action: 'Admin password changed',
      module: 'Auth',
      targetId: req.user.id,
      targetType: 'admin',
      status: 'success',
    });

    return res.status(200).json({ success: true, message: 'Admin password updated successfully' });
  } catch (error: any) {
    // Password-rule messages are ours; anything else is masked.
    return res.status(400).json({ message: safeErrorMessage(error, 'Failed to change admin password') });
  }
};

// Re-seeds the admin user on demand. Useful in dev / when the .env was
// just changed.
export const reseed = async (_req: Request, res: Response) => {
  try {
    const result = await authService.ensureAdminUser();
    return res.status(200).json({
      success: true,
      message: result.created
        ? 'Admin user created and seeded'
        : 'Admin user already exists; profile is up to date',
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to seed admin user' });
  }
};
