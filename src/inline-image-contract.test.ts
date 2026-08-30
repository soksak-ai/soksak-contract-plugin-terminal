import { describe, expect, it } from "vitest";
import {
  TERMINAL_INLINE_IMAGE_EVENTS,
  TERMINAL_INLINE_IMAGE_PROTOCOLS,
  TERMINAL_INLINE_IMAGE_REFUSAL_CODES,
  TERMINAL_V1_COMPONENTS,
  validateTerminalImagePresentResult,
  validateTerminalImageResource,
  validateTerminalInlineImageStatus,
  type TerminalDropMode,
} from "./index";

const resource = {
  resourceId: "image.resource-1",
  mime: "image/png",
  sizeBytes: 4096,
  lifetime: { kind: "single-presentation", expiresAtUnixMs: 1_900_000_000_000 },
};

describe("inline image contract foundation", () => {
  it("keeps authorized path insertion separate from inline resource presentation", () => {
    const pathMode: TerminalDropMode = "path";
    expect(pathMode).toBe("path");
    const inline = TERMINAL_V1_COMPONENTS.find(({ id }) => id === "inline-images");
    expect(inline).toMatchObject({
      level: "capability",
      commands: ["image.present", "status"],
      status: ["inlineImageProtocols", "inlineImageLimits", "inlineImageRefusal"],
      events: ["image.presented", "image.refused"],
    });
  });

  it("requires an opaque image resource with explicit mime size and lifetime", () => {
    expect(validateTerminalImageResource(resource)).toEqual([]);
    for (const missing of ["resourceId", "mime", "sizeBytes", "lifetime"] as const) {
      const invalid = { ...resource } as Record<string, unknown>;
      delete invalid[missing];
      expect(validateTerminalImageResource(invalid)).toContain(`resource.${missing}: required`);
    }
    expect(validateTerminalImageResource({ ...resource, path: "/private/image.png" }))
      .toContain("resource.path: unknown field");
    expect(validateTerminalImageResource({ ...resource, data: "base64-private-copy" }))
      .toContain("resource.data: unknown field");
    expect(validateTerminalImageResource({ ...resource, mime: "text/plain" }))
      .toContain("resource.mime: image MIME required");
    expect(validateTerminalImageResource({ ...resource, sizeBytes: 0 }))
      .toContain("resource.sizeBytes: positive integer required");
    expect(validateTerminalImageResource({
      ...resource, lifetime: { kind: "session", expiresAtUnixMs: 1_900_000_000_000 },
    })).toContain("resource.lifetime.kind: single-presentation required");
  });

  it("names supported protocols limits and explicit refusal status", () => {
    expect(TERMINAL_INLINE_IMAGE_PROTOCOLS).toEqual(["kitty-graphics", "iterm2-inline", "sixel"]);
    expect(TERMINAL_INLINE_IMAGE_REFUSAL_CODES).toEqual([
      "unsupported-engine", "unsupported-protocol", "unsupported-mime", "resource-expired",
      "resource-too-large", "resource-unavailable", "presentation-failed",
    ]);
    expect(validateTerminalInlineImageStatus({
      inlineImageProtocols: ["kitty-graphics"],
      inlineImageLimits: {
        "kitty-graphics": { maxBytes: 8_388_608, supportedMimeTypes: ["image/png"] },
      },
      inlineImageRefusal: null,
    })).toEqual([]);
    expect(validateTerminalInlineImageStatus({
      inlineImageProtocols: [], inlineImageLimits: {},
      inlineImageRefusal: {
        resourceId: "image.resource-1", code: "unsupported-engine",
        message: "engine declares no inline image protocol",
      },
    })).toEqual([]);
    expect(validateTerminalInlineImageStatus({
      inlineImageProtocols: ["private-protocol"],
      inlineImageLimits: {},
      inlineImageRefusal: null,
    })).toContain("inlineImageProtocols[0]: unknown protocol");
    expect(validateTerminalInlineImageStatus({
      inlineImageProtocols: ["kitty-graphics"],
      inlineImageLimits: { sixel: { maxBytes: 1, supportedMimeTypes: ["image/png"] } },
      inlineImageRefusal: null,
    })).toEqual(expect.arrayContaining([
      "inlineImageLimits.kitty-graphics: required for supported protocol",
      "inlineImageLimits.sixel: limit declared for unsupported protocol",
    ]));
  });

  it("makes presented and refused outcomes observable without a path", () => {
    expect(TERMINAL_INLINE_IMAGE_EVENTS).toEqual({
      presented: "soksak:terminal-image-presented", refused: "soksak:terminal-image-refused",
    });
    expect(validateTerminalImagePresentResult({
      pane: "tab-a.1", resourceId: resource.resourceId, presented: true,
      protocol: "kitty-graphics", refusal: null,
    })).toEqual([]);
    expect(validateTerminalImagePresentResult({
      pane: "tab-a.1", resourceId: resource.resourceId, presented: false, protocol: null,
      refusal: {
        resourceId: resource.resourceId, code: "unsupported-engine",
        message: "engine declares no inline image protocol",
      },
    })).toEqual([]);
    expect(validateTerminalImagePresentResult({
      pane: "tab-a.1", resourceId: resource.resourceId, presented: false, protocol: null,
      refusal: { resourceId: resource.resourceId, code: "unsupported-engine", message: "refused" },
      path: "/private/image.png",
    })).toContain("result.path: unknown field");
  });

  it("requires unsupported engines to refuse instead of falling back to path input", () => {
    expect(validateTerminalImagePresentResult({
      pane: "tab-a.1", resourceId: resource.resourceId, presented: false,
      protocol: null, refusal: null,
    })).toContain("result.refusal: explicit refusal required when not presented");
    expect(validateTerminalImagePresentResult({
      pane: "tab-a.1", resourceId: resource.resourceId, presented: true,
      protocol: null,
      refusal: { resourceId: resource.resourceId, code: "unsupported-engine", message: "contradiction" },
    })).toEqual(expect.arrayContaining([
      "result.protocol: supported protocol required when presented",
      "result.refusal: must be null when presented",
    ]));
  });
});
