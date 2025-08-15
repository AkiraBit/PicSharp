## PicSharp Sidecar API 文档（v2）

本模块为基于 Hono 的 HTTP 服务，提供图片压缩/转换与目录监听能力，并采用 master-worker 架构执行 CPU/IO 密集任务。

### 基本信息

- 启动：开发模式 `npm run dev`，生产模式 `npm run start`
- 启动后会输出形如：`{"origin":"http://localhost:3000"}`，以下示例以 `http://localhost:3000` 为基准
- 统一约定：
  - 成功返回 200；异步超时返回 202（含 `job_id`）；错误返回 4xx/5xx（含 `message`）
  - 队列满会返回 429（请稍后重试）

---

### 健康检查与基础路由

GET /ping

- 说明：连通性检查
- 示例：

```bash
curl -s http://localhost:3000/ping
```

GET /health

- 说明：健康状态与简要运行指标
- 返回字段：`status`、`uptime`、`queueLength`、`workers`、`workersIdle`、`workersRunning`

```bash
curl -s http://localhost:3000/health | jq
```

---

### 任务提交（压缩/转换）

POST /v2/compress/:codec

- codec 取值：`avif` `jpeg` `png` `webp` `gif` `tiff` `svg` `tinify`
- 通用入参（除 `svg`/`tinify` 外基本一致）：
  - `input_path`：要处理的本地文件绝对路径
  - `options`：保存/门限等通用选项
    - `limit_compress_rate`：最低压缩率（0-1），低于则放弃覆盖写入
    - `save`：
      - `mode`：`overwrite` | `save_as_new_file` | `save_to_new_folder`
      - `new_file_suffix`：新文件后缀（`save_as_new_file` 时有效）
      - `new_folder_path`：新目录路径（`save_to_new_folder` 时有效）
    - `temp_dir`：可选，保存原图副本的临时目录
    - `convert_types`/`convert_alpha`：可选，处理完成后的附加格式转换
    - `keep_metadata`（部分 codec 支持）：是否保留元数据
  - `process_options`：各 codec 专有参数（见下文示例）
  - `wait_ms`：可选，同步等待最长毫秒数；超时返回 202 + `job_id`

通用响应（成功完成时）：

```json
{
  "input_path": "/abs/path/to/image.png",
  "input_size": 123456,
  "output_path": "/abs/path/to/image_compressed.png",
  "output_size": 78901,
  "compression_rate": 0.36,
  "original_temp_path": "",
  "available_compress_rate": true,
  "hash": "<md5>",
  "debug": { "compressedSize": 78901, "compressionRate": 0.36 },
  "convert_results": [{ "success": true, "format": "webp", "output_path": "..." }]
}
```

入队响应（未等待或超时）：

```json
{ "job_id": "<uuid>", "status": "queued" }
```

#### 示例：AVIF

```bash
curl -s -X POST http://localhost:3000/v2/compress/avif \
  -H 'Content-Type: application/json' \
  -d '{
    "input_path": "/abs/path/to/input.png",
    "options": {"limit_compress_rate": 0, "save": {"mode": "save_as_new_file", "new_file_suffix": "_compressed"}},
    "process_options": {"quality": 50, "lossless": false, "effort": 4},
    "wait_ms": 5000
  }' | jq
```

#### 示例：JPEG

```bash
curl -s -X POST http://localhost:3000/v2/compress/jpeg \
  -H 'Content-Type: application/json' \
  -d '{
    "input_path": "/abs/path/to/input.png",
    "options": {"limit_compress_rate": 0.1, "save": {"mode": "save_as_new_file"}},
    "process_options": {"quality": 80, "progressive": true}
  }' | jq
```

#### 示例：PNG

```bash
curl -s -X POST http://localhost:3000/v2/compress/png \
  -H 'Content-Type: application/json' \
  -d '{
    "input_path": "/abs/path/to/input.jpg",
    "options": {"limit_compress_rate": 0, "save": {"mode": "overwrite"}},
    "process_options": {"compressionLevel": 6, "palette": false}
  }' | jq
```

#### 示例：WEBP（支持动图）

```bash
curl -s -X POST http://localhost:3000/v2/compress/webp \
  -H 'Content-Type: application/json' \
  -d '{
    "input_path": "/abs/path/to/input.gif",
    "options": {"limit_compress_rate": 0, "save": {"mode": "save_as_new_file"}},
    "process_options": {"quality": 80, "effort": 4, "loop": 0}
  }' | jq
```

#### 示例：GIF（动图）

```bash
curl -s -X POST http://localhost:3000/v2/compress/gif \
  -H 'Content-Type: application/json' \
  -d '{
    "input_path": "/abs/path/to/input.webp",
    "options": {"limit_compress_rate": 0, "save": {"mode": "save_as_new_file"}},
    "process_options": {"colours": 128, "dither": 1}
  }' | jq
```

#### 示例：TIFF

```bash
curl -s -X POST http://localhost:3000/v2/compress/tiff \
  -H 'Content-Type: application/json' \
  -d '{
    "input_path": "/abs/path/to/input.png",
    "options": {"save": {"mode": "save_as_new_file"}},
    "process_options": {"compression": "jpeg", "quality": 80}
  }' | jq
```

#### 示例：SVG（无 `process_options`）

```bash
curl -s -X POST http://localhost:3000/v2/compress/svg \
  -H 'Content-Type: application/json' \
  -d '{
    "input_path": "/abs/path/to/input.svg",
    "options": {"save": {"mode": "save_as_new_file"}},
    "wait_ms": 3000
  }' | jq
```

