import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export type Chunk = Uint8Array;
export interface Metadata {
    title: string;
    file: ExternalBlob;
    fileName: string;
    shareId: string;
    totalChunks: bigint;
    uploadedAt: Time;
}
export interface ChunkInfo {
    uploadedChunks: bigint;
    totalChunks: bigint;
}
export type Time = bigint;
export type ChunkIndex = bigint;
export interface UploadParams {
    title: string;
    fileName: string;
    shareId: string;
    totalChunks: bigint;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deletePdf(shareId: string): Promise<void>;
    finalizeUpload(shareId: string, file: ExternalBlob): Promise<void>;
    getAllPdfMeta(): Promise<Array<Metadata>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getPdf(shareId: string): Promise<Metadata>;
    getPdfChunk(shareId: string, chunkIndex: ChunkIndex): Promise<Chunk>;
    getPdfChunks(shareId: string): Promise<ChunkInfo>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    startUpload(uploadParams: UploadParams): Promise<void>;
    updatePdfTitle(shareId: string, newTitle: string): Promise<void>;
    uploadChunk(shareId: string, chunkIndex: bigint, chunkData: Chunk): Promise<void>;
}
