import Scheduler from './scheduler';
import {
  CompressionMode,
  ConvertFormat,
  VALID_TINYPNG_IMAGE_EXTS,
  ResizeFit,
  WatermarkType,
  WatermarkPosition,
} from '../constants';
import { CompressionOutputMode, CompressionType } from '../constants';
import { draw, isFunction } from 'radash';
import { captureError } from '.';

export namespace ICompressor {
  export type Options = {
    concurrency?: number;
    compressionMode?: CompressionMode;
    limitCompressRate?: number;
    tinifyApiKeys?: string[];
    compressionLevel?: number;
    compressionType?: CompressionType;
    save?: Partial<{
      mode: CompressionOutputMode;
      newFileSuffix: string;
      newFolderPath: string;
    }>;
    tempDir: string;
    sidecarDomain?: string;
    convertEnable?: boolean;
    convertTypes?: ConvertFormat[];
    convertAlpha?: string;
    resizeDimensions?: [number, number];
    resizeEnable?: boolean;
    resizeFit?: ResizeFit;
    watermarkType?: WatermarkType;
    watermarkPosition?: WatermarkPosition;
    watermarkText?: string;
    watermarkTextColor?: string;
    watermarkFontSize?: number;
    watermarkImagePath?: string;
    watermarkImageOpacity?: number;
    watermarkImageScale?: number;
    keepMetadata?: boolean;
  };

  export enum Status {
    // 待处理
    Pending = 'pending',
    // 处理中
    Processing = 'processing',
    // 完成
    Completed = 'completed',
    // 失败
    Failed = 'failed',
    // 已撤销
    Undone = 'undone',
  }

  export interface ResultItem {
    input_path: string;
    input_size: number;
    output_path: string;
    output_converted_path: string;
    output_size: number;
    compression_rate: number;
    original_temp_path: string;
    original_temp_converted_path: string;
    available_compress_rate: boolean;
    hash: string;
    convert_results?: ConvertResult[];
    ssim: number;
  }

  export interface FailedItem {
    input_path: string;
    error: string | Error;
  }

  export interface CompressPayloadOptions {
    limit_compress_rate: number;
    save: {
      mode: CompressionOutputMode;
      new_file_suffix: string;
      new_folder_path: string;
    };
    temp_dir?: string;
    convert_types?: ConvertFormat[];
    convert_alpha?: string;
    keep_metadata?: boolean;
    watermark_type?: WatermarkType;
    watermark_position?: WatermarkPosition;
    watermark_text?: string;
    watermark_text_color?: string;
    watermark_font_size?: number;
    watermark_image_path?: string;
    watermark_image_opacity?: number;
    watermark_image_scale?: number;
  }

  export interface JpegCompressPayload {
    input_path: string;
    options?: CompressPayloadOptions;
    process_options: Partial<{
      quality: number;
      progressive: boolean;
      chromaSubsampling: string;
      optimiseCoding: boolean;
      optimizeCoding: boolean;
      mozjpeg: boolean;
      trellisQuantisation: boolean;
      overshootDeringing: boolean;
      optimiseScans: boolean;
      optimizeScans: boolean;
      quantisationTable: number;
      quantizationTable: number;
      force: boolean;
    }>;
  }

  export enum OxiPngRowFilter {
    None = 0,
    Sub = 1,
    Up = 2,
    Average = 3,
    Paeth = 4,
    MinSum = 5,
    Entropy = 6,
    Bigrams = 7,
    BigEnt = 8,
    Brute = 9,
  }

  export interface PngCompressPayload {
    input_path: string;
    options?: CompressPayloadOptions;
    process_options:
      | Partial<{
          progressive: boolean;
          compressionLevel: number;
          adaptiveFiltering: boolean;
          palette: boolean;
          quality: number;
          effort: number;
          colours: number;
          colors: number;
          dither: number;
          force: boolean;
        }>
      | Partial<{
          fixErrors?: boolean;
          force?: boolean;
          filter?: Array<OxiPngRowFilter>;
          bitDepthReduction?: boolean;
          colorTypeReduction?: boolean;
          paletteReduction?: boolean;
          grayscaleReduction?: boolean;
          idatRecoding?: boolean;
          strip?: boolean;
          lossless: boolean;
        }>;
  }
  export interface SvgCompressPayload {
    input_path: string;
    options?: CompressPayloadOptions;
  }

