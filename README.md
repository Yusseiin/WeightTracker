<h1 align="center">
  <img src="https://raw.githubusercontent.com/yusseiin/weighttracker/main/public/icon.png" width="120" height="120" alt="Weight Tracker Logo">
  <br>
  Weight Tracker
</h1>

<p align="center">
  <strong>A self-hosted mobile-first weight tracking application to log your weight, water consumption, steps, blood pressure, medications, and fitness progress</strong>
</p>

<p align="center">
  <a href="https://hub.docker.com/r/yusseiin/weighttracker"><img src="https://img.shields.io/docker/pulls/yusseiin/weighttracker?style=flat-square&logo=docker&logoColor=white" alt="Docker Pulls"></a>
  <a href="https://github.com/yusseiin/weighttracker/blob/main/LICENSE"><img src="https://img.shields.io/github/license/yusseiin/weighttracker?style=flat-square&color=5D6D7E" alt="License"></a>
  <a href="https://github.com/yusseiin/weighttracker/stargazers"><img src="https://img.shields.io/github/stars/yusseiin/weighttracker?style=flat-square&color=E67E22" alt="Stars"></a>
  <a href="https://github.com/yusseiin/weighttracker/commits/main"><img src="https://img.shields.io/github/last-commit/yusseiin/weighttracker?style=flat-square&color=5D6D7E" alt="Last Commit"></a>
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

## Screenshots

<table border="0" cellspacing="0" cellpadding="0">
  <tr>
    <td>
      <a href="docs/screenshots/chart.png" target="_blank">
        <img src="docs/screenshots/chart.png" width="200px" alt="Chart View" />
      </a>
    </td>
    <td>
      <a href="docs/screenshots/history.png" target="_blank">
        <img src="docs/screenshots/history.png" width="200px" alt="History View" />
      </a>
    </td>
    <td>
      <a href="docs/screenshots/addentry.png" target="_blank">
        <img src="docs/screenshots/addentry.png" width="200px" alt="Add Entry" />
      </a>
    </td>
    <td>
      <a href="docs/screenshots/water.png" target="_blank">
        <img src="docs/screenshots/water.png" width="200px" alt="Water Tracking" />
      </a>
    </td>
  </tr>
  <tr>
    <td>
      <a href="docs/screenshots/step.png" target="_blank">
        <img src="docs/screenshots/step.png" width="200px" alt="Steps Tracking" />
      </a>
    </td>
    <td>
      <a href="docs/screenshots/blood.png" target="_blank">
        <img src="docs/screenshots/blood.png" width="200px" alt="Blood Pressure" />
      </a>
    </td>
    <td>
      <a href="docs/screenshots/chartblood.png" target="_blank">
        <img src="docs/screenshots/chartblood.png" width="200px" alt="Blood Pressure Chart" />
      </a>
    </td>
    <td>
      <a href="docs/screenshots/medication.png" target="_blank">
        <img src="docs/screenshots/medication.png" width="200px" alt="Medication Tracking" />
      </a>
    </td>
  </tr>
</table>

---

## Features

### Core Tracking

- **Weight Tracking**: Log your daily weight with activity type and sleep quality
- **Water Consumption**: Track daily water intake with quick-add buttons (Cup 200ml/8oz, 0.5L/17oz, 1L/34oz), custom amount input, and reset functionality
- **Activity Logging**: Track activity type with each entry - includes 3 default activities (Rest, Weights, Cardio)
- **Sleep Quality**: Record sleep quality (Good, Fair, Poor) with color indicators alongside weight
- **Today Recap**: Quick summary card showing today's weight, water, steps, blood pressure, and medications at a glance

### Optional Tracking Features

Enable/disable these features in Settings → Features:

