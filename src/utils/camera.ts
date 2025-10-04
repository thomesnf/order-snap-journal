import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

// Web fallback for file input
const pickImageWeb = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    };
    
    input.click();
  });
};

export const takePhoto = async (): Promise<string> => {
  try {
    // Use web fallback on web platform
    if (Capacitor.getPlatform() === 'web') {
      return await pickImageWeb();
    }
    
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera
    });

    return image.dataUrl || '';
  } catch (error) {
    console.error('Error taking photo:', error);
    throw error;
  }
};

export const pickImage = async (): Promise<string> => {
  try {
    // Use web fallback on web platform
    if (Capacitor.getPlatform() === 'web') {
      return await pickImageWeb();
    }
    
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos
    });

    return image.dataUrl || '';
  } catch (error) {
    console.error('Error picking image:', error);
    throw error;
  }
};

export const capturePhoto = async (): Promise<string> => {
  try {
    // Use web fallback on web platform
    if (Capacitor.getPlatform() === 'web') {
      return await pickImageWeb();
    }
    
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt // Allows user to choose camera or gallery
    });

    return image.dataUrl || '';
  } catch (error) {
    console.error('Error capturing photo:', error);
    throw error;
  }
};
