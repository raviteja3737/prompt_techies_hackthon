const fs = require("fs");
const os = require("os");
const path = require("path");

const localStorage = require("../../src/services/storage/localStorage");

describe("localStorage driver (VPS-disk pitch decks)", () => {
  let dir;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "pitchdeck-test-"));
    process.env.LOCAL_STORAGE_DIR = dir;
    process.env.API_PUBLIC_URL = "http://localhost:4000";
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    delete process.env.LOCAL_STORAGE_DIR;
  });

  const pdfBytes = Buffer.from("%PDF-1.4 fake pitch deck bytes");

  it("mints a server-side key and returns a same-API PUT upload URL", () => {
    const out = localStorage.createUpload({ teamId: "PRMPT-ABC123", contentType: "application/pdf", sizeBytes: 123 });
    expect(out.method).toBe("PUT");
    expect(out.key).toMatch(/^pitch-decks\/PRMPT-ABC123\/\d+-[a-f0-9]{16}\.pdf$/);
    expect(out.uploadUrl).toBe(`http://localhost:4000/api/team/submission/upload/${encodeURIComponent(out.key)}`);
  });

  it("rejects disallowed content types at key-mint time", () => {
    expect(() => localStorage.createUpload({ teamId: "PRMPT-ABC123", contentType: "image/png" })).toThrow(/Unsupported file type/);
  });

  it("round-trips save -> stat -> exists for the owning team", async () => {
    const { key } = localStorage.createUpload({ teamId: "PRMPT-ABC123", contentType: "application/pdf" });
    const saved = await localStorage.saveBuffer({ key, teamId: "PRMPT-ABC123", buffer: pdfBytes, contentType: "application/pdf" });
    expect(saved.bytesWritten).toBe(pdfBytes.length);

    expect(await localStorage.fileExistsForTeam({ key, teamId: "PRMPT-ABC123" })).toBe(true);
    const stat = await localStorage.readStatForTeam({ key, teamId: "PRMPT-ABC123" });
    expect(stat.contentType).toBe("application/pdf");
    expect(stat.sizeBytes).toBe(pdfBytes.length);
    expect(fs.readFileSync(stat.absPath).equals(pdfBytes)).toBe(true);
  });

  it("never exposes one team's file to another team", async () => {
    const { key } = localStorage.createUpload({ teamId: "PRMPT-ABC123", contentType: "application/pdf" });
    await localStorage.saveBuffer({ key, teamId: "PRMPT-ABC123", buffer: pdfBytes, contentType: "application/pdf" });
    expect(await localStorage.fileExistsForTeam({ key, teamId: "PRMPT-OTHER" })).toBe(false);
    expect(await localStorage.readStatForTeam({ key, teamId: "PRMPT-OTHER" })).toBeNull();
  });

  it("rejects saving under a foreign-team key", async () => {
    const { key } = localStorage.createUpload({ teamId: "PRMPT-ABC123", contentType: "application/pdf" });
    await expect(
      localStorage.saveBuffer({ key, teamId: "PRMPT-INTRUDER", buffer: pdfBytes, contentType: "application/pdf" })
    ).rejects.toThrow(/does not belong to your team/);
  });

  it("rejects traversal and malformed keys", async () => {
    for (const bad of [
      "pitch-decks/../../evil.pdf",
      "../../etc/passwd",
      "/abs/path.pdf",
      "pitch-decks/PRMPT-ABC123/nope.pdf",
      "url:https%3A%2F%2Fexample.com%2Fdeck.pdf",
    ]) {
      expect(await localStorage.fileExistsForTeam({ key: bad, teamId: "PRMPT-ABC123" })).toBe(false);
      expect(() => localStorage.resolveKeyPath(bad)).toThrow(/Invalid pitch-deck key/);
    }
  });

  it("rejects empty, oversized, and wrong-type bodies", async () => {
    const { key } = localStorage.createUpload({ teamId: "PRMPT-ABC123", contentType: "application/pdf" });
    await expect(
      localStorage.saveBuffer({ key, teamId: "PRMPT-ABC123", buffer: Buffer.alloc(0), contentType: "application/pdf" })
    ).rejects.toThrow(/Empty file/);
    await expect(
      localStorage.saveBuffer({ key, teamId: "PRMPT-ABC123", buffer: pdfBytes, contentType: "image/png" })
    ).rejects.toThrow(/Unsupported file type/);
    await expect(
      localStorage.saveBuffer({
        key,
        teamId: "PRMPT-ABC123",
        buffer: Buffer.alloc(localStorage.MAX_BYTES + 1),
        contentType: "application/pdf",
      })
    ).rejects.toThrow(/50MB/);
  });

  it("reports a writable directory as configured in health status", () => {
    expect(localStorage.getLocalStatus()).toEqual({ provider: "local", configured: true });
  });
});
