
import { Point, CircleResult } from '../types';

export const analyzeCircle = (points: Point[], nucleus: Point): CircleResult => {
  if (points.length < 15) {
    return { 
      score: 0, centerX: 0, centerY: 0, radius: 0, 
      message: "Draw a bit more!", isTooSmall: true, notClosed: false, timestamp: Date.now()
    };
  }

  // 1. Calculate centroid of user drawing
  const sumX = points.reduce((acc, p) => acc + p.x, 0);
  const sumY = points.reduce((acc, p) => acc + p.y, 0);
  const userCenterX = sumX / points.length;
  const userCenterY = sumY / points.length;

  // 2. Calculate average radius from user center
  const distances = points.map(p => {
    const dx = p.x - userCenterX;
    const dy = p.y - userCenterY;
    return Math.sqrt(dx * dx + dy * dy);
  });
  const avgRadius = distances.reduce((acc, d) => acc + d, 0) / distances.length;

  if (avgRadius < 30) {
    return { 
      score: 0, centerX: userCenterX, centerY: userCenterY, radius: avgRadius, 
      message: "Too small!", isTooSmall: true, notClosed: false, timestamp: Date.now()
    };
  }

  // 3. Precision (Deviation from a perfect circle)
  const totalDeviation = distances.reduce((acc, d) => acc + Math.abs(d - avgRadius), 0);
  const meanDeviation = totalDeviation / distances.length;
  const relativeDeviation = meanDeviation / avgRadius;

  // 4. Closed loop check (Strict)
  const start = points[0];
  const end = points[points.length - 1];
  const gap = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
  const isNotClosed = gap > avgRadius * 0.4; // Must be within 40% of the radius to count as closed

  if (isNotClosed) {
    return {
      score: 0, centerX: userCenterX, centerY: userCenterY, radius: avgRadius,
      message: "Finish the loop!", isTooSmall: false, notClosed: true, timestamp: Date.now()
    };
  }

  // 5. Nucleus Centering Bonus/Penalty
  // Calculate how far the circle's center is from the actual nucleus
  const distFromNucleus = Math.sqrt(Math.pow(userCenterX - nucleus.x, 2) + Math.pow(userCenterY - nucleus.y, 2));
  const centeringError = distFromNucleus / avgRadius;

  // 6. Final Score Calculation (Generous)
  // Base score on precision
  let score = 100 * (1 - (relativeDeviation / 0.35)); 
  
  // Penalize for poor centering relative to the nucleus
  score -= (centeringError * 15);

  // Bonus for decent work to make it feel good
  if (score > 50) score += 5;

  score = Math.max(0, Math.min(100, score));

  let message = "Not bad!";
  if (score > 98) message = "ABSOLUTE UNIT";
  else if (score > 95) message = "Nuclear Precision!";
  else if (score > 90) message = "Perfect Symmetry!";
  else if (score > 85) message = "Great Form!";
  else if (score > 75) message = "Solid Circle!";
  else if (score > 60) message = "Good effort.";
  else if (score > 40) message = "Wobbly orbit.";
  else message = "Unstable form.";

  return {
    score: Math.round(score),
    centerX: userCenterX,
    centerY: userCenterY,
    radius: avgRadius,
    message,
    isTooSmall: false,
    notClosed: false,
    timestamp: Date.now()
  };
};
