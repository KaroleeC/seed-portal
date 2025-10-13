import type { Response } from "express";

export interface ErrorEnvelope {
  code?: string;
  message: string;
}

export function sendOk<T = unknown>(
  res: Response,
  data?: T,
  meta?: Record<string, unknown>,
  legacy?: Record<string, unknown>
): Response {
  const body: Record<string, unknown> = { success: true };
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
  legacy?: Record<string, unknown>
): Response {
  const body: { success: boolean; error: ErrorEnvelope } & Record<string, unknown> = {
    success: false,
    error: { message },
  };
  if (code) body.error.code = code;
  if (legacy) Object.assign(body, legacy);
  return res.status(status).json(body);
}
