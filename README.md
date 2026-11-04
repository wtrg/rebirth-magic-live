# RE:BIRTH · Ma Pháp Bá Chủ Server

Vertical slice 3D cho Boss Raid tương tác với bình luận. Chạy cục bộ trên Windows với Node 24 và WebGL 2.

```powershell
npm ci
npm run build
npm start
```

Mở http://127.0.0.1:4173. Nhấn **Tham gia**, chọn class, bật **Tự đánh (MOCK)** hoặc dùng các nút tấn công, rồi nhấn **Bắt đầu Raid**. Đổi tên thử nghiệm để mô phỏng người chơi khác. Gõ `!pet 1`, `!stats`, `!rank` hoặc `!rebirth` trong ô bình luận. Nút **Dừng khẩn cấp** đóng hàng đợi hiện tại và tạm dừng trận.

OBS Browser Source dùng URL `http://127.0.0.1:4173/?overlay=1` với chiều rộng 1080 và chiều cao 1920. Thêm `&quality=high` để thử chất lượng cao. Bản dựng dùng MOCK. Adapter LIVE chưa có nguồn TikTok đã xác minh.

Dữ liệu nằm ở `data/rebirth.sqlite`. Dùng Ctrl+C để đóng máy chủ trước khi sao lưu thư mục `data`. Đặt `PORT` và `DB_PATH` qua biến môi trường nếu cần.

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
node scripts/smoke.mjs
```

[Master Plan](docs/MASTER_PLAN.md) · [Thiết kế game](docs/GAME_DESIGN.md) · [Kiến trúc](docs/ARCHITECTURE.md) · [Báo cáo](docs/reports)

Original project source and procedural geometry are MIT. See [THIRD_PARTY.md](THIRD_PARTY.md) for dependency attributions.
