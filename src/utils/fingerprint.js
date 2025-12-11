import { parseBuffer } from "music-metadata";
import { fft } from "fft-js";
import crypto from "crypto";

export async function generateFingerprint(buffer) {
  const metadata = await parseBuffer(buffer);

  const baseHash = crypto.createHash("md5").update(buffer).digest("hex");

  const fftSize = 512;
  const chunkSize = fftSize * 2;

  const fftFingerprint = [];

  for (let i = 0; i < buffer.length; i += chunkSize * 100) {
    const chunk = buffer.slice(i, i + chunkSize);
    const data = Array.from(chunk).map((b) => b / 255);

    const phasors = fft(data);
    const magnitudes = phasors.map((c) => Math.sqrt(c[0] ** 2 + c[1] ** 2));

    // Lấy 5 peak lớn nhất
    const top = magnitudes
      .map((v, i) => ({ v, i }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 5)
      .map((x) => x.i);

    fftFingerprint.push(...top);
  }

  const spectralHash = crypto
    .createHash("sha1")
    .update(JSON.stringify(fftFingerprint))
    .digest("hex");

  return {
    baseHash,
    spectralHash,
    duration: metadata.format.duration || 0,
  };
}
