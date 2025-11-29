"""
AWS S3 Storage Service for audio files.
Handles uploading and serving audio files from S3 bucket.
"""
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from app.config import settings
import logging
from typing import Optional
from fastapi import HTTPException, status
import os

logger = logging.getLogger(__name__)


class S3StorageService:
    """Service for managing audio files in AWS S3"""
    
    def __init__(self):
        self.s3_client = None
        self.bucket_name = settings.aws_s3_bucket_name
        
        # Initialize S3 client if credentials are provided
        if (settings.aws_access_key_id and 
            settings.aws_secret_access_key and 
            settings.aws_s3_bucket_name):
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.aws_access_key_id,
                    aws_secret_access_key=settings.aws_secret_access_key,
                    region_name=settings.aws_s3_region
                )
                logger.info(f"S3 storage initialized for bucket: {self.bucket_name}")
            except Exception as e:
                logger.error(f"Failed to initialize S3 client: {e}")
                self.s3_client = None
        else:
            logger.warning("S3 credentials not configured. Audio files will be stored locally.")
    
    def is_configured(self) -> bool:
        """Check if S3 is properly configured"""
        return self.s3_client is not None and self.bucket_name is not None
    
    def upload_file(self, local_file_path: str, s3_key: str) -> Optional[str]:
        """
        Upload a file to S3 bucket.
        
        Args:
            local_file_path: Path to local file to upload
            s3_key: S3 object key (path in bucket)
        
        Returns:
            S3 URL if successful, None otherwise
        """
        if not self.is_configured():
            logger.warning("S3 not configured, skipping upload")
            return None
        
        if not os.path.exists(local_file_path):
            logger.error(f"Local file not found: {local_file_path}")
            return None
        
        try:
            # Upload file to S3
            self.s3_client.upload_file(
                local_file_path,
                self.bucket_name,
                s3_key,
                ExtraArgs={'ContentType': self._get_content_type(local_file_path)}
            )
            
            # Generate public URL (supports both path-style and virtual-hosted-style)
            # Try virtual-hosted-style first (most common)
            if '.' not in self.bucket_name:
                s3_url = f"https://{self.bucket_name}.s3.{settings.aws_s3_region}.amazonaws.com/{s3_key}"
            else:
                # Use path-style for buckets with dots in name
                s3_url = f"https://s3.{settings.aws_s3_region}.amazonaws.com/{self.bucket_name}/{s3_key}"
            logger.info(f"File uploaded to S3: {s3_url}")
            return s3_url
            
        except NoCredentialsError:
            logger.error("AWS credentials not found")
            return None
        except ClientError as e:
            logger.error(f"Error uploading to S3: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error uploading to S3: {e}")
            return None
    
    def get_file_url(self, s3_key: str) -> Optional[str]:
        """
        Get public URL for an S3 object.
        
        Args:
            s3_key: S3 object key
        
        Returns:
            Public URL if object exists, None otherwise
        """
        if not self.is_configured():
            return None
        
        try:
            # Check if object exists
            self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            
            # Return public URL (supports both path-style and virtual-hosted-style)
            if '.' not in self.bucket_name:
                return f"https://{self.bucket_name}.s3.{settings.aws_s3_region}.amazonaws.com/{s3_key}"
            else:
                return f"https://s3.{settings.aws_s3_region}.amazonaws.com/{self.bucket_name}/{s3_key}"
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                logger.warning(f"S3 object not found: {s3_key}")
            else:
                logger.error(f"Error checking S3 object: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error getting S3 URL: {e}")
            return None
    
    def delete_file(self, s3_key: str) -> bool:
        """
        Delete a file from S3 bucket.
        
        Args:
            s3_key: S3 object key to delete
        
        Returns:
            True if successful, False otherwise
        """
        if not self.is_configured():
            return False
        
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            logger.info(f"File deleted from S3: {s3_key}")
            return True
        except ClientError as e:
            logger.error(f"Error deleting from S3: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error deleting from S3: {e}")
            return False
    
    def is_s3_url(self, file_path: str) -> bool:
        """Check if a file path is an S3 URL"""
        return file_path.startswith('https://') and 's3' in file_path and 'amazonaws.com' in file_path
    
    def _get_content_type(self, file_path: str) -> str:
        """Get content type based on file extension"""
        _, ext = os.path.splitext(file_path.lower())
        content_types = {
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wave',
            '.ogg': 'audio/ogg',
            '.m4a': 'audio/mp4',
        }
        return content_types.get(ext, 'audio/mpeg')


# Global instance
s3_storage = S3StorageService()