- **Steps Tracking**: Log daily step count with optional daily goal. One entry per day with timestamp for when steps were recorded
- **Blood Pressure**: Track systolic/diastolic readings multiple times per day with timestamps. View history and trends
- **Medication Tracking**: Configure custom medications with flexible scheduling options:
  - **Tracking Modes**: Boolean (taken/not taken) or Dosage (track specific amounts)
  - **Scheduling**: Daily, specific days of week, or every N days (interval-based)
  - **Dosage Support**: Set expected dose with unit (mg, ml, pills, etc.) and quick-select preset buttons
  - **Reminder Banner**: Shows due medications at top of screen with expected doses
  - **Dose Warnings**: Visual highlighting when recorded dose differs from expected (amber color in dialogs and history table)
  - **Compact UI**: Medications shown as buttons that expand to reveal date/time and dose options
- **Injection Tracking**: Track injection schedules and log when injections are administered (supports up to 15 injections)
- **Photo Attachments**: Attach photos to any entry type (weight, steps, pressure, medication, injection)
  - Camera capture and gallery picker on mobile and desktop
  - Client-side image compression (max 1200x1200, JPEG quality 0.8) to save storage
  - Photos displayed in history table via camera icon with popover preview
  - Photos stored at `/config/photos/{userId}/` and persist across Docker restarts

### Custom Activities

- **Activity Manager**: Create, edit, delete, and reorder up to 12 custom activities
- **Icon Picker**: Choose from 50+ Lucide icons organized by category with search functionality
- **Color Customization**: Select from multiple Tailwind color options for each activity
- **Usage Protection**: Cannot delete activities that are being used by existing entries
- **Reordering**: Move activities up/down to customize the order they appear

### Data Visualization

- **Progress Chart**: Interactive line chart with Recharts showing weight trends
- **Multi-Graph Support**: Choose which data to display on the chart (weight, water, steps, blood pressure, etc.) with the ability to show multiple metrics on a single graph
- **Time Filters**: View data for All time, 1 Month, 3 Months, or 6 Months
- **Chart Statistics**: Display average, min, and max weight in the selected period
- **Target Weight Line**: Optional reference line showing your goal weight
- **Customizable Colors**: Choose from 5 chart colors (Primary, Blue, Green, Orange, Purple)

### History & Entries

- **History Table**: Compact table view of all entries with weight, activity icon, sleep indicator, water, and weight difference
- **Click-to-Edit**: Tap any entry in the history to edit or delete it
- **Water Entry Editing**: Edit water entries directly from the history table
- **Weight Difference**: Automatic calculation showing change from previous entry

### Customization

- **Date Format Options**: 9 preset formats (EU, US, ISO, etc.) plus custom pattern support
- **Time Format**: Choose 24h (HH:mm), 12h (hh:mm a), or hide time
- **Locale Support**: English, Italian, German, French, Spanish
- **Weekday Display**: Optional weekday in date formatting
- **Separate Formatters**: Different date formats for table, chart tooltip, and chart axis
- **Unit Preferences**: Weight (kg/lb) and water (ml/oz) unit selection

### User Management

- **Multi-user Support**: Each user has their own data stored separately
- **User Roles**: Admin and regular user roles with different permissions
- **Admin Features**: Create, edit, and delete users from the settings popup
- **Password Management**: Users can change their own password
- **Nickname Management**: Users can change their display nickname
- **Secure Password Storage**: Passwords are hashed using bcrypt (automatic migration from plain-text)

### UI/UX

- **Mobile-First Design**: Responsive UI with bottom drawer on mobile, dialog on desktop
- **Floating Action Buttons**: Quick access to add weight (bottom right) and water (bottom left) on mobile, plus optional steps, blood pressure, and medication buttons when features are enabled
- **Dark Mode**: Automatic theme switching based on system preference
- **Toast Notifications**: Success and error feedback using Sonner
- **Changelog Dialog**: View version history and release notes with color-coded changes

### Data Storage