  export enum WebpPresetEnum {
    Default = 'default',
    Photo = 'photo',
    Picture = 'picture',
    Drawing = 'drawing',
    Icon = 'icon',
    Text = 'text',
  }

  export interface WebpCompressPayload {
    input_path: string;
    options?: CompressPayloadOptions;
    process_options: Partial<{
      // 质量，整数1-100
      quality: number;
      // alpha层的质量，整数0-100
      alphaQuality: number;
      // 使用无损压缩模式
      lossless: boolean;
      // 使用近无损压缩模式
      nearLossless: boolean;
      // 使用高质量色度子采样
      smartSubsample: boolean;
      // 自动调整去块滤波器，可以改善低对比度边缘（较慢）
      smartDeblock: boolean;
      // 预处理/过滤的命名预设，可选值：default, photo, picture, drawing, icon, text
      preset: WebpPresetEnum;
      // CPU努力程度，介于0（最快）和6（最慢）之间
      effort: number;
      // 动画迭代次数，使用0表示无限动画
      loop: number;
      // 动画帧之间的延迟（以毫秒为单位）
      delay: number | number[];
      // 防止使用动画关键帧以最小化文件大小（较慢）
      minSize: boolean;
      // 允许混合有损和无损动画帧（较慢）
      mixed: boolean;
      // 强制WebP输出，否则尝试使用输入格式
      force: boolean;
    }>;
  }

  export interface AvifCompressPayload {
    input_path: string;
    options?: CompressPayloadOptions;
    process_options: Partial<{
      // 质量，整数1-100
      quality: number;
      // 使用无损压缩模式
      lossless: boolean;
      // CPU努力程度，介于0（最快）和9（最慢）之间
      effort: number;
      // 色度子采样，设置为'4:2:0'以使用色度子采样，默认为'4:4:4'
      chromaSubsampling: string;
      // 位深度，设置为8、10或12位
      bitdepth: number;
    }>;
  }

  export enum TiffCompressionEnum {
    None = 'none',
    Jpeg = 'jpeg',
    Deflate = 'deflate',
    Packbits = 'packbits',
    Ccittfax4 = 'ccittfax4',
    Lzw = 'lzw',
    Webp = 'webp',
    Zstd = 'zstd',
    Jp2k = 'jp2k',
  }

  export enum TiffPredictorEnum {
    None = 'none',
    Horizontal = 'horizontal',
    Float = 'float',
  }

  export enum TiffBitDepthEnum {
    One = 1,
    Two = 2,
    Four = 4,
    Eight = 8,
  }

  export enum TiffResolutionUnitEnum {
    Inch = 'inch',
    Cm = 'cm',
  }

