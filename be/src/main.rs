use chrono::DateTime;
use chrono::Utc;
use futures::TryStreamExt;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use warp::Buf;
use warp::Filter;
use warp::http;
use warp::log::Info;
use warp::log::custom;
use warp::multipart::FormData;

const STORAGE_DIR: &str = "./content";
const METADATA_FILE: &str = "./content/image-metadata.json"; // flat file DB rahh, in the content dir for simplicity - for now

#[derive(Serialize, Deserialize)]
struct ImageMetadata {
    file: String,
    size_bytes: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    title: Option<String>,
    creation_date: String,
    last_modified: String,
}

#[tokio::main]
async fn main() {
    // ensure dependencies
    fs::create_dir_all(STORAGE_DIR).unwrap();
    if !Path::new(METADATA_FILE).exists() {
        fs::write(METADATA_FILE, "[]").unwrap();
    }

    let ten_mb = 10_000_000;

    let health = warp::path("health")
        .and(warp::get())
        .map(|| warp::reply::with_status("OK", http::StatusCode::OK));

    let get_img_metadata = warp::path("imageData")
        .and(warp::get())
        .and_then(handle_get_img_metadata);

    let get_image = warp::path("image")
        .and(warp::get())
        .and(warp::fs::dir(STORAGE_DIR));

    let post_image = warp::path("image")
        .and(warp::post())
        .and(warp::multipart::form().max_length(ten_mb))
        .and_then(handle_image_upload);

    let delete_image = warp::path("image")
        .and(warp::path::param::<String>())
        .and(warp::delete())
        .and_then(handle_image_deletion);

    let routes = health
        .or(get_img_metadata)
        .or(get_image)
        .or(post_image)
        .or(delete_image)
        .with(custom(|info: Info| {
            let path = info.path();
            let status = info.status().as_u16();
            let method = info.method();
            let elapsed = info.elapsed().as_millis();
            println!("Request: {} {} {} - {}ms", method, path, status, elapsed);
        }));

    warp::serve(routes).run(([0, 0, 0, 0], 8090)).await;
}

async fn handle_image_upload(form: FormData) -> Result<impl warp::Reply, warp::Rejection> {
    let mut title = None;
    let mut created = None; // TODO: parse and handle dates on the backend. Ok for now as the FE is also supposed to conform
    let mut filesize = None;
    let mut filename = None;
    let mut file_saved = false;

    let mut stream = form;
    loop {
        match stream.try_next().await {
            Ok(Some(mut part)) => match part.name() {
                "file" => {
                    filename = Some(part.filename().map(String::from).unwrap());
                    let filepath = format!("{}/{}", STORAGE_DIR, filename.clone().unwrap());
                    let mut data = Vec::new();

                    while let Some(chunk_res) = part.data().await {
                        match chunk_res {
                            Ok(chunk) => data.extend_from_slice(chunk.chunk()),
                            Err(e) => {
                                eprintln!("error reading chunk: {}", e);
                                return Ok(warp::reply::with_status(
                                    "Upload error",
                                    http::StatusCode::BAD_REQUEST,
                                ));
                            }
                        }
                    }

                    filesize = Some(data.len());

                    if let Err(e) = fs::write(&filepath, &data) {
                        eprintln!("file write error: {}", e);
                        return Ok(warp::reply::with_status(
                            "File write error",
                            http::StatusCode::INTERNAL_SERVER_ERROR,
                        ));
                    }

                    file_saved = true;
                }
                "title" => match part.data().await {
                    Some(Ok(v)) => title = Some(String::from_utf8_lossy(v.chunk()).to_string()),
                    Some(Err(e)) => eprintln!("title part error: {}", e),
                    _ => {}
                },
                "creationDate" => match part.data().await {
                    Some(Ok(v)) => {
                        let decoded_date = String::from_utf8_lossy(v.chunk());
                        match DateTime::parse_from_rfc3339(&decoded_date) {
                            Ok(dt) => created = Some(dt),
                            Err(_) => {}
                        }
                    }
                    Some(Err(e)) => eprintln!("created part error: {}", e),
                    _ => {}
                },
                _ => {}
            },
            Ok(_none) => break,
            Err(e) => {
                eprintln!("multipart error: {}", e);
                return Ok(warp::reply::with_status(
                    "Upload error",
                    http::StatusCode::BAD_REQUEST,
                ));
            }
        }
    }
    if file_saved {
        let metadata = ImageMetadata {
            file: filename.clone().unwrap(),
            size_bytes: filesize.unwrap_or(0) as u64,
            title: title,
            creation_date: created.map_or_else(|| Utc::now().to_rfc3339(), |dt| dt.to_rfc3339()),
            last_modified: Utc::now().to_rfc3339(),
        };

        let _ = (|| -> Result<(), Box<dyn std::error::Error>> {
            let s = fs::read_to_string(METADATA_FILE)?;
            let mut vec: Vec<ImageMetadata> = serde_json::from_str(&s)?;
            vec.push(metadata);
            let out = serde_json::to_string_pretty(&vec)?;
            fs::write(METADATA_FILE, out)?;
            Ok(())
        })()
        .map_err(|e| eprintln!("metadata write error: {}", e));

        return Ok(warp::reply::with_status(
            "Uploaded",
            http::StatusCode::CREATED,
        ));
    } else {
        Ok(warp::reply::with_status(
            "No file",
            http::StatusCode::BAD_REQUEST,
        ))
    }
}

async fn handle_get_img_metadata() -> Result<impl warp::Reply, warp::Rejection> {
    match fs::read_to_string(METADATA_FILE) {
        Ok(json_data) => Ok(warp::reply::with_status(
            warp::reply::with_header(json_data, "Content-Type", "application/json"),
            http::StatusCode::OK,
        )),
        Err(_) => Ok(warp::reply::with_status(
            warp::reply::with_header("[]".to_string(), "Content-Type", "application/json"),
            http::StatusCode::INTERNAL_SERVER_ERROR,
        )),
    }
}

async fn handle_image_deletion(filename: String) -> Result<impl warp::Reply, warp::Rejection> {
    let file_path = format!("{}/{}", STORAGE_DIR, filename);

    if filename.contains('/') || filename.contains('\\') {
        return Ok(warp::reply::with_status(
            "Invalid filename",
            http::StatusCode::BAD_REQUEST,
        ));
    }

    if !Path::new(&file_path).exists() {
        return Ok(warp::reply::with_status(
            "File not found",
            http::StatusCode::NOT_FOUND,
        ));
    }

    if let Err(e) = fs::remove_file(&file_path) {
        eprintln!("Error deleting file: {}", e);
        return Ok(warp::reply::with_status(
            "Error deleting file on the server",
            http::StatusCode::INTERNAL_SERVER_ERROR,
        ));
    }

    let metadata_result = (|| -> Result<(), Box<dyn std::error::Error>> {
        let s = fs::read_to_string(METADATA_FILE)?;
        let mut metadata: Vec<ImageMetadata> = serde_json::from_str(&s)?;

        metadata.retain(|entry| entry.file != filename);

        let out = serde_json::to_string_pretty(&metadata)?;
        fs::write(METADATA_FILE, out)?;
        Ok(())
    })();

    if let Err(e) = metadata_result {
        eprintln!("Error updating metadata (but sent OK): {}", e);
        return Ok(warp::reply::with_status(
            "File deleted but metadata update failed",
            http::StatusCode::OK,
        ));
    }

    Ok(warp::reply::with_status(
        "File deleted",
        http::StatusCode::OK,
    ))
}
