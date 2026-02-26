import Map "mo:core/Map";
import Blob "mo:core/Blob";
import Nat "mo:core/Nat";
import Storage "blob-storage/Storage";

module {
  public type OldMetadata = {
    title : Text;
    fileName : Text;
    shareId : Text;
    uploadedAt : Int;
    file : Storage.ExternalBlob;
  };

  public type OldActor = {
    pdfStorage : Map.Map<Text, OldMetadata>;
  };

  public type Chunk = Blob;
  public type ChunkIndex = Nat;

  public type ChunkedFile = {
    chunks : Map.Map<Nat, Chunk>;
    totalChunks : Nat;
  };

  public type Metadata = {
    title : Text;
    fileName : Text;
    shareId : Text;
    uploadedAt : Int;
    totalChunks : Nat;
    file : Storage.ExternalBlob;
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

  public type NewActor = {
    pdfMetadata : Map.Map<Text, Metadata>;
    uploadStatuses : Map.Map<Text, UploadStatus>;
  };

  public func run(old : OldActor) : NewActor {
    let newPdfMetadata = old.pdfStorage.map<Text, OldMetadata, Metadata>(
      func(_shareId, oldMetadata) {
        { oldMetadata with totalChunks = 0 };
      }
    );

    { pdfMetadata = newPdfMetadata; uploadStatuses = Map.empty<Text, UploadStatus>() };
  };
};
