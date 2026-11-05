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


## Đội hình của phiên hiện tại

Mỗi lần máy chủ khởi động, đội hình bắt đầu trống. Người xem gửi `!join` để khôi phục hồ sơ đã lưu và tham gia phiên này. Tối đa 64 người cùng ở trong đội. Hồ sơ lưu trong SQLite vẫn có thể nhiều hơn 64.

Dùng `!leave` giữa các trận để rời đội, hoặc nút **Giải tán đội hình** để host cho đội hình về trống. Người rời đội vẫn giữ tiến trình và điểm xếp hạng. Lệnh rời đội hoặc giải tán bị từ chối trong trận. Boss chỉ tính độ khó theo những người đang ở trong đội.


## Tự đánh thường

Người xem gửi `!auto on` sau khi tham gia; dùng `!auto off` để dừng hoặc `!auto` để xem trạng thái qua log. Trong bảng MOCK, checkbox **Tự đánh thường** gửi cùng lệnh đó cho nhân vật đang chọn. Đây là lựa chọn được lưu theo hồ sơ, mặc định tắt với người mới.

Server tự ra đòn thường khi nhân vật còn sống và raid đang chiến đấu. Không cần giữ trang điều khiển mở. Đòn tự động và `!attack` dùng chung cooldown 600 ms; `!skill1`, `!skill2`, `!ult` vẫn do người xem dùng. Hàng đợi bình luận của nhịp xử lý được áp dụng trước đòn tự động. **Dừng khẩn cấp** dừng cả tự đánh. Khi adapter mất kết nối, game cục bộ vẫn chạy; host có thể pause. Host vẫn phải mở từng raid mới.

## Bố cục điều khiển

Ở cửa sổ desktop từ 1000×700, đấu trường, đội hình và footer nằm trong màn hình; bảng điều khiển bên phải cuộn riêng. Nhóm mở raid/dừng/tiếp tục nằm đầu bảng và giữ vị trí khi cuộn. Có thể dùng Tab để đi tới các điều khiển; mục được chọn tự cuộn vào vùng nhìn thấy. Nhật ký dài và danh sách đóng góp có vùng cuộn bàn phím riêng.

Cửa sổ hẹp dùng một cột; cửa sổ thấp hơn 700 px dùng cuộn trang thông thường để mọi mục vẫn truy cập được. Màn hình OBS tiếp tục dùng URL overlay và tỷ lệ 9:16.