- **Offline-Ready Data**: JSON file storage for easy backup and portability
- **Docker Ready**: Configurable data path for container deployments

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
    "password": "",
    "nickname": "Administrator",
    "role": "admin",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "username": "john",
    "password": "",
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
├── water/
│   └── {username}.json         # Water consumption per user
├── steps/
│   └── {username}.json         # Daily steps per user
├── pressure/
│   └── {username}.json         # Blood pressure readings per user
├── medications/
│   └── {username}.json         # Medication tracking per user
└── photos/
    └── {username}/             # Photo attachments per user
        └── {entryType}-{entryId}.jpg

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CONFIG_PATH` | Directory for storing JSON data files | `/config` |
| `PUID` | User ID for file permissions (Unraid) | `1000` |
| `PGID` | Group ID for file permissions (Unraid) | `1000` |
| `API_KEY` | Secret key for API authentication (enables HA integration) | (disabled) |

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
│   │   │   ├── change-password/ # Change password
│   │   │   └── change-nickname/ # Change nickname
│   │   ├── entries/            # Weight entries CRUD
│   │   ├── settings/           # User settings
│   │   ├── users/              # User management (admin only)
│   │   ├── water/              # Water tracking
│   │   ├── steps/              # Steps tracking
│   │   ├── pressure/           # Blood pressure tracking
│   │   └── medications/        # Medication tracking
│   ├── login/                  # Login page
│   ├── settings/               # Settings page
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main dashboard
├── /config/                    # Data storage (Docker volume mount)
│   ├── users/                  # User credentials folder
│   ├── entries/                # Weight entries folder
│   ├── settings/               # Settings folder
│   ├── water/                  # Water consumption folder
│   ├── steps/                  # Daily steps folder
│   ├── pressure/               # Blood pressure readings folder
│   └── medications/            # Medication tracking folder
├── components/
│   ├── ui/                     # shadcn components
│   ├── weight-chart.tsx        # Chart component
│   ├── weight-tracker.tsx      # Main tracker with tabs
│   ├── entries-table.tsx       # History table view
│   ├── today-recap.tsx         # Today's weight and water summary
│   ├── add-entry-dialog.tsx    # Add entry form (drawer/dialog)
│   ├── edit-entry-dialog.tsx   # Edit/delete entry
│   ├── add-water-dialog.tsx    # Add water form (drawer/dialog)
│   ├── add-steps-dialog.tsx    # Add steps form (drawer/dialog)
│   ├── edit-steps-dialog.tsx   # Edit/delete steps entry
│   ├── add-pressure-dialog.tsx # Add blood pressure (drawer/dialog)
│   ├── edit-pressure-dialog.tsx # Edit/delete pressure entry
│   ├── add-medication-dialog.tsx # Track medications taken
│   ├── edit-medication-dialog.tsx # Edit medication entry
│   ├── medication-manager.tsx  # Custom medication presets
│   ├── settings-page.tsx       # Full settings page
│   ├── settings-popup.tsx      # Settings popup in header
│   ├── activity-manager.tsx    # Custom activity CRUD
│   ├── icon-picker.tsx         # Icon selection with search
│   ├── dynamic-icon.tsx        # Render Lucide icon by name
│   ├── changelog-dialog.tsx    # Version history display
│   ├── change-password-dialog.tsx  # Password change form
│   └── user-management-dialog.tsx  # Admin user management
├── hooks/
│   ├── use-mobile.ts           # Mobile detection
│   ├── use-weight-entries.ts   # Weight data management hook
│   ├── use-water.ts            # Water data management hook
│   ├── use-steps.ts            # Steps data management hook
│   ├── use-pressure.ts         # Blood pressure data management hook
│   └── use-medications.ts      # Medication data management hook
├── lib/
│   ├── auth.ts                 # Authentication utilities
│   ├── data.ts                 # Data storage utilities
│   ├── water.ts                # Water storage utilities
│   ├── steps.ts                # Steps storage utilities
│   ├── pressure.ts             # Blood pressure storage utilities
│   ├── medication.ts           # Medication storage utilities
│   ├── icons.ts                # Curated icon list with categories
│   ├── date-utils.ts           # Date formatting utilities
│   ├── water-utils.ts          # Water unit conversion utilities
│   ├── types.ts                # TypeScript types
│   └── utils.ts                # Utility functions
└── middleware.ts               # Route protection
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with username/password |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/change-password` | Change password |
| POST | `/api/auth/change-nickname` | Change display nickname |

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
| GET | `/api/water` | Get today's water (or ?date=YYYY-MM-DD or ?all=true for all entries) |
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

