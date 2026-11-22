/* Quản Lý Mẫu Win - webapp mobile demo (không cần build).
   Dữ liệu: data/products.js. Trạng thái lưu trong localStorage của trình duyệt. */
(function () {
'use strict';

var D = window.APP_DATA, P = D.products, DAYS = D.days;
var TABS = ['tong-quan', 'hang-mau', 'win-video', 'menu'];
var VIEW = { 'tong-quan': 'v-home', 'hang-mau': 'v-sample', 'win-video': 'v-win', 'menu': 'v-menu' };
var ST = ['Mới quét', 'Đã nhận mẫu', 'KOCs đang quay', 'Đã quay xong'];
var KEY = 'qlmau-v2';
var S = {}, tab = 'tong-quan', openId = null, lastUndo = null, toastT = null;
var segSample = 'chua', todayOnly = true, sortA = 'vg', query = '';
var VKEY = 'qlmau-vmin', VOPTS = [[0, 'Tất cả'], [5e6, 'Video ≥ 5tr'], [10e6, 'Video ≥ 10tr'], [20e6, 'Video ≥ 20tr']], vmin = 5e6;

var I = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
var SHOPICON = '<svg viewBox="0 0 24 24" ' + I + '><path d="M3 9l1.5-5h15L21 9"/><path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0"/><path d="M5 12v8h14v-8"/></svg>';
var CATICON = '<svg viewBox="0 0 24 24" ' + I + '><path d="M8 3l-5 3 2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 01-8 0z"/></svg>';

/* ---------- tiện ích ---------- */
function $(id) { return document.getElementById(id); }
function nf(n) { return n.toLocaleString('vi-VN'); }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
function norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase(); }
function byId(id) { return P.filter(function (x) { return x.id === id; })[0]; }
function p2(n) { return ('0' + n).slice(-2); }
function isToday(ts) { return !!ts && new Date(ts).toDateString() === new Date().toDateString(); }
function when(ts) {
  var d = new Date(ts), tm = p2(d.getHours()) + ':' + p2(d.getMinutes());
  return isToday(ts) ? 'hôm nay ' + tm : p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + ' ' + tm;
}
function dm(iso) { var a = iso.split('-'); return a[2] + '/' + a[1]; }
function pct(v) { return v.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%'; }
function tr(v) { return (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + 'tr'; }
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } }

/* ---------- dữ liệu dẫn xuất ---------- */
P.forEach(function (p) {
  p.o7 = sum(p.days); p.rev = p.o7 * p.price; p.last = p.days[6];
  p.growth = p.o7 / Math.max(p.prev, 1);
  var vs = p.videos.slice().sort(function (a, b) { return b.orders - a.orders || b.views - a.views; });
  p.best = vs[0] || null;
  p.vOrders = p.best ? p.best.orders : 0;
  p.winDate = p.best && p.best.orders > 0 ? p.best.date : null;
  p.roas = p.videos.reduce(function (m, v) { return v.roas > m ? v.roas : m; }, 0) || null;
  p.vsorted = vs;
  p.vg = p.mix.v.g; p.lg = p.mix.l.g; p.cg = p.mix.c.g; p.tg = p.mix.g;
});
/* Danh sách đang hiển thị: chỉ sản phẩm có doanh thu video 7 ngày >= ngưỡng */
function V() { return P.filter(function (p) { return p.vg >= vmin; }); }

/* ---------- trạng thái (demo có seed) ---------- */
function seed() {
  var now = Date.now(), m = 60000, h = 3600000, o = {}, ids = P.filter(function (p) { return p.vg >= 5e6; }).sort(function (x, y) { return y.rev - x.rev; }).map(function (p) { return p.id; });
  /* demo: 5 mẫu đã nhận (3 hôm nay, 1 hôm qua), 1 đang quay, 1 đã quay xong; còn lại là mới quét */
  o[ids[3]] = { s: 1, rcv: now - 50 * m };
  o[ids[5]] = { s: 1, rcv: now - 35 * m };
  o[ids[8]] = { s: 1, rcv: now - 20 * m };
  o[ids[11]] = { s: 1, rcv: now - 26 * h };
  o[ids[1]] = { s: 2, rcv: now - 3 * h, asg: now - 2 * h };
  o[ids[0]] = { s: 3, rcv: now - 5 * h, asg: now - 4 * h, done: now - h };
  return o;
}
function load() {
  var r = null;
  try { r = JSON.parse(lsGet(KEY) || 'null'); } catch (e) { r = null; }
  S = (r && typeof r === 'object') ? r : seed();
}
function loadV() { var n = parseFloat(lsGet(VKEY)); if (VOPTS.some(function (o) { return o[0] === n; })) vmin = n; }
function save() { lsSet(KEY, JSON.stringify(S)); }
function st(p) { return S[p.id] || { s: 0 }; }
/* Ước tính rủi ro hoàn hủy từ rating, review, danh mục, giá (Topview không có số hoàn hủy thật). 0-1 Thấp, 2-3 Vừa, 4+ Cao */
function risk(p) {
  var f = [], sc = 0, rv = p.total > 0 ? p.reviews / p.total * 100 : 0, rt = p.rating ? p.rating.toLocaleString('vi-VN', { minimumFractionDigits: 1 }) : '';
  function add(pts, t) { sc += pts; f.push({ pts: pts, t: t }); }
  if (!p.rating) add(1, 'Chưa có rating: chưa đủ dữ liệu chất lượng');
  else if (p.rating < 4.3) add(2, 'Rating thấp: ' + rt + ' sao');
  else if (p.rating < 4.6) add(1, 'Rating trung bình: ' + rt + ' sao');
  else add(0, 'Rating tốt: ' + rt + ' sao' + (p.reviews < 10 ? ' (mới ' + p.reviews + ' review, chưa chắc)' : ''));
  add(1, 'Thời trang nữ: hoàn hủy nền cao (sai size, lệch màu)');
  if (p.price < 100000 && p.o7 >= 300) add(1, 'Giá dưới 100k và bán rất nhanh: dễ đơn bom, đơn hủy');
  if (rv < 1) add(1, 'Chỉ ' + p.reviews + ' review trên ' + nf(p.total) + ' đơn (' + pct(rv) + '): chưa đủ dữ liệu chất lượng');
  else f.push({ pts: 0, t: p.reviews + ' review trên ' + nf(p.total) + ' đơn (' + pct(rv) + '): ổn' });
  var lv = sc >= 4 ? 'high' : (sc >= 2 ? 'mid' : 'low');
  return { score: sc, lv: lv, label: { low: 'Thấp', mid: 'Vừa', high: 'Cao' }[lv], f: f };
}
function trend(p) {
  var pk = Math.max.apply(null, p.days), nz = p.days.filter(function (v) { return v > 0; }).length, l = p.days[6], l2 = (p.days[5] + p.days[6]) / 2;
  if (nz <= 2) return { c: 'spike', tx: '⚡ Đột biến', full: '⚡ Đột biến, chưa ổn định' };
  if (l2 >= pk * 0.7) return { c: 'up', tx: '📈 Đang lên', full: '📈 Đang lên' };
  if (l < pk * 0.35) return { c: 'down', tx: '📉 Nguội', full: '📉 Đang nguội' };
  return { c: 'flat', tx: '➖ Qua đỉnh', full: '➖ Đã qua đỉnh' };
}
function spark(p) {
  var pk = Math.max.apply(null, p.days) || 1, o = '';
  p.days.forEach(function (v, k) {
    var h = Math.max(2, Math.round(v / pk * 26));
    o += '<rect x="' + (k * 10) + '" y="' + (28 - h) + '" width="7" height="' + h + '" rx="2" fill="' + (v === pk ? '#c2185b' : '#e8588a') + '"/>';
  });
  return '<svg viewBox="0 0 70 28" role="img" aria-label="Đơn mỗi ngày: ' + p.days.join(', ') + '">' + o + '</svg>';
}

/* ---------- đổi trạng thái ---------- */
function snap(id) { return JSON.parse(JSON.stringify(S[id] || { s: 0 })); }
function change(id, fn, msg) {
  var prev = snap(id); fn(); save(); lastUndo = { id: id, prev: prev }; render(); toast(msg);
}
function receive(id) { change(id, function () { S[id] = { s: 1, rcv: Date.now() }; }, 'Đã nhận mẫu'); }
function assign(id) { change(id, function () { var c = snap(id); c.s = 2; c.asg = Date.now(); S[id] = c; }, 'Đã giao KOCs quay'); }
function finish(id) { change(id, function () { var c = snap(id); c.s = 3; c.done = Date.now(); S[id] = c; }, 'Đã quay xong'); }
function back1(id) {
  var c = snap(id); if (c.s <= 0) return;
  change(id, function () {
    if (c.s === 3) { delete c.done; c.s = 2; }
    else if (c.s === 2) { delete c.asg; c.s = 1; }
    else { c = { s: 0 }; }
    if (c.s === 0) delete S[id]; else S[id] = c;
  }, 'Đã hoàn tác');
}
function toast(msg) {
  $('tmsg').textContent = msg;
  var t = $('toast'); t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 5000);
}
function undoLast() {
  if (!lastUndo) return;
  var u = lastUndo; lastUndo = null;
  if (u.prev.s === 0) delete S[u.id]; else S[u.id] = u.prev;
  save(); $('toast').hidden = true; render();
}

