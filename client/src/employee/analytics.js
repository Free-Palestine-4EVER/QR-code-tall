// Pure client-side analytics over the orders array. No server aggregation needed.

const DAY = 86400000;
export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const startOfWeek = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Monday-start
  return d.getTime() - dow * DAY;
};
const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
};
export const rangeStart = (r) => (r === "day" ? startOfToday() : r === "week" ? startOfWeek() : startOfMonth());

const valid = (o) => o.status !== "cancelled";

export function stats(orders, range) {
  const start = rangeStart(range);
  const sel = orders.filter((o) => valid(o) && (o.createdAt || 0) >= start);
  const revenue = sel.reduce((s, o) => s + (o.total || 0), 0);
  const paid = sel.filter((o) => o.paid).reduce((s, o) => s + o.total, 0);
  const count = sel.length;
  const aov = count ? revenue / count : 0;
  const covers = sel.reduce((s, o) => s + o.items.reduce((n, l) => n + l.qty, 0), 0);

  // top items
  const itemMap = {};
  sel.forEach((o) =>
    o.items.forEach((l) => {
      const k = l.name?.en || l.id;
      itemMap[k] = itemMap[k] || { name: k, qty: 0, revenue: 0 };
      itemMap[k].qty += l.qty;
      itemMap[k].revenue += l.qty * l.price;
    })
  );
  const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 6);

  // payment split
  const byPay = { alfan: 0, counter: 0 };
  sel.forEach((o) => (byPay[o.payMethod] = (byPay[o.payMethod] || 0) + 1));

  // time buckets: hourly for day, daily otherwise
  let buckets;
  if (range === "day") {
    buckets = Array.from({ length: 24 }, (_, h) => ({ label: `${h}`, value: 0 }));
    sel.forEach((o) => {
      const h = new Date(o.createdAt).getHours();
      buckets[h].value += o.total;
    });
    buckets = buckets.slice(7, 24); // trading hours 7:00–23:00
  } else {
    const days = range === "week" ? 7 : new Date().getDate();
    buckets = Array.from({ length: days }, (_, i) => {
      const ts = start + i * DAY;
      const d = new Date(ts);
      return { label: range === "week" ? ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i] : `${d.getDate()}`, value: 0 };
    });
    sel.forEach((o) => {
      const i = Math.floor((o.createdAt - start) / DAY);
      if (buckets[i]) buckets[i].value += o.total;
    });
  }

  return { revenue, paid, count, aov, covers, topItems, byPay, buckets, start };
}

export const money = (n) => Math.round(n).toLocaleString("en-US");
