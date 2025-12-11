import fs from "fs";
import { spawn } from "child_process";
import path from "path";

export async function getAudioEmbedding(audioBuffer, songId) {
  // 1. Lưu tạm file (giữ nguyên)
  const tmpFilePath = path.resolve(`./tmp_${songId}.mp3`);
  fs.writeFileSync(tmpFilePath, audioBuffer); // 2. Gọi Python (giữ nguyên)

  return new Promise((resolve, reject) => {
    const py = spawn("python", [
      "./py/audio_embedding.py",
      "--file",
      tmpFilePath,
      "--song_id",
      songId,
    ]);

    let output = "";
    py.stdout.on("data", (data) => (output += data.toString()));
    py.stderr.on("data", (data) => console.error(data.toString())); // Vẫn in lỗi Python

    py.on("close", (code) => {
      // 3. Xóa file tạm (giữ nguyên)
      fs.unlinkSync(tmpFilePath);

      if (code !== 0) {
        // Kiểm tra lỗi nếu Python thoát với mã lỗi khác 0
        return reject(
          new Error(
            `Python process failed with code ${code}. Output: ${output}`
          )
        );
      }

      try {
        // Lọc chuỗi JSON hợp lệ: Tìm chuỗi bắt đầu bằng '{' và kết thúc bằng '}' cuối cùng.
        // Điều này giúp loại bỏ các logs/warnings nằm ngoài chuỗi JSON.
        const jsonMatch = output.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
          throw new Error("Could not find valid JSON object in Python output.");
        }
        const jsonString = jsonMatch[0];
        const result = JSON.parse(jsonString);
        resolve(result.embedding); // trả về array embedding
      } catch (e) {
        // Ném lỗi parsing JSON, bao gồm cả output gốc để debug
        reject(
          new Error(`Failed to parse JSON: ${e.message}. Raw Output: ${output}`)
        );
      }
    });
  });
}
