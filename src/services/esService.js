import { Client } from "@elastic/elasticsearch";
import { configDotenv } from "dotenv";

configDotenv()
const client = new Client({
  node: process.env.ELASTIC_URL,
});

const addDataElastic = async (msg) => {
  const { doc, id, index } = msg;
  try {
    const response = await client.index({
      index: index,
      id: id,
      document: doc,
      refresh: "wait_for",
    });
    return response;
  } catch (error) {
    console.error("Lỗi khi thêm tài liệu:", error);
  }
};

const deleteDataElastic = async (msg) => {
  const { id, index } = msg;
  try {
    const response = await client.delete({
      index: index,
      id: id,
      refresh: "wait_for",
    });

    console.log(`Xóa tài liệu ID: ${id} thành công!`, response);
    return response;
  } catch (error) {
    if (error.statusCode === 404) {
      console.warn(`Không tìm thấy tài liệu ID: ${id} để xóa.`);
    } else {
      console.error("Lỗi khi xóa tài liệu:", error);
    }
  }
};

export { addDataElastic, deleteDataElastic };
