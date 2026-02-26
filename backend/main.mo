import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

actor {
  include MixinStorage();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type Chunk = Blob;
  public type ChunkIndex = Nat;

  public type ChunkedFile = {
    chunks : Map.Map<Nat, Chunk>;
    totalChunks : Nat;
  };

  type Metadata = {
    title : Text;
    fileName : Text;
    shareId : Text;
    uploadedAt : Time.Time;
    totalChunks : Nat;
    file : Storage.ExternalBlob;
  };

  module Metadata {
    public func compare(meta1 : Metadata, meta2 : Metadata) : Order.Order {
      Text.compare(meta1.title, meta2.title);
    };
  };

  public type UploadParams = {
    title : Text;
    fileName : Text;
    shareId : Text;
    totalChunks : Nat;
  };

  public type UploadStatus = {
    uploadParams : UploadParams;
    chunkedFile : ChunkedFile;
  };

  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();
  let pdfMetadata = Map.empty<Text, Metadata>();
  let uploadStatuses = Map.empty<Text, UploadStatus>();

  public type ChunkInfo = {
    uploadedChunks : Nat;
    totalChunks : Nat;
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func startUpload(uploadParams : UploadParams) : async () {
    // Accept all authenticated users except anonymous ones.
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Only authenticated users can start uploads");
    };

    switch (pdfMetadata.get(uploadParams.shareId)) {
      case (?_) { Runtime.trap("PDF with this share ID already exists!") };
      case (null) {
        let chunkedFile : ChunkedFile = {
          chunks = Map.empty<ChunkIndex, Chunk>();
          totalChunks = uploadParams.totalChunks;
        };

        let uploadStatus : UploadStatus = {
          uploadParams;
          chunkedFile;
        };

        uploadStatuses.add(uploadParams.shareId, uploadStatus);
      };
    };
  };

  public shared ({ caller }) func uploadChunk(shareId : Text, chunkIndex : Nat, chunkData : Chunk) : async () {
    // Accept all authenticated users except anonymous ones.
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Only authenticated users can upload chunks");
    };

    switch (uploadStatuses.get(shareId)) {
      case (?uploadStatus) {
        if (chunkIndex >= uploadStatus.uploadParams.totalChunks) {
          Runtime.trap("Invalid chunk index");
        };
        uploadStatus.chunkedFile.chunks.add(chunkIndex, chunkData);
        uploadStatuses.add(shareId, uploadStatus);
      };
      case (null) { Runtime.trap("Upload not started for this shareId!") };
    };
  };

  public shared ({ caller }) func finalizeUpload(shareId : Text, file : Storage.ExternalBlob) : async () {
    // Accept all authenticated users except anonymous ones.
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Only authenticated users can finalize uploads");
    };

    switch (uploadStatuses.get(shareId)) {
      case (?uploadStatus) {
        let metadata : Metadata = {
          title = uploadStatus.uploadParams.title;
          fileName = uploadStatus.uploadParams.fileName;
          shareId;
          uploadedAt = Time.now();
          file;
          totalChunks = uploadStatus.chunkedFile.totalChunks;
        };

        pdfMetadata.add(shareId, metadata);
        uploadStatuses.remove(shareId);
      };
      case (null) { Runtime.trap("Upload not started for this shareId!") };
    };
  };

  public query ({ caller }) func getPdfChunks(shareId : Text) : async ChunkInfo {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get PDF chunk info");
    };
    switch (uploadStatuses.get(shareId)) {
      case (?uploadStatus) {
        {
          uploadedChunks = uploadStatus.chunkedFile.chunks.size();
          totalChunks = uploadStatus.chunkedFile.totalChunks;
        };
      };
      case (null) { Runtime.trap("Upload not started for this shareId!") };
    };
  };

  public query ({ caller }) func getPdfChunk(shareId : Text, chunkIndex : ChunkIndex) : async Chunk {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get PDF chunks");
    };
    switch (uploadStatuses.get(shareId)) {
      case (?uploadStatus) {
        switch (uploadStatus.chunkedFile.chunks.get(chunkIndex)) {
          case (null) { Runtime.trap("Chunk does not exist") };
          case (?chunk) { chunk };
        };
      };
      case (null) { Runtime.trap("Upload not started for this shareId!") };
    };
  };

  public query ({ caller }) func getPdf(shareId : Text) : async Metadata {
    switch (pdfMetadata.get(shareId)) {
      case (null) { Runtime.trap("PDF with shareId does not exist!") };
      case (?metadata) { metadata };
    };
  };

  public query ({ caller }) func listPdfs() : async [Metadata] {
    pdfMetadata.values().toArray().sort();
  };

  public shared ({ caller }) func updatePdfTitle(shareId : Text, newTitle : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update PDF titles");
    };
    switch (pdfMetadata.get(shareId)) {
      case (null) { Runtime.trap("PDF not found") };
      case (?metadata) {
        let updatedMetadata = { metadata with title = newTitle };
        pdfMetadata.add(shareId, updatedMetadata);
      };
    };
  };

  public shared ({ caller }) func deletePdf(shareId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete PDFs");
    };
    if (not (pdfMetadata.containsKey(shareId))) {
      Runtime.trap("PDF with shareId does not exist!");
    };
    pdfMetadata.remove(shareId);
  };
};