### Steps

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/steps` | Get today's steps (or ?date=YYYY-MM-DD or ?all=true for all entries) |
| POST | `/api/steps` | Create/update today's steps |
| PATCH | `/api/steps` | Update steps for specific date |
| DELETE | `/api/steps` | Delete steps entry |

### Blood Pressure

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pressure` | Get all pressure entries (or ?date=YYYY-MM-DD for specific day) |
| POST | `/api/pressure` | Create new pressure entry |
| PATCH | `/api/pressure` | Update pressure entry by ID |
| DELETE | `/api/pressure` | Delete pressure entry by ID |

### Medications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/medications` | Get all medication entries (or ?date=YYYY-MM-DD for specific day) |
| POST | `/api/medications` | Create new medication entry |
| PATCH | `/api/medications` | Update medication entry by ID |
| DELETE | `/api/medications` | Delete medication entry by ID |

## Home Assistant Integration

Weight Tracker supports API key authentication for integration with Home Assistant REST sensors and automations.

### Setup

1. Generate a secure API key (e.g., using `openssl rand -hex 32`)
2. Add environment variables to your Docker configuration:

```yaml
environment:
  - API_KEY=your-secret-api-key-here
```

3. The API accepts authentication via:
   - `Authorization: Bearer YOUR_API_KEY` header
   - `X-API-Key: YOUR_API_KEY` header

4. For multi-user setups, specify which user's data to access:
   - `X-API-User: username` header (optional, defaults to first admin user)

### Multi-User Example

```bash
# Get admin's weight entries (default)
curl -H "Authorization: Bearer YOUR_API_KEY" http://YOUR_SERVER:3000/api/entries

# Get marco's weight entries
curl -H "Authorization: Bearer YOUR_API_KEY" -H "X-API-User: marco" http://YOUR_SERVER:3000/api/entries

# Get giulia's water data
curl -H "Authorization: Bearer YOUR_API_KEY" -H "X-API-User: giulia" http://YOUR_SERVER:3000/api/water
```

### REST Sensors

Add these sensors to your Home Assistant `configuration.yaml`:

```yaml
rest:
  - resource: http://YOUR_SERVER:3000/api/entries
    scan_interval: 3600
    headers:
      Authorization: "Bearer YOUR_API_KEY"
    sensor:
      - name: "Weight Tracker - Latest Weight"
        value_template: "{{ value_json.data[0].weight if value_json.data else 'unknown' }}"
        unit_of_measurement: "kg"
        json_attributes_path: "$.data[0]"
        json_attributes:
          - timestamp
          - training
          - sleep

  - resource: http://YOUR_SERVER:3000/api/water
    scan_interval: 300
    headers:
      Authorization: "Bearer YOUR_API_KEY"
    sensor:
      - name: "Weight Tracker - Today Water"
        value_template: "{{ value_json.data.amount if value_json.data else 0 }}"
        unit_of_measurement: "ml"
```

#### Multi-User Sensors

To track multiple users, add the `X-API-User` header:

