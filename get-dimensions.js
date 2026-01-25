import sharp from 'sharp';
const meta = await sharp('public/images/logo_color_250.webp').metadata();
console.log(`${meta.width}x${meta.height}`);
