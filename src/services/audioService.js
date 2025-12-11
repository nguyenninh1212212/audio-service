import SongFingerprint from "../model/SongFingerprint.js";
import { generateFingerprint } from "../utils/fingerprint.js";
import { cosineSimilarity } from "../utils/cosine.js";
import { getAudioEmbedding } from "../utils/getAudioEmbedding.js";
import { consumeMessage } from "../config/rabitmq.config.js";
import axios from "axios";
import SongEmbedding from "../model/SongEmbedding.js";
import client from "../grpc/audio_embed.client.js";
import { spawn } from "child_process";

export const addSongFingerprint = async (msg) => {
  try {
    const { songId, audioUrl } = msg;
    const audio = await axios.get(audioUrl, {
      responseType: "arraybuffer",
    });
    const fp = await generateFingerprint(Buffer.from(audio.data));
    await SongFingerprint.create({
      songId,
      fingerprint: fp.spectralHash,
      duration: fp.duration,
    });
  } catch (err) {
    console.log("🚀 ~ addSongFingerprint ~ err:", err);
  }
};
export const addSongEmbedding = async (msg) => {
  const { songId, audioUrl } = msg;
  console.log("🚀 ~ addSongEmbedding ~ msg:", msg);
  try {
    const grpcRequest = {
      songId: songId,
      audioUrl: audioUrl,
    };
    console.log("🚀 ~ addSongEmbedding ~ grpcRequest:", grpcRequest);

    const grpcResponse = await new Promise((resolve, reject) => {
      client.Embed(grpcRequest, (err, res) =>
        err ? reject(err) : resolve(res)
      );
    });

    return grpcResponse;
  } catch (err) {
    console.error("Failed to process song embedding:", err);
  }
};

export const searchSong = async (call, callback) => {
  try {
    const { audio } = call.request;
    const queryFp = await generateFingerprint(Buffer.from(audio));

    const docs = await SongFingerprint.find();

    let best = null;
    let bestScore = -1;

    for (const d of docs) {
      const sim = cosineSimilarity(
        Buffer.from(queryFp.spectralHash),
        Buffer.from(d.fingerprint)
      );

      if (sim > bestScore) {
        best = d;
        bestScore = sim;
      }
    }

    if (!best) return callback(null, { songId: "" });

    callback(null, {
      songId: best.songId,
      title: best.title,
      artist: best.artist,
      similarity: bestScore,
    });
  } catch (err) {
    console.error(err);
    callback(err, null);
  }
};

export const GetRecommendSongs = async (call, callback) => {
  try {
    const { songId } = call.request;
    const topN = 10;
    const targetSong = await SongEmbedding.findOne({ songId });
    if (!targetSong) {
      return callback(new Error("Song not found"), null);
    }

    const allSongs = await SongEmbedding.find({ songId: { $ne: songId } });

    const recommendations = allSongs
      .map((s) => ({
        songId: s.songId,
        score: cosineSimilarity(targetSong.embedding, s.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
    callback(null, { items: recommendations });
  } catch (err) {
    console.error(err);
    callback(err, null);
  }
};
