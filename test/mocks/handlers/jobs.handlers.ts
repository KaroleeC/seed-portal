/**
 * MSW Handlers for Job Queue API
 *
 * Mock API responses for testing job-related features.
 */

import { http, HttpResponse } from "msw";

const API_BASE = "http://localhost:5001";

export const jobsHandlers = [
  /**
   * GET /api/jobs/status
   * Returns worker status
   */
  http.get(`${API_BASE}/api/jobs/status`, () => {
    return HttpResponse.json({
      status: "running",
      message: "Graphile Worker is running",
    });
  }),

  /**
   * POST /api/jobs/queue
   * Queue a background job
   */
  http.post(`${API_BASE}/api/jobs/queue`, async ({ request }) => {
    const body = (await request.json()) as {
      taskName: string;
      payload?: any;
      options?: any;
    };

    if (!body.taskName) {
      return HttpResponse.json({ error: "taskName is required" }, { status: 400 });
    }

    return HttpResponse.json({
      success: true,
      message: `Job '${body.taskName}' queued successfully`,
    });
  }),

  /**
   * GET /api/jobs/status (worker not initialized)
   * Simulates worker not running
   */
  http.get(`${API_BASE}/api/jobs/status-disabled`, () => {
    return HttpResponse.json({
      status: "not_initialized",
      message: "Graphile Worker not initialized",
    });
  }),

  /**
   * POST /api/jobs/queue (error scenario)
   * Simulates job queuing failure
   */
  http.post(`${API_BASE}/api/jobs/queue-error`, () => {
    return HttpResponse.json({ error: "Failed to queue job" }, { status: 500 });
  }),
];
