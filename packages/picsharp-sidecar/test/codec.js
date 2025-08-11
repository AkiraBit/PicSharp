const sharp = require('sharp');

const testImage =
  '/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAAKAAD/7gAOQWRvYmUAZMAAAAAB/9sAhAAUEBAZEhknFxcnMiYfJjIuJiYmJi4+NTU1NTU+REFBQUFBQUREREREREREREREREREREREREREREREREREREREARUZGSAcICYYGCY2JiAmNkQ2Kys2REREQjVCRERERERERERERERERERERERERERERERERERERERERERERERERET/wAARCAAKAAoDASIAAhEBAxEB/8QAYQAAAwAAAAAAAAAAAAAAAAAAAwQGAQEAAAAAAAAAAAAAAAAAAAAAEAABAQUECwAAAAAAAAAAAAABAgAREjIDMVFhE/AhcYHRUoIzQ1MUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwAKF0ULGSKAVEn6HkAAQiLLNwMT4dcV4ZvNHsqdh9nj5tuDSFKdEtonl34Nf8NOlg//2Q==';

const testImageBuffer = Buffer.from(testImage, 'base64');
console.log('Test for JPG to HEIC, AVIF, WebP, JPEG2000, and JXL conversion...');

sharp('./test/tk.jpg')
  .heif({ compression: 'hevc' })
  .toFile('./test/tk.heic')
  .then((data) => {
    console.log('✅ HEIC');
  })
  .catch((e) => {
    console.log('Error: ' + e.message);
  });

sharp('./test/heic-test.HEIC')
  .avif()
  .toFile('./test/heic-test.avif')
  .then((data) => {
    console.log('✅ AVIF');
  })
  .catch((e) => {
    console.log('Error: ' + e.message);
  });

sharp(testImageBuffer)
  .webp()
  .toBuffer()
  .then((data) => {
    console.log('✅ WebP');
  })
  .catch((e) => {
    console.log('Error: ' + e.message);
  });

sharp('./test/heic-test.HEIC')
  .jp2()
  .toFile('./test/heic-test.jp2')
  .then((data) => {
    console.log('✅ JPEG 2000');
  })
  .catch((e) => {
    console.log('Error: ' + e.message);
  });

sharp('./test/heic-test.HEIC')
  .jxl()
  .toFile('./test/heic-test.jxl')
  .then((data) => {
    console.log('✅ JXL');
  })
  .catch((e) => {
    console.log('Error: ' + e.message);
  });
