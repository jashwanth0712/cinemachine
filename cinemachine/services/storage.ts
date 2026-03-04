import { getUploadUrl } from './api';

/**
 * Upload a local video file to Google Cloud Storage via a signed URL
 * obtained from the backend API.
 *
 * Uses plain `fetch` with PUT so no additional dependencies are needed.
 */
export async function uploadVideoToGCS(
  token: string,
  localUri: string,
  filename: string
): Promise<{ gcsUri: string }> {
  // 1. Get signed upload URL from our backend
  const { signed_url, gcs_uri } = await getUploadUrl(
    token,
    filename,
    'video/mp4'
  );

  // 2. Read the local file as a blob
  const fileResponse = await fetch(localUri);
  const blob = await fileResponse.blob();

  // 3. PUT the blob to the signed URL
  const uploadResponse = await fetch(signed_url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
    },
    body: blob,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`
    );
  }

  return { gcsUri: gcs_uri };
}

/**
 * Same as `uploadVideoToGCS` but reports upload progress via a callback.
 *
 * Uses `XMLHttpRequest` because `fetch` does not expose upload progress
 * events in React Native.
 */
export async function uploadWithProgress(
  token: string,
  localUri: string,
  filename: string,
  onProgress?: (progress: number) => void
): Promise<{ gcsUri: string }> {
  // 1. Get signed upload URL
  const { signed_url, gcs_uri } = await getUploadUrl(
    token,
    filename,
    'video/mp4'
  );

  // 2. Read the local file as a blob
  const fileResponse = await fetch(localUri);
  const blob = await fileResponse.blob();

  // 3. Upload via XHR for progress tracking
  return new Promise<{ gcsUri: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ gcsUri: gcs_uri });
      } else {
        reject(
          new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`)
        );
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    xhr.open('PUT', signed_url);
    xhr.setRequestHeader('Content-Type', 'video/mp4');
    xhr.send(blob);
  });
}
