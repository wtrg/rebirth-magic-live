# Sao lưu và khôi phục RE:BIRTH

## Sao lưu

Dùng SQLite Online Backup để chụp dữ liệu đã commit, kể cả khi máy chủ đang chạy ở chế độ WAL. Lệnh kiểm tra tính toàn vẹn của snapshot và chỉ tạo file đích mới. Chọn đường dẫn đích trên ổ NTFS hoặc hệ thống tệp hỗ trợ hard link.

```powershell
node scripts/backup.ts data/rebirth.sqlite data/backups/mock-2026-11-05.sqlite
```

Với LIVE, dùng `data/rebirth-live.sqlite` hoặc đường dẫn `DB_PATH` mà máy chủ đang dùng. Giữ snapshot ở máy hoặc nơi lưu trữ riêng. Snapshot có thể chứa hồ sơ người chơi và dấu nhận sự kiện.

## Khôi phục

Dừng máy chủ bằng Ctrl+C, rồi sao chép snapshot vào một đường dẫn mới để giữ cả bản đang dùng lẫn bản sao lưu.

```powershell
node scripts/backup.ts data/backups/mock-2026-11-05.sqlite data/restored-mock.sqlite
$env:REBIRTH_MODE = 'mock'
$env:DB_PATH = 'data/restored-mock.sqlite'
npm start
```

Gửi `!join` bằng định danh người chơi cũ rồi xác nhận cấp độ, pet, bảng xếp hạng và phụ bản đã mở khóa trong HUD. Máy chủ khởi động ở trạng thái chờ, với phụ bản đang mở gần nhất. HP boss và hiệu ứng tạm của trận dở được khởi tạo lại. Database v1 tự nâng lên v2 và bắt đầu lưu phụ bản từ mốc 1 vì bản cũ chưa từng ghi giá trị này.

`node scripts/smoke.mjs` kiểm tra sao lưu khi server còn chạy, phục hồi vào database riêng, rồi đối chiếu pet, cấp độ, xếp hạng, phụ bản và việc chặn sự kiện đã xử lý. [Node SQLite Backup](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html#sqlitebackup-sourcedb-path-options)
