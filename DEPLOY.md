# FatehaBD — VPS-এ লাইভ করার গাইড (Hostinger VPS, Ubuntu)

এই ধাপগুলো ক্রমানুসারে করুন। কমান্ডগুলো VPS-এর টার্মিনালে চালাতে হবে (যেখানে `local` লেখা আছে সেটা আপনার কম্পিউটারে)।

---

## ১. সার্ভারে যা লাগবে (একবারই)

```bash
sudo apt update && sudo apt upgrade -y
# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx mysql-server certbot python3-certbot-nginx
sudo npm install -g pm2
```

MySQL-এ ডাটাবেস ও আলাদা ইউজার (root ব্যবহার করবেন না):

```bash
sudo mysql
```
```sql
CREATE DATABASE fateha_landing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fatehabd'@'localhost' IDENTIFIED BY 'একটি-শক্ত-পাসওয়ার্ড-দিন';
GRANT ALL PRIVILEGES ON fateha_landing.* TO 'fatehabd'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## ২. ডাটা নিয়ে যাওয়া (প্রোডাক্ট, ছবি, এলাকা, সেটিংস, অর্ডার)

> পুরনো সাইট থেকে আবার import করবেন না — ডোমেইন নতুন সার্ভারে গেলে পুরনো সাইট আর পাওয়া যাবে না।
> লোকাল ডাটাবেসের dump আর `storage` ফোল্ডার কপি করাই সবচেয়ে নিরাপদ।

**local** (XAMPP-এর কম্পিউটারে):
```bash
C:\xampp\mysql\bin\mysqldump -u root --default-character-set=utf8mb4 --single-transaction fateha_landing > fateha.sql
```
তারপর `fateha.sql` আর পুরো `storage/` ফোল্ডার (প্রোডাক্টের ছবি, ব্যানার, ডিলারদের ডকুমেন্ট) সার্ভারে আপলোড করুন (FileZilla / `scp`)।

**VPS:**
```bash
mysql -u fatehabd -p fateha_landing < fateha.sql
```

## ৩. কোড বসানো

```bash
cd /var/www
git clone <আপনার-repo-url> fatehabd     # অথবা ফাইল আপলোড করুন
cd fatehabd
cp -r /path/to/uploaded/storage ./storage   # ধাপ ২-এর storage ফোল্ডার
npm ci
```

`.env` ফাইল তৈরি করুন (`.env.example` দেখে):
```bash
SITE_URL=https://fatehabd.com
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=fatehabd
DB_PASSWORD=ধাপ-১-এর-পাসওয়ার্ড
DB_NAME=fateha_landing
SESSION_SECRET=<নিচের কমান্ডের আউটপুট>
```
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # SESSION_SECRET তৈরি
```

ডাটাবেস আপডেট (নিরাপদ, বারবার চালানো যায়) ও বিল্ড:
```bash
npm run db:setup
npm run build
```

## ৪. সাইট চালু রাখা (PM2)

```bash
pm2 start npm --name fatehabd -- start -- -p 3000
pm2 save
pm2 startup        # যে কমান্ড দেখাবে সেটা কপি করে চালান — সার্ভার রিস্টার্টেও সাইট চালু থাকবে
```

## ৫. Nginx + SSL

`/etc/nginx/sites-available/fatehabd`:
```nginx
server {
    listen 80;
    server_name fatehabd.com www.fatehabd.com;

    # প্রোডাক্টের একাধিক ছবি একসাথে আপলোড হয় — এটা না দিলে বড় আপলোড ব্যর্থ হবে
    client_max_body_size 30m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        # এই হেডারগুলো জরুরি — না দিলে ফর্ম/অর্ডার (Server Actions) কাজ করবে না
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/fatehabd /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d fatehabd.com -d www.fatehabd.com   # ফ্রি SSL (https)
```
> Cloudflare ব্যবহার করলে SSL মোড **Full (strict)** দিন। সাইট নিজেই `cf-connecting-ip` থেকে আসল আইপি নেয়।

DNS: Namecheap-এ `fatehabd.com` ও `www`-এর A রেকর্ড VPS-এর IP-তে দিন।

## ৬. লাইভের পরপরই (খুব জরুরি)

