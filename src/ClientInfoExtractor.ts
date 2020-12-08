import * as fs from "fs";
import * as csv from "csv-parser";
import * as csvWriter from "csv-write-stream";

export class ClientInfoExtractor {

    private clientAccessTypeMap: Map<string, string> = new Map<string, string>();

    public Process(originalFilePath: string, ipColumnName: string, newFilePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.createReadStream(originalFilePath).pipe(csv())
              .on("data", async (data) => {
                const clientIp = data[ipColumnName];
                if (!clientIp) {
                  reject(`${ipColumnName} does not exist at ${originalFilePath}.`)
                }
                if (!this.ipOwnerMap.has(clientIp)) {
                  const owner = this.resolveOwner(clientIp);
                  data.owner = owner;
                  this.ipOwnerMap[clientIp] = owner;
                  ipOwnerWriter.write(data);
                }
              }).on("end", () => {
                ipOwnerWriter.end();
                resolve();
              }).on("error", (err) => {
                reject(err)
              });
          });
      

    }
}