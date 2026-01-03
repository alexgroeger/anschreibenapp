/**
 * File utility functions that can be used in both client and server contexts
 * These functions don't require Node.js-specific modules
 */

/**
 * Helper function to check if an object is a File-like object
 * Works in both browser and Node.js environments
 */
function isFileLike(obj: any): boolean {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.arrayBuffer === 'function' &&
    typeof obj.name === 'string' &&
    typeof obj.size === 'number' &&
    typeof obj.type === 'string'
  );
}

/**
 * Check if a file type is supported
 * Works with File objects and File-like objects
 */
export function isSupportedFileType(file: File | any): boolean {
  // Handle File-like objects (works in Node.js where File is not available)
  const fileName = (isFileLike(file) || file instanceof File) 
    ? (file.name || '').toLowerCase()
    : '';
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  const supportedTypes = ['pdf', 'txt', 'docx', 'doc'];
  return supportedTypes.includes(fileExtension || '');
}


