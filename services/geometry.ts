
import { Point, CircleResult } from '../types';

export const analyzeCircle = (points: Point[]): CircleResult => {
  if (points.length < 10) {
    return { 
      score: 0, 
      centerX: 0, 
      centerY: 0, 
      radius: 0, 
      message: "Draw more!", 
      isTooSmall: true, 
      notClosed: false,
      timestamp: Date.now()
    };
  }

  // 1. Calculate centroid
  const sumX = points.reduce((acc, p) => acc + p.x, 0);
  const sumY = points.reduce((acc, p) => acc + p.y, 0);
  const centerX = sumX / points.length;
  const centerY = sumY / points.length;

  // 2. Calculate average radius
  const distances = points.map(p => {
    const dx = p.x - centerX;
    const dy = p.y - centerY;
    return Math.sqrt(dx * dx + dy * dy);
  });
  const avgRadius = distances.reduce((acc, d) => acc + d, 0) / distances.length;

  // 3. Precision (Deviation)
  const totalDeviation = distances.reduce((acc, d) => acc + Math.abs(d - avgRadius), 0);
  const meanDeviation = totalDeviation / distances.length;
  // More generous denominator (0.3 instead of 0.25)
  const relativeDeviation = meanDeviation / Math.max(avgRadius, 1);

  // 4. Strict Closed loop check
  const start = points[0];
  const end = points[points.length - 1];
  const gap = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
  
  // Stricter requirement to be "closed" (must be within 35% of radius)
  const isNotClosed = gap > avgRadius * 0.35;

  if (isNotClosed) {
    return {
      score: 0,
      centerX,
      centerY,
      radius: avgRadius,
      message: "Finish the loop!",
      isTooSmall: false,
      notClosed: true,
      timestamp: Date.now()
    };
  }

  // 5. Generous score calculation
  // We use a lighter curve so slight errors don't drop the score as much
  let score = 100 * (1 - (relativeDeviation / 0.4)); 
  
  // Add bonus for stability
  if (score > 60) score += 5;
  
  // Final gap penalty if it's closed but messy at the junction
  if (gap > avgRadius * 0.1) {
      score -= (gap / avgRadius) * 10;
  }

  score = Math.max(0, Math.min(100, score));

  let message = "Keep it up!";
  if (score > 98) message = "ATOMIC PERFECTION";
  else if (score > 95) message = "Pure Nucleus!";
  else if (score > 90) message = "Highly Stable!";
  else if (score > 80) message = "Strong Bond!";
  else if (score > 60) message = "In Orbit.";
  else if (score > 40) message = "Decaying...";
  else message = "Unstable.";

  return {
    score: Math.round(score),
    centerX,
    centerY,
    radius: avgRadius,
    message,
    isTooSmall: avgRadius < 25,
    notClosed: false,
    timestamp: Date.now()
  };
};
