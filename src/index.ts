import * as fs from "fs"
import * as path from "path"
import { LogFilePreprocessor } from "./LogFilePreprocessor";

const processor = new LogFilePreprocessor("cache");

processor.Process();