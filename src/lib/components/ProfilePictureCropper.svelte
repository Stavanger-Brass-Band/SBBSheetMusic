<script lang="ts">
  import { ZoomIn, ZoomOut } from "@lucide/svelte";
  import {
    clampCrop,
    cropSizeBounds,
    fitSquareCrop,
    panCrop,
    toIntegerCrop,
    zoomCrop,
    type SquareCrop,
  } from "$lib/utils/profilePicture";

  /**
   * Picks the square of a chosen image that becomes the profile picture: drag to
   * move the frame, the slider to tighten it.
   *
   * The API takes the crop as coordinates and does the cutting itself, so nothing
   * here touches the file: `oncrop` reports the region, in the image's own pixels,
   * and the caller uploads the original alongside it. So the reader gets the
   * framing they chose without the app re-encoding anything, and the server still
   * has the full resolution to work from.
   *
   * The geometry lives in `$lib/utils/profilePicture`; this owns the pointer
   * events and the preview.
   */
  let {
    file,
    oncrop,
    onmeasured,
  }: {
    file: File;
    /**
     * Called with the square chosen so far, in whole source pixels, or `null`
     * until the image has loaded and there is one. Reported as it changes rather
     * than on a confirm of its own, so the dialog's footer can upload it without
     * reaching in here for it.
     */
    oncrop: (crop: SquareCrop | null) => void;
    /**
     * The image's own pixel size, once the browser has decoded it. Only the caller
     * knows what the API will accept, and only this component ever learns how
     * large the picture really is.
     */
    onmeasured?: (width: number, height: number) => void;
  } = $props();

  /** How many steps the zoom slider has between the widest and tightest crop. */
  const ZOOM_STEPS = 100;

  let objectUrl = $state("");
  let naturalWidth = $state(0);
  let naturalHeight = $state(0);
  let crop = $state<SquareCrop>({ x: 0, y: 0, size: 0 });
  /** The viewport's own width, measured — the drag maths is in its pixels. */
  let viewportPixels = $state(0);
  let dragOrigin: { x: number; y: number } | null = null;

  let isReady = $derived(
    naturalWidth > 0 && naturalHeight > 0 && crop.size > 0,
  );
  let sizeBounds = $derived(cropSizeBounds(naturalWidth, naturalHeight));
  /** Locked when the image holds only one square: a 1:1 photo, or a tiny one. */
  let canZoom = $derived(sizeBounds.largest > sizeBounds.smallest);

  /**
   * How the image is laid over the viewport: scaled so the crop square fills it,
   * then offset so the square's top-left corner lands in the corner of the
   * viewport. Everything outside is shown dimmed rather than hidden, so the
   * reader can see what they are cutting away.
   */
  let previewScale = $derived(
    isReady && viewportPixels ? viewportPixels / crop.size : 1,
  );

  /**
   * The slider runs the intuitive way round — right is closer in — while the crop
   * it sets runs the other, since closer in is a smaller square.
   */
  let zoomStep = $derived.by(() => {
    if (!canZoom) return 0;
    const span = sizeBounds.largest - sizeBounds.smallest;
    return Math.round(((sizeBounds.largest - crop.size) / span) * ZOOM_STEPS);
  });

  // Revoking on cleanup matters more here than for the cached pictures: this URL
  // is for one pass through the dialog, and a reader who tries three photos
  // would otherwise leave three of them behind.
  $effect(() => {
    const url = URL.createObjectURL(file);
    objectUrl = url;
    return () => URL.revokeObjectURL(url);
  });

  function onImageLoad(event: Event) {
    const image = event.currentTarget as HTMLImageElement;
    naturalWidth = image.naturalWidth;
    naturalHeight = image.naturalHeight;
    crop = fitSquareCrop(naturalWidth, naturalHeight);
    onmeasured?.(naturalWidth, naturalHeight);
  }

  function startDrag(event: PointerEvent) {
    if (!isReady) return;
    dragOrigin = { x: event.clientX, y: event.clientY };
    // Keeps the drag alive when the pointer leaves the small viewport, which it
    // does constantly — the frame is being pushed against the image's edges.
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent) {
    if (!dragOrigin || !viewportPixels) return;
    crop = panCrop(
      crop,
      event.clientX - dragOrigin.x,
      event.clientY - dragOrigin.y,
      viewportPixels,
      naturalWidth,
      naturalHeight,
    );
    dragOrigin = { x: event.clientX, y: event.clientY };
  }

  function endDrag() {
    dragOrigin = null;
  }

  /** Nudges the frame by a tenth of its width, for a reader who can't drag. */
  function nudge(event: KeyboardEvent) {
    const steps: Record<string, [number, number]> = {
      ArrowLeft: [1, 0],
      ArrowRight: [-1, 0],
      ArrowUp: [0, 1],
      ArrowDown: [0, -1],
    };
    const step = steps[event.key];
    if (!step || !viewportPixels) return;
    event.preventDefault();
    const distance = viewportPixels / 10;
    crop = panCrop(
      crop,
      step[0] * distance,
      step[1] * distance,
      viewportPixels,
      naturalWidth,
      naturalHeight,
    );
  }

  function setZoom(step: number) {
    const span = sizeBounds.largest - sizeBounds.smallest;
    const size = sizeBounds.largest - (step / ZOOM_STEPS) * span;
    crop = zoomCrop(crop, size, naturalWidth, naturalHeight);
  }

  function reset() {
    crop = fitSquareCrop(naturalWidth, naturalHeight);
  }

  // Reported on every change rather than on a confirm: the footer button belongs
  // to the dialog, and this way it needs nothing from in here but the answer.
  // Rounding here and keeping `crop` fractional is deliberate — see `panCrop`.
  $effect(() => {
    oncrop(
      isReady
        ? toIntegerCrop(
            clampCrop(crop, naturalWidth, naturalHeight),
            naturalWidth,
            naturalHeight,
          )
        : null,
    );
  });
