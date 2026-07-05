import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { saveAsset, Asset } from './db';
import imageCompression from 'browser-image-compression';
import exifr from 'exifr';

/**
 * Uploads a file to Firebase Storage, compresses it if it's an image, 
 * saves the record to the assets collection, and returns its public download URL.
 * @param file The file to upload
 * @param directory The storage directory (defaults to 'uploads')
 * @returns The public download URL
 */
export async function uploadFile(file: File, directory: string = 'uploads'): Promise<string> {
  if (!file) {
    throw new Error('No file provided');
  }

  let fileToUpload = file;
  let isImage = file.type.startsWith('image/');
  let exifData: any = null;

  // Extract EXIF data BEFORE compression (compression strips it)
  if (isImage) {
    try {
      const gps = await exifr.gps(file);
      const meta = await exifr.parse(file, ['DateTimeOriginal', 'Make', 'Model']);
      if (gps || meta) {
        exifData = {
          latitude: gps?.latitude || null,
          longitude: gps?.longitude || null,
          capturedAt: meta?.DateTimeOriginal ? new Date(meta.DateTimeOriginal).toISOString() : null,
          cameraMake: meta?.Make || null,
          cameraModel: meta?.Model || null,
        };
      }
    } catch (exifErr) {
      console.warn('Could not parse EXIF metadata:', exifErr);
    }
  }

  // Client-side compression for images (excluding SVGs/GIFs which might break or not benefit)
  if (isImage && !file.type.includes('svg') && !file.type.includes('gif')) {
    try {
      const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 2048,
        useWebWorker: true,
        fileType: 'image/webp'
      };
      
      console.log('Compressing image...');
      fileToUpload = await imageCompression(file, options);
      console.log(`Compressed from ${(file.size/1024/1024).toFixed(2)} MB to ${(fileToUpload.size/1024/1024).toFixed(2)} MB`);
    } catch (error) {
      console.error('Error during image compression, falling back to original:', error);
      // Fallback to original file
      fileToUpload = file;
    }
  }

  // Create a unique filename to prevent overwrites
  // If we converted to WebP, ensure the extension matches
  let fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  if (isImage && !file.type.includes('svg') && !file.type.includes('gif')) {
    // browser-image-compression creates a Blob, but we can treat it as a File for Firebase
    // Ensure extension is .webp if we converted it
    fileName = fileName.replace(/\.[^/.]+$/, "") + ".webp";
  }

  const uniqueName = `${Date.now()}_${fileName}`;
  const storageRef = ref(storage, `${directory}/${uniqueName}`);

  try {
    const snapshot = await uploadBytes(storageRef, fileToUpload);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Save asset record to Firestore
    const assetId = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newAsset: Asset = {
      id: assetId,
      url: downloadURL,
      name: file.name, // keep original name for display
      type: fileToUpload.type,
      size: fileToUpload.size,
      createdAt: Date.now(),
      isHidden: false,
      exif: exifData
    };
    
    await saveAsset(newAsset);

    // Asynchronously trigger Gemini Vision AI scan in the background
    try {
      const idToken = window.sessionStorage.getItem('authToken') || '';
      fetch(`/api/admin/media/${assetId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        }
      }).catch(err => console.warn('[AI Scan] Failed to analyze upload:', err));
    } catch (aiErr) {
      console.warn('[AI Scan] Failed to trigger scan:', aiErr);
    }

    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file to storage');
  }
}