```yaml
rest:
  # Marco's weight
  - resource: http://YOUR_SERVER:3000/api/entries
    scan_interval: 3600
    headers:
      Authorization: "Bearer YOUR_API_KEY"
      X-API-User: "marco"
    sensor:
      - name: "Marco - Latest Weight"
        value_template: "{{ value_json.data[0].weight if value_json.data else 'unknown' }}"
        unit_of_measurement: "kg"

  # Giulia's weight
  - resource: http://YOUR_SERVER:3000/api/entries
    scan_interval: 3600
    headers:
      Authorization: "Bearer YOUR_API_KEY"
      X-API-User: "giulia"
    sensor:
      - name: "Giulia - Latest Weight"
        value_template: "{{ value_json.data[0].weight if value_json.data else 'unknown' }}"
        unit_of_measurement: "kg"
```

### REST Commands

Add water via Home Assistant:

```yaml
rest_command:
  weight_tracker_add_water:
    url: http://YOUR_SERVER:3000/api/water
    method: POST
    headers:
      Authorization: "Bearer YOUR_API_KEY"
      Content-Type: "application/json"
    payload: '{"amount": {{ amount }}}'

  weight_tracker_add_weight:
    url: http://YOUR_SERVER:3000/api/entries
    method: POST
    headers:
      Authorization: "Bearer YOUR_API_KEY"
      Content-Type: "application/json"
    payload: '{"weight": {{ weight }}, "training": "{{ training }}", "sleep": {{ sleep }}}'
```

Use in automations or scripts:

```yaml
# Add water (amount in ml)
service: rest_command.weight_tracker_add_water
data:
  amount: 250

# Add weight entry
service: rest_command.weight_tracker_add_weight
data:
  weight: 75.5        # Weight in kg or lb (based on your settings)
  training: "rest"    # Activity ID: "rest", "weights", "cardio", or custom activity ID
  sleep: 0            # Sleep quality: 0=Good, 1=Fair, 2=Poor
```

### Example Automation - Water Reminder

```yaml
automation:
  - alias: "Water Reminder"
    trigger:
      - platform: time_pattern
        hours: "/2"
    condition:
      - condition: template
        value_template: "{{ states('sensor.weight_tracker_today_water') | int < 2000 }}"
      - condition: time
        after: "09:00:00"
        before: "21:00:00"
    action:
      - service: notify.mobile_app_your_phone
        data:
          title: "Drink Water!"
          message: "You've only had {{ states('sensor.weight_tracker_today_water') }}ml today. Goal: 2000ml"
```

### Security Notes

- Use a strong, randomly generated API key
- The API key provides full access to the configured user's data
- Consider using HTTPS (via reverse proxy) for production deployments
- Keep your API key secret and don't commit it to version control

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
  training: string;           // Activity ID (e.g., 'rest', 'weights', 'cardio', or custom ID)
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

### Custom Activity

```typescript
{
  id: string;                 // Unique identifier (e.g., 'rest', 'weights', 'swimming')
  label: string;              // Display name (e.g., 'Swimming')
  icon: string;               // Lucide icon name (e.g., 'Waves')
  color: string;              // Tailwind color class (e.g., 'text-cyan-500')
}
```

### Steps Entry

```typescript
{
  id: string;
  author: string;
  date: string;               // YYYY-MM-DD (one entry per day)
  steps: number;              // Max 99999 (5 digits)
  timestamp: string;          // ISO 8601 - time of measurement
  updatedAt: string;          // ISO 8601
}
```

### Blood Pressure Entry

```typescript
{
  id: string;
  author: string;
  date: string;               // YYYY-MM-DD
  systolic: number;           // Upper value (e.g., 120)
  diastolic: number;          // Lower value (e.g., 80)
  timestamp: string;          // ISO 8601 - time of measurement
  updatedAt: string;          // ISO 8601
}
```

### Medication Preset

