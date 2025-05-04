import RNFS from "react-native-fs";
import { Platform, Alert } from "react-native";

export const downloadModel = async (
  modelName: string,
  modelUrl: string,
  onProgress: (progress: number) => void
): Promise<string> => {
  const destPath = `${RNFS.DocumentDirectoryPath}/${modelName}`;
  
  // First check if we have network connectivity
  try {
    // Perform a HEAD request to check server connectivity and get content length
    // This helps detect issues before starting a large download
    const headCheck = await fetch(modelUrl, { method: 'HEAD' });
    
    if (!headCheck.ok) {
      throw new Error(`Server returned status ${headCheck.status}: ${headCheck.statusText}`);
    }
    
    const contentLength = headCheck.headers.get('content-length');
    console.log(`Content length from HEAD request: ${contentLength}`);
    
    if (!contentLength || parseInt(contentLength) < 1000000) {
      console.warn('Content length is missing or suspiciously small');
    }
  } catch (networkError) {
    console.error('Network connectivity issue:', networkError);
    throw new Error('Unable to connect to download server. Please check your internet connection and try again.');
  }

  try {
    const fileExists = await RNFS.exists(destPath);

    // If it exists, check if it's complete
    if (fileExists) {
      try {
        // Check file size - if too small, might be incomplete
        const fileInfo = await RNFS.stat(destPath);
        if (fileInfo.size < 1000000) { // Smaller than 1MB is suspicious for GGUF
          console.log(`File exists but may be incomplete (${fileInfo.size} bytes), deleting...`);
          await RNFS.unlink(destPath);
        } else {
          console.log(`File exists and seems complete (${fileInfo.size} bytes)`);
          return destPath;
        }
      } catch (statError) {
        console.error("Error checking file stats:", statError);
        // Delete to be safe
        await RNFS.unlink(destPath);
      }
    }

    console.log("Starting download");
    console.log("modelUrl:", modelUrl);

    // Create a temporary file path for downloading
    // This prevents corrupted downloads if the app is closed during download
    const tempDestPath = `${destPath}.downloading`;
    
    // Clean up any existing temp file
    if (await RNFS.exists(tempDestPath)) {
      await RNFS.unlink(tempDestPath);
    }

    // Download with retry logic
    let downloadSuccess = false;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    // For iOS devices, use more aggressive progress updates
    const progressDivider = Platform.OS === 'ios' ? 1 : 5;
    
    // Longer timeouts for larger files
    const connectionTimeout = 60000; // 60 seconds
    const readTimeout = 60000;       // 60 seconds
    
    // Last progress update time to detect stalled downloads
    let lastProgressTime = Date.now();
    let lastBytesWritten = 0;
    const progressCheckInterval = setInterval(() => {
      if (isDownloading && Date.now() - lastProgressTime > 30000) {
        console.warn('Download appears to be stalled');
        // Force a small progress update to show activity
        onProgress(Math.min(99, currentProgress + 0.1));
      }
    }, 30000);
    
    let isDownloading = false;
    let currentProgress = 0;

    while (!downloadSuccess && retryCount < MAX_RETRIES) {
      try {
        isDownloading = true;
        lastProgressTime = Date.now();
        
        // Request with longer timeouts for iOS
        const downloadResult = await RNFS.downloadFile({
          fromUrl: modelUrl,
          toFile: tempDestPath,
          progressDivider: progressDivider,
          connectionTimeout: connectionTimeout,
          readTimeout: readTimeout,
          background: true, // Enable background downloads
          discretionary: false, // Download immediately
          cacheable: true, // Allow caching if possible
          begin: (res) => {
            console.log("Download begun with response:", res);
            
            // Check if we're getting a valid response
            if (res.statusCode && res.statusCode !== 200) {
              console.error(`Bad response code: ${res.statusCode}`);
              throw new Error(`Server responded with code ${res.statusCode}`);
            }
            
            // Check if we're getting content length info
            if (!res.contentLength || res.contentLength <= 0) {
              console.warn("No content length received from server");
              
              // If no content length on iOS, try to show indeterminate progress
              if (Platform.OS === 'ios') {
                // Show incremental progress even without content length
                let fakeProgress = 0;
                const fakeProgressInterval = setInterval(() => {
                  if (isDownloading) {
                    fakeProgress = Math.min(95, fakeProgress + 5);
                    onProgress(fakeProgress);
                  } else {
                    clearInterval(fakeProgressInterval);
                  }
                }, 5000);
              }
            }
          },
          progress: ({ bytesWritten, contentLength }: { bytesWritten: number; contentLength: number }) => {
            // Update last progress time
            lastProgressTime = Date.now();
            
            // Check for stalled download
            if (bytesWritten === lastBytesWritten) {
              console.warn('Download may be stalled - bytes written unchanged');
            }
            lastBytesWritten = bytesWritten;
            
            if (contentLength > 0) {
              const progress = (bytesWritten / contentLength) * 100;
              console.log(`Progress: ${progress.toFixed(2)}% (${bytesWritten}/${contentLength})`);
              onProgress(Math.floor(progress));
              currentProgress = Math.floor(progress);
            } else {
              // Handle case where content length is unknown
              console.log(`Downloaded ${bytesWritten} bytes (unknown total)`);
              
              // Use bytesWritten to show some progress
              // Estimate total size at around 2GB max
              const estimatedProgress = Math.min(99, (bytesWritten / (2 * 1024 * 1024 * 1024)) * 100);
              onProgress(Math.floor(estimatedProgress));
              currentProgress = Math.floor(estimatedProgress);
            }
          },
        }).promise;
        
        isDownloading = false;
        clearInterval(progressCheckInterval);
        
        console.log("Download finished with status:", downloadResult);

        if (downloadResult.statusCode === 200) {
          // Verify file was actually downloaded
          const fileInfo = await RNFS.stat(tempDestPath);
          if (fileInfo.size > 1000000) { // Should be at least 1MB
            // Move the temp file to the final destination
            await RNFS.moveFile(tempDestPath, destPath);
            
            downloadSuccess = true;
            console.log(`Download successful, file size: ${fileInfo.size} bytes`);
            return destPath;
          } else {
            console.error(`Downloaded file too small: ${fileInfo.size} bytes`);
            throw new Error("Downloaded file is incomplete");
          }
        } else {
          console.error(`Download failed with status code: ${downloadResult.statusCode}`);
          throw new Error(`Download failed with status code: ${downloadResult.statusCode}`);
        }
      } catch (error) {
        isDownloading = false;
        clearInterval(progressCheckInterval);
        
        retryCount++;
        console.error(`Download attempt ${retryCount} failed:`, error);
        
        // Last attempt failed, give up and report error
        if (retryCount >= MAX_RETRIES) {
          if (error instanceof Error) {
            throw new Error(`Failed to download model after ${MAX_RETRIES} attempts: ${error.message}`);
          } else {
            throw new Error(`Failed to download model after ${MAX_RETRIES} attempts: Unknown error`);
          }
        }
        
        // Wait before retrying (1 second, 2 seconds, etc.)
        await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
        
        // Show retry message to user
        onProgress(1); // Reset progress to 1% to show activity
        
        if (Platform.OS === 'ios') {
          // On iOS, we need to explicitly show a retry is happening
          Alert.alert(
            'Download Failed', 
            `Retrying download (attempt ${retryCount + 1} of ${MAX_RETRIES})`,
            [{ text: 'OK' }]
          );
        }
      }
    }

    // This should not be reached due to the return/throw statements above
    throw new Error("Download failed under unexpected circumstances");
  } catch (error) {
    console.error("Download error:", error);
    
    // Clean up any partial download
    try {
      const tempDestPath = `${destPath}.downloading`;
      
      if (await RNFS.exists(tempDestPath)) {
        await RNFS.unlink(tempDestPath);
        console.log(`Deleted incomplete download at ${tempDestPath}`);
      }
      
      if (await RNFS.exists(destPath)) {
        await RNFS.unlink(destPath);
        console.log(`Deleted incomplete download at ${destPath}`);
      }
    } catch (cleanupError) {
      console.error("Error during cleanup:", cleanupError);
    }
    
    // Rethrow with user-friendly message
    if (error instanceof Error) {
      throw new Error(`Failed to download model: ${error.message}`);
    } else {
      throw new Error('Failed to download model: Unknown error');
    }
  }
};