/* ---------- HTML từng phần ---------- */
function growTag(p) {
  return '<span class="tg grow">' + (p.prev <= 5 ? '🆕 Mới bán' : '📈 ×' + (p.o7 / Math.max(p.prev, 1)).toLocaleString('vi-VN', { maximumFractionDigits: p.o7 / Math.max(p.prev, 1) < 10 ? 1 : 0 })) + '</span>';
}
function refTag(p) {
  var k = risk(p);
  return '<span class="tg risk ' + k.lv + '">↩ Rủi ro hoàn hủy: ' + k.label + '</span>';
}
function pc(r) { return Math.round(r * 100) + '%'; }
function mixBar(p) {
  var m = p.mix;
  return '<div class="mixbar" role="img" aria-label="Doanh thu: video ' + pc(m.v.g / p.tg) + ', live ' + pc(m.l.g / p.tg) + ', thẻ sản phẩm ' + pc(m.c.g / p.tg) + '"><i class="mv" style="flex:' + m.v.g + '"></i><i class="ml" style="flex:' + m.l.g + '"></i><i class="mc" style="flex:' + m.c.g + '"></i></div>';
}
function mixText(p) {
  return '<p class="mixt"><span class="v">Video <b>' + tr(p.vg) + '</b></span><span class="l">Live ' + tr(p.lg) + '</span><span class="c">Thẻ SP ' + tr(p.cg) + '</span></p>';
}
function thumb(p) {
  var t = trend(p);
  return '<div class="thumb"><img alt="" src="' + p.img + '" loading="lazy"><span class="badge ' + t.c + '">' + t.tx + '</span></div>';
}
function info(p, showState) {
  var s = st(p);
  return '<div class="info"><h2 class="nm">' + esc(p.title) + '</h2><p class="shopn">' + esc(p.shop) + ' · ' + esc(p.cat) + '</p>' +
    '<p class="big"><b>' + nf(p.o7) + '</b> đơn · ' + tr(p.rev) + '</p>' + mixBar(p) + mixText(p) +
    (showState ? '<span class="chipst s' + s.s + '">' + ST[s.s] + '</span>' : '<div class="mini">' + spark(p) + '<span>' + p.creators + ' creator · ' + p.vids + ' video</span></div>') +
    '<div class="tags">' + growTag(p) + refTag(p) + (p.roas ? '<span class="tg roas">ROAS ' + p.roas.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '</span>' : '') + '</div></div>';
}
function rowHTML(p, mode) {
  var s = st(p), act = '';
  if (mode === 'sample') {
    if (s.s === 0) act = '<button type="button" class="btn pri" data-a="rcv" data-id="' + p.id + '">✔ Đã nhận mẫu</button>';
    else if (s.s === 1) act = '<span class="stat s1">Đã nhận · ' + when(s.rcv) + '</span><button type="button" class="btn pri" data-a="asg" data-id="' + p.id + '">🎬 Giao KOCs quay</button>';
    else if (s.s === 2) act = '<span class="stat s2">🎬 KOCs đang quay</span><button type="button" class="btn pri" data-a="fin" data-id="' + p.id + '">✔ Đã quay xong</button>';
    else act = '<span class="stat s3">✔ Quay xong ' + when(s.done) + '</span><button type="button" class="btn ghost" data-a="back" data-id="' + p.id + '">Hoàn tác</button>';
  }
  return '<article class="row" data-id="' + p.id + '" tabindex="0" role="button" aria-label="' + esc(p.shop) + ': ' + nf(p.o7) + ' đơn trong 7 ngày. Mở chi tiết">' +
    thumb(p) + info(p, mode === 'home') + (act ? '<div class="act">' + act + '</div>' : '') + '</article>';
}
function winRow(p) {
  var tag = p.winDate ? '<span class="tg win">🎬 Win ' + dm(p.winDate) + '</span>' : '<span class="tg nowin">Chưa có video ra đơn</span>';
  var num = p.videos.length ? p.vOrders : '—';
  return '<article class="wrow" data-id="' + p.id + '" tabindex="0" role="button" aria-label="' + esc(p.shop) + ': video tốt nhất ' + num + ' đơn. Mở chi tiết">' +
    '<div class="wthumb"><img alt="" src="' + p.img + '" loading="lazy"></div>' +
    '<div class="winfo"><h2 class="nm">' + esc(p.title) + '</h2><p class="shopn">' + esc(p.shop) + '</p>' + mixBar(p) + mixText(p) +
    '<div class="tags">' + tag + growTag(p) + refTag(p) + (p.roas ? '<span class="tg roas">ROAS ' + p.roas.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '</span>' : '') + '</div></div>' +
    '<div class="wnum"><b>' + num + '</b><span>đơn video</span></div></article>';
}
function vminHTML() {
  return VOPTS.map(function (o) { return '<button type="button" class="seg" data-vmin="' + o[0] + '" aria-pressed="' + (vmin === o[0]) + '">' + o[1] + '</button>'; }).join('');
}
function empty(msg) { return '<div class="empty">' + msg + '</div>'; }
function sortBy(a, k) { return a.sort(function (x, y) { return y[k] - x[k]; }); }

