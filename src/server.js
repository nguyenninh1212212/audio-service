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
const RENDER_PORT = 50051; // 50051 là cổng mặc định cho local dev/test
const HOST = "0.0.0.0";
const GRPC_ADDRESS = `${HOST}:${RENDER_PORT}`;

function startHealthCheckServer() {
  const app = express();

  // Endpoint Health Check cho Render
  app.get("/health", (req, res) => {
    // Trả về 200 OK để Render xác nhận cổng đang mở
    res.status(200).json({ status: "OK", service: "gRPC Health Check" });
  });

  const httpServer = http.createServer(app);

  httpServer.listen(RENDER_PORT, HOST, () => {
    console.log(`✅ HTTP Health Check running at ${HOST}:${RENDER_PORT}`);
  });

  httpServer.on("error", (e) => {
    // Xử lý lỗi nếu cổng đã bị chiếm (ít khả năng xảy ra nếu gRPC chưa start)
    if (e.code === "EADDRINUSE") {
      console.warn(`Port ${RENDER_PORT} already in use.`);
    } else {
      console.error("HTTP Server Error:", e);
    }
  });
}

async function start() {
  try {
    console.log("⏳ Connecting MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected!"); // 1. KHỞI ĐỘNG SERVER gRPC

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
    );

    // 2. KHỞI ĐỘNG HEALTH CHECK (HTTP/1.1)
    startHealthCheckServer();
  } catch (err) {
    console.error("❌ Fatal error starting gRPC server:", err);
    process.exit(1);
  }

  startConsumers();
}

start();
