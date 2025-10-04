import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export const takePhoto = async (): Promise<string> => {
  try {
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
