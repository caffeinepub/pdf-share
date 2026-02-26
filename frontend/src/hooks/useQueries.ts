import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { type Metadata, type UploadParams, ExternalBlob, type backendInterface } from '../backend';
import type { Principal } from '@icp-sdk/core/principal';

// ─── Helper: get actor from query cache reactively ───────────────────────────

function getActorFromCache(queryClient: ReturnType<typeof useQueryClient>): backendInterface | null {
    const queries = queryClient.getQueriesData<backendInterface>({ queryKey: ['actor'] });
    for (const [, data] of queries) {
        if (data) return data;
    }
    return null;
}

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
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (uploadParams: UploadParams) => {
            const actor = getActorFromCache(queryClient);
            if (!actor) throw new Error('Connection not ready. Please wait a moment and try again.');
            await actor.startUpload(uploadParams);
        },
    });
}

export function useUploadChunk() {
    const queryClient = useQueryClient();

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
            const actor = getActorFromCache(queryClient);
            if (!actor) throw new Error('Connection not ready. Please wait a moment and try again.');
            await actor.uploadChunk(shareId, chunkIndex, chunkData);
        },
    });
}

export function useFinalizeUpload() {
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
            const actor = getActorFromCache(queryClient);
            if (!actor) throw new Error('Connection not ready. Please wait a moment and try again.');
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
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (shareId: string) => {
            const actor = getActorFromCache(queryClient);
            if (!actor) throw new Error('Connection not ready. Please wait a moment and try again.');
            await actor.deletePdf(shareId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pdfs'] });
        },
    });
}

export function useUpdatePdfTitle() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ shareId, newTitle }: { shareId: string; newTitle: string }) => {
            const actor = getActorFromCache(queryClient);
            if (!actor) throw new Error('Connection not ready. Please wait a moment and try again.');
            await actor.updatePdfTitle(shareId, newTitle);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pdfs'] });
        },
    });
}

// ─── Admin: banned users ─────────────────────────────────────────────────────

export function useBannedUsers() {
    const { actor, isFetching } = useActor();

    return useQuery<Principal[]>({
        queryKey: ['bannedUsers'],
        queryFn: async () => {
            if (!actor) return [];
            return actor.listBannedUsers();
        },
        enabled: !!actor && !isFetching,
        retry: false,
    });
}

export function useKickUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (user: Principal) => {
            const actor = getActorFromCache(queryClient);
            if (!actor) throw new Error('Connection not ready. Please wait a moment and try again.');
            await actor.kickUser(user);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bannedUsers'] });
        },
    });
}

export function useUnbanUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (user: Principal) => {
            const actor = getActorFromCache(queryClient);
            if (!actor) throw new Error('Connection not ready. Please wait a moment and try again.');
            await actor.unbanUser(user);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bannedUsers'] });
        },
    });
}
