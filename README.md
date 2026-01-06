# 🎰 Poker Friends

A real-time multiplayer Texas Hold'em poker game for playing with friends. Built with Next.js, Firebase, and deployed on Vercel.

![Poker Friends](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Firebase](https://img.shields.io/badge/Firebase-Realtime-orange?logo=firebase)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)

## ✨ Features

- 🎮 **Real-time multiplayer** - Play Texas Hold'em with 2-8 friends
- 🪙 **Virtual economy** - Start with 1,000 coins, win more by playing
- 👑 **Admin system** - First user becomes admin, can give coins to friends
- 🔐 **Authentication** - Email/password signup and login
- 📱 **Responsive** - Works on desktop and mobile
- ⚡ **Instant updates** - Real-time game state sync via Firebase

## 🚀 Quick Setup (15 minutes)

### Step 1: Set Up Firebase (Free)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** (or use existing one)
3. Give it a name like "poker-friends" and continue
4. Disable Google Analytics (optional) and create project

#### Enable Authentication:
1. In Firebase Console, go to **Authentication** (left sidebar)
2. Click **"Get started"**
3. Go to **Sign-in method** tab
4. Enable **Email/Password** provider

#### Create Realtime Database:
1. Go to **Realtime Database** (left sidebar)
2. Click **"Create Database"**
3. Choose your region (any is fine)
4. Start in **test mode** for now
5. Click **Enable**

#### Get Your Config:
1. Go to **Project Settings** (gear icon)
2. Scroll down to **"Your apps"**
3. Click the web icon **</>** to add a web app
4. Give it a nickname like "poker-web"
5. DON'T check "Firebase Hosting"
6. Click **Register app**
7. Copy the `firebaseConfig` values - you'll need these!

### Step 2: Deploy to GitHub

1. Download/extract this project
2. Create a new GitHub repository
3. Push the code:

```bash
cd poker-friends
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/poker-friends.git
git push -u origin main
```

### Step 3: Deploy to Vercel

1. Go to [Vercel](https://vercel.com/) and sign in with GitHub
2. Click **"Add New Project"**
3. Import your `poker-friends` repository
4. In **Environment Variables**, add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Your Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | your-project.firebaseapp.com |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | https://your-project-default-rtdb.firebaseio.com |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | your-project-id |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | your-project.appspot.com |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Your app ID |

5. Click **Deploy**
6. Wait 1-2 minutes, and you're live! 🎉

Your site will be at: `https://poker-friends-xxxxx.vercel.app`

### Step 4: Secure Your Database (Important!)

Go back to Firebase Console > Realtime Database > Rules, and set:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid || root.child('users').child(auth.uid).child('isAdmin').val() === true",
        ".write": "$uid === auth.uid || root.child('users').child(auth.uid).child('isAdmin').val() === true"
      }
    },
    "games": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

Click **Publish**.

## 🎮 How to Play

1. **Sign up** - First person becomes admin 👑
2. **Create a table** - Set blinds (5/10 is good for starting)
3. **Share the link** - Friends sign up and join your table
4. **Start the game** - Creator clicks "Start Game" when 2+ players joined
5. **Play poker!** - Standard Texas Hold'em rules

### Controls

| Action | When to Use |
|--------|-------------|
| **Fold** | Give up this hand |
| **Check** | Pass (if no one has bet) |
| **Call** | Match the current bet |
| **Raise** | Increase the bet |
| **All In** | Bet all your coins |

## 💰 Economy System

- **Starting coins**: 1,000 for new players
- **Admin powers**: Give coins to friends who run out
- **Win pots**: Winner takes the whole pot

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Fill in your Firebase credentials in .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
poker-friends/
├── app/
│   ├── globals.css      # Tailwind + poker styles
│   ├── layout.tsx       # Root layout with providers
│   └── page.tsx         # Main page component
├── components/
│   ├── AuthForm.tsx     # Login/signup form
│   ├── Lobby.tsx        # Game browser & creation
│   ├── PokerTable.tsx   # Main game UI
│   ├── PlayingCard.tsx  # Card component
│   └── AdminPanel.tsx   # Coin management
├── lib/
│   ├── firebase.ts      # Firebase config
│   ├── auth-context.tsx # Auth state management
│   ├── game-context.tsx # Game state management
│   └── poker.ts         # Game logic & hand evaluation
└── package.json
```

## 🔧 Customization

### Change Starting Coins
In `lib/auth-context.tsx`, find:
```typescript
coins: 1000, // Starting coins
```

### Change Table Limits
In `lib/game-context.tsx`, find:
```typescript
minPlayers: 2,
maxPlayers: 8,
```

### Add Custom Styles
Edit `app/globals.css` for colors, animations, etc.

## ❓ Troubleshooting

**"Permission denied" errors**
- Check Firebase Database Rules are set correctly
- Make sure you're logged in

**Game not updating in real-time**
- Check your `databaseURL` in environment variables
- Make sure Realtime Database is enabled (not Firestore)

**Cards not showing**
- Wait for the game to start (need 2+ players)
- Make sure you haven't folded

## 📝 License

MIT - Do whatever you want with it!

---

Made with ♠♥♣♦ for poker nights with friends
