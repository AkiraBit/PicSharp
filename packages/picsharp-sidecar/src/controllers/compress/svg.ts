import { Hono } from "hono";
import { optimize } from "svgo";
import type { Config } from "svgo";
import fs from "node:fs/promises";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  calCompressionRate,
  checkFile,
  createOutputPath,
  copyFileToTemp,
  convertFileSrc,
} from "../../utils";
import { SaveMode } from "../../constants";
const app = new Hono();

const defaultSvgoConfigs: Config = {
  multipass: true,
  plugins: [{ name: "preset-default", params: {} }],
};

const OptionsSchema = z
  .object({
    limit_compress_rate: z.number().min(0).max(1).optional(),
    save: z
      .object({
        mode: z.nativeEnum(SaveMode).optional().default(SaveMode.Overwrite),
        new_file_suffix: z.string().optional().default("_compressed"),
        new_folder_path: z.string().optional(),
      })
      .optional()
      .default({}),
    temp_dir: z.string().optional(),
  })
  .optional()
  .default({});

const PayloadSchema = z.object({
  input_path: z.string(),
  options: OptionsSchema,
});

app.post("/", zValidator("json", PayloadSchema), async (context) => {
  let { input_path, options } = await context.req.json<
    z.infer<typeof PayloadSchema>
  >();
  await checkFile(input_path);
  options = OptionsSchema.parse(options);

  const originalContent = await fs.readFile(input_path, "utf-8");
  const optimizedContent = optimize(originalContent, defaultSvgoConfigs);
  const compressRatio = calCompressionRate(
    originalContent.length,
    optimizedContent.data.length
  );

  const availableCompressRate =
    compressRatio >= (options.limit_compress_rate || 0);

  const newOutputPath = await createOutputPath(input_path, {
    mode: options.save.mode,
    new_file_suffix: options.save.new_file_suffix,
    new_folder_path: options.save.new_folder_path,
  });

  const tempFilePath = options.temp_dir
    ? await copyFileToTemp(input_path, options.temp_dir)
    : "";
  if (availableCompressRate) {
    await fs.writeFile(newOutputPath, optimizedContent.data);
  } else {
    if (
      options.save.mode !== SaveMode.Overwrite &&
      input_path !== newOutputPath
    ) {
      await fs.cp(input_path, newOutputPath);
    }
  }

  return context.json({
    input_path,
    input_size: originalContent.length,
    output_path: newOutputPath,
    output_converted_path: await convertFileSrc(newOutputPath),
    output_size: optimizedContent.data.length,
    compression_rate: compressRatio,
    original_temp_path: tempFilePath,
    original_temp_converted_path: await convertFileSrc(tempFilePath),
    available_compress_rate: availableCompressRate,
  });
});

export default app;
