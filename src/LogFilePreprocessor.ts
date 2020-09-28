import * as fs from "fs";
import * as path from "path";
import * as gunzip from "gunzip-file";
import * as csv from "csv-parser";
import * as csvWriter from "csv-write-stream";
import * as geoip from "geoip-lite";

export class LogFilePreprocessor {
  /**
   * h2 2020-09-21T23:55:03.144807Z app/cdd-prod-int-alb-cdd/902ce81debed00fa 200.91.206.27:36889 10.128.156.5:443 0.000 0.002 0.000 200 200 38 634 "GET https://chemdrawdirect.perkinelmer.cloud:443/js/chemdrawweb/cursors/bin323.cur HTTP/2.0" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36" ECDHE-RSA-AES128-GCM-SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:771749195520:targetgroup/cdd-prod-int-trgp-cdd/1a0ea1e00ab7c39f "Root=1-5f693d57-3fdfed20e2e29a884b2fc8b0" "chemdrawdirect.perkinelmer.cloud" "session-reused" 0 2020-09-21T23:55:03.142000Z "forward" "-" "-" "10.128.156.5:443" "200" "-" "-"
   * h2
   * 2020-09-21T23:55:03.144807Z
   * app/cdd-prod-int-alb-cdd/902ce81debed00fa
   * 200.91.206.27:36889
   * 10.128.156.5:443
   * 0.000
   * 0.002
   * 0.000
   * 200
   * 200
   * 38
   * 634
   * "GET https://chemdrawdirect.perkinelmer.cloud:443/js/chemdrawweb/cursors/bin323.cur HTTP/2.0"
   * "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36"
   * ECDHE-RSA-AES128-GCM-SHA256
   * TLSv1.2
   * arn:aws:elasticloadbalancing:us-east-1:771749195520:targetgroup/cdd-prod-int-trgp-cdd/1a0ea1e00ab7c39f
   * "Root=1-5f693d57-3fdfed20e2e29a884b2fc8b0"
   * "chemdrawdirect.perkinelmer.cloud"
   * "session-reused"
   * 0
   * 2020-09-21T23:55:03.142000Z
   * "forward"
   * "-"
   * "-"
   * "10.128.156.5:443"
   * "200"
   * "-"
   * "-"
   */

  private rootDir: string;

  private readonly GZ_SUFFIX = ".gz";

  private gzFilePaths: string[] = [];

  private clientIpSet: Set<string> = new Set<string>();

  private clientGeoInfos: any[] = [];

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.init();
  }

  private init() {
    this.findGzFiles(this.rootDir);
    this.gzFilePaths.sort();
    console.info(`${this.gzFilePaths.length} gz files found.`);
  }

  public findGzFiles(dirPath: string) {
    const fullPath = path.resolve(dirPath);
    const childPaths = fs.readdirSync(fullPath);
    childPaths.forEach((childPath) => {
      const childFullPath = path.join(dirPath, childPath);
      const fsStat = fs.lstatSync(childFullPath);
      if (fsStat.isDirectory()) {
        this.findGzFiles(childFullPath);
      } else if (childFullPath.toLowerCase().endsWith(this.GZ_SUFFIX)) {
        this.gzFilePaths.push(childFullPath);
      }
    });
  }

  public Process() {
    const results = [];
    let processedGzFiles = this.gzFilePaths.length;
    const accessLogWriter = csvWriter();
    accessLogWriter.pipe(fs.createWriteStream("access-logs.csv"));

    const accessClientWriter = csvWriter();
    accessClientWriter.pipe(fs.createWriteStream("client-geo.csv"));

    this.gzFilePaths.forEach((gzFilePath) => {
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

      console.info(expectedLogFilePath);
      //const ws = fs.createWriteStream()
      fs.createReadStream(expectedLogFilePath)
        .pipe(
          csv({
            separator: " ",
            headers: [
              "type",
              "time",
              "elb",
              "clientIpPort",
              "targetIpPort",
              "requestProcessingTime",
              "targetProcessingTime",
              "responseProcessingTime",
              "elbStatusCode",
              "targetStatusCode",
              "receivedBytes",
              "sentBytes",
              "request",
              "userAgent",
              "sslCipher",
              "sslProtocol",
              "targetGroupAnr",
              "traceId",
              "domainName",
              "chosenCertArn",
              "matchedRulePriority",
              "requestCreationTime",
              "actionsExecuted",
              "redirectUrl",
              "errorReason",
              "targetPortList",
              "targetStatusCodeList",
              "classification",
              "classificationReason"
            ],
          })
        )
        .on("data", (data) => {
          results.push(data);

          data.clientIp = data["clientIpPort"].split(":")[0];
          if (!this.clientIpSet.has(data.clientIp)) {
            this.clientIpSet.add(data.clientIp);
            const geoInfo = geoip.lookup(data.clientIp);
            geoInfo.ip = data.clientIp;
            accessClientWriter.write(geoInfo);
          }
          accessLogWriter.write(data);
        })
        .on("end", () => {
            processedGzFiles--;
            if (processedGzFiles === 0) {
                accessLogWriter.end();
                accessClientWriter.end();
                console.info(`${results.length} records`);
                console.info(`${this.clientIpSet.size} IP records`);
            }

            /*
            Account/User ID
409845
License key
WdPpPc4cr6PcVeyN 
            */
        });
    });
  }
}
