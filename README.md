<h1 align="center">
  <img src="https://raw.githubusercontent.com/yusseiin/weighttracker/main/public/icon.png" width="150" height="80" alt="Weight Tracker Logo">
  <br>
  Weight Tracker
</h1>

<p align="center">
  <strong>A self-hosted mobile-first weight tracking application to log your weight, water consumption, and fitness progress</strong>
</p>

<p align="center">
  <a href="https://hub.docker.com/r/yusseiin/weighttracker"><img src="https://img.shields.io/docker/pulls/yusseiin/weighttracker?logo=docker&logoColor=white" alt="Docker Pulls"></a>
  <a href="https://github.com/yusseiin/weighttracker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/yusseiin/weighttracker?color=5D6D7E" alt="License"></a>
  <a href="https://github.com/yusseiin/weighttracker/stargazers"><img src="https://img.shields.io/github/stars/yusseiin/weighttracker?color=E67E22" alt="Stars"></a>
  <a href="https://github.com/yusseiin/weighttracker/commits/main"><img src="https://img.shields.io/github/last-commit/yusseiin/weighttracker?color=5D6D7E" alt="Last Commit"></a>
  <br>
  <img src="https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Tailwind-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind">
  <img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/Unraid-F15A2C?logo=unraid&logoColor=white" alt="Unraid">
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#getting-started">Installation</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#development">Development</a>
</p>

---

## Features

- **Weight Tracking**: Log your daily weight with activity type and sleep quality
- **Water Consumption**: Track daily water intake with quick-add buttons (Cup 200ml, 0.5L, 1L)
- **Progress Chart**: Visualize weight trends with interactive line chart and time filters (1M, 3M, 6M, All)
- **Activity Logging**: Track activity type (Rest, Weights, Cardio) with each entry
- **Sleep Quality**: Record sleep quality (Good, Fair, Poor) alongside weight
- **History Table**: Compact table view of all entries with water consumption and click-to-edit functionality
- **Customizable Chart**: Choose from 5 chart colors (Default, Blue, Green, Orange, Purple)
- **Customizable Date Format**: Choose date format, time format (24h/12h), and locale (English, Italian, German, French, Spanish)
- **Multi-user Support**: Each user has their own data stored separately
- **User Roles**: Admin and regular user roles with different permissions
- **Admin Features**: Create, edit, and delete users from the settings popup
- **Password Management**: Users can change their own password
- **Mobile-First Design**: Responsive UI with bottom drawer on mobile, dialog on desktop
- **Dark Mode**: Automatic theme switching based on system preference
- **Offline-Ready Data**: JSON file storage for easy backup and portability

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **UI**: shadcn/ui components with Tailwind CSS
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Notifications**: Sonner toast

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/weight-tracker.git
cd weight-tracker/nextjserision

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Login

- **Username**: `admin`
- **Password**: `changeme`

## Configuration

### User Management

Admin users can manage users directly from the settings popup (gear icon in header):
- Create new users with username, password, nickname, and role
- Edit existing users (change nickname and role)
- Delete users (except yourself)

Users are stored in `/config/users/users.json` (or `CONFIG_PATH/users/users.json`):

```json
[
  {
    "username": "admin",
    "password": "changeme",
    "nickname": "Administrator",
    "role": "admin",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "username": "john",
    "password": "mypassword",
    "nickname": "John Doe",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Data Structure

Each user gets their own data files in separate folders inside the config directory:

```
/config/                        # Default path (configurable via CONFIG_PATH)
├── users/
│   └── users.json              # User credentials and roles
├── entries/
│   └── {username}.json         # Weight entries per user
├── settings/
│   └── {username}.json         # Settings per user
└── water/
    └── {username}.json         # Water consumption per user
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CONFIG_PATH` | Directory for storing JSON data files | `/config` |
| `PUID` | User ID for file permissions (Unraid) | `1000` |
| `PGID` | Group ID for file permissions (Unraid) | `1000` |

## Docker Deployment

### Using Pre-built Image

```bash
docker pull yusseiin/weighttracker:latest
```

### Docker Run

```bash
docker run -d \
  --name weight-tracker \
  -p 3000:3000 \
  -v /path/to/config:/config \
  -e PUID=1000 \
  -e PGID=1000 \
  yusseiin/weighttracker:latest
