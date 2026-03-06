# Proc Apps - Monorepo Application

Aplikasi monorepo yang menggabungkan frontend (Next.js) dan backend (Express.js) dalam satu struktur terpadu.

## Struktur Proyek

```
proc-apps/
├── src/                    # Frontend Next.js application
│   ├── app/               # Next.js app router pages
│   ├── components/        # React components
│   └── lib/               # Utility functions dan API clients
├── server/                # Backend Express.js application
│   ├── lib/              # Backend utilities (Prisma client)
│   └── index.js          # Express server entry point
├── prisma/                # Prisma schema dan migrations
│   └── schema.prisma      # Database schema
├── public/                # Static assets
├── .env                   # Environment variables (untuk frontend dan backend)
└── package.json           # Root package.json dengan scripts terpadu
```

## Prerequisites

- Node.js (v18 atau lebih baru)
- PostgreSQL database
- npm atau yarn

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment variables:**
   Pastikan file `.env` sudah dikonfigurasi dengan benar:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/db_bulog"
   PRISMA_CLIENT_ENGINE_TYPE='library'
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

3. **Setup Prisma:**
   ```bash
   # Generate Prisma Client
   npm run prisma:generate
   
   # Run migrations (jika diperlukan)
   npm run prisma:migrate
   ```

## Menjalankan Aplikasi

### Development Mode (Frontend + Backend bersamaan)
```bash
npm run dev
```

Ini akan menjalankan:
- Frontend di `http://localhost:3000`
- Backend di `http://localhost:5000`

### Development Mode Terpisah

**Frontend saja:**
```bash
npm run dev:frontend
```

**Backend saja:**
```bash
npm run dev:backend
```

### Production Mode
```bash
npm run build
npm run start
```

## Scripts yang Tersedia

- `npm run dev` - Menjalankan frontend dan backend secara bersamaan
- `npm run dev:frontend` - Menjalankan frontend saja (Next.js)
- `npm run dev:backend` - Menjalankan backend saja (Express)
- `npm run build` - Build frontend untuk production
- `npm run start` - Menjalankan aplikasi dalam mode production
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run Prisma migrations
- `npm run prisma:studio` - Buka Prisma Studio untuk melihat data

## Teknologi yang Digunakan

### Frontend
- Next.js 16.1.6
- React 19.2.3
- TypeScript
- Tailwind CSS
- TanStack React Table
- Lucide React Icons

### Backend
- Express.js 5.2.1
- Prisma ORM
- PostgreSQL
- CORS
- dotenv

## Struktur Database

Database menggunakan Prisma dengan model:
- Product
- PurchaseOrder
- RitelModern
- UnitProduksi

Lihat `prisma/schema.prisma` untuk detail schema lengkap.

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api/ritel` - Get semua data ritel modern
- `POST /api/ritel` - Create data ritel modern baru

## Catatan Penting

1. **Prisma Client**: Prisma client di-generate ke `server/generated/prisma` sesuai konfigurasi di `prisma/schema.prisma`
2. **Environment Variables**: Semua environment variables didefinisikan di root `.env` file
3. **API URL**: Frontend menggunakan `NEXT_PUBLIC_API_URL` untuk menghubungi backend API

## Troubleshooting

### Prisma Client tidak ditemukan
Jalankan:
```bash
npm run prisma:generate
```

### Database connection error
Pastikan:
- PostgreSQL sudah berjalan
- `DATABASE_URL` di `.env` sudah benar
- Database sudah dibuat

### Port sudah digunakan
Ubah port di:
- Backend: Edit `server/index.js` (default: 5000)
- Frontend: Edit `package.json` script `dev:frontend` (default: 3000)
