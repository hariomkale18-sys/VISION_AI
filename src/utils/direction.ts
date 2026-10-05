import { DirectionType } from '../types';

export function calculateDirection(bboxX: number, bboxWidth: number, frameWidth: number): DirectionType {
  const centerX = bboxX + bboxWidth / 2;
  const ratio = centerX / (frameWidth || 1);

  if (ratio < 0.35) {
    return 'on your left';
  } else if (ratio > 0.65) {
    return 'on your right';
  } else {
    return 'ahead';
  }
}
