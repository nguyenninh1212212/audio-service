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

// --- HÀM HỖ TRỢ: BIẾN bindAsync THÀNH ĐỒNG BỘ ---
async function startGrpcServerSafe(grpcServer, GRPC_ADDRESS) {
  return new Promise((resolve, reject) => {
    // Sử dụng bindAsync chính thức của gRPC
    grpcServer.bindAsync(
      GRPC_ADDRESS,
      grpc.ServerCredentials.createInsecure(),
      (err, actualPort) => {
        if (err) {
          // Nếu gRPC thất bại trong việc chiếm cổng, đây là lỗi FATAL.
          return reject(err);
        }

        // Khởi động gRPC server sau khi bind thành công
        grpcServer.start();
        console.log(
          `🚀 gRPC Audio Fingerprint Server running at port ${actualPort}`
        );
        resolve(grpcServer);
      }
    );
  });
}

// --- HÀM KHỞI TẠO HTTP HEALTH CHECK (EXPRESS) ---
// Hàm này chạy riêng và xử lý lỗi xung đột cổng EADDRINUSE
function startHealthCheckServer(PORT, HOST) {
  const app = express();

  // Endpoint Health Check cho Render
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", service: "gRPC Health Check" });
  });

  const httpServer = http.createServer(app);

  // Express/HTTP cố gắng lắng nghe
  httpServer.listen(PORT, HOST, () => {
    console.log(`✅ HTTP Health Check (Express) running at ${HOST}:${PORT}`);
  });

  httpServer.on("error", (e) => {
    // XỬ LÝ EADDRINUSE: Bỏ qua lỗi nếu gRPC đã chiếm cổng thành công.
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
    console.log("✅ MongoDB connected!"); // 1. KHỞI ĐỘNG SERVER gRPC (ƯU TIÊN TUYỆT ĐỐI BẰNG AWAIT)

    const grpcServer = new grpc.Server();

    grpcServer.addService(proto.AudioSearch.service, {
      SearchSong: searchSong,
      GetRecommendSongs: GetRecommendSongs,
    }); // CHỜ (AWAIT) cho gRPC bind và start thành công trước khi tiếp tục

    await startGrpcServerSafe(grpcServer, GRPC_ADDRESS); // 2. KHỞI ĐỘNG HEALTH CHECK (HTTP/1.1)

    // Express sẽ cố gắng chiếm cổng và thất bại (EADDRINUSE), nhưng lỗi sẽ được bỏ qua.
    startHealthCheckServer(RENDER_PORT, HOST);
  } catch (err) {
    console.error("❌ Fatal error during startup:", err);
    process.exit(1);
  }

  startConsumers();
}

start();
