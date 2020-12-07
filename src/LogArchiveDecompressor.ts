import * as fs from "fs";
import * as path from "path";
import * as gunzip from "gunzip-file";

export class LogArchiveDecompressor {

  private readonly GZ_SUFFIX = ".gz";

  private findGzFiles(dirPath: string): string[] {
    const foundGzFilePaths: string[] = [];
    const fullPath = path.resolve(dirPath);
    const childPaths = fs.readdirSync(fullPath);
    childPaths.forEach((childPath) => {
      const childFullPath = path.join(dirPath, childPath);
      const fsStat = fs.lstatSync(childFullPath);
      if (fsStat.isDirectory()) {
        this.findGzFiles(childFullPath);
      } else if (childFullPath.toLowerCase().endsWith(this.GZ_SUFFIX)) {
        foundGzFilePaths.push(childFullPath);
      }
    });
    foundGzFilePaths.sort();
    return foundGzFilePaths;
  }

  public Decompress(srcDir: string) {
    const gzFilePaths = this.findGzFiles(srcDir);
    gzFilePaths.forEach((gzFilePath) => {
      const expectedLogFilePath = gzFilePath.substring(
        0,
        gzFilePath.length - this.GZ_SUFFIX.length
      );

      // Decompress the log
      if (!fs.existsSync(expectedLogFilePath)) {
        gunzip(gzFilePath, expectedLogFilePath, () => {
          console.info(`Decompressed ${expectedLogFilePath}`);
        });
      }
    });
  }
}
