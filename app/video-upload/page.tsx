/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { tokenlessAxios } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileVideo, CheckCircle, AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

const CHUNK_SIZE = 50 * 1024 * 1024
const MAX_CONCURRENT_UPLOADS = 3

interface InitResult {
    status: string;
    data: {
        asset_id: number;
        s3_key: string;
        presigned_url: string;
    };
}

interface InitMultiUploadResult {
    status: string;
    data: {
        asset_id: number;
        upload_id: string;
        key: string;
        part_size: number;
        presigned_parts: {
            partNumber: number;
            url: string;
        }[];
    };
}

const initMultipartUpload = async (file: File): Promise<InitMultiUploadResult> => {
    const chunks = Math.ceil(file.size / CHUNK_SIZE)
    const res = await tokenlessAxios.post("/live-streams/multipart_upload", {
        filename: file.name,
        filesize: file.size,
        chunks: chunks,
    })
    return res.data
}

const completeUpload = async (assetId: number, uploadId?: string, parts?: Array<{PartNumber: number, ETag: string}>): Promise<void> => {
    const payload: any = {
        asset_id: assetId,
    }
    
    if (uploadId && parts) {
        payload.upload_id = uploadId
        payload.parts = parts
    }
    
    await tokenlessAxios.post("/live-streams/video_upload/complete", payload)
}

const initSingleUpload = async (file: File): Promise<InitResult> => {
    const res = await tokenlessAxios.post("/live-streams/single_upload", {
        filename: file.name,
        filesize: file.size,
    })
    return res.data
}

const uploadToAWS = async (url: string, data: Blob | File): Promise<string | null> => {
  const proxyUrl = `/api/s3-upload-proxy?url=${encodeURIComponent(url)}`
  const headers: Record<string, string> = {}
  if (data instanceof File) {
    headers["x-content-type"] = data.type
  }
  const response = await fetch(proxyUrl, {
    method: "POST",
    body: data,
    headers,
  })
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unable to read error response')
    throw new Error(`Proxy upload failed: ${response.status} ${response.statusText} - ${errorText}`)
  }
  const etag = response.headers.get('ETag') || response.headers.get('etag')
  return etag ? etag.replace(/"/g, '') : null
}

const createChunkWithType = (file: File, start: number, end: number): Blob => {
    const chunk = file.slice(start, end)
    return chunk 
}

const uploadChunksWithConcurrency = async (
    file: File,
    presignedParts: { partNumber: number; url: string }[],
    onProgress: (progress: number) => void
): Promise<Array<{PartNumber: number, ETag: string}>> => {
    const chunks = Math.ceil(file.size / CHUNK_SIZE)
    let completedChunks = 0
    let currentIndex = 0
    const completedParts: Array<{PartNumber: number, ETag: string}> = []

    const uploadChunk = async (index: number): Promise<void> => {
        const start = index * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, file.size)
        const chunk = createChunkWithType(file, start, end)
        
        console.log(`Uploading chunk ${index + 1}/${chunks}...`, chunk)
        
        try {
            const etag = await uploadToAWS(presignedParts[index].url, chunk)
            if (!etag) {
                throw new Error(`No ETag received for part ${index + 1}`)
            }
            
            // Store the part info with 1-based part number
            completedParts[index] = {
                PartNumber: presignedParts[index].partNumber,
                ETag: etag
            }
            
            completedChunks++
            onProgress((completedChunks / chunks) * 100)
            console.log(`Completed chunk ${index + 1}/${chunks}, ETag: ${etag}`)
        } catch (error) {
            console.error(`Failed to upload chunk ${index + 1}:`, error)
            throw error
        }
    }

    const workers = Array(Math.min(MAX_CONCURRENT_UPLOADS, chunks)).fill(null).map(async () => {
        while (currentIndex < chunks) {
            const chunkIndex = currentIndex++
            await uploadChunk(chunkIndex)
        }
    })

    await Promise.all(workers)
    
    // Sort parts by PartNumber to ensure correct order
    return completedParts.filter(part => part != null).sort((a, b) => a.PartNumber - b.PartNumber)
}

