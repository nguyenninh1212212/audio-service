import levenshtein from "fast-levenshtein";

export function fingerprintDistance(fp1, fp2) {
  return levenshtein.get(fp1, fp2);
}


export function normalizeSimilarity(distance) {
  return 1 / (1 + distance);
}
