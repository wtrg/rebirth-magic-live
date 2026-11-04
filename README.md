# RE:BIRTH · Ma Pháp Bá Chủ Server

Vertical slice 3D cho Boss Raid tương tác với bình luận. Chạy cục bộ trên Windows với Node 24 và WebGL 2.

```powershell
npm ci
npm run build
npm start
```

Mở http://127.0.0.1:4173. Nhấn **Tham gia**, chọn class, bật **Tự đánh (MOCK)** hoặc dùng các nút tấn công, rồi nhấn **Bắt đầu Raid**. Đổi tên thử nghiệm để mô phỏng người chơi khác. Gõ `!pet 1`, `!stats`, `!rank` hoặc `!rebirth` trong ô bình luận. Nút **Dừng khẩn cấp** đóng hàng đợi hiện tại và tạm dừng trận.

Chọn **Raid luyện tập** để thử hiệu ứng chiến đấu của quà MOCK. Raid thường nhận EXP và điểm xếp hạng, còn quà chỉ hiện hiệu ứng chào mừng.

OBS Browser Source dùng URL `http://127.0.0.1:4173/?overlay=1` với chiều rộng 1080 và chiều cao 1920. Thêm `&quality=high` để thử chất lượng cao. Máy chủ mặc định chạy MOCK. Có thể cấu hình [chế độ TikTok LIVE](docs/LIVE_SETUP.md) khi có kênh và quyền phù hợp.

Dữ liệu nằm ở `data/rebirth.sqlite`. Dùng Ctrl+C để đóng máy chủ trước khi sao lưu thư mục `data`. Đặt `PORT` và `DB_PATH` qua biến môi trường nếu cần.

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
