# Quản Lý Mẫu Win

Webapp mobile (demo) cho luồng làm việc với sản phẩm TikTok Shop "win":

1. **00:00** quét danh sách sản phẩm đủ tiêu chí (demo: 10 sản phẩm lấy từ Topview).
2. **08:00** nhân viên kiểm hàng, bấm **Đã nhận mẫu** (tab *Hàng mẫu*).
3. Trợ lý lọc **Chờ giao** + **Nhận hôm nay**, ưu tiên doanh thu, bấm **Giao KOCs quay**.
4. KOCs quay xong thì bấm **Đã quay xong**.

Tab **Win Video**: với mỗi sản phẩm, video bán được nhiều đơn nhất (số đơn video, ngày đăng, ROAS nếu có).

## Chạy thử

Không cần build. Mở `index.html`, hoặc `npx serve .`

## Cấu trúc

```
index.html        giao diện
css/app.css       style
js/app.js         logic (trạng thái, lọc, màn hình)
data/products.js  dữ liệu demo (window.APP_DATA)
img/<itemId>.jpg  ảnh sản phẩm
vercel.json       cấu hình Vercel (static)
```

## Dữ liệu

`data/products.js` lấy từ Topview MCP (nguồn Tabcut, trễ 1-2 ngày, số ước tính). Doanh thu = số đơn x giá niêm yết.

| Trường | Ý nghĩa |
|---|---|
| `days` | đơn 7 ngày 15/11-21/11 |
| `prev` | đơn 7 ngày trước đó (suy ra từ tỷ lệ tăng trưởng) |
| `videos[]` | video gắn link: `orders`, `views`, `date`, `adCost`, `roas` |
| `refund` | tỉ lệ hoàn hủy (%). **Topview không có**, để `null`; nhập tay trong trang chi tiết (lưu ở trình duyệt) |

## Giới hạn của bản demo

- Trạng thái mẫu (và hoàn hủy nhập tay) chỉ lưu trong `localStorage` của từng trình duyệt, chưa dùng chung giữa các máy.
- Một số trạng thái ban đầu là giả lập. Menu có nút "Đặt lại dữ liệu demo".
- Chưa có job quét tự động.

## Triển khai Vercel

1. vercel.com > Add New > Project > chọn repo này.
2. Framework Preset: **Other**. Không cần Build Command hay Output Directory. Deploy.

## Làm tiếp để chạy thật

- Job quét 00:00 (Vercel Cron + hàm `api/scan`) gọi Tabcut API, ghi ra `data/products.js` hoặc DB.
- Lưu trạng thái dùng chung (Google Sheet qua Apps Script, hoặc Supabase/Firebase).
- Nguồn tỉ lệ hoàn hủy (ví dụ Kalodata API) để điền `refund` tự động.
