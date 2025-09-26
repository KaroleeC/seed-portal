import type { Response } from "express";

export interface ErrorEnvelope {
  code?: string;
  message: string;
}

export function sendOk<T = any>(
  res: Response,
  data?: T,
  meta?: any,
  legacy?: Record<string, any>,
) {
  const body: any = { success: true };
  if (typeof data !== "undefined") body.data = data;
  if (typeof meta !== "undefined") body.meta = meta;
  if (legacy) Object.assign(body, legacy);
  return res.json(body);
}

export function sendError(
  res: Response,
  code: string | undefined,
  message: string,
  status = 500,
  legacy?: Record<string, any>,
) {
  const body: any = { success: false, error: { message } as ErrorEnvelope };
  if (code) body.error.code = code;
  if (legacy) Object.assign(body, legacy);
  return res.status(status).json(body);
}
