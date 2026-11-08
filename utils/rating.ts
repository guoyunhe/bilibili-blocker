export function formatRating(rating: number) {
  const clampedRating = Math.max(0, Math.min(100, rating));
  const value = clampedRating / 20;
  return {
    value: value.toFixed(1),
    color: value < 1.5 ? '#d9363e' : value < 2.5 ? '#f08c00' : value < 3.5 ? '#d4a000' : '#389e0d',
  };
}
