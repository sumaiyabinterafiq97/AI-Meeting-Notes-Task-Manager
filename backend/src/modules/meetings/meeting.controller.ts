import { Request, Response, NextFunction } from 'express';
import { meetingService } from './meeting.service';
import {
  CreateMeetingDto,
  UpdateMeetingDto,
  UploadTranscriptDto,
  MeetingListQuery,
} from './meeting.dto';
import { routeParam } from '../../utils/route-param';

export class MeetingController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const meeting = await meetingService.createMeeting(
        workspaceId,
        req.user!.id,
        req.body as CreateMeetingDto,
      );
      res.status(201).json(meeting);
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const result = await meetingService.listMeetings(
        workspaceId,
        req.query as MeetingListQuery,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const meetingId = routeParam(req.params.meetingId);
      const meeting = await meetingService.getMeeting(workspaceId, meetingId);
      res.status(200).json(meeting);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const meetingId = routeParam(req.params.meetingId);
      const meeting = await meetingService.updateMeeting(
        workspaceId,
        meetingId,
        req.body as UpdateMeetingDto,
      );
      res.status(200).json(meeting);
    } catch (error) {
      next(error);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const meetingId = routeParam(req.params.meetingId);
      await meetingService.deleteMeeting(workspaceId, meetingId, {
        userId: req.user!.id,
        role: req.workspace!.role,
      });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async uploadTranscript(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const meetingId = routeParam(req.params.meetingId);
      const result = await meetingService.uploadTranscript(
        workspaceId,
        meetingId,
        req.body as UploadTranscriptDto,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async reprocess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const meetingId = routeParam(req.params.meetingId);
      const result = await meetingService.reprocessMeeting(workspaceId, meetingId);
      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const meetingController = new MeetingController();
