import * as fs from "fs";
import * as path from "path";
import * as csv from "csv-parser";
import * as netmask from "netmask";

import * as csvWriter from "csv-write-stream";

export class IpOwnerProcessor {

  private netmaskOwnerMap: Map<string, string> = new Map<string, string>();
  private ipOwnerMap: Map<string, string> = new Map<string, string>();

  private netmaskFilePath: string;

  constructor(netmaskFilePath: string) {
    this.netmaskFilePath = path.resolve(netmaskFilePath);
  }

  private initNetmaskOwnerMap(): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.createReadStream(this.netmaskFilePath).pipe(csv({
        separator: ",",
        headers: ["netmask", "owner"],
        skipLines: 1
      })).on("data", (data) => {
        this.netmaskOwnerMap.set(data.netmask, data.owner);
      }).on("end", () => {
        resolve();
      }).on("error", (err) => {
        reject(err)
      });
    });
  }

  private resolveOwner(clientIp: string): string {
    for (let pair of this.netmaskOwnerMap.entries()) {
      const block = new netmask.Netmask(pair[0]);
      if (block.contains(clientIp)) {
        return pair[1];
      }
    }

    return "UNKNOWN";
  }

  public async Process(ipCsvFilePath: string, ipColumnName: string, newCsvFilePath: string) {
    await this.initNetmaskOwnerMap();

    const ipOwnerWriter = csvWriter();
    ipOwnerWriter.pipe(fs.createWriteStream(newCsvFilePath));

    return new Promise((resolve, reject) => {
      fs.createReadStream(ipCsvFilePath).pipe(csv())
        .on("data", async (data) => {
          const clientIp = data[ipColumnName];
          if (!clientIp) {
            reject(`${ipColumnName} does not exist at ${ipCsvFilePath}.`)
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

new IpOwnerProcessor(process.argv[2]).Process(process.argv[3], process.argv[4], process.argv[5]).then(() => {
  console.info("Done");
}).catch(err => {
  console.error(err);
})