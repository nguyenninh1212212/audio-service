import protoLoader from "@grpc/proto-loader";
import grpc from "@grpc/grpc-js";
import dotenv from "dotenv";
dotenv.config();

const PROTO_PATH = "./proto/audio_embed.proto";
const packageDef = protoLoader.loadSync(PROTO_PATH);
const grpcProto = grpc.loadPackageDefinition(packageDef).audioembed;
const client = new grpcProto.AudioEmbed(
  process.env.AUDIO_EMBEDDING,
  grpc.credentials.createInsecure()
);

export default client;