/* ---------- các màn ---------- */
function renderHome() {
  var c = [0, 0, 0, 0], wait = 0, L = V();
  L.forEach(function (p) { var s = st(p); c[s.s]++; if (s.s === 1 && isToday(s.rcv)) wait++; });
  var d = new Date();
  $('homesub').textContent = 'Demo · ' + L.length + ' sản phẩm' + (vmin ? ' có doanh thu video ≥ ' + tr(vmin) : '') + ', tăng trưởng ≥ ×2 · ' + p2(d.getDate()) + '/' + p2(d.getMonth() + 1);
  var tiles = [['Mới quét', c[0], '', 'chua'], ['Đã nhận mẫu', c[1], wait + ' nhận hôm nay', 'cho'], ['KOCs đang quay', c[2], '', 'quay'], ['Đã quay xong', c[3], '', 'xong']];
  $('stats').innerHTML = tiles.map(function (t) {
    return '<button type="button" class="tile" data-go="hang-mau" data-seg="' + t[3] + '"><b>' + t[1] + '</b><span>' + t[0] + '</span>' + (t[2] ? '<small>' + t[2] + '</small>' : '') + '</button>';
  }).join('');
  var todo = '';
  if (c[0]) todo += '<button type="button" class="todo" data-go="hang-mau" data-seg="chua"><span class="n">' + c[0] + '</span>mẫu chưa nhận, nhân viên cần kiểm hàng<span class="go">›</span></button>';
  if (wait) todo += '<button type="button" class="todo" data-go="hang-mau" data-seg="cho"><span class="n">' + wait + '</span>mẫu nhận hôm nay, chờ giao KOCs quay<span class="go">›</span></button>';
  if (c[2]) todo += '<button type="button" class="todo" data-go="hang-mau" data-seg="quay"><span class="n">' + c[2] + '</span>mẫu KOCs đang quay, chờ cập nhật<span class="go">›</span></button>';
  $('todo').innerHTML = todo || empty('Không có việc cần làm.');
  $('topList').innerHTML = sortBy(L.slice(), 'vg').slice(0, 3).map(function (p) { return rowHTML(p, 'home'); }).join('');
}
function segBtns(el, defs, cur, counts) {
  el.innerHTML = defs.map(function (d, i) {
    return '<button type="button" class="seg" data-seg="' + d[0] + '" aria-pressed="' + (cur === d[0]) + '">' + d[1] + '<span class="n">' + counts[i] + '</span></button>';
  }).join('');
}
function renderSample() {
  var L = V(), cnt = [0, 0, 0, 0]; L.forEach(function (p) { cnt[st(p).s]++; });
  $('vminS').innerHTML = vminHTML();
  segBtns($('segSample'), [['chua', 'Chưa nhận'], ['cho', 'Chờ giao'], ['quay', 'Đang quay'], ['xong', 'Đã xong'], ['all', 'Tất cả']], segSample, [cnt[0], cnt[1], cnt[2], cnt[3], L.length]);
  var q = norm(query.trim()), want = { chua: 0, cho: 1, quay: 2, xong: 3 }[segSample];
  var showOpts = segSample === 'cho' && !q;
  $('optsSample').hidden = !showOpts;
  $('todayBtn').setAttribute('aria-pressed', String(todayOnly));
  var items = L.filter(function (p) {
    var s = st(p);
    if (!q) {
      if (want !== undefined && s.s !== want) return false;
      if (showOpts && todayOnly && !isToday(s.rcv)) return false;
    }
    return !q || norm(p.title + ' ' + p.shop + ' ' + p.id).indexOf(q) >= 0;
  });
  sortBy(items, showOpts ? sortA : 'vg');
  var label = q ? 'tìm trong tất cả' : (segSample === 'cho' ? 'chờ giao' + (todayOnly ? ', nhận hôm nay' : '') + ' · ưu tiên theo ' + $('sortA').selectedOptions[0].text.toLowerCase() : 'sắp theo doanh thu video 7 ngày');
  $('cntSample').textContent = items.length + ' sản phẩm · ' + label;
  var hint = { chua: 'Không còn sản phẩm nào chờ nhận mẫu.', cho: 'Chưa có mẫu nào chờ giao. Nhân viên bấm “Đã nhận mẫu” ở mục Chưa nhận, hoặc tắt lọc “Nhận hôm nay”.', quay: 'Chưa có mẫu nào đang quay.', xong: 'Chưa có video nào quay xong.', all: 'Không có sản phẩm.' }[segSample];
  $('sampleList').innerHTML = items.length ? items.map(function (p) { return rowHTML(p, 'sample'); }).join('') : empty(q ? 'Không tìm thấy sản phẩm nào.' : hint);
}
function renderWin() {
  var items = V().sort(function (a, b) { return b.vOrders - a.vOrders || b.o7 - a.o7; });
  var n = items.filter(function (p) { return p.vOrders > 0; }).length;
  $('vminW').innerHTML = vminHTML();
  $('cntWin').textContent = items.length + ' sản phẩm · ' + n + ' có video ra đơn';
  $('winList').innerHTML = items.map(winRow).join('');
}
function renderBadge() {
  var n = V().filter(function (p) { return st(p).s === 0; }).length, b = $('bdg');
  b.hidden = !n; b.textContent = n;
}

