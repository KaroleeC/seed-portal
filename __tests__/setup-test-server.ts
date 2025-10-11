/**
 * Test Server Setup
 *
 * Lightweight test server for smoke tests.
 * Starts the Express app with a test database.
 */

import { createServer } from "http";
import type { Server } from "http";

class TestServer {
  private httpServer: Server | null = null;
  public url = "";
  public testToken = "test-token-12345"; // Mock token for tests

  async start(): Promise<void> {
    if (this.httpServer) {
      return; // Already started
    }

    // Import the Express app
    const { app } = await import("../server/index");

    // Create HTTP server
    this.httpServer = createServer(app);

    // Start listening on random port
    await new Promise<void>((resolve) => {
      this.httpServer!.listen(0, () => {
        const address = this.httpServer!.address();
        if (address && typeof address === "object") {
          this.url = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.httpServer) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.httpServer!.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    this.httpServer = null;
    this.url = "";
  }
}

export const server = new TestServer();
