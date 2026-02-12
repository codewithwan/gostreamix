# GoStreamix Engine 🚀

GoStreamix is a lightweight, high-performance stream engine and control panel designed for managing live broadcasting pipelines, VOD assets, and system configurations. Built with modern Go technologies for speed and reliability.

## ✨ Features

- **Authentication System**: Secure setup and login flow for administrators.
- **Intuitive Dashboard**: Real-time monitoring of CPU, Memory, and Network metrics.
- **Stream Management**: Pipeline monitoring for active ingest points.
- **Media Vault**: Manage recorded sessions and video assets.
- **Responsive Design**: Fully functional on mobile, tablet, and desktop devices.
- **Internationalization (i18n)**: Native support for English and Indonesian languages.
- **Theme Support**: Professional Dark Mode aesthetics with glassmorphism effects.

## 🛠️ Tech Stack

- **Backend**: [Go](https://go.dev/) with [Fiber](https://gofiber.io/)
- **Database**: [SQLite](https://sqlite.org/) via [Bun ORM](https://bun.uptrace.dev/)
- **UI Components**: [Templ](https://templ.guide/) (Type-safe HTML templates)
- **Frontend Interactivity**: [HTMX](https://htmx.org/)
- **Styling**: Vanilla CSS with [Tailwind CSS](https://tailwindcss.com/)
- **Logging**: [Uber Zap](https://github.com/uber-go/zap)

## 🚀 Getting Started

### Prerequisites

- [Go](https://go.dev/dl/) (1.21 or later)
- [Templ CLI](https://templ.guide/quick-start/installation/)
- [Air](https://github.com/cosmtrek/air) (Optional, for hot reloading)

### Running Locally

1. **Clone the repository**:

   ```bash
   git clone https://github.com/codewithwan/gostreamix.git
   cd gostreamix
   ```

2. **Generate Templ components**:

   ```bash
   templ generate
   ```

3. **Install dependencies**:

   ```bash
   go mod tidy
   ```

4. **Run the application**:

   ```bash
   go run main.go
   ```

5. **Access the Control Panel**:
   Open [http://localhost:8080](http://localhost:8080) in your browser.

---

Built with ❤️ by [codewithwanwan](https://github.com/codewithwan)
