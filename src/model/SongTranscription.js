import mongoose from "mongoose";

const songFingerprintSchema = new mongoose.Schema({
  songId: String,
  text: [
    {
      startTime: Number,
      endTime: Number,
      note: String,
    },
  ],
});

export default mongoose.model("SongFingerprint", songFingerprintSchema);
