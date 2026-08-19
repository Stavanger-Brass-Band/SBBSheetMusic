import type { User } from "$lib/types";

/**
 * The geometry behind the profile-picture cropper, kept out of the component so
 * the arithmetic can be read and tested on its own.
 *
 * Every function here is pure and works in the source image's own pixels — the
 * units the upload endpoint's `X`/`Y`/`Size` are in. The component owns the
 * pointer events and the CSS; this owns what a drag or a zoom means.
 */

/**
 * The square region of a source image that becomes the picture. The API crops to
 * it and re-encodes the result as WebP, so a picture is square wherever it is
 * shown and nothing client-side ever resizes an image.
 */
export interface SquareCrop {
  x: number;
  y: number;
  size: number;
}

/**
 * The tightest crop offered, in source pixels. Past this a portrait is being
 * enlarged rather than framed, and the WebP the API writes would be a blur.
 * Images shorter than this are croppable at their full size instead — see
 * `cropSizeBounds`.
 */
const SMALLEST_CROP_PIXELS = 64;

/**
 * How small and how large the crop square may be for an image of this size. The
 * largest is the shortest side — a square cannot leave the image — and the
 * smallest is `SMALLEST_CROP_PIXELS` unless the image itself is smaller, in which
 * case the whole of it is the only crop there is.
 */
export function cropSizeBounds(
  width: number,
  height: number,
): { smallest: number; largest: number } {
  const shortestSide = Math.min(width, height);
  return {
    smallest: Math.min(SMALLEST_CROP_PIXELS, shortestSide),
    largest: shortestSide,
  };
}

/**
 * The crop a newly chosen image opens on: the largest square it holds, centred.
 * It is the whole picture for anyone who doesn't touch the controls, so it has to
 * be the most likely framing rather than a corner to drag from.
 */
export function fitSquareCrop(width: number, height: number): SquareCrop {
  const size = Math.min(width, height);
  return { x: (width - size) / 2, y: (height - size) / 2, size };
}

/** Keeps a crop square inside the image and within the size bounds. */
export function clampCrop(
  crop: SquareCrop,
  width: number,
  height: number,
): SquareCrop {
  const { smallest, largest } = cropSizeBounds(width, height);
  const size = Math.min(Math.max(crop.size, smallest), largest);
  return {
    size,
    x: Math.min(Math.max(crop.x, 0), width - size),
    y: Math.min(Math.max(crop.y, 0), height - size),
  };
}

/**
 * The crop after dragging the image by `deltaX`/`deltaY` viewport pixels. The
 * image moves with the pointer, so the window onto it moves the opposite way, and
 * one viewport pixel is worth `size / viewportPixels` source pixels — a drag
 * covers more of a zoomed-out image than of a zoomed-in one.
 *
 * Nothing is rounded here: while zoomed in, a source pixel is wider than a
 * screen pixel, and rounding each step would swallow slow drags entirely.
 * `toIntegerCrop` does the rounding, once, on the way out.
 */
export function panCrop(
  crop: SquareCrop,
  deltaX: number,
  deltaY: number,
  viewportPixels: number,
  width: number,
  height: number,
): SquareCrop {
  const sourcePixelsPerViewportPixel = crop.size / viewportPixels;
  return clampCrop(
    {
      size: crop.size,
      x: crop.x - deltaX * sourcePixelsPerViewportPixel,
      y: crop.y - deltaY * sourcePixelsPerViewportPixel,
    },
    width,
    height,
  );
}

/**
 * The crop resized to `size` about its own centre, so zooming holds onto
 * whatever the reader had framed instead of pulling towards a corner. Clamping
 * can still shift it when the square runs into an edge.
 */
export function zoomCrop(
  crop: SquareCrop,
  size: number,
  width: number,
  height: number,
): SquareCrop {
  const centerX = crop.x + crop.size / 2;
  const centerY = crop.y + crop.size / 2;
  return clampCrop(
    { size, x: centerX - size / 2, y: centerY - size / 2 },
    width,
    height,
  );
}

/**
 * The crop as whole pixels, for the upload — `X`, `Y` and `Size` are `int32`.
 * Rounded first and clamped after, so a rounded-up square can't end up hanging
 * over an edge the fractional one fitted inside.
 */
export function toIntegerCrop(
  crop: SquareCrop,
  width: number,
  height: number,
): SquareCrop {
  const rounded = {
    x: Math.round(crop.x),
    y: Math.round(crop.y),
    size: Math.round(crop.size),
  };
  const clamped = clampCrop(rounded, width, height);
  // Clamping can reintroduce a fraction when the image's own size is odd; the
  // size is already whole, so only the offsets need taking back down.
  return {
    size: clamped.size,
    x: Math.floor(clamped.x),
    y: Math.floor(clamped.y),
  };
}

/**
 * The version of a user's profile picture, or `null` for a user with none.
 *
 * The single reader of the shape `profilePicture` arrives in, which the OpenAPI
 * document doesn't describe — so if it turns out to be a bare version string
 * rather than the nested object, this function is the only place that has to
 * change. A version is also the only thing the app needs from it: `null` means
 * render initials and ask for nothing.
 */
export function profilePictureVersion(
  user: Pick<User, "profilePicture"> | null | undefined,
): string | null {
  return user?.profilePicture?.version ?? null;
}
