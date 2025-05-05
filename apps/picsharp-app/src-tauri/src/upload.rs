use futures_util::TryStreamExt;
use read_progress_stream::ReadProgressStream;
use serde::{ser::Serializer, Serialize};
use tokio::{
    fs::File,
    io::{AsyncWriteExt, BufWriter},
};
use tokio_util::codec::{BytesCodec, FramedRead};

use std::collections::HashMap;
use std::time::Instant;

type Result<T> = std::result::Result<T, Error>;

// TransferStats 结构体同时跟踪传输速度和累计传输进度。
pub struct TransferStats {
    accumulated_chunk_len: usize, // 当前周期中传输的块的总长度
    accumulated_time: u128,       // 当前周期中传输所花费的总时间
    pub transfer_speed: u64,      // 计算的传输速度（字节/秒）
    pub total_transferred: u64,   // 所有已传输数据的累计总量
    start_time: Instant,          // 当前周期开始的时间
    granularity: u32,             // 计算传输速度的时间周期（以毫秒为单位）
}

impl TransferStats {
    // 使用指定的粒度初始化一个新的 TransferStats 实例。
    pub fn start(granularity: u32) -> Self {
        Self {
            accumulated_chunk_len: 0,
            accumulated_time: 0,
            transfer_speed: 0,
            total_transferred: 0,
            start_time: Instant::now(),
            granularity,
        }
    }
    // 记录数据块的传输并更新传输速度和总进度。
    pub fn record_chunk_transfer(&mut self, chunk_len: usize) {
        let now = Instant::now();
        let it_took = now.duration_since(self.start_time).as_millis();
        self.accumulated_chunk_len += chunk_len;
        self.total_transferred += chunk_len as u64;
        self.accumulated_time += it_took;

        // 如果累计时间超过粒度，则计算传输速度。
        if self.accumulated_time >= self.granularity as u128 {
            self.transfer_speed =
                (self.accumulated_chunk_len as u128 / self.accumulated_time * 1024) as u64;
            self.accumulated_chunk_len = 0;
            self.accumulated_time = 0;
        }

        // 重置下一周期的开始时间。
        self.start_time = now;
    }
}

// 为 TransferStats 提供一个默认实现，粒度为 500 毫秒。
impl Default for TransferStats {
    fn default() -> Self {
        Self::start(500) // 默认粒度为 500 毫秒
    }
}

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Request(#[from] reqwest::Error),
    #[error("{0}")]
    ContentLength(String),
    #[error("request failed with status code {0}: {1}")]
    HttpErrorCode(u16, String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressPayload {
    progress: u64,
    total: u64,
    transfer_speed: u64,
}

pub async fn download_file(
    url: &str,
    file_path: &str,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<()> {
    let client = reqwest::Client::new();
    let mut request = if let Some(body) = body {
        client.post(url).body(body)
    } else {
        client.get(url)
    };
    // 遍历 headers 的键值对
    // 并将它们添加到请求对象中。
    for (key, value) in headers {
        request = request.header(&key, value);
    }

    let response = request.send().await?;
    if !response.status().is_success() {
        return Err(Error::HttpErrorCode(
            response.status().as_u16(),
            response.text().await.unwrap_or_default(),
        ));
    }
    let total = response.content_length().unwrap_or(0);

    let mut file = BufWriter::new(File::create(file_path).await?);
    let mut stream = response.bytes_stream();

    let mut stats = TransferStats::default();
    while let Some(chunk) = stream.try_next().await? {
        file.write_all(&chunk).await?;
        stats.record_chunk_transfer(chunk.len());
    }
    file.flush().await?;

    Ok(())
}

pub async fn upload_file(
    url: &str,
    file_path: &str,
    method: &str,
    headers: HashMap<String, String>,
) -> Result<String> {
    let file = File::open(file_path).await?;
    let file_len = file.metadata().await.unwrap().len();

    let client = reqwest::Client::new();
    let mut request = match method.to_uppercase().as_str() {
        "POST" => client.post(url),
        "PUT" => client.put(url),
        _ => return Err(Error::ContentLength("Invalid HTTP method".into())),
    };

    request = request
        .header(reqwest::header::CONTENT_LENGTH, file_len)
        .body(file_to_body(file));

    for (key, value) in headers {
        request = request.header(&key, value);
    }

    let response = request.send().await?;
    if response.status().is_success() {
        response.text().await.map_err(Into::into)
    } else {
        Err(Error::HttpErrorCode(
            response.status().as_u16(),
            response.text().await.unwrap_or_default(),
        ))
    }
}

fn file_to_body(file: File) -> reqwest::Body {
    let stream = FramedRead::new(file, BytesCodec::new()).map_ok(|r| r.freeze());

    let mut stats = TransferStats::default();
    reqwest::Body::wrap_stream(ReadProgressStream::new(
        stream,
        Box::new(move |progress_chunk, _progress_total| {
            stats.record_chunk_transfer(progress_chunk as usize);
        }),
    ))
}
