import { describe, expect, it } from "vitest";
import {
  clampCrop,
  cropSizeBounds,
  fitSquareCrop,
  panCrop,
  profilePictureVersion,
  toIntegerCrop,
  zoomCrop,
} from "./profilePicture";

describe("fitSquareCrop", () => {
  it("centres the largest square in a landscape image", () => {
    expect(fitSquareCrop(400, 200)).toEqual({ x: 100, y: 0, size: 200 });
  });

  it("centres the largest square in a portrait image", () => {
    expect(fitSquareCrop(200, 500)).toEqual({ x: 0, y: 150, size: 200 });
  });

  it("takes the whole of a square image", () => {
    expect(fitSquareCrop(300, 300)).toEqual({ x: 0, y: 0, size: 300 });
  });
});

describe("cropSizeBounds", () => {
  it("caps the crop at the shortest side", () => {
    expect(cropSizeBounds(800, 500).largest).toBe(500);
  });

  it("lets an image smaller than the zoom floor be cropped whole", () => {
    expect(cropSizeBounds(40, 32)).toEqual({ smallest: 32, largest: 32 });
  });
});

describe("clampCrop", () => {
  it("pulls a square back inside the image", () => {
    expect(clampCrop({ x: -50, y: 900, size: 200 }, 400, 400)).toEqual({
      x: 0,
      y: 200,
      size: 200,
    });
  });

  it("shrinks a square larger than the image", () => {
    expect(clampCrop({ x: 0, y: 0, size: 900 }, 400, 300)).toEqual({
      x: 0,
      y: 0,
      size: 300,
    });
  });

  it("holds the crop at the zoom floor", () => {
    expect(clampCrop({ x: 10, y: 10, size: 4 }, 400, 400).size).toBe(64);
  });
});

describe("panCrop", () => {
  it("moves the window against the drag, so the image follows the pointer", () => {
    // A 200px crop shown in a 200px viewport: one viewport pixel is one source
    // pixel, so dragging right by 20 moves the window left by 20.
    const panned = panCrop({ x: 100, y: 100, size: 200 }, 20, 0, 200, 500, 500);
    expect(panned).toEqual({ x: 80, y: 100, size: 200 });
  });

  it("scales the drag by how much of the image the viewport shows", () => {
    // A 400px crop in a 200px viewport: each viewport pixel covers two source
    // pixels, so the same 20px drag is worth 40.
    const panned = panCrop(
      { x: 100, y: 100, size: 400 },
      20,
      20,
      200,
      900,
      900,
    );
    expect(panned).toEqual({ x: 60, y: 60, size: 400 });
  });

  it("stops at the image's edge", () => {
    expect(
      panCrop({ x: 10, y: 0, size: 100 }, 400, -400, 100, 300, 300),
    ).toEqual({ x: 0, y: 200, size: 100 });
  });
});

describe("zoomCrop", () => {
  it("keeps the crop's centre while resizing", () => {
    // Centred on (200, 200); a 100px square around that centre starts at 150.
    expect(zoomCrop({ x: 100, y: 100, size: 200 }, 100, 500, 500)).toEqual({
      x: 150,
      y: 150,
      size: 100,
    });
  });

  it("shifts the crop when the new size runs into an edge", () => {
    expect(zoomCrop({ x: 0, y: 0, size: 100 }, 300, 300, 300)).toEqual({
      x: 0,
      y: 0,
      size: 300,
    });
  });
});

describe("toIntegerCrop", () => {
  it("rounds to whole pixels", () => {
    expect(toIntegerCrop({ x: 10.4, y: 10.6, size: 199.5 }, 400, 400)).toEqual({
      x: 10,
      y: 11,
      size: 200,
    });
  });

  it("keeps a rounded-up square inside the image", () => {
    const crop = toIntegerCrop({ x: 200.6, y: 0, size: 99.6 }, 300, 300);
    expect(crop).toEqual({ x: 200, y: 0, size: 100 });
  });

  it("crops an image smaller than the zoom floor whole", () => {
    expect(toIntegerCrop({ x: 0, y: 0, size: 32 }, 32, 32)).toEqual({
      x: 0,
      y: 0,
      size: 32,
    });
  });
});

describe("profilePictureVersion", () => {
  it("reads the version off the user's picture", () => {
    expect(profilePictureVersion({ profilePicture: { version: "v1" } })).toBe(
      "v1",
    );
  });

  it("is null for a user with no picture", () => {
    expect(profilePictureVersion({ profilePicture: null })).toBeNull();
    expect(profilePictureVersion({})).toBeNull();
    expect(profilePictureVersion(null)).toBeNull();
    expect(profilePictureVersion(undefined)).toBeNull();
  });
});
