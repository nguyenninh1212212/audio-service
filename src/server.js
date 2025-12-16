import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import startConsumers from "./services/startCosumer.js";
import {
  addSongFingerprint,
  searchSong,
  GetRecommendSongs,
} from "./services/audioService.js";
import { consumeMessage } from "./config/rabitmq.config.js";

const PROTO_PATH = "./proto/audio.proto";

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDef).audio;

async function start() {
  try {
    console.log("⏳ Connecting MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected!");

    const server = new grpc.Server();

    server.addService(proto.AudioSearch.service, {
      SearchSong: searchSong,
      GetRecommendSongs: GetRecommendSongs,
    });

    const PORT = 50051;

    server.bindAsync(
      `0.0.0.0:${PORT}`,
      grpc.ServerCredentials.createInsecure(),
      (err, actualPort) => {
        if (err) {
          console.error("❌ gRPC bind error:", err);
          return;
        }
        console.log(
          `🚀 gRPC Audio Fingerprint Server running at port ${actualPort}`
        );
        server.start();
      }
    );
  } catch (err) {
    console.error("❌ Fatal error starting gRPC server:", err);
    process.exit(1);
  }

  startConsumers();
}

start();
