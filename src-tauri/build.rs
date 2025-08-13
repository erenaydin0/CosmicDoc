fn main() {
    // Cross compilation için Windows resource dosyalarını devre dışı bırak
    if std::env::var("TARGET").unwrap_or_default().contains("windows") && 
       std::env::var("HOST").unwrap_or_default().contains("darwin") {
        // Cross compilation durumunda winres kullanma
        return;
    }
    
    tauri_build::build()
}
