/**
 * Resizes and compresses an image file to a lightweight base64 string
 * suitable for avatar/logo and localStorage storage (typically ~20-40KB).
 */
export async function compressImageFile(
  file: File,
  maxDimension: number = 360,
  quality: number = 0.88
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem'));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagem inválido'));

      img.onload = () => {
        try {
          let { width, height } = img;

          // Scale down proportionally if larger than maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback to original reader result
            resolve(e.target?.result as string);
            return;
          }

          // Enable smooth scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(img, 0, 0, width, height);

          // Prefer WebP if supported, fallback to PNG / JPEG
          let compressedDataUrl = canvas.toDataURL('image/webp', quality);
          if (!compressedDataUrl.startsWith('data:image/webp')) {
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(compressedDataUrl);
        } catch (err) {
          // If canvas fails, fallback to raw reader result
          resolve(e.target?.result as string);
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
