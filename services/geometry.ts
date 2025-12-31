
import { Point, CircleResult } from '../types';

export const analyzeCircle = (points: Point[], nucleus: Point): CircleResult => {
  if (points.length < 10) {
    return { 
      score: 0, centerX: 0, centerY: 0, radius: 0, 
      message: "Draw a loop!", isTooSmall: true, notClosed: false, timestamp: Date.now()
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

  // Mobile-friendly size check: smaller circles are okay
  if (avgRadius < 15) {
    return { 
      score: 0, centerX: userCenterX, centerY: userCenterY, radius: avgRadius, 
      message: "Too small!", isTooSmall: true, notClosed: false, timestamp: Date.now()
    };
  }

  // 3. Precision (Deviation from a perfect circle)
  const totalDeviation = distances.reduce((acc, d) => acc + Math.abs(d - avgRadius), 0);
  const meanDeviation = totalDeviation / distances.length;
  // Increase denominator for more forgiving scoring (0.45 instead of 0.35)
  const relativeDeviation = meanDeviation / avgRadius;

  // 4. Closed loop check (Magnetic for mobile)
  const start = points[0];
  const end = points[points.length - 1];
  const gap = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
  
  // More lenient closure: allow up to 60% of radius gap on mobile
  const isNotClosed = gap > avgRadius * 0.6; 

  if (isNotClosed) {
    return {
      score: 0, centerX: userCenterX, centerY: userCenterY, radius: avgRadius,
      message: "Close the loop!", isTooSmall: false, notClosed: true, timestamp: Date.now()
    };
  }

  // 5. Nucleus Centering Bonus/Penalty
  const distFromNucleus = Math.sqrt(Math.pow(userCenterX - nucleus.x, 2) + Math.pow(userCenterY - nucleus.y, 2));
  const centeringError = distFromNucleus / avgRadius;

  // 6. Final Score Calculation (Optimized for Fingers)
  // We use a softer curve for relativeDeviation so wobbly lines don't kill the score.
  let score = 100 * (1 - (relativeDeviation / 0.5)); 
  
  // Centering penalty is lighter on mobile
  score -= (centeringError * 10);

  // Small closure penalty for visible gaps, but don't fail them
  if (gap > avgRadius * 0.2) {
    score -= (gap / avgRadius) * 15;
  }

  // Bonus to make it feel satisfying
  if (score > 40) score += 8;

  score = Math.max(0, Math.min(100, score));

  let message = "Keep it up!";
  if (score > 98) message = "ABSOLUTE PRECISION";
  else if (score > 95) message = "Perfect Orbit!";
  else if (score > 90) message = "Nuclear Symmetry!";
  else if (score > 80) message = "Strong Form!";
  else if (score > 65) message = "Good Loop!";
  else if (score > 45) message = "Stable enough.";
  else if (score > 20) message = "Unstable orbit.";
  else message = "Fragmented.";

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
