# AWS S3 Setup Guide for Audio Storage

This guide explains how to configure AWS S3 for storing audio files permanently, preventing them from being lost when Render restarts or redeploys.

## Problem

Render's filesystem is **ephemeral**, meaning files stored on disk are lost when:
- The service restarts
- The service is redeployed
- After some time (due to maintenance)

This causes audio files to disappear after 2-3 days, even though the database still references them.

## Solution: AWS S3

AWS S3 provides persistent cloud storage that survives service restarts and redeployments.

## Step 1: Create AWS S3 Bucket

1. **Sign in to AWS Console**
   - Go to https://aws.amazon.com/
   - Sign in or create an account (free tier available)

2. **Create S3 Bucket**
   - Navigate to **S3** service
   - Click **Create bucket**
   - Configure:
     - **Bucket name**: e.g., `genpsyco-audio-files` (must be globally unique)
     - **AWS Region**: Choose closest to your users (e.g., `us-east-1`)
     - **Block Public Access**: 
       - **Uncheck** "Block all public access" (or configure bucket policy for public read)
       - This allows users to access audio files directly
   - Click **Create bucket**

3. **Configure Bucket Permissions (Optional)**
   - Go to bucket → **Permissions** tab
   - **Bucket Policy** (for public read access):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
       }
     ]
   }
   ```
   - Replace `YOUR_BUCKET_NAME` with your actual bucket name

## Step 2: Create IAM User and Access Keys

1. **Create IAM User**
   - Go to **IAM** service → **Users**
   - Click **Create user**
   - **User name**: `genpsyco-s3-user`
   - Click **Next**

2. **Attach Permissions**
   - Select **Attach policies directly**
   - Search and select: **AmazonS3FullAccess** (or create custom policy with read/write only)
   - Click **Next** → **Create user**

3. **Create Access Key**
   - Click on the created user
   - Go to **Security credentials** tab
   - Click **Create access key**
   - Select **Application running outside AWS**
   - Click **Next** → **Create access key**
   - **IMPORTANT**: Save both:
     - **Access key ID**
     - **Secret access key** (shown only once!)

## Step 3: Configure Backend Environment Variables

Add these environment variables to your **Render** service:

1. Go to your Render dashboard → Your service → **Environment**
2. Add these variables:

```env
AWS_ACCESS_KEY_ID=your_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
AWS_S3_BUCKET_NAME=genpsyco-audio-files
AWS_S3_REGION=us-east-1
```

**Replace:**
- `your_access_key_id_here` with your Access Key ID
- `your_secret_access_key_here` with your Secret Access Key
- `genpsyco-audio-files` with your actual bucket name
- `us-east-1` with your bucket's region

## Step 4: Deploy Changes

1. **Commit and push to GitHub**:
   ```bash
   git add .
   git commit -m "Add AWS S3 storage for audio files"
   git push origin main
   ```

2. **Render will automatically deploy** the new version with S3 support

## Step 5: Verify Setup

1. **Generate a new audio file** through your application
2. **Check S3 bucket** - you should see the file in `audio/` folder
3. **Test playback** - audio should be accessible even after service restart

## How It Works

- **Audio Generation**: 
  - Audio is generated locally first
  - Automatically uploaded to S3
  - Local file is cleaned up after upload
  - S3 URL is stored in database

- **Audio Playback**:
  - System checks if file path is an S3 URL
  - If S3 URL: Redirects to S3 for direct access
  - If local path: Serves from local filesystem (backward compatibility)

## Troubleshooting

### Error: "S3 credentials not configured"
- Check that all environment variables are set correctly in Render
- Verify Access Key ID and Secret Access Key are correct

### Error: "Access Denied" when accessing audio
- Check bucket permissions (Block Public Access settings)
- Verify bucket policy allows public read access

### Error: "Bucket not found"
- Verify `AWS_S3_BUCKET_NAME` matches your bucket name exactly
- Check that `AWS_S3_REGION` matches your bucket's region

### Files still disappearing
- Ensure environment variables are set in Render (not just local `.env`)
- Check Render logs for S3 upload errors
- Verify boto3 is installed: `pip install boto3==1.34.0`

## Cost Considerations

- **AWS S3 Free Tier**: 
  - 5 GB storage
  - 20,000 GET requests
  - 2,000 PUT requests
  - Per month for first 12 months

- **After Free Tier**:
  - Storage: ~$0.023 per GB/month
  - Requests: Very low cost (cents per 1000 requests)

For a therapy app, you'll likely stay within free tier limits unless you have thousands of users.

## Security Best Practices

1. **Use IAM roles** (if running on AWS) instead of access keys when possible
2. **Rotate access keys** periodically
3. **Use bucket policies** to restrict access to specific IPs if needed
4. **Enable S3 versioning** for backup/recovery
5. **Set up lifecycle policies** to archive old files to cheaper storage

## Support

If you encounter issues:
1. Check Render logs for error messages
2. Verify AWS credentials in AWS Console
3. Test S3 access using AWS CLI:
   ```bash
   aws s3 ls s3://your-bucket-name/ --profile your-profile
   ```

