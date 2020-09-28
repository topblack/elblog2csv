export interface LogEntry {
    type: string;
    time: string;
    elb: string;
    clientIp: string;
    clientPort: number;
    targetIp: string;
    targetPort: number;
    requestProcessingTime: number;
    targetProcessingTime: number;
    responseProcessingTime: number;
    elbStatusCode: number;
    targetStatusCode: number;
    receivedBytes: number;
    sentBytes: number;
    request: string;
    userAgent: string;
    sslCipher: string;
    sslProtocol: string;
    targetGroupArn: string;
    traceId: string;
    domainName: string;
    chosenCertArn: string;
    matchedRulePriority: number;
    requestCreationTime: string;
}