```

### Docker Compose

```yaml
services:
  weight-tracker:
    image: yusseiin/weighttracker:latest
    container_name: weight-tracker
    ports:
      - "3000:3000"
    volumes:
      - /path/to/config:/config
    environment:
      - PUID=1000
      - PGID=1000
    restart: unless-stopped
```

### Build from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/weight-tracker.git
cd weight-tracker/nextjserision

# Build the Docker image
docker build --build-arg NEXT_PUBLIC_VERSION=1.0.0 -t weight-tracker .

# Run
docker run -d -p 3000:3000 -v /path/to/config:/config weight-tracker
```

## Unraid Deployment

### Manual Installation

1. Go to Docker tab → Add Container
2. Fill in the following:
   - **Name**: `weight-tracker`
   - **Repository**: `yusseiin/weighttracker:latest`
   - **Network Type**: Bridge
   - **Port Mapping**: Container Port `3000` → Host Port `3000`
   - **Volume Mapping**: Container Path `/config` → Host Path `/mnt/user/appdata/weight-tracker`
   - **PUID**: `99` (or your user ID)
   - **PGID**: `100` (or your group ID)

### Unraid Template Variables

| Variable | Container Path | Host Path | Description |
|----------|---------------|-----------|-------------|
| Config | `/config` | `/mnt/user/appdata/weight-tracker` | Data storage |
| Port | `3000` | `3000` | Web UI port |
| PUID | - | `99` | User ID |
| PGID | - | `100` | Group ID |

## Project Structure

```
nextjserision/
├── app/
│   ├── api/
│   │   ├── auth/               # Authentication endpoints
│   │   │   ├── login/          # Login endpoint
│   │   │   ├── logout/         # Logout endpoint
│   │   │   ├── me/             # Get current user
│   │   │   └── change-password/ # Change password
│   │   ├── entries/            # Weight entries CRUD
│   │   ├── settings/           # User settings
│   │   └── users/              # User management (admin only)
│   ├── login/                  # Login page
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main dashboard
├── /config/                    # Data storage (Docker volume mount)
│   ├── users/                  # User credentials folder
│   ├── entries/                # Weight entries folder
│   ├── settings/               # Settings folder
│   └── water/                  # Water consumption folder
├── components/
│   ├── ui/                     # shadcn components
│   ├── weight-chart.tsx        # Chart component
│   ├── weight-tracker.tsx      # Main tracker with tabs
│   ├── entries-table.tsx       # History table view
│   ├── add-entry-dialog.tsx    # Add entry form
│   ├── edit-entry-dialog.tsx   # Edit/delete entry
│   ├── settings-popup.tsx      # Settings popup in header
│   ├── change-password-dialog.tsx  # Password change form
│   └── user-management-dialog.tsx  # Admin user management
├── hooks/
│   ├── use-mobile.ts           # Mobile detection
│   └── use-weight-entries.ts   # Data management hook
├── lib/
│   ├── auth.ts                 # Authentication utilities
│   ├── data.ts                 # Data storage utilities
│   ├── types.ts                # TypeScript types
│   └── utils.ts                # Utility functions
└── proxy.ts                    # Route protection
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with username/password |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/change-password` | Change password |

### Entries

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/entries` | List all entries |
| POST | `/api/entries` | Create new entry |
| DELETE | `/api/entries/[id]` | Delete entry |
| PATCH | `/api/entries/[id]` | Update entry |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get user settings |
| PUT | `/api/settings` | Update settings |

### Water

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/water` | Get today's water (or ?date=YYYY-MM-DD) |
| POST | `/api/water` | Add water to today's total |
| PATCH | `/api/water` | Set water amount for specific date |
| DELETE | `/api/water` | Reset today's water to 0 |

