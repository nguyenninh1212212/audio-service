# Giai đoạn 1: Build (Nếu bạn cần build, ví dụ: TypeScript)
# (Bỏ qua giai đoạn này nếu bạn không dùng TypeScript hoặc không có bước build)

# Giai đoạn 2: Production
# Sử dụng một image Node.js chính thức, gọn nhẹ (Alpine)
FROM node:18-alpine

# Đặt thư mục làm việc bên trong container
WORKDIR /app

# Sao chép tệp package.json và package-lock.json (hoặc yarn.lock)
# Giả sử các tệp này nằm ở thư mục gốc của bạn
COPY package.json package-lock.json ./

# Cài đặt chỉ các dependencies cần thiết cho production
# 'npm ci' nhanh hơn và an toàn hơn 'npm install' cho CI/CD
RUN npm ci --only=production

# Sao chép toàn bộ mã nguồn của dự án vào
# (Tệp .dockerignore sẽ loại bỏ các tệp không cần thiết)
COPY . .

# Expose cổng mà server gRPC của bạn đang chạy
# 50051 là cổng gRPC phổ biến, HÃY THAY ĐỔI nếu bạn dùng cổng khác
EXPOSE 50051

# Lệnh để khởi chạy ứng dụng
# Giả sử bạn có script "start" trong package.json
# Ví dụ: "start": "node src/grpc/server.js"
CMD [ "npm", "start" ]