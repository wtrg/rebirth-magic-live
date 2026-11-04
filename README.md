# RE:BIRTH · Ma Pháp Bá Chủ Server

Bản ứng viên 0.2.0-rc.1 cho Boss Raid 3D tương tác với bình luận. [Phạm vi và bằng chứng QA](docs/RELEASE_CANDIDATE.md). Chạy cục bộ trên Windows với Node 24 và WebGL 2.

```powershell
npm ci
npm run build
npm start
```

Mở http://127.0.0.1:4173. Nhấn **Tham gia**, chọn class, bật **Tự đánh (MOCK)** hoặc dùng các nút tấn công, rồi nhấn **Bắt đầu Raid**. Đổi tên thử nghiệm để mô phỏng người chơi khác. Gõ `!pet 1`, `!stats`, `!rank` hoặc `!rebirth` trong ô bình luận. Nút **Dừng khẩn cấp** đóng hàng đợi hiện tại và tạm dừng trận.

Thắng raid xếp hạng để nhận trang bị theo số trận đã thắng. Xem túi bằng `!inventory` và dùng `!equip ember`, `!equip aegis` hoặc `!equip eclipse` giữa các trận. Bảng điều khiển MOCK có danh sách trang bị đã sở hữu.

Ba mảnh linh thú đầu mở ba pet. Sau đó, dùng mảnh kiếm thêm từ raid xếp hạng để nâng pet lên tối đa cấp 5 giữa các trận. Dùng `!pet 1` đến `!pet 3` để gọi và `!petup` để nâng pet đang gọi. Kỹ năng II kích hoạt chiêu riêng của pet.

Chọn **Raid luyện tập** để thử hiệu ứng chiến đấu của quà MOCK. Raid thường nhận EXP và điểm xếp hạng, còn quà chỉ hiện hiệu ứng chào mừng.

[Hướng dẫn OBS](docs/OBS_SETUP.md). Browser Source dùng URL `http://127.0.0.1:4173/?overlay=1` với chiều rộng 1080 và chiều cao 1920. Thêm `&quality=high` để thử chất lượng cao. Máy chủ mặc định chạy MOCK. Có thể cấu hình [chế độ TikTok LIVE](docs/LIVE_SETUP.md) khi có kênh và quyền phù hợp.

Dữ liệu MOCK mặc định nằm ở `data/rebirth.sqlite`. Tiến trình phụ bản được lưu sau mỗi trận thắng xếp hạng. Xem [sao lưu và khôi phục](docs/RECOVERY.md). Đặt `PORT` và `DB_PATH` qua biến môi trường nếu cần.

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
node scripts/smoke.mjs
```

## Ghi và phát lại một phiên MOCK

Đặt biến trước khi khởi động máy chủ. Chỉ dùng tên người chơi thử nghiệm.

```powershell
$env:REBIRTH_RECORD_REPLAY = '1'
npm start
```

Sau khi chơi, tải replay và chạy lại mô phỏng trong một cửa sổ PowerShell khác.

```powershell
Invoke-WebRequest http://127.0.0.1:4173/replay -OutFile data/rebirth-mock-replay.json
node scripts/replay.ts data/rebirth-mock-replay.json
```

Replay khởi tạo từ hồ sơ MOCK lúc máy chủ bật, rồi áp dụng các bước đã xử lý theo thứ tự và thời điểm gốc. Lệnh phát lại in trạng thái cuối và không mở database. Bản ghi nằm trong bộ nhớ cho tới khi xuất, giới hạn 10.000 bước. Nếu vượt giới hạn, trường `truncated` báo rằng file chỉ chứa phần đầu. Máy chủ LIVE không ghi hoặc xuất replay.

[Master Plan](docs/MASTER_PLAN.md) · [Thiết kế game](docs/GAME_DESIGN.md) · [Kiến trúc](docs/ARCHITECTURE.md) · [Báo cáo](docs/reports)

Original project source and procedural geometry are MIT. See [THIRD_PARTY.md](THIRD_PARTY.md) for dependency attributions.
