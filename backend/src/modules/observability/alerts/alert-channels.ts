import { structuredLogger } from '../logging/structured-logger';
import type { Alert } from './alert.types';

export type AlertChannel = 'slack' | 'email' | 'log';

export interface AlertDeliveryResult {
  channel: AlertChannel;
  success: boolean;
  error?: string;
}

/**
 * Alert channel adapters — Slack webhook and email stubs for future integrations.
 * Never includes secrets in outbound payloads.
 */
export class AlertChannels {
  async sendSlack(alert: Alert, webhookUrl?: string): Promise<AlertDeliveryResult> {
    if (!webhookUrl) {
      structuredLogger.info(
        { component: 'alerts', channel: 'slack', alertType: alert.type },
        `[SLACK STUB] ${alert.message}`,
      );
      return { channel: 'slack', success: true };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `[${alert.severity.toUpperCase()}] ${alert.message}`,
          blocks: [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `*${alert.type}*\n${alert.message}` },
            },
          ],
        }),
      });

      return { channel: 'slack', success: response.ok };
    } catch (error) {
      return {
        channel: 'slack',
        success: false,
        error: error instanceof Error ? error.message : 'Slack delivery failed',
      };
    }
  }

  async sendEmail(alert: Alert, to?: string): Promise<AlertDeliveryResult> {
    structuredLogger.info(
      {
        component: 'alerts',
        channel: 'email',
        to: to ? '[configured]' : undefined,
        alertType: alert.type,
      },
      `[EMAIL STUB] ${alert.message}`,
    );
    return { channel: 'email', success: true };
  }

  async sendLog(alert: Alert): Promise<AlertDeliveryResult> {
    const level = alert.severity === 'critical' || alert.severity === 'high' ? 'error' : 'warn';
    structuredLogger[level](
      { component: 'alerts', alertType: alert.type, severity: alert.severity, workspaceId: alert.workspaceId },
      alert.message,
    );
    return { channel: 'log', success: true };
  }
}

export const alertChannels = new AlertChannels();
