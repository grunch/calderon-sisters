import { VIEW_HEIGHT, MIN_VIEW_WIDTH, MAX_VIEW_WIDTH } from '../config.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Fits the game in the available space. The scale is a whole number of device
 * pixels per game pixel so the pixel art stays crisp; any width left over is
 * used to show more of the level instead of black bars.
 */
export function computeViewport(availableWidth, availableHeight, devicePixelRatio = 1) {
  const deviceWidth = Math.floor(availableWidth * devicePixelRatio);
  const deviceHeight = Math.floor(availableHeight * devicePixelRatio);
  const scale = Math.max(1, Math.floor(Math.min(deviceWidth / MIN_VIEW_WIDTH, deviceHeight / VIEW_HEIGHT)));
  const viewWidth = clamp(Math.floor(deviceWidth / scale), MIN_VIEW_WIDTH, MAX_VIEW_WIDTH);

  return {
    scale,
    viewWidth,
    pixelWidth: viewWidth * scale,
    pixelHeight: VIEW_HEIGHT * scale,
    cssWidth: (viewWidth * scale) / devicePixelRatio,
    cssHeight: (VIEW_HEIGHT * scale) / devicePixelRatio
  };
}
