export type RankableBid = {
  id: bigint | number;
  userId: string;
  amountSatang: number;
  username: string;
};

export type BidderRanking<T extends RankableBid> = {
  userId: string;
  username: string;
  /** ยอดที่ลูกค้าคนนี้เพิ่มเองสะสมทั้งหมด (ไม่รวมยอดที่คนอื่นเพิ่ม) */
  satang: number;
  /** บิดล่าสุดของลูกค้าคนนี้ ใช้อ้างอิงบัตรที่ผูกไว้ */
  lastBid: T;
};

/**
 * จัดอันดับลูกค้าของโฮสต์หนึ่งคนจากบิดทั้งหมด (ต้องเป็นบิดของรายการประมูลเดียวกัน)
 *
 * amountSatang ของแต่ละบิดคือยอดรวมสะสมของโฮสต์ ณ เวลานั้น ดังนั้นยอดที่ลูกค้าเพิ่มเอง
 * คือส่วนต่างจากบิดก่อนหน้า ตรรกะนี้ต้องตรงกับ /api/auction/customer-drips
 * เพื่อให้อันดับที่แสดงกับคนที่ถูกตัดเงินเป็นคนเดียวกัน
 *
 * ผลลัพธ์เรียงจากอันดับ 1 ลงไป (ยอดเท่ากันเรียงตาม username)
 */
export function rankBidders<T extends RankableBid>(bids: T[]): BidderRanking<T>[] {
  const ordered = [...bids].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const byUser = new Map<string, BidderRanking<T>>();
  let previousTotal = 0;

  for (const bid of ordered) {
    const added = Math.max(0, bid.amountSatang - previousTotal);
    previousTotal = bid.amountSatang;
    const entry = byUser.get(bid.userId) ?? { userId: bid.userId, username: bid.username, satang: 0, lastBid: bid };
    entry.satang += added;
    entry.lastBid = bid;
    byUser.set(bid.userId, entry);
  }

  return Array.from(byUser.values())
    .filter((row) => row.satang > 0)
    .sort((a, b) => b.satang - a.satang || a.username.localeCompare(b.username));
}