### Users (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create new user |
| PATCH | `/api/users/[username]` | Update user |
| DELETE | `/api/users/[username]` | Delete user |

## Data Models

### User

```typescript
{
  username: string;
  password: string;
  nickname: string;
  role: 'admin' | 'user';
  createdAt: string;          // ISO 8601
}
```

### Weight Entry

```typescript
{
  id: string;
  author: string;
  weight: number;
  training: 0 | 1 | 2;        // 0=Rest, 1=Weights, 2=Cardio
  sleep: 0 | 1 | 2;           // 0=Good, 1=Fair, 2=Poor
  timestamp: string;          // ISO 8601
}
```

### Water Entry

```typescript
{
  id: string;
  author: string;
  date: string;             // YYYY-MM-DD (one per day)
  amount: number;           // Total ml for the day
  updatedAt: string;        // ISO 8601
}
```

### User Settings

```typescript
{
  userId: string;
  unit: 'kg' | 'lb';
  waterUnit: 'ml' | 'oz';
  targetWeight: number | null;
  chartColor: 'primary' | 'blue' | 'green' | 'orange' | 'purple';
  dateFormat: {
    dateFormat: string;       // 'dd/MM/yyyy', 'MM/dd/yyyy', etc.
    customDateFormat?: string; // For custom patterns
    timeFormat: string;       // 'HH:mm', 'hh:mm a', 'none'
    locale: string;           // 'en', 'it', 'de', 'fr', 'es'
    showWeekday: boolean;
  };
  createdAt: string;
  updatedAt: string;
}
```

### Chart Color Options

| Value | Description |
|-------|-------------|
| `primary` | Default theme color (adapts to light/dark mode) |
| `blue` | Blue (#0066FF) |
| `green` | Green (#22C55E) |
| `orange` | Orange (#F97316) |
| `purple` | Purple (#A855F7) |

### Date Format Options

| Preset | Example | Description |
|--------|---------|-------------|
| `dd/MM/yyyy` | 06/01/2025 | European format |
| `MM/dd/yyyy` | 01/06/2025 | US format |
| `yyyy-MM-dd` | 2025-01-06 | ISO format |
| `dd MMM yyyy` | 06 Jan 2025 | Month name |
| `EEE dd/MM` | Mon 06/01 | Weekday with date |
| `EEE.dd/MM` | Mon.06/01 | Weekday.date |
| `custom` | User-defined | Custom pattern |

### Date Format Tokens

When using custom date format, these tokens are available (date-fns format):

| Token | Example | Description |
|-------|---------|-------------|
| `dd` | 06 | Day of month (2 digits) |
| `d` | 6 | Day of month |
| `MM` | 01 | Month (2 digits) |
| `MMM` | Jan | Month abbreviation |
| `MMMM` | January | Full month name |
| `yyyy` | 2025 | Full year |
| `yy` | 25 | 2-digit year |
| `EEE` | Mon | Weekday abbreviation |
| `EEEE` | Monday | Full weekday name |
| `HH` | 14 | Hour 24h (2 digits) |
| `hh` | 02 | Hour 12h (2 digits) |
| `mm` | 30 | Minutes (2 digits) |
| `a` | PM | AM/PM |

### Supported Locales

| Code | Language | Weekday Example |
|------|----------|-----------------|
| `en` | English | Mon, Tue, Wed |
| `it` | Italian | Lun, Mar, Mer |
| `de` | German | Mo, Di, Mi |
| `fr` | French | Lun, Mar, Mer |
| `es` | Spanish | Lun, Mar, Mié |

## Development

```bash
# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type checking
pnpm tsc --noEmit
```

## License

MIT