```typescript
{
  id: string;                 // Unique identifier (e.g., 'morning', 'med_abc123')
  label: string;              // User-defined name (e.g., 'Morning pill')
  icon: string;               // Lucide icon name (e.g., 'Sunrise', 'Pill')
  color: string;              // Tailwind color class (e.g., 'text-purple-500')
  trackingMode: 'boolean' | 'dosage';  // How to track this medication
  unit?: string;              // Unit for dosage mode (e.g., 'mg', 'ml', 'pills')
  schedule?: {
    type: 'daily' | 'weekly' | 'interval';  // Schedule type
    daysOfWeek?: number[];    // For 'weekly': 0=Sunday, 1=Monday, etc.
    intervalDays?: number;    // For 'interval': every N days
    startDate?: string;       // For 'interval': YYYY-MM-DD when counting starts
    expectedDose?: number;    // Expected dosage amount
  };
}
```

### Medication Entry

```typescript
{
  id: string;
  author: string;
  date: string;               // YYYY-MM-DD
  medicationId: string;       // References MedicationPreset.id
  taken: boolean;             // Whether the medication was taken
  dose?: number;              // Actual dose taken (for dosage mode)
  timestamp: string;          // ISO 8601 - time when marked
  updatedAt: string;          // ISO 8601
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
  activities: CustomActivity[];  // User's custom activities (max 12)
  waterPresets: WaterPreset[];   // Custom water presets (max 6)
  medicationPresets: MedicationPreset[]; // Custom medication presets (max 8)
  goals: {
    dailyWaterGoal: number | null;    // Daily water goal in ml
    weeklyWeightGoal: number | null;  // Weekly weight change in kg
    monthlyWeightGoal: number | null; // Monthly weight change in kg
    weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6; // Week start day (0 = Sunday)
    dailyStepsGoal: number | null;    // Daily steps goal
  };
  features: {
    stepsEnabled: boolean;      // Show steps tracking button
    pressureEnabled: boolean;   // Show blood pressure tracking button
    medicationEnabled: boolean; // Show medication tracking button
  };
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

### Default Medication Presets

New users start with these 3 default medication presets (all use `boolean` tracking mode with `daily` schedule):

| ID | Label | Icon | Color | Tracking Mode |
|----|-------|------|-------|---------------|
| `morning` | Morning | Sunrise | `text-orange-500` | boolean |
| `afternoon` | Afternoon | Sun | `text-yellow-500` | boolean |
| `evening` | Evening | Moon | `text-indigo-500` | boolean |

#### Example Dosage Mode Preset

```json
{
  "id": "med_abc123",
  "label": "Aspirin",
  "icon": "Pill",
  "color": "text-purple-500",
  "trackingMode": "dosage",
  "unit": "mg",
  "schedule": {
    "type": "daily",
    "expectedDose": 100
  }
}
```

### Default Activities

New users start with these 3 default activities:

| ID | Label | Icon | Color |
|----|-------|------|-------|
| `rest` | Rest | Sofa | `text-muted-foreground` |
| `weights` | Weights | Dumbbell | `text-blue-500` |
| `cardio` | Cardio | Activity | `text-green-500` |

### Available Icon Categories

The icon picker includes 50+ icons organized by category:

| Category | Icons |
|----------|-------|
| Fitness | Dumbbell, Activity, Bike, Timer, Trophy, Target, Flame, Zap |
| Sports | Waves, Mountain, Footprints, PersonStanding |
| Rest | Sofa, Moon, Coffee, Bed, Armchair |
| Health | Heart, HeartPulse, Pill, Stethoscope, Apple, Salad |
| General | Star, Circle, Square, Plus, Check, X |

### Activity Color Options

| Color Class | Description |
|-------------|-------------|
| `text-muted-foreground` | Muted gray (default) |
| `text-blue-500` | Blue |
| `text-green-500` | Green |
| `text-red-500` | Red |
| `text-orange-500` | Orange |
| `text-purple-500` | Purple |
| `text-cyan-500` | Cyan |
| `text-pink-500` | Pink |
| `text-yellow-500` | Yellow |

### Chart Color Options

| Value | Description |
|-------|-------------|
| `primary` | Default theme color (adapts to light/dark mode) |
| `blue` | Blue (#0066FF) - Default for new users |
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
