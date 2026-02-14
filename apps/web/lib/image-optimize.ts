export async function optimizeImageFile(file: File): Promise<string> {
  const source = await fileToDataUrl(file);
  const image = await loadImage(source);

  let width = image.width;
  let height = image.height;
  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return source;

  const targetBytes = 900 * 1024;
  let quality = 0.82;
  let output = source;
  let loop = 0;

  while (loop < 8) {
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    output = canvas.toDataURL('image/jpeg', quality);
    const estimated = estimateDataUrlBytes(output);
    if (estimated <= targetBytes) break;

    if (quality > 0.56) {
      quality -= 0.08;
    } else {
      width = Math.max(640, Math.round(width * 0.85));
      height = Math.max(640, Math.round(height * 0.85));
    }
    loop += 1;
  }

  return output;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('invalid image'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

function estimateDataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Math.floor((base64.length * 3) / 4);
}
