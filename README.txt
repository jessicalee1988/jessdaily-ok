JESSICA DAILY V1.9 – NHẬP ORDER TỪ ZALO

1. Giải nén và tải toàn bộ nội dung thư mục (bao gồm api/) lên repository GitHub.
2. Vercel tự triển khai lại dự án; không cần build command.
3. Để AI phân tích ảnh và văn bản, vào Vercel > Project > Settings > Environment Variables, tạo GEMINI_API_KEY với khóa API của bạn. Redeploy sau khi thêm biến.
4. Nếu chưa cấu hình khóa, dán văn bản vẫn có thể dùng bộ nhận diện cơ bản chạy trên thiết bị. Đọc ảnh chỉ hoạt động khi có GEMINI_API_KEY.
5. Vào tab Nhập từ Zalo > dán văn bản hoặc chọn ảnh > Phân tích & điền nháp > kiểm tra biểu mẫu Thêm order > Lưu.
6. Tất cả dữ liệu order vẫn được lưu trong localStorage của trình duyệt (không đồng bộ). Xuất JSON sao lưu trước khi cập nhật.
7. Không đưa khóa API vào GitHub, index.html hay app.js. Không gửi ảnh chứa thông tin nhạy cảm không cần thiết.
8. API không có cơ chế đăng nhập hoặc giới hạn tốc độ riêng. Trước khi sử dụng rộng rãi, cần bổ sung xác thực, hạn mức yêu cầu và lưu trữ trực tuyến.
