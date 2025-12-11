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

// Load Protobuf Definition
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDef).audio;

// LẤY PORT TỪ BIẾN MÔI TRƯỜNG CỦA RENDER
const RENDER_PORT = process.env.PORT || 50051;
const HOST = "0.0.0.0";
const GRPC_ADDRESS = `${HOST}:${RENDER_PORT}`;

// --- HÀM KHỞI TẠO HTTP HEALTH CHECK (EXPRESS) ---
// Hàm này chạy riêng và xử lý lỗi xung đột cổng
function startHealthCheckServer(HOST) {
  const app = express();

  // Endpoint Health Check cho Render
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", service: "gRPC Health Check" });
  });

  const httpServer = http.createServer(app);

  // Express/HTTP cố gắng lắng nghe
  httpServer.listen(8001, HOST, () => {
    console.log(`✅ HTTP Health Check (Express) running at ${HOST}:${8001}`);
  });

  httpServer.on("error", (e) => {
    // XỬ LÝ EADDRINUSE: Nếu gRPC đã chiếm cổng (thành công), ta bỏ qua lỗi này.
    if (e.code === "EADDRINUSE") {
      console.warn(
        `⚠️ Port ${PORT} already in use. Assuming gRPC server is handling HTTP/2.`
      );
    } else {
      console.error("❌ HTTP Server Error:", e);
    }
  });
}

async function start() {
  try {
    console.log("⏳ Connecting MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected!"); // 1. KHỞI ĐỘNG SERVER gRPC (Dịch vụ chính)

    const grpcServer = new grpc.Server();

    grpcServer.addService(proto.AudioSearch.service, {
      SearchSong: searchSong,
      GetRecommendSongs: GetRecommendSongs,
    });

    // BẮT BUỘC dùng bindAsync()
    grpcServer.bindAsync(
      GRPC_ADDRESS,
      grpc.ServerCredentials.createInsecure(),
      (err, actualPort) => {
        if (err) {
          console.error("❌ gRPC bind error:", err); // KHÔNG RETURN: Thử tiếp Health Check Server (Bước 2)
        } else {
          console.log(
            `🚀 gRPC Audio Fingerprint Server running at port ${actualPort}`
          );
          grpcServer.start();
        }
      }
    ); // 2. KHỞI ĐỘNG HEALTH CHECK (HTTP/1.1)

    // Server này sẽ cố gắng chiếm cổng, nếu gRPC chiếm trước, nó sẽ báo EADDRINUSE và bỏ qua lỗi.
    startHealthCheckServer(HOST);
  } catch (err) {
    console.error("❌ Fatal error during startup:", err);
    process.exit(1);
  }

  startConsumers();
}

start();
