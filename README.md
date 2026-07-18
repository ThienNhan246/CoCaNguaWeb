# Co Ca Ngua Player Portal

Web app player-facing de dang ky tai khoan cho project Unity `3DCoCaNgua`.

## Chuc nang

- Player tu dang ky tai khoan tren web.
- Backend tao document dung schema Unity dang dung.
- Password hash bang HMACSHA256 + salt Base64, khop voi `DatabaseManager.cs`.
- Khong hien danh sach tai khoan va khong co admin dashboard.
- Serve frontend va backend trong cung mot Node/Express app de deploy don gian.

## Chay local

```powershell
cd D:\CoCaNguaWeb
copy .env.example .env
npm install
npm start
```

Mo:

```text
http://localhost:3000
```

Sua `.env`:

```env
MONGODB_URI=your-mongodb-atlas-uri
MONGODB_DB=LudoGameDB
PLAYERS_COLLECTION=Players
MATCH_HISTORY_COLLECTION=MatchHistories
PORT=3000
```

## Deploy tren Render

1. Day folder nay len GitHub.
2. Vao Render, chon **New Web Service**.
3. Ket noi repo.
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables:
   - `MONGODB_URI`
   - `MONGODB_DB=LudoGameDB`
   - `PLAYERS_COLLECTION=Players`
   - `MATCH_HISTORY_COLLECTION=MatchHistories`
7. Deploy.

File `render.yaml` da co san neu muon dung Blueprint cua Render.

## Luu y voi Unity

Phuong an nay giu Unity hien tai dang login truc tiep MongoDB. Vi vay web tao data dung cac field:

- `username`
- `passwordHash`
- `passwordSalt`
- `displayName`
- `coins`
- `ownedSkinIds`
- `equippedSkinId`
- `rewardedMatchIds`
- `createdAtUtc`
- `lastLoginUtc`

Tai khoan tao tren web co the mo file `.exe` va dang nhap trong game.

## Nen chinh trong project Unity

Cho demo mon hoc co the giu nguyen. Nhung neu gui game cho nguoi ngoai, nen:

- Khong de MongoDB connection string trong `Assets/Scenes/AuthScene.unity`.
- Rotate password MongoDB da tung de trong scene.
- Sau nay doi `DatabaseManager` sang goi API backend thay vi goi MongoDB truc tiep.
