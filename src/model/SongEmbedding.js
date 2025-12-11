import mongoose from "mongoose";

const songEmbeddingSchema = new mongoose.Schema({
  songId: { type: String, required: true, unique: true },
  embedding: { type: [Number], required: true },
});

export default mongoose.model("SongEmbedding", songEmbeddingSchema);
