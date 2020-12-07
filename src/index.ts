import { LogFilePreprocessor } from "./LogFilePreprocessor";
import { LogArchiveDecompressor } from "./LogArchiveDecompressor";

const decompressor = new LogArchiveDecompressor();

decompressor.Decompress("cache")