</script>

<div class="cropper">
  <p class="hint">
    Dra bildet for å velge hva som skal vises, og zoom med glidebryteren under.
  </p>

  <!-- The frame is round because the picture always is: a square preview would
       promise corners that every avatar then cuts off. -->
  <!--
    `role="application"` is ARIA's escape hatch for a widget whose interaction
    has no standard role — panning a 2D surface is one, and it also asks the
    screen reader to pass the arrow keys through to `nudge` rather than moving
    its own cursor with them. Svelte's a11y pass doesn't count that role as
    interactive, so it reads the focus and the key handler as mistakes; they are
    what makes the crop reachable without a pointer at all.
  -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="viewport"
    bind:clientWidth={viewportPixels}
    role="application"
    aria-label="Beskjær profilbildet"
    tabindex="0"
    onpointerdown={startDrag}
    onpointermove={moveDrag}
    onpointerup={endDrag}
    onpointercancel={endDrag}
    onkeydown={nudge}
  >
    {#if objectUrl}
      <img
        src={objectUrl}
        alt=""
        draggable="false"
        onload={onImageLoad}
        style="width:{naturalWidth * previewScale}px; left:{-crop.x *
          previewScale}px; top:{-crop.y * previewScale}px;"
      />
    {/if}
    <span class="frame" aria-hidden="true"></span>
  </div>

  <!--
    A native range styled from the tokens rather than Flowbite's `Range`, which
    rendered as a bare track with no visible thumb against the tuxedo palette —
    a zoom nobody could see was there. The magnifier icons flanking it say what
    it does without a label taking a line of the dialog, and the track fills
    behind the thumb so the current zoom reads at a glance.
  -->
  <div class="controls">
    <span class="zoom-icon" aria-hidden="true"><ZoomOut size={16} /></span>
    <input
      class="zoom"
      type="range"
      min="0"
      max={ZOOM_STEPS}
      value={zoomStep}
      disabled={!canZoom}
      aria-label="Zoom"
      style="--filled:{(zoomStep / ZOOM_STEPS) * 100}%"
      oninput={(event) => setZoom(Number(event.currentTarget.value))}
    />
    <span class="zoom-icon" aria-hidden="true"><ZoomIn size={16} /></span>
    <button type="button" class="reset" onclick={reset} disabled={!isReady}>
      Nullstill
    </button>
  </div>
</div>

<style>
  .cropper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
  }
  .hint {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
    text-align: center;
  }
  /*
   * A square that never exceeds the dialog's width. The image inside is
   * positioned in pixels from the script, so the box has to be the size the
   * script measured — hence the aspect ratio rather than a fixed height.
   */
  .viewport {
    position: relative;
    width: min(320px, 100%);
    aspect-ratio: 1;
    overflow: hidden;
    background: var(--surface-sunken);
    border-radius: var(--radius-md);
    cursor: grab;
    touch-action: none;
    user-select: none;
  }
  .viewport:active {
    cursor: grabbing;
  }
  .viewport:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .viewport img {
    position: absolute;
    max-width: none;
  }
  /* The round frame, drawn over the image: a ring plus a wash over the corners
     it will lose, so the cut is visible before it happens. */
  .frame {
    position: absolute;
    inset: 0;
    border-radius: var(--radius-full);
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);
    border: 2px solid var(--white);
    pointer-events: none;
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 12px;
    width: min(320px, 100%);
  }
  .zoom-icon {
    display: inline-flex;
    flex-shrink: 0;
    color: var(--text-muted);
  }

  /*
   * The track is drawn as a background on the input itself and the thumb styled
   * per engine — a range gives no element to hang either on. `--filled` comes
   * from the script, so the brass runs up to wherever the thumb sits.
   */
  .zoom {
    flex: 1;
    min-width: 0;
    height: 20px;
    margin: 0;
    padding: 0;
    appearance: none;
    background: linear-gradient(
      to right,
      var(--accent) var(--filled),
      var(--border-strong) var(--filled)
    );
    background-size: 100% 4px;
    background-position: center;
    background-repeat: no-repeat;
    border-radius: var(--radius-full);
    cursor: pointer;
  }
  .zoom:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .zoom:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }
  .zoom::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: var(--white);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-full);
    box-shadow: var(--shadow-sm);
    cursor: grab;
  }
  /* Firefox draws its own track on top of the input's background unless it is
     told not to. */
  .zoom::-moz-range-track {
    height: 4px;
    background: transparent;
  }
  .zoom::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: var(--white);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-full);
    box-shadow: var(--shadow-sm);
    cursor: grab;
  }
  .reset {
    flex-shrink: 0;
    padding: 0;
    background: none;
    border: none;
    font-family: var(--font-text);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: underline;
    cursor: pointer;
  }
  .reset:disabled {
    color: var(--text-muted);
    cursor: default;
    text-decoration: none;
  }
</style>
