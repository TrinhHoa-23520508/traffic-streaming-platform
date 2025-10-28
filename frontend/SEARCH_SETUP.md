# Search Setup with GoongIO API

The search functionality uses **GoongIO API** - a free Vietnamese geocoding service optimized for Vietnam addresses.

## Getting Your Free API Key

1. **Sign up** at: https://account.goong.io/
   - Create a free account (no credit card required)
   
2. **Get your API key**:
   - After signing in, go to your dashboard
   - Copy your API key (starts with something like `vP8zN...`)

3. **Add to your project**:
   - Open `.env.local` file in the frontend folder
   - Replace `your_goong_api_key_here` with your actual API key:
     ```
     NEXT_PUBLIC_GOONG_API_KEY=vP8zN...your_actual_key
     ```

4. **Restart dev server**:
   ```powershell
   npm run dev
   ```

## Features

- ✅ Optimized for Vietnamese addresses
- ✅ Better search results than Nominatim
- ✅ Auto-completion as you type
- ✅ Focused on Ho Chi Minh City area
- ✅ Completely free
- ✅ No billing required

## How It Works

1. User types search query (e.g., "21 Nguyễn Tri Phương")
2. GoongIO Autocomplete API suggests relevant places
3. When user selects a result, we fetch detailed coordinates
4. Map zooms to the selected location

## API Limits

- **Free tier**: Generous limits for personal/development use
- If you need more, check GoongIO pricing plans

## Fallback

If the API key is not configured, the search will show an error message. Make sure to add your key to `.env.local`.