1. `https://fatehabd.com/admin` → লগইন → **My account** থেকে পাসওয়ার্ড বদলান (ডিফল্ট `admin12345` থাকলে ড্যাশবোর্ডে লাল সতর্কবার্তা দেখাবে)।
2. **Payments** → bKash/Nagad/Rocket নাম্বার দিয়ে চালু করুন।
3. **Main Site Settings** → সাপোর্ট ফোন, ইমেইল, ঠিকানা, Facebook পেজ।
4. **Landing Settings** → ফুটারের নাম, কল/WhatsApp বাটন।
5. **Invoice Settings** → কোম্পানির ঠিকানা/ফোন/লোগো।
6. **Facebook Pixel** → আসল Pixel ID + Access Token দিন → *Verify* → *Send test event* (Events Manager-এ দেখুন)। Meta Business-এ `fatehabd.com` ডোমেইন verify করুন।
7. নিজে একটা শপ অর্ডার ও একটা ল্যান্ডিং অর্ডার দিয়ে দেখুন → অ্যাডমিনে এসেছে কিনা → বাতিল করুন।
8. Google Search Console-এ `https://fatehabd.com/sitemap.xml` জমা দিন।

## ৬-ক. Email (SMTP), SMS ও OTP চালু করা

**Admin → Email, SMS & OTP** পেজে:

1. **Email (SMTP)** — Hostinger hPanel → Emails → `noreply@fatehabd.com` মেইলবক্স খুলুন, তারপর:
   - "Hostinger" quick-fill চাপুন (host `smtp.hostinger.com`, port `465`, SSL)
   - Username ও Sender email: `noreply@fatehabd.com`, Password: মেইলবক্সের পাসওয়ার্ড
   - **Save & send test email** — নিজের ইনবক্সে টেস্ট মেইল এলে ঠিক আছে ("Connected")
   - ভালো ডেলিভারির জন্য Hostinger DNS-এ SPF/DKIM চালু রাখুন (hPanel → Emails → DNS records)।
2. **SMS gateway** — BulkSMSBD / Alpha SMS (sms.net.bd) থেকে API key ও Sender ID নিন → Save → **Send test SMS**।
3. **Sign-in security** — টেস্ট সফল হলে "Email code at admin sign-in" ও "Verify customers by SMS" চালু করুন।
4. **Alerts** — নতুন অর্ডারের ইমেইল কোন ঠিকানায় যাবে লিখুন; চাইলে কাস্টমারকে অর্ডার SMS।

> ⚠️ ইমেইল কাজ করা বন্ধ হলে অ্যাডমিনরা কোড পাবে না। তখন সার্ভারে চালান:
> ```bash
> cd /var/www/fatehabd && npm run admin:otp-off
> ```
> এতে শুধু ইমেইল-কোড বন্ধ হবে, তারপর পাসওয়ার্ড দিয়ে ঢুকে ইমেইল ঠিক করে আবার চালু করুন।

> `SESSION_SECRET` বদলালে সংরক্ষিত SMTP পাসওয়ার্ড ও SMS API key আবার দিতে হবে (এগুলো ওই key দিয়ে এনক্রিপ্ট করা)।

## ৭. ব্যাকআপ (প্রতিদিন স্বয়ংক্রিয়)

```bash
mkdir -p /var/backups/fatehabd
crontab -e
```
```cron
30 3 * * * mysqldump -u fatehabd -p'পাসওয়ার্ড' --single-transaction fateha_landing | gzip > /var/backups/fatehabd/db-$(date +\%F).sql.gz
45 3 * * * tar -czf /var/backups/fatehabd/storage-$(date +\%F).tgz -C /var/www/fatehabd storage
0 4 * * * find /var/backups/fatehabd -mtime +14 -delete
```
মাঝে মাঝে ব্যাকআপ ফাইল নিজের কম্পিউটারে/Google Drive-এ নামিয়ে রাখুন।

## ৮. পরে কোড আপডেট করলে

```bash
cd /var/www/fatehabd
git pull
npm ci
npm run db:setup     # নতুন কলাম/টেবিল থাকলে যোগ করে, ডাটা মোছে না
npm run build
pm2 reload fatehabd
```

## সমস্যা হলে

- লগ দেখুন: `pm2 logs fatehabd --lines 100`
- “Missing origin header” বা ফর্ম সাবমিট কাজ না করলে → ধাপ ৫-এর `proxy_set_header` লাইনগুলো আছে কিনা দেখুন।
- ছবি আপলোড “413” দিলে → `client_max_body_size` বাড়ান।
- সময় ভুল দেখালে: সাইট নিজেই বাংলাদেশ সময় (+06:00) ব্যবহার করে; সার্ভারের টাইমজোন বদলানোর দরকার নেই।
