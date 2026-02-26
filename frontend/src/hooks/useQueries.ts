import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { type Metadata, type UploadParams, ExternalBlob } from '../backend';

// ─── List / meta ────────────────────────────────────────────────────────────

export function useListPdfs() {
    const { actor, isFetching } = useActor();

    return useQuery<Metadata[]>({
        queryKey: ['pdfs'],
        queryFn: async () => {
            if (!actor) return [];
            return actor.listPdfs();
        },
        enabled: !!actor && !isFetching,
    });
}

// Keep legacy alias for existing consumers
export function useGetAllPdfMeta() {
    return useListPdfs();
}

export function useGetPdf(shareId: string) {
    const { actor, isFetching } = useActor();

    return useQuery<Metadata>({
        queryKey: ['pdf', shareId],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.getPdf(shareId);
        },
        enabled: !!actor && !isFetching && !!shareId,
        retry: false,
    });
}

// ─── Chunked upload ──────────────────────────────────────────────────────────

export function useStartUpload() {
    const { actor } = useActor();

    return useMutation({
        mutationFn: async (uploadParams: UploadParams) => {
            if (!actor) throw new Error('Actor not available');
            await actor.startUpload(uploadParams);
        },
    });
}

export function useUploadChunk() {
    const { actor } = useActor();

    return useMutation({
        mutationFn: async ({
            shareId,
            chunkIndex,
            chunkData,
        }: {
            shareId: string;
            chunkIndex: bigint;
            chunkData: Uint8Array;
        }) => {
            if (!actor) throw new Error('Actor not available');
            await actor.uploadChunk(shareId, chunkIndex, chunkData);
        },
    });
}

export function useFinalizeUpload() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            shareId,
            fileBytes,
            onProgress,
        }: {
            shareId: string;
            fileBytes: Uint8Array<ArrayBuffer>;
            onProgress?: (pct: number) => void;
        }) => {
            if (!actor) throw new Error('Actor not available');
            const blob = ExternalBlob.fromBytes(fileBytes).withUploadProgress(
                onProgress ?? (() => {})
            );
            await actor.finalizeUpload(shareId, blob);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pdfs'] });
        },
    });
}

// ─── Delete / rename ─────────────────────────────────────────────────────────

export function useDeletePdf() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (shareId: string) => {
            if (!actor) throw new Error('Actor not available');
            await actor.deletePdf(shareId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pdfs'] });
        },
    });
}

export function useUpdatePdfTitle() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ shareId, newTitle }: { shareId: string; newTitle: string }) => {
            if (!actor) throw new Error('Actor not available');
            await actor.updatePdfTitle(shareId, newTitle);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pdfs'] });
        },
    });
}
