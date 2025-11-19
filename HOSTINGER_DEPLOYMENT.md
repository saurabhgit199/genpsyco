# Hostinger Deployment Guide

## Step 1: Build Your React App

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies (if not already installed):
```bash
npm install
```

3. Build the production version:
```bash
npm run build
```

This will create a `dist` folder with all the production files.

## Step 2: Prepare Files for Upload

The build process will create a `dist` folder containing:
- `index.html` (your main HTML file)
- `assets/` folder (CSS, JS, images, etc.)
- `.htaccess` file (for Apache routing - already included in public folder)

## Step 3: Upload to Hostinger

### Using File Manager (hPanel):

1. **Log in to Hostinger hPanel**
2. **Open File Manager**
3. **Navigate to `public_html`** (or the folder for your domain)
4. **Delete any existing files** (if this is a fresh deployment)
5. **Upload all contents from `frontend/dist` folder**:
   - Select all files and folders from `dist`
   - Upload them to `public_html`
   - Make sure `index.html` is directly in `public_html`
   - Make sure `.htaccess` is in `public_html` (check "Show hidden files" if you don't see it)

### Using FTP:

1. Connect to your Hostinger FTP
2. Navigate to `public_html` directory
3. Upload all files from `frontend/dist` folder
4. Ensure `.htaccess` is uploaded (it's a hidden file, enable "Show hidden files" in your FTP client)

## Step 4: Verify File Structure

Your `public_html` should look like this:
```
public_html/
├── index.html
├── .htaccess
└── assets/
    ├── index-[hash].js
    ├── index-[hash].css
    └── ...
```

## Step 5: Set File Permissions

In Hostinger File Manager:
- **Folders**: Set to `755`
- **Files**: Set to `644`
- **`.htaccess`**: Set to `644`

## Step 6: Configure Environment Variables

If your app uses environment variables (like `VITE_API_URL`), you need to:

1. **Update API URL in code** before building, OR
2. **Use a config file** that's loaded at runtime

For this app, check `frontend/src/contexts/AuthContext.jsx` - it uses `VITE_API_URL` or defaults to `http://localhost:8000`.

**Before building**, you can:
- Create a `.env.production` file in `frontend/` with:
  ```
  VITE_API_URL=https://your-backend-api.com
  ```
- Then build: `npm run build`

## Step 7: Update Backend API URL

Make sure your backend API is accessible and update the frontend to point to it:

1. If your backend is on a different server, update `VITE_API_URL` before building
2. Or update `AuthContext.jsx` to use your production API URL

## Step 8: Test Your Site

1. **Clear browser cache** or use incognito mode
2. Visit your domain: `https://yourdomain.com`
3. Test all routes:
   - `/login`
   - `/patient`
   - `/psychologist`
   - Refresh on sub-routes to ensure `.htaccess` is working

## Troubleshooting

### Site shows blank page:
- ✅ Check that `index.html` exists in `public_html`
- ✅ Check browser console for errors
- ✅ Verify file permissions (folders: 755, files: 644)
- ✅ Check that `.htaccess` is present and has correct permissions

### 404 errors on routes:
- ✅ Verify `.htaccess` file exists in `public_html`
- ✅ Check that mod_rewrite is enabled on Hostinger (usually enabled by default)
- ✅ Ensure `.htaccess` has correct content (see above)
- ✅ Try accessing the site in incognito mode

### API calls failing:
- ✅ Check `VITE_API_URL` is set correctly in your build
- ✅ Verify backend CORS allows your domain
- ✅ Check browser console Network tab for CORS errors
- ✅ Ensure backend is running and accessible

### Can't see `.htaccess` file:
- ✅ In File Manager, uncheck "Hide dotfiles" option
- ✅ In FTP client, enable "Show hidden files"

### DNS not resolving:
- ✅ Verify DNS is pointing to Hostinger's nameservers
- ✅ Wait 24-48 hours for DNS propagation
- ✅ Check DNS status using online DNS checker tools

## Backend Deployment

If you're also hosting the backend on Hostinger:

1. **Upload backend files** to a subdirectory or subdomain
2. **Set up Python environment** (if using shared hosting, you may need VPS)
3. **Configure environment variables** in `.env` file
4. **Set up database** (MySQL/PostgreSQL) in hPanel
5. **Update CORS settings** in `backend/app/main.py` to include your domain
6. **Run migrations** to set up database tables

## Additional Notes

- **Build command**: `npm run build` (creates optimized production build)
- **Build output**: `frontend/dist/` folder
- **Main file**: `index.html` (must be in `public_html` root)
- **Routing**: `.htaccess` handles client-side routing for React Router
- **Environment variables**: Must be set before building (Vite bundles them at build time)

