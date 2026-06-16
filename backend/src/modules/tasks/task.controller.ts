import { Request, Response, NextFunction } from 'express';
import { taskService } from './task.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskListQuery,
  BoardQuery,
  CreateCommentDto,
} from './task.dto';
import { routeParam } from '../../utils/route-param';

export class TaskController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const task = await taskService.createTask(workspaceId, req.user!.id, req.body as CreateTaskDto);
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const result = await taskService.listTasks(workspaceId, req.query as TaskListQuery);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async board(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const result = await taskService.getBoard(workspaceId, req.query as BoardQuery);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const taskId = routeParam(req.params.taskId);
      const task = await taskService.getTask(workspaceId, taskId);
      res.status(200).json(task);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const taskId = routeParam(req.params.taskId);
      const task = await taskService.updateTask(
        workspaceId,
        taskId,
        req.user!.id,
        req.body as UpdateTaskDto,
      );
      res.status(200).json(task);
    } catch (error) {
      next(error);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const taskId = routeParam(req.params.taskId);
      await taskService.deleteTask(workspaceId, taskId, {
        userId: req.user!.id,
        role: req.workspace!.role,
      });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async createComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const taskId = routeParam(req.params.taskId);
      const comment = await taskService.createComment(
        workspaceId,
        taskId,
        req.user!.id,
        req.body as CreateCommentDto,
      );
      res.status(201).json(comment);
    } catch (error) {
      next(error);
    }
  }

  async listComments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const taskId = routeParam(req.params.taskId);
      const result = await taskService.listComments(workspaceId, taskId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const taskController = new TaskController();
