# CosmicDoc

Modern ve kullanıcı dostu masaüstü belge karşılaştırma ve dönüştürme uygulaması.

## 🚀 Özellikler

- **PDF Karşılaştırma**: İki PDF dosyasını karşılaştırın ve farklılıkları görsel olarak inceleyin
- **Excel Karşılaştırma**: Excel dosyalarındaki değişiklikleri detaylı olarak analiz edin
- **Metin Karşılaştırma**: Metin dosyalarını karşılaştırın ve farklılıkları satır bazında görün
- **Dosya Dönüştürme(Geliştirme aşamasında)**: Farklı belge formatları arasında dönüştürme yapın

## 🛠️ Teknolojiler

- **Frontend**: React 18 + TypeScript
- **Desktop**: Tauri v2
- **Build Tool**: Vite
- **Routing**: React Router DOM v7
- **Styling**: CSS3 + CSS Variables
- **Icons**: FontAwesome

## 📋 Gereksinimler

- Node.js (v18 veya üstü)
- npm veya yarn
- Rust (Tauri için)

## ⚡ Kurulum

### 1. Depoyu klonlayın
```bash
git clone https://github.com/erenaydin0/CosmicDoc.git
cd CosmicDoc
```

### 2. Bağımlılıkları yükleyin
```bash
npm install
```

### 3. Rust kurulumunu kontrol edin
```bash
# Rust kurulu değilse:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 4. Tauri CLI'yi yükleyin
```bash
npm install -g @tauri-apps/cli
```

## 🎯 Geliştirme

### Geliştirme sunucusunu başlatın
```bash
npm run dev
```
Bu komut hem React development server'ını hem de Tauri penceresini açar.

### Prodüksiyon build'i oluşturun
```bash
npm run build
```

### Tauri uygulamasını derleyin
```bash
npm run tauri build
```

## 📁 Proje Yapısı

```
src/
├── components/          # Tekrar kullanılabilir React bileşenleri
├── pages/              # Sayfa bileşenleri
├── services/           # Dosya işleme servisleri
├── style/             # CSS dosyaları
└── types/             # TypeScript tip tanımları

src-tauri/             # Tauri backend kodu
├── src/               # Rust kaynak kodu
└── icons/             # Uygulama ikonları
```

## 🔧 Geliştirme İpuçları

- Hot reload aktif, değişiklikler otomatik yansır
- CSS değişkenleri `App.css` dosyasında tanımlı
- Tema renkleri merkezi olarak yönetiliyor
- Her sayfa için ayrı CSS dosyası kullanılıyor

## 📦 Build ve Dağıtım

Uygulama platform-spesifik installer'lar olarak derlenir:
- Windows: `.msi` dosyası
- macOS: `.dmg` dosyası  
- Linux: `.deb` veya `.AppImage` dosyası

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