/* ---------- chi tiết ---------- */
function videoRows(p) {
  if (!p.videos.length) return '<div class="empty">Chưa có video nào gắn link sản phẩm này.</div>';
  return p.vsorted.map(function (v) {
    var meta = nf(v.views) + ' lượt xem · ' + dm(v.date) + (v.ads ? ' · có chạy ads (chi ₫' + nf(v.adCost) + ')' : '') + (v.followers ? ' · ' + nf(v.followers) + ' follow' : '');
    return '<div class="vid"><a href="' + v.url + '" target="_blank" rel="noopener">@' + esc(v.handle) + ' ↗</a>' +
      '<span class="o' + (v.orders > 0 ? ' win' : '') + '">' + nf(v.orders) + ' đơn</span>' +
      '<span class="s">' + esc(meta) + '</span><span class="s roas" style="text-align:right">' + (v.roas ? 'ROAS ' + v.roas.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : '') + '</span></div>';
  }).join('');
}
function mixHTML(p) {
  var m = p.mix, rows = [['v', 'Video', m.v], ['l', 'Live', m.l], ['c', 'Thẻ sản phẩm', m.c]];
  return '<section class="mixsec"><h3>Doanh thu 7 ngày theo nguồn <small>(' + tr(p.tg) + ')</small></h3>' + mixBar(p) +
    rows.map(function (r) {
      return '<div class="mrow ' + r[0] + '"><i></i><b>' + r[1] + '</b><span class="mo">' + nf(r[2].o) + ' đơn</span><span class="mg">' + tr(r[2].g) + '</span><span class="mp">' + pc(r[2].g / p.tg) + '</span></div>';
    }).join('') + '<small>Thẻ sản phẩm = đơn không qua video hay live (thẻ sản phẩm, trang shop, tìm kiếm và nguồn khác). Doanh thu video ' + (p.vg >= vmin || !vmin ? 'đạt' : 'chưa đạt') + ' ngưỡng ' + (vmin ? tr(vmin) : 'lọc') + '.</small></section>';
}
function detailHTML(p) {
  var t = trend(p), s = st(p), peak = Math.max.apply(null, p.days) || 1, bars = '', labels = '';
  p.days.forEach(function (v, k) {
    var h = Math.max(3, Math.round(v / peak * 96)), cls = v === peak ? 'col peak' : (v >= peak * 0.6 ? 'col mid' : 'col');
    bars += '<div class="' + cls + '"><span class="v">' + v + '</span><div class="b" style="height:' + h + 'px"></div></div>';
    labels += '<div><b>' + DAYS[k].d + '</b>' + DAYS[k].n + '</div>';
  });
  var mult = (p.o7 / Math.max(p.prev, 1)).toLocaleString('vi-VN', { maximumFractionDigits: 0 });
  var kpi = '<div class="kpis"><div><b>' + p.creators + '</b><span>creator</span></div><div><b>' + p.vids + '</b><span>video gắn link</span></div><div><b>' + (p.prev <= 5 ? 'Mới' : '×' + mult) + '</b><span>kỳ trước chỉ ~' + nf(p.prev) + ' đơn</span></div></div>';
  var line = ST[s.s] + (s.s >= 1 && s.rcv ? ' · nhận ' + when(s.rcv) : '');
  var k = risk(p);
  return '<div class="photos one"><img alt="Ảnh sản phẩm" src="' + p.img + '"><span class="badge ' + t.c + '">' + t.full + '</span></div>' +
    '<span class="stat s' + s.s + '">' + esc(line) + '</span>' +
    '<h2 class="t">' + esc(p.title) + '</h2>' +
    '<div class="chips"><span class="chip shop">' + SHOPICON + esc(p.shop) + '</span><span class="chip cat">' + CATICON + esc(p.cat) + '</span></div>' +
    '<p class="sum">7 ngày: <b>' + nf(p.o7) + ' đơn</b> · ' + tr(p.rev) + '</p>' +
    '<div><div class="bars" role="img" aria-label="Đơn mỗi ngày: ' + p.days.join(', ') + '">' + bars + '</div><div class="labels">' + labels + '</div></div>' +
    mixHTML(p) +
    '<section class="mix"><h3>Chỉ số lọc</h3>' + kpi + '<p class="ads" style="margin-top:10px"><b>Ads:</b> ' + esc(p.ads) + '<br><b>ROAS:</b> ' + (p.roas ? p.roas.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) : 'chưa có') + ' · Ra mắt ' + esc(p.found) + '</p></section>' +
    '<section class="riskbox ' + k.lv + '"><h3>Rủi ro hoàn hủy: ' + k.label + ' <small>(' + k.score + ' điểm)</small></h3><ul>' + k.f.map(function (x) { return '<li class="' + (x.pts ? 'bad' : 'ok') + '"><b>' + (x.pts ? '+' + x.pts : '0') + '</b><span>' + esc(x.t) + '</span></li>'; }).join('') + '</ul><small>Ước tính từ chỉ số Topview, không phải số hoàn hủy thật của TikTok. Dùng để ưu tiên chọn mẫu.</small></section>' +
    '<section><h3 class="sec" style="margin:4px 0 8px">Video ra đơn (' + p.videos.length + '/' + p.videoTotal + ' video)</h3>' + videoRows(p) + '</section>' +
    '<p class="insight">' + esc(p.insight) + '</p>' +
    '<div class="meta"><span>Giá ₫' + nf(p.price) + ' · tổng ' + nf(p.total) + ' đơn</span><a class="open" href="https://www.tiktok.com/view/product/' + p.id + '" target="_blank" rel="noopener">Mở trên TikTok Shop ↗</a></div>';
}
function sheetActHTML(p) {
  var s = st(p);
  if (s.s === 0) return '<button type="button" class="btn pri" data-a="rcv" data-id="' + p.id + '">✔ Đã nhận mẫu</button>';
  if (s.s === 1) return '<button type="button" class="btn ghost" data-a="back" data-id="' + p.id + '">Hoàn tác</button><button type="button" class="btn pri" data-a="asg" data-id="' + p.id + '">🎬 Giao KOCs quay</button>';
  if (s.s === 2) return '<button type="button" class="btn ghost" data-a="back" data-id="' + p.id + '">Hoàn tác</button><button type="button" class="btn pri" data-a="fin" data-id="' + p.id + '">✔ Đã quay xong</button>';
  return '<button type="button" class="btn ghost" data-a="back" data-id="' + p.id + '">Hoàn tác</button>';
}
var sheet = $('sheet'), sheetBody = $('sheetbody');
function renderSheet() {
  var p = openId && byId(openId); if (!p) return;
  var sc = sheet.scrollTop;
  sheetBody.innerHTML = detailHTML(p);
  $('sheetact').innerHTML = sheetActHTML(p);
  sheet.scrollTop = sc;
}
function showSheet(id) {
  if (!byId(id)) return;
  openId = id; sheet.hidden = false; document.body.classList.add('lock'); renderSheet(); sheet.scrollTop = 0;
}
function hideSheet() { openId = null; sheet.hidden = true; document.body.classList.remove('lock'); }