  export interface TiffCompressPayload {
    input_path: string;
    options?: CompressPayloadOptions;
    process_options: Partial<{
      // 质量，整数1-100
      quality: number;
      // 强制TIFF输出，否则尝试使用输入格式
      force: boolean;
      // 压缩选项：none, jpeg, deflate, packbits, ccittfax4, lzw, webp, zstd, jp2k
      compression: TiffCompressionEnum;
      // 压缩预测器选项：none, horizontal, float
      predictor: TiffPredictorEnum;
      // 写入图像金字塔
      pyramid: boolean;
      // 写入平铺TIFF
      tile: boolean;
      // 水平平铺大小
      tileWidth: number;
      // 垂直平铺大小
      tileHeight: number;
      // 水平分辨率（像素/毫米）
      xres: number;
      // 垂直分辨率（像素/毫米）
      yres: number;
      // 分辨率单位选项：inch, cm
      resolutionUnit: TiffResolutionUnitEnum;
      // 降低位深度至1、2或4位
      bitdepth: TiffBitDepthEnum;
      // 将1位图像写为miniswhite
      miniswhite: boolean;
    }>;
  }
  export interface GifCompressPayload {
    input_path: string;
    options?: CompressPayloadOptions;
    process_options: Partial<{
      // 重用现有调色板，否则生成新的（较慢）
      reuse: boolean;
      // 使用渐进式（交错）扫描
      progressive: boolean;
      // 调色板条目的最大数量，包括透明度，介于2和256之间
      colours: number;
      // `options.colours`的替代拼写
      colors: number;
      // CPU努力程度，介于1（最快）和10（最慢）之间
      effort: number;
      // Floyd-Steinberg误差扩散的级别，介于0（最少）和1（最多）之间
      dither: number;
      // 透明度的最大帧间误差，介于0（无损）和32之间
      interFrameMaxError: number;
      // 调色板重用的最大调色板间误差，介于0和256之间
      interPaletteMaxError: number;
      // 动画迭代次数，使用0表示无限动画
      loop: number;
      // 动画帧之间的延迟（以毫秒为单位）
      delay: number | number[];
      // 强制GIF输出，否则尝试使用输入格式
      force: boolean;
    }>;
  }

  export interface TinifyCompressPayload {
    input_path: string;
    options?: CompressPayloadOptions;
    process_options: Partial<{
      api_key: string;
      mime_type: string;
      preserveMetadata?: string[];
    }>;
  }

  export type CompressType =
    | 'jpeg'
    | 'jpg'
    | 'png'
    | 'webp'
    | 'avif'
    | 'tiff'
    | 'tif'
    | 'gif'
    | 'svg'
    | 'tinify';
  export type CompressPayloadMap = {
    svg: SvgCompressPayload;
    jpeg: JpegCompressPayload;
    jpg: JpegCompressPayload;
    png: PngCompressPayload;
    webp: WebpCompressPayload;
    avif: AvifCompressPayload;
    tiff: TiffCompressPayload;
    tif: TiffCompressPayload;
    gif: GifCompressPayload;
    tinify: TinifyCompressPayload;
  };
}

const JPEG_COMPRESSION_LEVEL_PRESET: Record<
  string,
  Partial<ICompressor.JpegCompressPayload['process_options']>
> = {
  1: {
    quality: 95,
    mozjpeg: true,
    progressive: true,
  },
  2: {
    quality: 80,
    mozjpeg: true,
    progressive: true,
  },
  3: {
    quality: 70,
    mozjpeg: true,
    progressive: true,
  },
  4: {
    quality: 40,
    mozjpeg: true,
    progressive: true,
  },
  5: {
    quality: 10,
    mozjpeg: true,
    progressive: true,
  },
};

const PNG_COMPRESSION_LEVEL_PRESET: Record<
  string,
  Partial<ICompressor.PngCompressPayload['process_options']>
> = {
  1: {
    quality: 100,
    palette: true,
    adaptiveFiltering: true,
    effort: 1,
    compressionLevel: 3,
  },
  2: {
    quality: 95,
    palette: true,
    adaptiveFiltering: true,
    effort: 3,
    compressionLevel: 5,
  },
  3: {
    quality: 90,
    palette: true,
    adaptiveFiltering: true,
    effort: 9,
    compressionLevel: 9,
  },
  4: {
    quality: 85,
    palette: true,
    adaptiveFiltering: true,
    effort: 7,
    compressionLevel: 7,
  },
  5: {
    quality: 70,
    palette: true,
    adaptiveFiltering: true,
    effort: 9,
    compressionLevel: 9,
  },
};

const WEBP_COMPRESSION_LEVEL_PRESET: Record<
  string,
  Partial<ICompressor.WebpCompressPayload['process_options']>
> = {
  1: {
    quality: 95,
    alphaQuality: 100,
  },
  2: {
    quality: 85,
    alphaQuality: 100,
  },
  3: {
    quality: 70,
    alphaQuality: 100,
  },
  4: {
    quality: 30,
    alphaQuality: 100,
  },
  5: {
    quality: 10,
    alphaQuality: 100,
  },
};

