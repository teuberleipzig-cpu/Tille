export function imageToJpeg(file, options = {}) {
  const ratio = options.ratio || 1;
  const width = options.width || 1000;
  const height = options.height || Math.round(width / ratio);
  const quality = options.quality || 0.86;

  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      const sourceRatio = image.width / image.height;
      let sx = 0;
      let sy = 0;
      let sw = image.width;
      let sh = image.height;

      if (sourceRatio > ratio) {
        sw = image.height * ratio;
        sx = (image.width - sw) / 2;
      } else {
        sh = image.width / ratio;
        sy = (image.height - sh) / 2;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };

    image.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
    image.src = url;
  });
}
