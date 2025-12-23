/**
 * File utility functions that can be used in both client and server contexts
 * These functions don't require Node.js-specific modules
 */

/**
 * Check if a file type is supported
 */
export function isSupportedFileType(file: File): boolean {
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  const supportedTypes = ['pdf', 'txt', 'docx', 'doc'];
  return supportedTypes.includes(fileExtension || '');
}
