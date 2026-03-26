<div align="center">
  <h1>🚀 Bionluk Otomasyon Botu 🤖</h1>
  <p><b>Bionluk Alıcı İsteklerini gerçek zamanlı takip edip anında Telegram'dan bildirim almanızı sağlayan yüksek performanslı bir izleme sistemi.</b></p>
  <br />
</div>

## 📌 Proje Hakkında

Bu proje, **Bionluk** üzerindeki gizli alıcı istekleri paneline doğrudan bağlantı kurarak, site üzerinde yeni bir proje açıldığında bunu saniyeler içerisinde algılar. Ardından, önceden bağlamış olduğunuz **Telegram Botu** aracılığıyla size anlık bir bildirim gönderir. 

Puppeteer Extra ve Stealth Plugin kullanılarak geliştirilmiş modern, bot denetimlerine takılmayan (Cloudflare/Bot Anti-Detection bypass) stabil bir mimariye sahiptir. Hem JavaScript (Node.js) hem de Python script alternatifleri mevcuttur.

---

## ✨ Özellikler

- ⚡ **Gerçek Zamanlı Takip:** Yeni ilanları eşzamanlı olarak çeker.
- 🛡️ **Bot Koruması Aşımı:** *Puppeteer Stealth* ile geliştirilmiş insan hareketlerini taklit eden altyapı.
- 📱 **Telegram Bildirimleri:** Yeni iş açıklandığında anında başlık, detay ve bütçe bilgisiyle cebinize bildirim gelir.
- 🗄️ **SQLite Entegrasyonu:** Kaydedilen ilanları hafif ve hızlı `database.db` içerisinde tutar, aynı ilanın birden fazla gönderilmesini engeller.
- 🔄 **Sürekli Tarama (PM2):** PM2 desteği ile arkaplanda kesintisiz (7/24) tarama yapar.
- 🤖 **Telegram Komutları:** Telegram üzerinden `/status` gönderildiğinde botun çalışma süresi ve durumu hakkında istatistik raporu verir.

---

## 🛠️ Kurulum

### 1️⃣ Gereksinimler

Projenin çalışabilmesi için sisteminizde aşağıdakilerin yüklü olması gerekir:
- [Node.js](https://nodejs.org/en/) (v16 ve üzeri önerilir)
- (Opsiyonel) Python 3.10+ (Eğer `fetch_jobs.py` kullanılacaksa)

### 2️⃣ Projeyi İndirin

```bash
git clone https://github.com/rifatardarslan/Bionluk-Freelance-Tracker
cd Bionluk-Freelance-Tracker
```

### 3️⃣ Bağımlılıkları Yükleyin

Node.js ortamı için paketleri yükleyin:

```bash
npm install
```

*(Eğer sadece Python sürümünü çalıştıracaksanız `pip install -r requirements.txt` komutunu uygulayın.)*

### 4️⃣ Çevresel Değişkenleri Ayarlayın

Gizli anahtarlarınızı ve API bilgilerinizi ayarlamak için `.env.example` dosyasının adını `.env` olarak değiştirin ve içini doldurun:

```bash
cp .env.example .env
```

**.env Dosyası Örneği:**
```env
# Telegram Ayarları
TELEGRAM_BOT_TOKEN=123456789:ABCDefghIJKLmnopQRSTuvwxyz
TELEGRAM_CHAT_ID=123456789

# Bionluk Ayarları
PHPSESSID=bionluk_oturum_cookie_degeriniz
SUPER_KEY=tarayıcı_ağından_alınan_super_key
SUPER_TOKEN=tarayıcı_ağından_alınan_super_token
SUPER_VISITOR=tarayıcı_ağından_alınan_super_visitor
SCAN_INTERVAL=60000
```

> **Not:** `SUPER_KEY`, `SUPER_TOKEN` ve diğer başlık bilgilerinizi almak için Bionluk sitesine giriş yapıp *Alıcı İstekleri* sayfasına girin. Geliştirici konsolunu (F12) açıp *Network* (Ağ) sekmesindeki `list_all/` isteğinin **Request Headers** kısmından değerleri kopyalayabilirsiniz.

---

## 🚀 Çalıştırma

### 🔸 Geliştirme Modunda Başlatma (Node.js)

```bash
node app.js
```

### 🔸 Arka Planda Kesintisiz Başlatma (PM2 ile - Önerilen)

Eğer projenizi bir VDS veya sunucuda 7/24 çalıştıracaksanız PM2 kullanmanız önerilir:

```bash
# PM2 global olarak yüklü değilse yükleyin
npm install -g pm2

# Botu başlatın
pm2 start ecosystem.config.cjs

# Logları izlemek için
pm2 logs bionluk-bot
```

### 🔸 Python Sürümünü Başlatma (Eski Mimarî)

Eğer `fetch_jobs.py` olan hafif API-only sürümünü test etmek isterseniz:
```bash
python fetch_jobs.py
```

---

## 🔒 Güvenlik & Uyarılar

- Bu proje **API anahtarları**, **Şifreler** ve **Cookie** gibi gizli içeriklerle çalışır.
- `database.db`, `*.log` ve `.env` dosyaları `.gitignore` dosyasında dışarıda bırakılmıştır. **Asla `.env` dosyanızı bir public GitHub reposuna göndermeyin.**
- Bionluk bu tarz otomatik taramaları kısıtlayabilir. `SCAN_INTERVAL` değerini mantıklı bir düzeyde (örneğin 60 saniye: `60000`) tutmaya özen gösterin.

---

## 🤝 Katkıda Bulunma

1. Bu depoyu 'Fork'layın.
2. Yeni bir dal (branch) oluşturun. (`git checkout -b feature/YeniOzellik`)
3. Yaptığınız değişiklikleri commit'leyin. (`git commit -m 'Yeni bir özellik eklendi'`)
4. Yeni dalı (branch) ana depoya (Push) atın. (`git push origin feature/YeniOzellik`)
5. Bir "Pull Request" (PR) oluşturun.