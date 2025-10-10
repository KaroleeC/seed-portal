/**
 * Voice Provider Service (Twilio Calls)
 */

export interface VoiceCallParams {
  to: string;
  from?: string; // Defaults to TWILIO_PHONE_NUMBER
  statusCallbackUrl: string; // Our webhook to receive call status updates
  twimlUrl: string; // URL that returns TwiML to instruct the call
}

export interface VoiceCallResult {
  sid: string;
  status: string;
}

/**
 * Initiate an outbound voice call via Twilio
 */
export async function initiateVoiceCall(params: VoiceCallParams): Promise<VoiceCallResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !twilioPhone) {
    throw new Error("Twilio credentials not configured");
  }

  const { to, from, statusCallbackUrl, twimlUrl } = params;

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(accountSid, authToken);

    const call = await client.calls.create({
      to,
      from: from || twilioPhone,
      url: twimlUrl,
      statusCallback: statusCallbackUrl,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      method: "POST",
    });

    console.log("[VoiceProvider] Outbound call initiated:", {
      sid: call.sid,
      to,
      status: call.status,
    });

    return { sid: call.sid, status: call.status as string };
  } catch (error) {
    console.error("[VoiceProvider] Failed to initiate call:", error);
    throw error;
  }
}
