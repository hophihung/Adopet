export const formatPetLocation = (location?: string | null): string => {
  if (!location) return 'Khu vực lân cận';

  const trimmed = location.trim();
  const coordinatePattern = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;

  if (coordinatePattern.test(trimmed)) {
    return 'Khu vực lân cận';
  }

  return trimmed;
};

