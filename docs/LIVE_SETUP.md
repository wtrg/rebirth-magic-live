# Vận hành TikTok LIVE

MOCK là chế độ mặc định và chạy offline. LIVE là chế độ nhận sự kiện một chiều qua Euler Stream WebSocket. Tài liệu nhà cung cấp liệt kê gói Community miễn phí với WebSocket. Chỉ dùng gói Community trong phạm vi giới hạn hiện hành và chỉ kết nối kênh mà host được phép vận hành. Xem [giá và giới hạn](https://www.eulerstream.com/pricing) và [giao thức WebSocket](https://www.eulerstream.com/docs/api/tiktok-web-socket-api).

## Chuẩn bị

1. Cài Node 24, chạy `npm ci` và `npm run build`.
2. Xác nhận kênh sắp phát LIVE và quyền kết nối của host. Nếu dùng Euler, tạo khóa Community trên tài khoản được phép.
3. Đặt biến trong PowerShell. Đọc khóa từ lời nhắc ẩn và giữ khóa trên máy host.

```powershell
$env:REBIRTH_MODE = 'live'
$env:TIKTOK_CHANNEL = 'your_channel'
$env:EULER_API_KEY = Read-Host 'Euler Community API key' -MaskInput
$env:TIKTOK_GIFT_MAP = '{}'
npm start
```

Máy chủ mặc định chỉ nghe ở `127.0.0.1:4173`. Xem `/health` hoặc nhãn LIVE ở HUD để biết trạng thái. `connected` xác nhận nhà cung cấp báo đã kết nối phòng hoặc một sự kiện hợp lệ đã tới. LIVE dùng `data/rebirth-live.sqlite`, MOCK dùng `data/rebirth.sqlite` khi không đặt `DB_PATH`.

## Ánh xạ quà

Chỉ nhập gift ID đã đối chiếu với danh sách và giá quà thực tế của phiên phát. Biến `TIKTOK_GIFT_MAP` là JSON object với khóa gift ID và giá trị số 1, 5, 10, 20 hoặc 30 tương ứng với hiệu ứng game. Mặc định object rỗng vẫn nhận lệnh chat. Tên quà và số lượng trong streak không tự suy ra giá trị. Quà loại streak chỉ được xử lý khi hoàn tất. Raid xếp hạng chỉ hiển thị phản hồi hình ảnh. Raid luyện tập mới kích hoạt tác động chiến đấu.

## Mất kết nối

Khi nguồn gián đoạn, game, HUD và điều khiển cục bộ vẫn chạy. Adapter thử lại với backoff lên đến hai phút. Lỗi xác thực, quyền hoặc giới hạn nhà cung cấp đưa adapter về trạng thái từ chối. Kiểm tra lại cấu hình trước khi khởi động lại. Để chuyển hoàn toàn về MOCK, dừng máy chủ bằng Ctrl+C, đặt `$env:REBIRTH_MODE = 'mock'` và chạy lại `npm start`. Có thể bỏ khóa khỏi shell bằng `Remove-Item Env:EULER_API_KEY`. Máy chủ LIVE không nhận lệnh hoặc quà MOCK qua HTTP.

## Tiêu chí nghiệm thu phiên thật

- Một người xem gửi `!join` và xuất hiện đúng trong HUD. Dùng cùng tài khoản sau khi đổi tên hiển thị hoặc handle để kiểm tra định danh. Hồ sơ dùng ID số của TikTok làm khóa ổn định, còn handle và tên hiển thị được cập nhật từ sự kiện hợp lệ.
- Một lệnh hợp lệ thay đổi trạng thái trận. Một streak đã xác minh chỉ kích hoạt một hiệu ứng khi kết thúc.
- Rớt kết nối và kết nối lại. Kiểm tra HUD vẫn hoạt động, rồi nhận thêm một bình luận mới.
- Mở OBS Browser Source ở 1080×1920 và xác nhận bố cục, trạng thái LIVE và tiến độ trận.

Chạy `node scripts/live-loopback-qa.mjs` để kiểm tra server ở chế độ LIVE với nguồn Euler tổng hợp qua loopback. Bài thử xác minh bình luận, đòn đánh, gift streak hoàn tất, kết nối lại, loại sự kiện trùng và SQLite. Chỉ tiến trình thử dùng địa chỉ loopback và khóa giả.

Phiên TikTok LIVE thật, giá và gift ID thực tế, OBS và hiệu năng stream vẫn chờ nghiệm thu.
