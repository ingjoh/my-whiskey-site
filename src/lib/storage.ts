import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { saveAsset, Asset } from './db';
import imageCompression from 'browser-image-compression';

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
      isHidden: false
    };
    
    await saveAsset(newAsset);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file to storage');
  }
}
