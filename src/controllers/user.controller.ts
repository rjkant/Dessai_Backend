import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { AppError } from '../utils/app-error.util';
import {
  CreateUserProfileRequest,
  UpdateUserProfileRequest,
  UserSearchOptions,
  UserPreferences
} from '../types/user.types';

export class UserController {
  constructor(private userService: UserService) {}

  /**
   * Create a new user profile
   */
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userData: CreateUserProfileRequest = req.body;
      
      const user = await this.userService.createProfile(userData);
      
      res.status(201).json({
        success: true,
        message: 'User profile created successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const user = await this.userService.getProfileById(id);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user profile by email
   */
  async getUserByEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.params;
      
      const user = await this.userService.getProfileByEmail(email);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateUserProfileRequest = req.body;
      
      const user = await this.userService.updateProfile(id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'User profile updated successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user profile (soft delete)
   */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      await this.userService.deleteProfile(id);
      
      res.status(200).json({
        success: true,
        message: 'User profile deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search users with filters
   */
  async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const searchOptions: UserSearchOptions = {};
      
      if (req.query['search']) {
        searchOptions.search = req.query['search'] as string;
      }
      if (req.query['organizationId']) {
        searchOptions.organizationId = req.query['organizationId'] as string;
      }
      if (req.query['roleId']) {
        searchOptions.roleId = req.query['roleId'] as string;
      }
      if (req.query['isActive'] !== undefined) {
        searchOptions.isActive = req.query['isActive'] === 'true';
      }
      if (req.query['emailVerified'] !== undefined) {
        searchOptions.emailVerified = req.query['emailVerified'] === 'true';
      }
      
      searchOptions.page = req.query['page'] ? parseInt(req.query['page'] as string) : 1;
      searchOptions.limit = req.query['limit'] ? parseInt(req.query['limit'] as string) : 10;
      searchOptions.sortBy = (req.query['sortBy'] as 'name' | 'email' | 'createdAt' | 'lastLoginAt') || 'createdAt';
      searchOptions.sortOrder = (req.query['sortOrder'] as 'asc' | 'desc') || 'desc';
      
      const result = await this.userService.searchUsers(searchOptions);
      
      res.status(200).json({
        success: true,
        data: result.users,
        pagination: {
          page: result.pagination.page,
          limit: result.pagination.limit,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
          hasNext: result.pagination.hasNext,
          hasPrev: result.pagination.hasPrev
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const user = await this.userService.getProfileById(id);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      res.status(200).json({
        success: true,
        data: user.preferences
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const preferences: Partial<UserPreferences> = req.body;
      
      const user = await this.userService.updatePreferences(id, preferences);
      
      res.status(200).json({
        success: true,
        message: 'User preferences updated successfully',
        data: user.preferences
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify user email
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const user = await this.userService.verifyEmail(id);
      
      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user activity log
   */
  async getUserActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const activities = await this.userService.getUserActivity(id);
      
      res.status(200).json({
        success: true,
        data: activities
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile (authenticated user)
   */
  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Assuming user ID is available in req.user from auth middleware
      const userId = (req as any).user?.id;
      
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }
      
      const user = await this.userService.getProfileById(userId);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update current user profile (authenticated user)
   */
  async updateCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }
      
      const updateData: UpdateUserProfileRequest = req.body;
      
      const user = await this.userService.updateProfile(userId, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
}
