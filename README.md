# 🏎️ F1 Manager Game

A browser-based, mobile-first Formula 1 management game built with modern web technologies. Manage your racing empire, sign top drivers, upgrade your car parts in the garage, and plan race-winning strategies.

## 🌟 Features

- **Team Management:** Create your own racing team, manage your budget, and track your standings.
- **Driver Market:** Sign free agents or release drivers. Every driver has unique stats (Pace, Racecraft, Experience, etc.) affecting race performance.
- **Garage Upgrades:** Invest your budget into 7 key car components (Engine, Aero, Chassis, Gearbox, Suspension, Brakes, Cooling). Features real-time countdown timers for ongoing research.
- **Race Strategy:** Assign unique tire and fuel strategies for each driver on your team. Adjust driving aggression and fuel modes to adapt to the race.
- **Serverless Race Simulator:** Races are simulated automatically using Vercel Cron Jobs.

## 💻 Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router)
- **Styling:** Tailwind CSS v4 & custom CSS with a premium dark-mode aesthetic
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL + Row Level Security)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Deployment:** [Vercel](https://vercel.com/) (Serverless Functions + Cron Jobs)

## 🚀 Getting Started

1. **Clone the repository** and install dependencies:
   ```bash
   npm install
   ```

2. **Set up Environment Variables:**
   Copy `.env.example` to `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   CRON_SECRET=your_cron_secret
   ```

3. **Run Database Migrations:**
   Run the SQL files in `supabase/migrations/` using the Supabase Dashboard SQL Editor, or use the Supabase CLI if linked:
   ```bash
   npx supabase db push
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app.

## 📝 License
This project is open-source and available for educational purposes.
