import { determineDirectory } from "./fileUtils";

describe("determineDirectory", () => {
  it("should return the directory path for a typical absolute path", () => {
    expect(determineDirectory("/path/to/file.jpg")).toBe("/path/to");
  });

  it("should return empty string for a path with only a filename (no slash)", () => {
    expect(determineDirectory("file.jpg")).toBe("");
  });

  it("should return empty string for a path with only a single slash at the beginning", () => {
    expect(determineDirectory("/file.jpg")).toBe("");
  });

  it("should return the parent directory for a path ending in a slash", () => {
    expect(determineDirectory("/path/to/dir/")).toBe("/path/to/dir");
  });

  it("should handle paths with multiple slashes correctly", () => {
    expect(determineDirectory("/a/b/c/d.txt")).toBe("/a/b/c");
  });

  it("should return empty string for an empty input", () => {
    expect(determineDirectory("")).toBe("");
  });
});
