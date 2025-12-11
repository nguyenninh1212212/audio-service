import mongoose from "mongoose";

const songFingerprintSchema = new mongoose.Schema({
  songId: { type: String, required: true, unique: true },
  title: String,
  artist: String,
  fingerprint: String,
});

export default mongoose.model("SongFingerprint", songFingerprintSchema);
