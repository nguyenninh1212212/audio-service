import { initRabbit } from "../config/rabitmq.config.js";
import { addSongFingerprint, addSongEmbedding } from "./audioService.js";
import { addDataElastic, deleteDataElastic } from "./esService.js";

const startConsumers = async () => {
  const connection = await initRabbit();
  const chEmbedding = await connection.createChannel();
  await chEmbedding.assertQueue("song_embedding", { durable: true });
  chEmbedding.prefetch(1);

  chEmbedding.consume(
    "song_embedding",
    async (msg) => {
      if (!msg) return;
      const message = JSON.parse(msg.content.toString());
      console.log("[song_embedding] Received:", message);

      try {
        await addSongEmbedding(message);
        await addSongFingerprint(message);
        chEmbedding.ack(msg);
      } catch (err) {
        console.error("Error processing song_embedding message:", err);
        chEmbedding.nack(msg, false, true); // gửi lại message
      }
    },
    { noAck: false }
  );

  const chES = await connection.createChannel();
  await chES.assertQueue("song_es", { durable: true });
  chES.prefetch(1);

  chES.consume(
    "song_es",
    async (msg) => {
      if (!msg) return;
      const message = JSON.parse(msg.content.toString());
      console.log("[song_es] Received:", message);

      try {
        await addDataElastic(message);
        chES.ack(msg);
      } catch (err) {
        console.error("Error processing song_es message:", err);
        chES.nack(msg, false, true);
      }
    },
    { noAck: false }
  );
  const chESDel = await connection.createChannel();
  await chESDel.assertQueue("song_es_del", { durable: true });
  chESDel.prefetch(1);

  chESDel.consume(
    "song_es_del",
    async (msg) => {
      if (!msg) return;
      const message = JSON.parse(msg.content.toString());
      console.log("[song_es:del] Received:", message);

      try {
        await deleteDataElastic(message);
        chESDel.ack(msg);
      } catch (err) {
        console.error("Error processing song_es_del message:", err);
        chESDel.nack(msg, false, true);
      }
    },
    { noAck: false }
  );

  console.log("✔ Consumers initialized");
};

export default startConsumers;
