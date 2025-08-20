export const validateCreateUserProfile = jest.fn().mockReturnValue({ 
  isValid: true, 
  errors: [] 
});

export const validateUpdateUserProfile = jest.fn().mockReturnValue({ 
  isValid: true, 
  errors: [] 
});

export const normalizeEmail = jest.fn((email: string) => email.toLowerCase());

export const stripSensitiveFields = jest.fn((user: any) => {
  if (!user) return null;
  // Return a copy of the user object without sensitive fields
  const { passwordHash, mfaSecret, ...safe } = user;
  return {
    ...safe,
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImage: user.profileImage,
    timezone: user.timezone,
    preferences: user.preferences || {},
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    organization: user.organization,
    role: user.role
  };
});

export const sanitizeUserInput = jest.fn((input: any) => input);
