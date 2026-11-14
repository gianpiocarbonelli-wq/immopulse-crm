export function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const isImg =
      (file.type && file.type.startsWith('image/')) ||
      /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name || '');

    if (!isImg) {
      reject(new Error('File non immagine'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('Immagine oltre 10 MB'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Errore lettura file'));
    reader.onload = (evt) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Immagine non valida'));
      img.onload = () => {
        const maxDim = 720;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas non supportato'));
          return;
        }
        // White backdrop prevents transparent PNG floorplans from turning black in JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = String(evt.target?.result ?? '');
    };
    reader.readAsDataURL(file);
  });
}

export function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
