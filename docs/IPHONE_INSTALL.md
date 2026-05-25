# Cai T-Expense len iPhone 15

App hien duoc dong goi theo huong PWA. Cach nay phu hop nhat cho app ca nhan: khong can App Store, khong can Apple Developer account, khong can Mac/Xcode.

## 1. Chay backend

Tu thu muc goc du an:

```bash
docker-compose up -d --build
```

Backend mac dinh chay o:

```text
http://localhost:8080
```

Neu mo tren iPhone trong cung Wi-Fi, `localhost` khong dung duoc. Hay lay IP LAN cua may tinh, vi du:

```text
http://192.168.1.5:8080
```

## 2. Cau hinh frontend tro den backend

Tao file:

```text
expense-tracker-web/.env.local
```

Neu dung trong cung Wi-Fi:

```env
VITE_API_BASE_URL=http://192.168.1.5:8080
```

Neu deploy backend len VPS/domain:

```env
VITE_API_BASE_URL=https://api.example.com
```

## 3. Chay frontend de test trong LAN

```bash
cd expense-tracker-web
npm run dev -- --host 0.0.0.0
```

Mo Safari tren iPhone 15:

```text
http://192.168.1.5:5173
```

Thay `192.168.1.5` bang IP LAN cua may tinh ban.

## 4. Cai vao man hinh chinh iPhone

Tren iPhone:

1. Mo Safari.
2. Vao URL cua app.
3. Bam nut Share.
4. Chon Add to Home Screen.
5. Dat ten `T-Expense`.
6. Bam Add.

Sau do app se xuat hien nhu mot app rieng tren Home Screen.

## 5. Ban production nen dung HTTPS

iOS PWA on dinh nhat khi app duoc host bang HTTPS. Huong production nen la:

1. Deploy backend len VPS hoac server rieng.
2. Gan domain HTTPS cho backend.
3. Build frontend voi `VITE_API_BASE_URL=https://api-domain-cua-ban.com`.
4. Host frontend bang HTTPS.
5. Cai app len iPhone tu Safari.

## 6. Gmail App Password

Vi app ca nhan khong dung user/auth, Gmail sync se doc cau hinh tu backend.

Can tao Gmail App Password:

1. Bat 2-Step Verification trong Google Account.
2. Vao App passwords.
3. Tao password cho app.
4. Cau hinh `Gmail:Username` va `Gmail:AppPassword` trong backend.

Khong commit App Password that len GitHub.
