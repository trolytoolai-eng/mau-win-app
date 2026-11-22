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
| `rating`, `reviews` | sao và số review (từ `td_item_basic`). App dùng chúng, cùng danh mục và giá, để ước tính **rủi ro hoàn hủy** (Thấp/Vừa/Cao). Topview không có tỉ lệ hoàn hủy thật |

## Giới hạn của bản demo

- Trạng thái mẫu chỉ lưu trong `localStorage` của từng trình duyệt, chưa dùng chung giữa các máy.
- Một số trạng thái ban đầu là giả lập. Menu có nút "Đặt lại dữ liệu demo".
- Chưa có job quét tự động.

## Triển khai Vercel

1. vercel.com > Add New > Project > chọn repo này.
2. Framework Preset: **Other**. Không cần Build Command hay Output Directory. Deploy.

## Làm tiếp để chạy thật

- Job quét 00:00 (Vercel Cron + hàm `api/scan`) gọi Tabcut API, ghi ra `data/products.js` hoặc DB.
- Lưu trạng thái dùng chung (Google Sheet qua Apps Script, hoặc Supabase/Firebase).
- Khi có nguồn tỉ lệ hoàn hủy thật (Seller Center/Open API hoặc Kalodata), hiệu chỉnh công thức rủi ro theo ~20 sản phẩm có số thật.

## Bộ lọc danh sách demo
Danh sách là 27 sản phẩm thời trang nữ (Topview, VN, 22/11/2026) qua các bước:
1. Mới phát hiện từ 01/11, bán ≥ 300 đơn trong 7 ngày, ≤ 25 creator.
2. **Tăng trưởng đơn 7 ngày ≥ ×2** so với 7 ngày trước (sản phẩm chưa có đơn kỳ trước hiện là "Mới bán").
3. Loại sản phẩm đã nguội (đơn 2 ngày gần nhất < 35% đỉnh) hoặc chỉ có 1-3 ngày có đơn.
4. Loại sản phẩm giá dưới 30.000đ.
Ads/ROAS chỉ có cho vài sản phẩm cũ; sản phẩm mới ghi "Chưa quét ads".

## Doanh thu theo nguồn (video / live / thẻ sản phẩm)
- Mỗi sản phẩm có `mix`: `{v, l, c, g}` = doanh thu 7 ngày (15–21/11) từ video, live, thẻ sản phẩm (đơn không qua video/live) và tổng. Mỗi nguồn có `r` (tỉ lệ), `o` (đơn), `g` (₫). Nguồn: Topview `td_item_v2_sales_mode_distribution`.
- App chỉ hiển thị sản phẩm có doanh thu video >= ngưỡng (mặc định 5tr, chọn 10tr / 20tr / Tất cả ở Hàng mẫu và Win Video).
- 32 sản phẩm trong dữ liệu, 12 sản phẩm đạt ngưỡng 5tr. Ảnh lấy 640px từ Tabcut (nguồn tối đa 500px).
