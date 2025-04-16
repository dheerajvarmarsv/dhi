import RNFS from "react-native-fs";

export const downloadModel = async (
  modelName: string,
  modelUrl: string,
  onProgress: (progress: number) => void
): Promise<string> => {
  const destPath = `${RNFS.DocumentDirectoryPath}/${modelName}`;
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

    // Download with retry logic
    let downloadSuccess = false;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    while (!downloadSuccess && retryCount < MAX_RETRIES) {
      try {
        const downloadResult = await RNFS.downloadFile({
          fromUrl: modelUrl,
          toFile: destPath,
          progressDivider: 5,
          connectionTimeout: 30000, // 30 second timeout
          readTimeout: 30000,       // 30 second read timeout
          begin: (res) => {
            console.log("Download begun with response:", res);
            
            // Check if we're getting a valid response
            if (res.statusCode && res.statusCode !== 200) {
              console.error(`Bad response code: ${res.statusCode}`);
              throw new Error(`Server responded with code ${res.statusCode}`);
            }
            
            // Check if we're getting content length info
            if (!res.contentLength || res.contentLength <= 0) {
              console.warn("No content length received, download may fail");
            }
          },
          progress: ({ bytesWritten, contentLength }: { bytesWritten: number; contentLength: number }) => {
            if (contentLength > 0) {
              const progress = (bytesWritten / contentLength) * 100;
              console.log(`Progress: ${progress.toFixed(2)}% (${bytesWritten}/${contentLength})`);
              onProgress(Math.floor(progress));
            } else {
              // Handle case where content length is unknown
              console.log(`Downloaded ${bytesWritten} bytes`);
              // Just update with indeterminate progress
              onProgress(Math.min(99, retryCount * 30 + (bytesWritten > 1000000 ? 50 : 10)));
            }
          },
        }).promise;
        
        console.log("Download finished with status:", downloadResult);

        if (downloadResult.statusCode === 200) {
          // Verify file was actually downloaded
          const fileInfo = await RNFS.stat(destPath);
          if (fileInfo.size > 1000000) { // Should be at least 1MB
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
      }
    }

    // This should not be reached due to the return/throw statements above
    throw new Error("Download failed under unexpected circumstances");
  } catch (error) {
    console.error("Download error:", error);
    
    // Clean up any partial download
    try {
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