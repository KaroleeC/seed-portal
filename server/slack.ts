import { WebClient } from "@slack/web-api";
import { logger } from './logger';

const slackLogger = logger.child({ module: 'slack' });

// Use Slack Bot Token
if (!process.env.SLACK_BOT_TOKEN) {
  throw new Error("SLACK_BOT_TOKEN environment variable must be set");
}

if (!process.env.SLACK_PA_CHANNEL_ID) {
  throw new Error("SLACK_PA_CHANNEL_ID environment variable must be set");
}

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

/**
 * Sends a structured message to a Slack channel using the Slack Web API
 * @param message - Message content and configuration
 * @returns Promise resolving to the sent message's timestamp
 */
export async function sendSlackMessage(
  message: {
    text?: string;
    blocks?: any[];
    channel?: string;
    attachments?: any[];
  }
): Promise<string | undefined> {
  try {
    const channel = message.channel || process.env.SLACK_PA_CHANNEL_ID;
    
    // Send the message
    const response = await slack.chat.postMessage({
      channel,
      text: message.text,
      blocks: message.blocks,
      attachments: message.attachments
    });

    slackLogger.info({ channel, ts: response.ts }, 'Slack message sent');
    return response.ts;
  } catch (error) {
    slackLogger.error({ error }, 'Error sending Slack message');
    throw error;
  }
}

/**
 * Send alert for system errors
 */
export async function sendSystemAlert(
  title: string,
  description: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  channel?: string
): Promise<void> {
  const severityColors = {
    low: '#36C5F0',      // Blue
    medium: '#ECB22E',   // Yellow  
    high: '#E01E5A',     // Red
    critical: '#FF0000'  // Bright Red
  };

  const severityEmojis = {
    low: ':information_source:',
    medium: ':warning:',
    high: ':rotating_light:',
    critical: ':fire:'
  };

  try {
    await sendSlackMessage({
      channel: channel,  // Use custom channel if provided
      text: `${severityEmojis[severity]} ${title}`,
      attachments: [
        {
          color: severityColors[severity],
          fields: [
            {
              title: 'Severity',
              value: severity.toUpperCase(),
              short: true
            },
            {
              title: 'Timestamp',
              value: new Date().toISOString(),
              short: true
            },
            {
              title: 'Description',
              value: description,
              short: false
            }
          ]
        }
      ]
    });
  } catch (error) {
    slackLogger.error({ error, title, description, severity }, 'Failed to send system alert');
  }
}

/**
 * Send BullMQ job failure alert
 */
export async function sendJobFailureAlert(
  jobName: string,
  failureCount: number,
  timeWindow: string,
  errors: string[]
): Promise<void> {
  try {
    await sendSlackMessage({
      text: `:rotating_light: BullMQ Job Failures Detected`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🚨 BullMQ Alert: ${jobName} Failures`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Failed Jobs:* ${failureCount}`
            },
            {
              type: 'mrkdwn',
              text: `*Time Window:* ${timeWindow}`
            },
            {
              type: 'mrkdwn',
              text: `*Queue:* ${jobName}`
            },
            {
              type: 'mrkdwn',
              text: `*Timestamp:* ${new Date().toISOString()}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Recent Errors:*\n${errors.slice(0, 3).map(e => `• ${e}`).join('\n')}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Queue Metrics'
              },
              url: `${process.env.APP_URL || 'https://app.seedfinancial.io'}/admin/queue`
            }
          ]
        }
      ]
    });
  } catch (error) {
    slackLogger.error({ error, jobName, failureCount }, 'Failed to send job failure alert');
  }
}