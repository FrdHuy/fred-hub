// 从小屋里加照片：在浏览器里缩小（小图 360px、大图 1600px，按照片自带的方向转正），压成 JPEG。
// 之后由 memory.js 加密、上传——原图不会离开这台设备。
const MAX = 650000;                                          // 加密后还要转成文字，单张控制在约 650KB 以内
async function shrink(bitmap, edge, quality) {
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height)), canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (let q = quality; ; q -= .08) {
    const blob = await new Promise(done => canvas.toBlob(done, 'image/jpeg', q));
    if (blob.size <= MAX || q < .45) return { bytes: new Uint8Array(await blob.arrayBuffer()), w: canvas.width, h: canvas.height };
  }
}
// 一张照片 → { thumb, full, w, h, date }。读不了的格式（比如部分浏览器里的 HEIC）返回 null。
export async function preparePhoto(file) {
  let bitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { return null; }
  const [thumb, full] = [await shrink(bitmap, 360, .74), await shrink(bitmap, 1600, .84)]; bitmap.close?.();
  const taken = new Date(file.lastModified || Date.now());
  return { thumb: thumb.bytes, full: full.bytes, w: full.w, h: full.h, date: `${taken.getFullYear()}-${String(taken.getMonth() + 1).padStart(2, '0')}-${String(taken.getDate()).padStart(2, '0')}` };
}