/* ---------- điều hướng ---------- */
function setTab(name) {
  if (TABS.indexOf(name) < 0) name = 'tong-quan';
  tab = name;
  TABS.forEach(function (n) { $(VIEW[n]).hidden = (n !== name); });
  Array.prototype.forEach.call(document.querySelectorAll('.nav button[data-tab]'), function (b) {
    if (b.dataset.tab === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  render(); window.scrollTo(0, 0);
}
function go(name, seg) {
  if (name === 'hang-mau' && seg) segSample = seg;
  if (location.hash === '#' + name) setTab(name); else location.hash = name;
}
function route() {
  var h = location.hash.replace('#', '');
  if (h.indexOf('sp-') === 0) { showSheet(h.slice(3)); return; }
  hideSheet(); setTab(h || 'tong-quan');
}
function render() {
  renderBadge();
  if (tab === 'tong-quan') renderHome(); else if (tab === 'hang-mau') renderSample(); else if (tab === 'win-video') renderWin();
  if (openId) renderSheet();
}

/* ---------- sự kiện ---------- */
function onAction(e) {
  var b = e.target.closest('button[data-a]'); if (!b) return false;
  e.stopPropagation();
  var id = b.dataset.id, a = b.dataset.a;
  if (a === 'rcv') receive(id); else if (a === 'asg') assign(id); else if (a === 'fin') finish(id); else if (a === 'back') back1(id);
  return true;
}
function openProduct(id) { location.hash = 'sp-' + id; }
document.addEventListener('click', function (e) {
  if (onAction(e)) return;
  var n = e.target.closest('.nav button[data-tab]'); if (n) { go(n.dataset.tab); return; }
  if (e.target.closest('#fab')) { query = ''; $('q').value = ''; go('hang-mau', 'all'); setTimeout(function () { $('q').focus(); }, 80); return; }
  var g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go, g.dataset.seg); return; }
  var vb = e.target.closest('[data-vmin]'); if (vb) { vmin = parseFloat(vb.dataset.vmin); lsSet(VKEY, String(vmin)); render(); return; }
  var sg = e.target.closest('#segSample .seg'); if (sg) { segSample = sg.dataset.seg; render(); return; }
  if (e.target.closest('#todayBtn')) { todayOnly = !todayOnly; render(); return; }
  var r = e.target.closest('.row, .wrow'); if (r && r.dataset.id) { openProduct(r.dataset.id); return; }
});
document.addEventListener('keydown', function (e) {
  var t = e.target;
  if ((e.key === 'Enter' || e.key === ' ') && t.classList && (t.classList.contains('row') || t.classList.contains('wrow'))) { e.preventDefault(); openProduct(t.dataset.id); }
  if (e.key === 'Escape' && openId) $('back').click();
});
$('q').addEventListener('input', function (e) { query = e.target.value; renderSample(); });
$('sortA').addEventListener('change', function (e) { sortA = e.target.value; renderSample(); });
$('tundo').addEventListener('click', undoLast);
$('back').addEventListener('click', function () {
  if (location.hash.indexOf('#sp-') === 0) { if (history.length > 1) history.back(); else location.hash = 'tong-quan'; }
  else hideSheet();
});
var resetArmed = false, resetT = null;
$('reset').addEventListener('click', function () {
  var b = this;
  if (!resetArmed) {
    resetArmed = true; b.textContent = 'Bấm lần nữa để đặt lại';
    clearTimeout(resetT); resetT = setTimeout(function () { resetArmed = false; b.textContent = 'Đặt lại dữ liệu demo'; }, 4000);
    return;
  }
  resetArmed = false; b.textContent = 'Đặt lại dữ liệu demo';
  S = seed(); save(); lastUndo = null; render(); toast('Đã đặt lại dữ liệu demo');
});
window.addEventListener('hashchange', route);

loadV(); load(); route();
})();
