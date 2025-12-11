import amqp from "amqplib";
import { configDotenv } from "dotenv";
configDotenv();
const RABBIT_URL = process.env.RABBIT_URL;
let channel;

const initRabbit = async () => {
  if (!channel) {
    channel = await amqp.connect(RABBIT_URL);
    console.log("RabbitMQ connected!");
  }
  return channel;
};

const sendMessage = async (queue, message) => {
  const ch = await initRabbit();
  await ch.assertQueue(queue, { durable: true });
  ch.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
  console.log("Sent message:", message);
};

const consumeMessage = async (queue, callback) => {
  const ch = await initRabbit();
  await ch.assertQueue(queue, { durable: true });

  ch.consume(
    queue,
    async (msg) => {
      if (msg) {
        const message = JSON.parse(msg.content.toString());
        console.log("Received:", message);
        await callback(message);
        ch.ack(msg);
      }
    },
    { noAck: false }
  );
};

export { initRabbit, sendMessage, consumeMessage };