export default function UploadPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
    const [errorMessage, setErrorMessage] = useState("")
    const [isDragOver, setIsDragOver] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            setUploadStatus("uploading")
            setUploadProgress(0)
            setErrorMessage("")

            try {
                const isLargeFile = file.size >= CHUNK_SIZE
                console.log(`File size: ${file.size} bytes, Chunk size: ${CHUNK_SIZE}, Using multipart: ${isLargeFile}`)

                if (isLargeFile) {
                    // Multipart upload with improved error handling
                    const initResponse = await initMultipartUpload(file)
                    const { data } = initResponse

                    if (!data.presigned_parts || data.presigned_parts.length === 0) {
                        throw new Error("No upload URLs received")
                    }

                    console.log(`Starting multipart upload for ${file.name} with ${data.presigned_parts.length} parts`)

                    // Upload chunks with concurrency control
                    const parts = await uploadChunksWithConcurrency(
                        file,
                        data.presigned_parts,
                        (progress) => setUploadProgress(progress * 0.9) // Reserve 10% for completion
                    )

                    console.log("All chunks uploaded, completing multipart upload...", parts)
                    setUploadProgress(95)
                    
                    await completeUpload(data.asset_id, data.upload_id, parts)
                    setUploadProgress(100)
                } else {
                    // Single part upload - init first to get presigned URL
                    const initResponse = await initSingleUpload(file)
                    const { data: { presigned_url, asset_id } } = initResponse

                    if (!presigned_url) throw new Error("No upload URL received")

                    setUploadProgress(10)

                    // Upload file to AWS using presigned URL
                    await uploadToAWS(presigned_url, file)
                    setUploadProgress(80)

                    // Complete the upload
                    await completeUpload(asset_id)
                    setUploadProgress(100)
                }

                setUploadStatus("success")
            } catch (error) {
                console.error("Upload failed:", error)
                setUploadStatus("error")
                
                let errorMsg = "Upload failed"
                if (error instanceof Error) {
                    if (error.message.includes('NS_ERROR_NET_RESET')) {
                        errorMsg = "Network connection was reset. Please check your connection and try again."
                    } else if (error.message.includes('CORS')) {
                        errorMsg = "CORS error occurred. Please contact support."
                    } else {
                        errorMsg = error.message
                    }
                }
                setErrorMessage(errorMsg)
            }
        },
        mutationKey: ["upload-video"],
    })

    const handleFileSelect = useCallback((file: File) => {
        if (!file.type.startsWith("video/")) {
            setErrorMessage("Please select a video file")
            return
        }
        setSelectedFile(file)
        setUploadStatus("idle")
        setUploadProgress(0)
        setErrorMessage("")
    }, [])

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            setIsDragOver(false)

            const files = Array.from(e.dataTransfer.files)
            if (files.length > 0) {
                handleFileSelect(files[0])
            }
        },
        [handleFileSelect],
    )

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
    }, [])

    const triggerFileSelect = useCallback(() => {
        fileInputRef.current?.click()
    }, [])

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes"
        const k = 1024
        const sizes = ["Bytes", "KB", "MB", "GB"]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    }

    const getUploadTypeLabel = (fileSize: number) => {
        return fileSize >= CHUNK_SIZE ? "Multipart Upload" : "Single Upload"
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Video Upload</h1>
                    <p className="text-muted-foreground">
                        Upload your videos with automatic optimization for different file sizes
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileVideo className="h-5 w-5" />
                            Upload Video
                        </CardTitle>
                        <CardDescription>
                            Files under 50MB use single upload, larger files use multipart upload for better performance
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleFileSelect(file)
                            }}
                            className="hidden"
                            disabled={uploadStatus === "uploading"}
                        />

                        <div
                            className={cn(
                                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                                isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                                uploadStatus === "uploading" && "pointer-events-none opacity-50",
                            )}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={triggerFileSelect}
                        >
                            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <div className="space-y-2">
                                <p className="text-lg font-medium">{selectedFile ? selectedFile.name : "Drop your video here"}</p>
                                <p className="text-sm text-muted-foreground">or click to browse files</p>
                            </div>
                        </div>

                        {selectedFile && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <FileVideo className="h-8 w-8 text-primary" />
                                        <div>
                                            <p className="font-medium">{selectedFile.name}</p>
                                            <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary">{getUploadTypeLabel(selectedFile.size)}</Badge>
                                        {uploadStatus !== "uploading" && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedFile(null)
                                                    setUploadStatus("idle")
                                                    setUploadProgress(0)
                                                    setErrorMessage("")
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {uploadStatus === "uploading" && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Uploading...</span>
                                            <span>{Math.round(uploadProgress)}%</span>
                                        </div>
                                        <Progress value={uploadProgress} className="h-2" />
                                    </div>
                                )}

                                {uploadStatus === "success" && (
                                    <Alert>
                                        <CheckCircle className="h-4 w-4" />
                                        <AlertDescription>Video uploaded successfully! Your video is now being processed.</AlertDescription>
                                    </Alert>
                                )}

                                {uploadStatus === "error" && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{errorMessage}</AlertDescription>
                                    </Alert>
                                )}

                                <Button
                                    onClick={() => selectedFile && uploadMutation.mutate(selectedFile)}
                                    disabled={!selectedFile || uploadStatus === "uploading"}
                                    className="w-full"
                                    size="lg"
                                >
                                    {uploadStatus === "uploading" ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload Video
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}