import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import startConsumers from "./services/startCosumer.js";
import { searchSong, GetRecommendSongs } from "./services/audioService.js";

// --- THÊM THƯ VIỆN EXPRESS VÀ HTTP ---
import express from "express";
import http from "http";
// ------------------------------------

const PROTO_PATH = "./proto/audio.proto";

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDef).audio;

// LẤY PORT TỪ BIẾN MÔI TRƯỜNG CỦA RENDER
const RENDER_PORT = process.env.PORT || 50051; // 50051 là cổng mặc định cho local dev/test
const HOST = "0.0.0.0";
const GRPC_ADDRESS = `${HOST}:${RENDER_PORT}`;

async function start() {
  try {
    console.log("⏳ Connecting MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected!"); // 1. KHỞI ĐỘNG SERVER gRPC
    // 1. KHỞI ĐỘNG SERVER gRPC (Chỉ gọi gRPC)
    const grpcServer = new grpc.Server();

    grpcServer.addService(proto.AudioSearch.service, {
      SearchSong: searchSong,
      GetRecommendSongs: GetRecommendSongs,
    });

    grpcServer.bindAsync(
      GRPC_ADDRESS, // SỬ DỤNG CỔNG CỦA RENDER
      grpc.ServerCredentials.createInsecure(),
      (err, actualPort) => {
        if (err) {
          console.error("❌ gRPC bind error:", err);
          return;
        }
        console.log(
          `🚀 gRPC Audio Fingerprint Server running at port ${actualPort}`
        );
        grpcServer.start();
      }
    ); // 2. KHỞI ĐỘNG HEALTH CHECK (Đã loại bỏ tạm thời) // startHealthCheckServer();
  } catch (err) {
    console.error("❌ Fatal error starting gRPC server:", err);
    process.exit(1);
  }

  startConsumers();
}

start();