const AVIF_COMPRESSION_LEVEL_PRESET: Record<
  string,
  Partial<ICompressor.AvifCompressPayload['process_options']>
> = {
  1: {
    quality: 95,
  },
  2: {
    quality: 85,
  },
  3: {
    quality: 70,
  },
  4: {
    quality: 30,
  },
  5: {
    quality: 10,
  },
};

const TIFF_COMPRESSION_LEVEL_PRESET: Record<
  string,
  Partial<ICompressor.TiffCompressPayload['process_options']>
> = {
  1: {
    quality: 95,
  },
  2: {
    quality: 85,
  },
  3: {
    quality: 70,
  },
  4: {
    quality: 30,
  },
  5: {
    quality: 10,
  },
};

const GIF_COMPRESSION_LEVEL_PRESET: Record<
  string,
  Partial<ICompressor.GifCompressPayload['process_options']>
> = {
  1: {
    colours: 256,
    effort: 10,
    dither: 0.0,
  },
  2: {
    colours: 192,
    effort: 7,
    dither: 0.25,
  },
  3: {
    colours: 128,
    effort: 5,
    dither: 0.5,
  },
  4: {
    colours: 64,
    effort: 3,
    dither: 0.75,
  },
  5: {
    colours: 32,
    effort: 1,
    dither: 1.0,
  },
};
export default class Compressor {
  private options: ICompressor.Options;
  private handlers: Record<
    ICompressor.CompressType,
    (file: FileInfo) => Promise<ICompressor.ResultItem>
  > = null;

  constructor(options?: ICompressor.Options) {
    this.options = Object.assign(
      {
        concurrency: 10,
        compressionMode: CompressionMode.Auto,
        save: {
          mode: CompressionOutputMode.Overwrite,
        },
      },
      options,
    );
    this.handlers = {
      jpeg: this.jpeg,
      jpg: this.jpeg,
      png: this.png,
      webp: this.webp,
      avif: this.avif,
      svg: this.svg,
      tiff: this.tiff,
      tif: this.tiff,
      gif: this.gif,
      tinify: this.tinify,
    };
  }

  private selectHandler = (file: FileInfo) => {
    return this.handlers[file.ext](file).catch((error) => {
      captureError(error, undefined, 'compressor_handler_error');
      return Promise.reject({
        input_path: file.path,
        error: error,
      });
    });
  };

  private createTasks = (files: FileInfo[]) => {
    switch (this.options.compressionMode) {
      case CompressionMode.Auto: {
        return files.map((file) => () => {
          if (VALID_TINYPNG_IMAGE_EXTS.includes(file.ext)) {
            return this.tinify(file).catch(() => this.selectHandler(file));
          } else {
            return this.selectHandler(file);
          }
        });
      }
      case CompressionMode.Remote: {
        return files.map(
          (file) => () =>
            this.tinify(file).catch((error) => {
              return Promise.reject({
                input_path: file.path,
                error,
              });
            }),
        );
      }
      default: {
        return files.map((file) => () => this.selectHandler(file));
      }
    }
  };

  public compress = async (
    files: FileInfo[],
    onFulfilled?: (res: ICompressor.ResultItem) => void,
    onRejected?: (res: ICompressor.FailedItem) => void,
  ): Promise<ICompressor.ResultItem[]> => {
    const scheduler = new Scheduler({
      concurrency: this.options.concurrency,
    })
      .addListener(Scheduler.Events.Fulfilled, (res) => {
        isFunction(onFulfilled) && onFulfilled(res);
      })
      .addListener(Scheduler.Events.Rejected, (res) => {
        isFunction(onRejected) && onRejected(res);
      })
      .setTasks(this.createTasks(files));
    return scheduler.run();
  };

