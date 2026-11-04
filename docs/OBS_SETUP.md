# OBS Browser Source · RE:BIRTH

1. Chạy `npm run build` và `npm start`. Giữ trang điều khiển mở tại `http://127.0.0.1:4173`.
2. Trong **Settings → Video**, đặt **Base (Canvas)** và **Output (Scaled)** là **1080×1920**, đặt **Common FPS** là **30**.
3. Trong scene riêng, thêm **Browser Source** và nhập `http://127.0.0.1:4173/?overlay=1`. Đặt **Width 1080**, **Height 1920**. Dùng **Fit to Screen** nếu cần. Nếu bật **Use custom frame rate**, chọn **30**.
4. Giữ chất lượng mặc định để thử trên GPU tích hợp. URL `&quality=high` tăng độ phân giải render nội bộ. Dùng **Stats** để kiểm tra rendering lag và encoding lag trước khi dùng.
5. Bấm **Start Recording** để kiểm tra cục bộ. Trong trình duyệt, cho người chơi thử nghiệm tham gia, khởi động raid và kiểm tra trận từ lúc xuất hiện đến kết quả. Mở file ghi để kiểm tra cả HUD và video.
6. Nếu mất nguồn LIVE, HUD hiển thị trạng thái và adapter thử kết nối lại. Dùng **Dừng khẩn cấp** nếu cần dừng raid. Xem [LIVE setup](LIVE_SETUP.md) để chuyển về MOCK.

Bản QA sử dụng cấu hình OBS portable riêng. [OBS Portable Mode](https://obsproject.com/kb/portable-mode) · [OBS WebSocket stats](https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md#getstats)


## Âm thanh chiến đấu

Âm thanh tổng hợp mặc định tắt. Thêm `&audio=1` vào URL Browser Source, mở **Interact** của nguồn trong OBS rồi nhấn **Bật âm thanh**. Sau khi khởi tạo Web Audio, nút tự ẩn. Nếu nguồn tải lại, bật lại bằng **Interact**. Kiểm tra mức tín hiệu trong OBS Audio Mixer trước khi ghi.