#### 示例：Tinify（第三方 API）

```bash
curl -s -X POST http://localhost:3000/v2/compress/tinify \
  -H 'Content-Type: application/json' \
  -d '{
    "input_path": "/abs/path/to/input.png",
    "options": {"save": {"mode": "save_as_new_file"}},
    "process_options": {"api_key": "<TINIFY_API_KEY>", "mime_type": "image/png", "preserveMetadata": ["copyright"]}
  }' | jq
```

---

### 任务管理

GET /v2/jobs/:job_id

- 说明：查询任务状态
- 返回：

```json
{ "id": "<uuid>", "status": "queued|running|succeeded|failed|cancelled", "result": {…}, "error": "…", "progress": 0-100 }
```

POST /v2/jobs/:job_id/cancel

- 说明：取消队列中的任务（已运行中的任务尽力取消，可能在下个阶段生效）
- 返回：`{ status: "cancelled", job_id }` 或 409

GET /v2/jobs/:job_id/stream

- 说明：SSE 实时进度事件（`starting/processing/writing/converting/completed`）
- 示例：

```bash
curl -N http://localhost:3000/v2/jobs/<job_id>/stream
```

---

### 目录监听与批量入队

GET /v2/watch/new-images?path=<abs_dir>

- 说明：SSE 推送目录内新增的图片条目（与旧接口语义一致）
- 事件：`ready` `add` `self-enoent` `fault` `ping`

POST /v2/watch/enqueue

- 说明：递归扫描目录，将符合条件的图片批量入队为压缩任务
- 入参：

```json
{
  "path": "/abs/path/to/dir",
  "codec": "jpeg|png|webp|gif|avif|tiff|svg|tinify",
  "options": {},
  "process_options": {},
  "recursive": true,
  "max_files": 1000
}
```

- 示例：

```bash
curl -s -X POST http://localhost:3000/v2/watch/enqueue \
  -H 'Content-Type: application/json' \
  -d '{"path":"/abs/images","codec":"webp","options":{"save":{"mode":"save_as_new_file"}},"recursive":true,"max_files":100}' | jq
```

---

### 批量提交与批量完成通知（SSE）

说明：前端进入页面后先建立 SSE 连接，用户选择完文件后一次性提交批量任务。服务端逐项入队并在完成/失败时通过 SSE 按项回传，事件体包含前端自定义的 `client_id` 以便定位 UI 元素。

POST /v2/batch/compress

- 入参：

```json
{
  "stream_id": "front-session-123", // 可选，建议传。用作 SSE 路径标识
  "items": [
    {
      "client_id": "file-001", // 前端自定义的唯一标识（可用文件绝对路径或业务ID）
      "codec": "avif",
      "input_path": "/abs/a.png",
      "options": { "save": { "mode": "save_as_new_file" } },
      "process_options": { "quality": 60 }
    },
    {
      "client_id": "file-002",
      "codec": "jpeg",
      "input_path": "/abs/b.png",
      "options": {},
      "process_options": { "quality": 80 }
    }
  ]
}
```

- 响应（简单确认）：

```json
{ "batch_id": "b_xxx", "accepted": 2 }
```

- 说明：
  - 不返回每项 `job_id`，由后端完成后通过 SSE 推送。
  - 大批量/大请求体由后端统一处理与分项入队；单项失败不阻断整个批次，并在 SSE 中返回失败事件。

GET /v2/batch/:streamId

- 说明：SSE 推送本 `streamId` 下已绑定任务的完成/失败事件
- 事件示例（完成）：

```json
{
  "event": "completed",
  "client_id": "file-001",
  "job_id": "j1",
  "result": {
    /* 通用响应 */
  }
}
```

- 事件示例（失败）：

```json
{ "event": "failed", "client_id": "file-002", "job_id": "j2", "error": "..." }
```

- 示例：

```bash
curl -N http://localhost:3000/v2/batch/front-session-123
```

前端建议流程

- 页面加载：生成 `stream_id` 并建立 SSE：`GET /v2/batch/:streamId`
- 用户选择文件：一次性调用 `POST /v2/batch/compress` 携带 `stream_id` 与所有 `items`
- 根据 SSE 事件中的 `client_id` 更新对应 UI；必要时可结合单条 `GET /v2/jobs/:job_id` 查询详情

---

### 配置（环境变量）

- `PICSHARP_CONCURRENCY`：worker 数量（默认 CPU-1）
- `PICSHARP_QUEUE_MAX`：最大队列长度（默认 1000）
- `PICSHARP_JOB_TIMEOUT_MS`：任务超时（默认 180000）
- `PICSHARP_USE_CLUSTER`：启用 cluster 多进程（默认 false）
- `PICSHARP_LOG_LEVEL`：`debug|info|warn|error`（默认 info）
- 重试策略：
  - `PICSHARP_RETRY_ENABLE`（默认 true）
  - `PICSHARP_RETRY_MAX_ATTEMPTS`（默认 3）
  - `PICSHARP_RETRY_BACKOFF_INITIAL_MS`（默认 1000）
  - `PICSHARP_RETRY_BACKOFF_MAX_MS`（默认 30000）

---

### 日志

- 开发模式启用 `pino-pretty`，生产模式为 JSON；日志包含 `job_id`、`codec`、`elapsed_ms` 等字段
- 示例（成功）：`{"level":"info","job_id":"…","codec":"jpeg","event":"success","elapsed_ms":123}`
