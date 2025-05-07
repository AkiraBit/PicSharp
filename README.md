<div align="center">
  <a href="" target="_blank">
    <img src="./doc/logo.png" alt="PicSharp Logo" width="20%" />
  </a>
  <h1>PicSharp</h1>
  <br>
</div>

A simple, efficient, and flexible cross-platform desktop image compression application.

## Supported Platforms

- **Mac:** Available
- **Windows:** Coming soon
- **Linux:** Coming soon

## Features

- **Powerful Batch Processing:** Based on Rust implementation, it scans selected files or directories with high performance and low resource consumption, identifying and processing image files within them. Even 100,000+ images can be handled with ease.
- **TinyPNG Integration:** Optional TinyPNG compression is available, with account pool management for automatic selection during task processing. Supported image formats: PNG/Animated PNG, JPEG, WebP, AVIF.
- **Offline Compression Support:** Fully localized processing with rich compression option configurations (compression level, lossy/lossless, etc.). Supported image formats: PNG, JPEG, WebP/Animated WebP, AVIF, TIFF, GIF, SVG.
- **Combined Compression Strategies:** TinyPNG offers the best compression ratio but requires an internet connection, is less efficient for large numbers of images, and is not suitable for sensitive images. Offline compression is slightly less effective than TinyPNG but offers extremely high batch processing efficiency, requires no internet connection, and ensures privacy and security. During compression, both strategies are automatically combined to achieve optimal processing efficiency.
- **Automatic Compression Mode:** Select folders to monitor, and images added to these folders will be automatically compressed, enhancing your workflow.
- **Convenient Operations:** Drag and drop files into the application or onto the application icon for quick opening, select files or directories in Mac Finder and choose a compression method from the "Services" menu, and more.
- **Rich Application Configuration:** Offers dark/light themes, multiple languages, system notifications, startup on boot, save methods for processed images, save locations, number of parallel tasks, and more.
- **Open Integration:** Provides image compression invocation capabilities via DeepLink, allowing automation tools to call it and enhance your workflow.
