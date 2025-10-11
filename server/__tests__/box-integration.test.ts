import { describe, it, expect, vi, beforeEach } from "vitest";

// Helpers to control module initialization timing
const setBoxEnv = (on: boolean) => {
  if (on) {
    process.env["BOX_CLIENT_ID"] = "id";
    process.env["BOX_CLIENT_SECRET"] = "secret";
    process.env["BOX_ENTERPRISE_ID"] = "ent";
    process.env["BOX_KEY_ID"] = "kid";
    process.env["BOX_PRIVATE_KEY"] = "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----";
    process.env["BOX_PASSPHRASE"] = "pass";
    process.env["BOX_CLIENT_FOLDERS_PARENT_ID"] = "0";
  } else {
    delete process.env["BOX_CLIENT_ID"];
    delete process.env["BOX_CLIENT_SECRET"];
    delete process.env["BOX_ENTERPRISE_ID"];
    delete process.env["BOX_KEY_ID"];
    delete process.env["BOX_PRIVATE_KEY"];
    delete process.env["BOX_PASSPHRASE"];
    delete process.env["BOX_CLIENT_FOLDERS_PARENT_ID"];
  }
};

beforeEach(() => {
  vi.resetModules();
});

describe("BoxService (with mocked SDK)", () => {
  it("creates client folder and returns success payload", async () => {
    setBoxEnv(true);

    const folders = {
      create: vi.fn().mockResolvedValue({ id: "C1", name: "Acme" }),
      getItems: vi.fn().mockImplementation(async (folderId: string) => {
        if (folderId === "TEMPLATE") {
          return { entries: [{ type: "file", id: "F1", name: "doc.docx" }] };
        }
        return { entries: [] };
      }),
    };
    const files = {
      copy: vi.fn().mockResolvedValue({ entries: [{ id: "N1", name: "doc.docx" }] }),
      uploadFile: vi.fn().mockResolvedValue({ entries: [{ id: "U1", name: "msa.docx" }] }),
    };

    // Mock default export class of box-node-sdk
    vi.doMock("box-node-sdk", () => {
      return {
        default: class BoxSDKMock {
          constructor(_: any) {}
          getAppAuthClient() {
            return { folders, files } as any;
          }
        },
      };
    });

    const { BoxService } = await import("../box-integration");
    const service = new BoxService();

    const result = await service.createClientFolder("Acme Co", "TEMPLATE");
    expect(result.success).toBe(true);
    expect(result.folderId).toBe("C1");
    expect(folders.create).toHaveBeenCalledWith("0", expect.stringContaining("Acme Co"));
    expect(files.copy).toHaveBeenCalledWith("F1", "C1");
  });

  it("returns empty items list when client is not initialized", async () => {
    setBoxEnv(false);
    const { BoxService } = await import("../box-integration");
    const service = new BoxService();
    const items = await service.listFolderItems("123");
    expect(items).toEqual([]);
  });
});
