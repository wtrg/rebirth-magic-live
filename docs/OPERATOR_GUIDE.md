# Vận hành RE:BIRTH

## Trước buổi thử

1. Cài Node 24. Chạy `npm ci`, `npm run build`, rồi `npm start`.
2. Mở `http://127.0.0.1:4173` để điều khiển. Xem `/health` hoặc nhãn trên HUD để xác nhận chế độ.
3. Dùng [hướng dẫn OBS](OBS_SETUP.md) để thiết lập Browser Source 1080×1920. Ghi thử và xem lại đoạn có HP boss, trạng thái kết nối và kết quả trận. Âm thanh là tùy chọn.
4. Với dữ liệu đang dùng, tạo [snapshot SQLite](RECOVERY.md) trước khi đổi phiên bản.

## Trong trận

- **Bắt đầu Raid** mở trận xếp hạng và cho phần thưởng từ đóng góp chiến đấu. Quà ở chế độ này chỉ hiện phản hồi hình ảnh.
- **Raid luyện tập** cho phép tác động của quà. Kết quả luyện tập không cấp EXP, trang bị, pet hay điểm xếp hạng.
- Trong MOCK, cho người chơi thử vào bằng `!join`, chọn class và dùng các nút kỹ năng. Từ phụ bản 3, có thể nhắm Ảnh Linh bằng `!attack left` hoặc `!attack right`.
- **Dừng khẩn cấp** tạm dừng đồng hồ trận và xóa hàng đợi hiện tại. **Tiếp tục** khôi phục đồng hồ. Tránh dùng nút tiếp tục khi sự cố dữ liệu chưa được xử lý.

## Khi có sự cố

- HUD báo kết nối lại: kiểm tra server cục bộ và Browser Source. Nếu khởi động lại server, phụ bản đã mở và tiến trình người chơi còn trong SQLite. Trận dở quay về trạng thái chờ.
- LIVE báo mất kết nối: giữ overlay hoặc tạm dừng trận trong khi adapter thử lại. Nếu cần tập offline, dừng server rồi chuyển về MOCK theo [hướng dẫn LIVE](LIVE_SETUP.md).
- Phục hồi dữ liệu: dừng server, khôi phục vào file mới và đặt `DB_PATH` sang file đó. Kiểm tra cấp độ, pet, trang bị, xếp hạng và phụ bản trước khi chơi tiếp. [Quy trình khôi phục](RECOVERY.md)

Windows MOCK đã có bản ứng viên. TikTok LIVE thật và gift ID thực tế vẫn chờ một phiên thử được phép.


## Dừng máy chủ có xử lý hàng đợi

Ctrl+C gửi yêu cầu dừng trong terminal. Cũng có thể dừng từ PowerShell bằng endpoint local.

```powershell
Invoke-WebRequest http://127.0.0.1:4173/admin -Method Post -ContentType application/json -Headers @{Origin='http://127.0.0.1:4173'} -Body '"shutdown"'
```

Máy chủ ngừng nhận sự kiện mới, xử lý phần hàng đợi đã nhận rồi đóng kết nối và SQLite. Khi cần sao lưu hoặc đổi phiên bản, chờ tiến trình kết thúc trước khi khởi động lại. Thao tác kết thúc cưỡng bức qua Task Manager có thể bỏ các sự kiện còn trong bộ nhớ.
