"use client"

import Image from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  fill?: boolean
  sizes?: string
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down"
  placeholder?: "blur" | "empty"
  blurDataURL?: string
  onError?: () => void
}

/**
 * Optimized Image Component using Next.js Image
 * 
 * This component wraps Next.js Image component with automatic optimization:
 * - Automatic format conversion (WebP, AVIF)
 * - Responsive images with srcset
 * - Lazy loading (unless priority is set)
 * - Blur placeholder support
 * 
 * Usage:
 * ```tsx
 * <OptimizedImage
 *   src="/logo.png"
 *   alt="Logo"
 *   width={200}
 *   height={200}
 *   priority // For above-the-fold images
 * />
 * ```
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  fill = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  objectFit = "contain",
  placeholder = "empty",
  blurDataURL,
  onError,
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  // Fallback to regular img if error occurs
  if (hasError) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={{ objectFit }}
      />
    )
  }

  // External images need to be configured in next.config.js
  const isExternal = src.startsWith("http://") || src.startsWith("https://")

  if (isExternal) {
    // For external images, use regular img tag with loading optimization
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={{ objectFit }}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={handleError}
      />
    )
  }

  // Use Next.js Image for internal images
  const imageProps = {
    src,
    alt,
    className: cn(className),
    priority,
    onError: handleError,
    ...(fill
      ? {
          fill: true,
          sizes,
          style: { objectFit },
        }
      : {
          width: width || 800,
          height: height || 600,
          style: { objectFit },
        }),
    ...(placeholder === "blur" && blurDataURL && { placeholder: "blur" as const, blurDataURL }),
  }

  return <Image {...imageProps} />
}