  private process = async <T extends ICompressor.CompressType>(
    type: string,
    payload: ICompressor.CompressPayloadMap[T],
  ) => {
    try {
      const response = await fetch(`${this.options.sidecarDomain}/api/compress/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          options: Object.assign(
            {
              limit_compress_rate: this.options.limitCompressRate,
              save: {
                mode: this.options.save.mode,
                new_file_suffix: this.options.save.newFileSuffix,
                new_folder_path: this.options.save.newFolderPath,
              },
              temp_dir: this.options.tempDir,
              convert_enable: this.options.convertEnable,
              convert_types: this.options.convertTypes,
              convert_alpha: this.options.convertAlpha,
              resize_dimensions: this.options.resizeDimensions,
              resize_enable: this.options.resizeEnable,
              resize_fit: this.options.resizeFit,
              keep_metadata: this.options.keepMetadata,
              watermark_type: this.options.watermarkType,
              watermark_position: this.options.watermarkPosition,
              watermark_text: this.options.watermarkText,
              watermark_text_color: this.options.watermarkTextColor,
              watermark_font_size: Number(this.options.watermarkFontSize),
              watermark_image_path: this.options.watermarkImagePath,
              watermark_image_opacity: Number(this.options.watermarkImageOpacity),
              watermark_image_scale: Number(this.options.watermarkImageScale),
              lossless: this.options.compressionType === CompressionType.Lossless,
            },
            payload.options,
          ),
        }),
      });
      const result = await response.json();
      if (!String(response.status).startsWith('2')) {
        throw new Error(result.message || 'Process failed, please try again later.');
      }
      return result;
    } catch (error) {
      return Promise.reject(error);
    }
  };

  jpeg = async (file: FileInfo) => {
    return this.process('jpeg', {
      input_path: file.path,
      process_options: {
        ...JPEG_COMPRESSION_LEVEL_PRESET[this.options.compressionLevel],
        force: true,
      },
    });
  };

  png = async (file: FileInfo) => {
    if (this.options.compressionType === CompressionType.Lossless) {
      return this.process('png/lossless', {
        input_path: file.path,
        process_options: {
          strip: !this.options?.keepMetadata,
          force: true,
          lossless: true,
        },
      });
    } else {
      return this.process('png', {
        input_path: file.path,
        process_options: {
          ...PNG_COMPRESSION_LEVEL_PRESET[this.options.compressionLevel],
          force: true,
        },
      });
    }
  };

  webp = async (file: FileInfo) => {
    return this.process('webp', {
      input_path: file.path,
      process_options: {
        ...WEBP_COMPRESSION_LEVEL_PRESET[this.options.compressionLevel],
        force: true,
        lossless: this.options.compressionType === CompressionType.Lossless,
      },
    });
  };

  avif = async (file: FileInfo) => {
    return this.process('avif', {
      input_path: file.path,
      process_options: {
        ...AVIF_COMPRESSION_LEVEL_PRESET[this.options.compressionLevel],
        lossless: this.options.compressionType === CompressionType.Lossless,
      },
    });
  };

  svg = async (file: FileInfo) => {
    return this.process('svg', {
      input_path: file.path,
    });
  };

  tiff = async (file: FileInfo) => {
    return this.process('tiff', {
      input_path: file.path,
      process_options: {
        ...TIFF_COMPRESSION_LEVEL_PRESET[this.options.compressionLevel],
        force: true,
        compression:
          this.options.compressionType === CompressionType.Lossless
            ? ICompressor.TiffCompressionEnum.Deflate
            : ICompressor.TiffCompressionEnum.Jpeg,
      },
    });
  };

  gif = async (file: FileInfo) => {
    return this.process('gif', {
      input_path: file.path,
      process_options: {
        ...GIF_COMPRESSION_LEVEL_PRESET[this.options.compressionLevel],
        force: true,
      },
    });
  };

  tinify = async (file: FileInfo) => {
    // if (!VALID_TINYPNG_IMAGE_EXTS.includes(file.ext)) {
    //   return Promise.reject(t('page.compression.tinify.error.unsupported_file_type'));
    // }
    return this.process('tinify', {
      input_path: file.path,
      process_options: {
        api_key: draw(this.options.tinifyApiKeys),
        mime_type: file.mimeType,
      },
    });
  };
}
