import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** Longest side of an uploaded photo. Bigger buys nothing on a phone screen. */
const MAX_EDGE = 1280;

export interface PickedPhoto {
  blob: Blob;
  contentType: string;
  /** Local file URI, for the preview while the upload runs. */
  previewUri: string;
}

/**
 * Camera or library, cropped square and downscaled before upload.
 *
 * The square crop is not only about bandwidth: every surface shows photos in a
 * square or a circle, so an uncropped original would mean the member never sees
 * the framing everyone else sees. `allowsEditing` hands the crop to the native
 * UI, which is far better than anything we would draw ourselves.
 */
export async function pickPhoto(source: 'camera' | 'library'): Promise<PickedPhoto | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('permission_denied');

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];

  const resized = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: Math.min(asset.width ?? MAX_EDGE, MAX_EDGE) } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
  );

  // React Native's fetch reads a file:// URI into a Blob, which is what the
  // signed PUT needs; there is no FileReader dance involved.
  const response = await fetch(resized.uri);
  const blob = await response.blob();

  return { blob, contentType: 'image/jpeg', previewUri: resized.uri };
}
