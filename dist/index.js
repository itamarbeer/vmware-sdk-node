// src/types/errors.ts
var VsphereErrorCode = /* @__PURE__ */ ((VsphereErrorCode2) => {
  VsphereErrorCode2["CONNECTION_FAILED"] = "CONNECTION_FAILED";
  VsphereErrorCode2["AUTH_FAILED"] = "AUTH_FAILED";
  VsphereErrorCode2["SESSION_EXPIRED"] = "SESSION_EXPIRED";
  VsphereErrorCode2["SOAP_FAULT"] = "SOAP_FAULT";
  VsphereErrorCode2["TASK_FAILED"] = "TASK_FAILED";
  VsphereErrorCode2["TASK_TIMEOUT"] = "TASK_TIMEOUT";
  VsphereErrorCode2["NOT_FOUND"] = "NOT_FOUND";
  VsphereErrorCode2["RATE_LIMITED"] = "RATE_LIMITED";
  VsphereErrorCode2["INVALID_ARGUMENT"] = "INVALID_ARGUMENT";
  VsphereErrorCode2["UNKNOWN"] = "UNKNOWN";
  return VsphereErrorCode2;
})(VsphereErrorCode || {});
var VsphereError = class extends Error {
  /** Machine-readable error classification. */
  code;
  /** Raw SOAP fault, when the error originates from a SOAP call. */
  soapFault;
  /** Related managed object reference, if applicable. */
  moRef;
  /** HTTP status code returned by vCenter, if applicable. */
  statusCode;
  /**
   * @param message - Human-readable error description.
   * @param code - Error classification code.
   * @param options - Additional error context.
   */
  constructor(message, code, options) {
    super(message, options?.cause ? { cause: options.cause } : void 0);
    this.name = "VsphereError";
    this.code = code;
    this.soapFault = options?.soapFault;
    this.moRef = options?.moRef;
    this.statusCode = options?.statusCode;
  }
};

// src/utils/logger.ts
var noopLogger = {
  debug() {
  },
  info() {
  },
  warn() {
  },
  error() {
  }
};

// src/soap/soap-client.ts
import * as soap from "soap";
import https from "https";

// src/utils/rate-limiter.ts
var TokenBucketRateLimiter = class {
  tokens;
  lastRefill;
  maxTokens;
  refillRate;
  waitQueue = [];
  timer = null;
  destroyed = false;
  /**
   * @param maxPerSecond - Maximum number of tokens (requests) allowed per second.
   */
  constructor(maxPerSecond) {
    this.maxTokens = maxPerSecond;
    this.tokens = maxPerSecond;
    this.refillRate = maxPerSecond;
    this.lastRefill = Date.now();
  }
  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1e3;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
  processQueue() {
    this.refill();
    while (this.waitQueue.length > 0 && this.tokens >= 1) {
      this.tokens -= 1;
      const waiter = this.waitQueue.shift();
      waiter.resolve();
    }
    if (this.waitQueue.length === 0 && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
  /** Acquires a token, waiting if the bucket is empty. Throws if the limiter has been destroyed. */
  async acquire() {
    if (this.destroyed) {
      throw new VsphereError("Rate limiter destroyed", "CONNECTION_FAILED" /* CONNECTION_FAILED */);
    }
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    return new Promise((resolve, reject) => {
      this.waitQueue.push({ resolve, reject });
      if (!this.timer) {
        this.timer = setInterval(() => this.processQueue(), 100);
        if (typeof this.timer.unref === "function") {
          this.timer.unref();
        }
      }
    });
  }
  /** Destroys the limiter and rejects all queued waiters. */
  destroy() {
    this.destroyed = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const err = new VsphereError("Rate limiter destroyed", "CONNECTION_FAILED" /* CONNECTION_FAILED */);
    for (const waiter of this.waitQueue) {
      waiter.reject(err);
    }
    this.waitQueue = [];
  }
};

// src/utils/concurrency.ts
var ConcurrencyLimiter = class {
  constructor(maxConcurrency) {
    this.maxConcurrency = maxConcurrency;
  }
  running = 0;
  queue = [];
  destroyed = false;
  /**
   * Runs `fn` once a concurrency slot is available. Throws if the limiter has been destroyed.
   * @param fn - Async function to execute.
   */
  async run(fn) {
    if (this.destroyed) {
      throw new VsphereError("Concurrency limiter destroyed", "CONNECTION_FAILED" /* CONNECTION_FAILED */);
    }
    if (this.running >= this.maxConcurrency) {
      await new Promise((resolve, reject) => {
        this.queue.push({ resolve, reject });
      });
    }
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next.resolve();
      }
    }
  }
  /** Destroys the limiter and rejects all queued waiters. */
  destroy() {
    this.destroyed = true;
    const err = new VsphereError("Concurrency limiter destroyed", "CONNECTION_FAILED" /* CONNECTION_FAILED */);
    for (const waiter of this.queue) {
      waiter.reject(err);
    }
    this.queue = [];
  }
};

// src/soap/fault-handler.ts
function extractFaultType(err) {
  if (!err || typeof err !== "object") return void 0;
  const root = err.root;
  if (root && typeof root === "object") {
    const envelope = root.Envelope;
    if (envelope && typeof envelope === "object") {
      const body = envelope.Body;
      if (body && typeof body === "object") {
        const fault = body.Fault;
        if (fault && typeof fault === "object") {
          const detail = fault.detail;
          if (detail && typeof detail === "object") {
            const keys = Object.keys(detail);
            if (keys.length > 0) return keys[0];
          }
          const faultstring = fault.faultstring;
          if (typeof faultstring === "string") return faultstring;
        }
      }
    }
  }
  if ("message" in err) {
    return err.message;
  }
  return void 0;
}
var FAULT_MAP = {
  InvalidLogin: "AUTH_FAILED" /* AUTH_FAILED */,
  InvalidLoginFault: "AUTH_FAILED" /* AUTH_FAILED */,
  NotAuthenticated: "SESSION_EXPIRED" /* SESSION_EXPIRED */,
  NotAuthenticatedFault: "SESSION_EXPIRED" /* SESSION_EXPIRED */,
  NoPermission: "AUTH_FAILED" /* AUTH_FAILED */,
  ManagedObjectNotFound: "NOT_FOUND" /* NOT_FOUND */,
  ManagedObjectNotFoundFault: "NOT_FOUND" /* NOT_FOUND */,
  InvalidArgument: "INVALID_ARGUMENT" /* INVALID_ARGUMENT */,
  InvalidArgumentFault: "INVALID_ARGUMENT" /* INVALID_ARGUMENT */
};
function wrapSoapFault(err, context) {
  if (err instanceof VsphereError) return err;
  const faultType = extractFaultType(err);
  const code = faultType && FAULT_MAP[faultType] || "SOAP_FAULT" /* SOAP_FAULT */;
  const message = faultType ? `SOAP fault: ${faultType}${context?.method ? ` (method: ${context.method})` : ""}` : `SOAP error${context?.method ? ` (method: ${context.method})` : ""}: ${err}`;
  return new VsphereError(message, code, {
    soapFault: err,
    moRef: context?.moRef,
    cause: err instanceof Error ? err : void 0
  });
}

// src/mappers/common.ts
function toSoapMoRef(ref) {
  return { attributes: { type: ref.type }, $value: ref.value };
}
function prepareSoapArgs(args) {
  const result = {};
  for (const [key, val] of Object.entries(args)) {
    result[key] = convertValue(val);
  }
  return result;
}
function convertValue(val) {
  if (!val || typeof val !== "object") return val;
  if (Array.isArray(val)) return val.map(convertValue);
  const obj = val;
  if ("type" in obj && "value" in obj && Object.keys(obj).length === 2) {
    return toSoapMoRef(obj);
  }
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = convertValue(v);
  }
  return result;
}
function toMoRef(raw) {
  if (!raw || typeof raw !== "object") {
    return { type: "unknown", value: String(raw) };
  }
  const obj = raw;
  if (obj.attributes && typeof obj.attributes === "object" && "$value" in obj) {
    const attrs = obj.attributes;
    return { type: attrs.type || "unknown", value: String(obj.$value) };
  }
  if ("type" in obj && "value" in obj) {
    return { type: String(obj.type), value: String(obj.value) };
  }
  if ("_" in obj) {
    return { type: String(obj.type ?? "unknown"), value: String(obj._) };
  }
  return { type: "unknown", value: String(raw) };
}
function toDate(raw) {
  if (!raw) return void 0;
  if (raw instanceof Date) return raw;
  const d = new Date(String(raw));
  return isNaN(d.getTime()) ? void 0 : d;
}
function unwrap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const obj = raw;
  if ("$value" in obj) return obj.$value;
  if ("_" in obj) return obj._;
  return raw;
}
function toString(raw) {
  if (raw === null || raw === void 0) return "";
  const v = unwrap(raw);
  if (v === null || v === void 0) return "";
  return String(v);
}
function toNumber(raw, fallback = 0) {
  if (raw === null || raw === void 0) return fallback;
  const n = Number(unwrap(raw));
  return isNaN(n) ? fallback : n;
}
function toBool(raw, fallback = false) {
  if (raw === null || raw === void 0) return fallback;
  const v = unwrap(raw);
  if (typeof v === "boolean") return v;
  return v === "true" || v === "1";
}
function ensureArray(val) {
  if (val === void 0 || val === null) return [];
  return Array.isArray(val) ? val : [val];
}
function propsToMap(propSet) {
  const map = {};
  for (const p of propSet) {
    map[p.name] = p.val;
  }
  return map;
}

// src/soap/soap-client.ts
var SoapClient = class {
  client = null;
  sessionCookie = null;
  logger;
  rateLimiter;
  concurrencyLimiter;
  config;
  httpsAgent = null;
  responseHandler = (_body, response) => {
    if (response?.headers) {
      this.captureSessionCookie(response.headers);
    }
  };
  constructor(config) {
    this.config = config;
    this.logger = config.logger ?? noopLogger;
    this.rateLimiter = config.rateLimit ? new TokenBucketRateLimiter(config.rateLimit.maxPerSecond) : null;
    this.concurrencyLimiter = new ConcurrencyLimiter(config.maxConcurrency ?? 4);
  }
  get wsdlUrl() {
    const port = this.config.port ?? 443;
    return `https://${this.config.host}:${port}/sdk/vimService.wsdl`;
  }
  get endpoint() {
    const port = this.config.port ?? 443;
    return `https://${this.config.host}:${port}/sdk`;
  }
  async connect() {
    this.logger.info(`Connecting to vCenter at ${this.config.host}`);
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: !this.config.insecure,
      ca: this.config.ca ? this.config.ca : void 0
    });
    const wsdlOptions = {
      httpsAgent: this.httpsAgent,
      timeout: this.config.requestTimeoutMs ?? 6e4
    };
    try {
      const soapOptions = {
        endpoint: this.endpoint,
        wsdl_options: wsdlOptions
      };
      this.client = await soap.createClientAsync(this.wsdlUrl, soapOptions);
      this.client.setEndpoint(this.endpoint);
      if (this.httpsAgent) {
        this.client.httpClient.options = {
          ...this.client.httpClient?.options,
          httpsAgent: this.httpsAgent
        };
      }
      this.client.on("response", this.responseHandler);
      this.logger.info("SOAP client created successfully");
    } catch (err) {
      throw new VsphereError(
        `Failed to connect to vCenter at ${this.config.host}: ${err}`,
        "CONNECTION_FAILED" /* CONNECTION_FAILED */,
        { cause: err instanceof Error ? err : void 0 }
      );
    }
  }
  /** @internal */
  setSessionCookie(cookie) {
    this.sessionCookie = cookie;
    if (this.client) {
      this.client.addHttpHeader("Cookie", cookie);
    }
  }
  clearSessionCookie() {
    this.sessionCookie = null;
    if (this.client) {
      this.client.clearHttpHeaders();
    }
  }
  async call(method, args) {
    if (!this.client) {
      throw new VsphereError("SOAP client not connected", "CONNECTION_FAILED" /* CONNECTION_FAILED */);
    }
    if (this.rateLimiter) {
      await this.rateLimiter.acquire();
    }
    return this.concurrencyLimiter.run(async () => {
      this.logger.debug(`SOAP call: ${method}`);
      const methodFn = this.client[method + "Async"];
      if (typeof methodFn !== "function") {
        throw new VsphereError(
          `Unknown SOAP method: ${method}`,
          "SOAP_FAULT" /* SOAP_FAULT */
        );
      }
      try {
        const prepared = prepareSoapArgs(args);
        this.logger.debug(`SOAP args for ${method}: ${JSON.stringify(prepared, null, 2)}`);
        const result = await methodFn.call(
          this.client,
          prepared
        );
        const [response] = result;
        return response;
      } catch (err) {
        throw wrapSoapFault(err, { method });
      }
    });
  }
  captureSessionCookie(headers) {
    const setCookie = headers["set-cookie"] || headers["Set-Cookie"];
    if (!setCookie) return;
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const cookie of cookies) {
      const cookieStr = String(cookie);
      if (cookieStr.includes("vmware_soap_session")) {
        const match = cookieStr.match(/vmware_soap_session=[^;]+/);
        if (match) {
          this.setSessionCookie(match[0]);
          this.logger.debug("Session cookie captured");
        }
      }
    }
  }
  async destroy() {
    this.rateLimiter?.destroy();
    this.concurrencyLimiter.destroy();
    if (this.client) {
      this.client.removeListener("response", this.responseHandler);
    }
    this.client = null;
    this.sessionCookie = null;
    if (this.httpsAgent) {
      this.httpsAgent.destroy();
      this.httpsAgent = null;
    }
    this.logger.info("SOAP client destroyed");
  }
  isConnected() {
    return this.client !== null;
  }
};

// src/types/mo-ref.ts
function moRef(type, value) {
  return { type, value };
}
var SERVICE_INSTANCE = { type: "ServiceInstance", value: "ServiceInstance" };

// src/client/session.ts
var SessionManager = class {
  constructor(soap2, config, logger) {
    this.soap = soap2;
    this.config = config;
    this.logger = logger;
  }
  keepAliveTimer = null;
  _serviceContent = null;
  sessionManagerRef = null;
  get serviceContent() {
    if (!this._serviceContent) {
      throw new VsphereError("Not connected", "CONNECTION_FAILED" /* CONNECTION_FAILED */);
    }
    return this._serviceContent;
  }
  async login() {
    this.logger.info(`Logging in to ${this.config.host}`);
    const scResponse = await this.soap.call(
      "RetrieveServiceContent",
      { _this: SERVICE_INSTANCE }
    );
    const sc = scResponse.returnval ?? scResponse;
    this._serviceContent = this.parseServiceContent(sc);
    this.sessionManagerRef = this._serviceContent.sessionManager;
    try {
      await this.soap.call("Login", {
        _this: this.sessionManagerRef,
        userName: this.config.username,
        password: this.config.password,
        locale: "en"
      });
      this.logger.info(`Successfully logged in to ${this.config.host}`);
      return this._serviceContent;
    } catch (err) {
      if (err instanceof VsphereError && err.code === "AUTH_FAILED" /* AUTH_FAILED */) {
        throw err;
      }
      throw new VsphereError(
        `Login failed for ${this.config.host}`,
        "AUTH_FAILED" /* AUTH_FAILED */,
        { cause: err instanceof Error ? err : void 0 }
      );
    }
  }
  async logout() {
    if (!this.sessionManagerRef) return;
    this.logger.info("Logging out");
    try {
      await this.soap.call("Logout", { _this: this.sessionManagerRef });
    } catch {
      this.logger.warn("Logout call failed (session may already be expired)");
    }
    this.soap.clearSessionCookie();
  }
  startKeepAlive() {
    if (this.keepAliveTimer) return;
    const interval = this.config.keepAliveIntervalMs ?? 6e5;
    this.logger.debug(`Starting keep-alive every ${interval}ms`);
    this.keepAliveTimer = setInterval(async () => {
      try {
        await this.soap.call("CurrentTime", { _this: SERVICE_INSTANCE });
        this.logger.debug("Keep-alive ping successful");
      } catch (err) {
        this.logger.warn(`Keep-alive failed: ${err}`);
      }
    }, interval);
    if (this.keepAliveTimer && typeof this.keepAliveTimer.unref === "function") {
      this.keepAliveTimer.unref();
    }
  }
  stopKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
      this.logger.debug("Keep-alive stopped");
    }
  }
  parseServiceContent(raw) {
    const aboutInfo = raw.about;
    return {
      rootFolder: toMoRef(raw.rootFolder),
      propertyCollector: toMoRef(raw.propertyCollector),
      viewManager: toMoRef(raw.viewManager),
      searchIndex: toMoRef(raw.searchIndex),
      sessionManager: toMoRef(raw.sessionManager),
      eventManager: toMoRef(raw.eventManager),
      alarmManager: toMoRef(raw.alarmManager),
      taskManager: toMoRef(raw.taskManager),
      perfManager: toMoRef(raw.perfManager),
      aboutInfo: {
        name: toString(aboutInfo?.name),
        fullName: toString(aboutInfo?.fullName),
        version: toString(aboutInfo?.version),
        build: toString(aboutInfo?.build),
        apiVersion: toString(aboutInfo?.apiVersion)
      }
    };
  }
};

// src/mappers/task-mapper.ts
function mapTaskInfo(taskRef, info) {
  return {
    moRef: taskRef,
    name: toString(info.name || info.descriptionId),
    entityRef: info.entity ? toMoRef(info.entity) : void 0,
    state: mapTaskState(info.state),
    progress: info.progress !== void 0 ? toNumber(info.progress) : void 0,
    startTime: toDate(info.startTime),
    completeTime: toDate(info.completeTime),
    errorMessage: info.error ? extractErrorMessage(info.error) : void 0
  };
}
function mapTaskState(raw) {
  const s = toString(raw);
  if (s === "queued") return "queued";
  if (s === "running") return "running";
  if (s === "success") return "success";
  if (s === "error") return "error";
  return "queued";
}
function extractErrorMessage(raw) {
  if (!raw || typeof raw !== "object") return String(raw);
  const obj = raw;
  if (obj.localizedMessage) return String(obj.localizedMessage);
  if (obj.fault && typeof obj.fault === "object") {
    const fault = obj.fault;
    return String(fault.faultMessage || fault.msg || JSON.stringify(fault));
  }
  return String(obj.msg || JSON.stringify(raw));
}

// src/tasks/task-handle.ts
var TaskHandle = class {
  /** Managed object reference of the task. */
  moRef;
  _result = null;
  engine;
  constructor(moRef2, engine) {
    this.moRef = moRef2;
    this.engine = engine;
  }
  /** Fetches the current task state from vCenter. */
  async status() {
    const task = await this.engine.getTaskInfo(this.moRef);
    this._result = task;
    return task;
  }
  /**
   * Polls the task until it succeeds or fails. Throws {@link VsphereErrorCode.TASK_FAILED} on error, {@link VsphereErrorCode.TASK_TIMEOUT} on timeout.
   * @param opts - Timeout, polling interval, and progress callback.
   */
  async wait(opts) {
    const timeoutMs = opts?.timeoutMs ?? 3e5;
    const pollIntervalMs = opts?.pollIntervalMs ?? 2e3;
    const start = Date.now();
    let lastProgress = -1;
    while (true) {
      const task = await this.status();
      if (task.state === "success" || task.state === "error") {
        if (task.state === "error") {
          throw new VsphereError(
            `Task ${task.name} failed: ${task.errorMessage ?? "unknown error"}`,
            "TASK_FAILED" /* TASK_FAILED */,
            { moRef: this.moRef }
          );
        }
        return task;
      }
      if (task.progress !== void 0 && task.progress !== lastProgress) {
        lastProgress = task.progress;
        opts?.onProgress?.(task.progress);
      }
      if (Date.now() - start > timeoutMs) {
        throw new VsphereError(
          `Task ${task.name} timed out after ${timeoutMs}ms`,
          "TASK_TIMEOUT" /* TASK_TIMEOUT */,
          { moRef: this.moRef }
        );
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }
  /** Requests cancellation of the task on vCenter. */
  async cancel() {
    await this.engine.cancelTask(this.moRef);
  }
  /** Returns the last fetched task info, or `null` if status() has not been called. */
  get result() {
    return this._result;
  }
};

// src/tasks/task-engine.ts
var TaskEngine = class {
  callFn;
  logger;
  propertyCollectorRef = null;
  constructor(callFn, logger) {
    this.callFn = callFn;
    this.logger = logger;
  }
  setPropertyCollector(ref) {
    this.propertyCollectorRef = ref;
  }
  /**
   * Retrieves current task info via the PropertyCollector.
   * @param taskRef - Task managed object reference.
   */
  async getTaskInfo(taskRef) {
    if (!this.propertyCollectorRef) {
      throw new VsphereError("PropertyCollector not initialized", "CONNECTION_FAILED" /* CONNECTION_FAILED */);
    }
    const result = await this.callFn("RetrievePropertiesEx", {
      _this: this.propertyCollectorRef,
      specSet: [
        {
          propSet: [{ type: "Task", pathSet: ["info"] }],
          objectSet: [{ obj: taskRef, skip: false }]
        }
      ],
      options: { maxObjects: 1 }
    });
    const returnval = result?.returnval;
    const objects = ensureArray(
      returnval?.objects ?? returnval
    );
    if (objects.length === 0) {
      return {
        moRef: taskRef,
        name: "unknown",
        state: "queued"
      };
    }
    const obj = objects[0];
    const propSet = ensureArray(obj.propSet);
    const info = propSet.find((p) => p.name === "info");
    if (info && typeof info.val === "object" && info.val !== null) {
      return mapTaskInfo(taskRef, info.val);
    }
    return { moRef: taskRef, name: "unknown", state: "queued" };
  }
  /**
   * Sends a cancel request for the given task.
   * @param taskRef - Task to cancel.
   */
  async cancelTask(taskRef) {
    this.logger.info(`Cancelling task ${taskRef.value}`);
    await this.callFn("CancelTask", { _this: taskRef });
  }
  createHandle(taskRef) {
    this.logger.debug(`Created task handle for ${taskRef.value}`);
    return new TaskHandle(taskRef, this);
  }
  /**
   * Extracts the task MoRef from a SOAP response and returns a {@link TaskHandle}.
   * @param response - Raw SOAP response containing the task reference.
   */
  handleTaskResponse(response) {
    const ref = extractTaskRef(response);
    return this.createHandle(ref);
  }
};
function extractTaskRef(response) {
  if (!response || typeof response !== "object") {
    return { type: "Task", value: String(response) };
  }
  const obj = response;
  const returnval = obj.returnval ?? obj;
  return toMoRef(returnval);
}

// src/inventory/property-collector.ts
var PropertyCollectorHelper = class {
  constructor(callFn, propertyCollectorRef, rootFolderRef, logger) {
    this.callFn = callFn;
    this.propertyCollectorRef = propertyCollectorRef;
    this.rootFolderRef = rootFolderRef;
    this.logger = logger;
  }
  viewManagerRef = { type: "ViewManager", value: "ViewManager" };
  setViewManager(ref) {
    this.viewManagerRef = ref;
  }
  async retrieveProperties(type, pathSet, container) {
    const startFrom = container ?? this.rootFolderRef;
    const traversalSpecs = this.buildTraversalSpecs();
    const specSet = [
      {
        propSet: [{ type, pathSet }],
        objectSet: [
          {
            obj: startFrom,
            skip: true,
            selectSet: traversalSpecs
          }
        ]
      }
    ];
    return this.executeRetrieve(specSet);
  }
  async retrieveOne(moRef2, pathSet) {
    const specSet = [
      {
        propSet: [{ type: moRef2.type, pathSet }],
        objectSet: [{ obj: moRef2, skip: false }]
      }
    ];
    const results = await this.executeRetrieve(specSet);
    if (results.length === 0) return null;
    const map = {};
    for (const prop of results[0].propSet) {
      map[prop.name] = prop.val;
    }
    return map;
  }
  async retrieveContainerContents(container, type, pathSet) {
    const viewResult = await this.callFn("CreateContainerView", {
      _this: this.viewManagerRef,
      container,
      type: [type],
      recursive: true
    });
    const viewRef = toMoRef(viewResult.returnval ?? viewResult);
    try {
      const specSet = [
        {
          propSet: [{ type, pathSet }],
          objectSet: [
            {
              obj: viewRef,
              skip: true,
              selectSet: [
                {
                  attributes: { "xsi:type": "TraversalSpec" },
                  name: "viewTraversal",
                  type: "ContainerView",
                  path: "view",
                  skip: false
                }
              ]
            }
          ]
        }
      ];
      return await this.executeRetrieve(specSet);
    } finally {
      await this.callFn("DestroyView", { _this: viewRef }).catch(() => {
      });
    }
  }
  async executeRetrieve(specSet) {
    const results = [];
    const response = await this.callFn("RetrievePropertiesEx", {
      _this: this.propertyCollectorRef,
      specSet,
      options: {}
    });
    const returnval = response?.returnval;
    if (!returnval) return results;
    this.extractObjects(returnval, results);
    let token = returnval.token;
    while (token) {
      const contResponse = await this.callFn("ContinueRetrievePropertiesEx", {
        _this: this.propertyCollectorRef,
        token
      });
      const contReturnval = contResponse?.returnval;
      if (!contReturnval) break;
      this.extractObjects(contReturnval, results);
      token = contReturnval.token;
    }
    return results;
  }
  extractObjects(returnval, results) {
    const objects = ensureArray(returnval.objects);
    for (const objRaw of objects) {
      const obj = objRaw;
      const moRef2 = toMoRef(obj.obj);
      const propSet = ensureArray(obj.propSet);
      results.push({ obj: moRef2, propSet });
    }
  }
  buildTraversalSpecs() {
    return [
      {
        attributes: { "xsi:type": "TraversalSpec" },
        name: "folderTraversal",
        type: "Folder",
        path: "childEntity",
        skip: false,
        selectSet: [
          { name: "folderTraversal" },
          { name: "datacenterHostTraversal" },
          { name: "datacenterVmTraversal" },
          { name: "datacenterDsTraversal" },
          { name: "computeResourceTraversal" },
          { name: "hostTraversal" }
        ]
      },
      {
        attributes: { "xsi:type": "TraversalSpec" },
        name: "datacenterHostTraversal",
        type: "Datacenter",
        path: "hostFolder",
        skip: false,
        selectSet: [{ name: "folderTraversal" }]
      },
      {
        attributes: { "xsi:type": "TraversalSpec" },
        name: "datacenterVmTraversal",
        type: "Datacenter",
        path: "vmFolder",
        skip: false,
        selectSet: [{ name: "folderTraversal" }]
      },
      {
        attributes: { "xsi:type": "TraversalSpec" },
        name: "datacenterDsTraversal",
        type: "Datacenter",
        path: "datastoreFolder",
        skip: false,
        selectSet: [{ name: "folderTraversal" }]
      },
      {
        attributes: { "xsi:type": "TraversalSpec" },
        name: "computeResourceTraversal",
        type: "ComputeResource",
        path: "host",
        skip: false
      },
      {
        attributes: { "xsi:type": "TraversalSpec" },
        name: "hostTraversal",
        type: "HostSystem",
        path: "vm",
        skip: false,
        selectSet: [{ name: "folderTraversal" }]
      }
    ];
  }
};

// src/mappers/datacenter-mapper.ts
function mapDatacenterProperties(obj, propSet) {
  const props = propsToMap(propSet);
  return {
    moRef: obj,
    name: toString(props["name"])
  };
}
var DATACENTER_PROPERTY_PATHS = ["name"];

// src/mappers/cluster-mapper.ts
function mapClusterProperties(obj, propSet) {
  const props = propsToMap(propSet);
  return {
    moRef: obj,
    name: toString(props["name"]),
    numHosts: toNumber(props["summary.numHosts"]),
    numEffectiveHosts: toNumber(props["summary.numEffectiveHosts"]),
    totalCpu: toNumber(props["summary.totalCpu"]),
    totalMemory: toNumber(props["summary.totalMemory"]),
    parentRef: props["parent"] ? toMoRef(props["parent"]) : void 0
  };
}
var CLUSTER_PROPERTY_PATHS = [
  "name",
  "summary.numHosts",
  "summary.numEffectiveHosts",
  "summary.totalCpu",
  "summary.totalMemory",
  "parent"
];

// src/mappers/host-mapper.ts
function mapHostProperties(obj, propSet) {
  const props = propsToMap(propSet);
  return {
    moRef: obj,
    name: toString(props["name"]),
    connectionState: mapConnectionState(props["runtime.connectionState"]),
    powerState: mapHostPowerState(props["runtime.powerState"]),
    cpuModel: toString(props["summary.hardware.cpuModel"]),
    cpuMhz: toNumber(props["summary.hardware.cpuMhz"]),
    numCpuCores: toNumber(props["summary.hardware.numCpuCores"]),
    memoryBytes: toNumber(props["summary.hardware.memorySize"]),
    parentRef: props["parent"] ? toMoRef(props["parent"]) : void 0,
    overallCpuUsage: toNumber(props["summary.quickStats.overallCpuUsage"]),
    overallMemoryUsageMB: toNumber(props["summary.quickStats.overallMemoryUsage"])
  };
}
function mapConnectionState(raw) {
  const s = toString(raw);
  if (s === "connected") return "connected";
  if (s === "disconnected") return "disconnected";
  return "notResponding";
}
function mapHostPowerState(raw) {
  const s = toString(raw);
  if (s === "poweredOn") return "poweredOn";
  if (s === "standBy") return "standBy";
  return "unknown";
}
var HOST_PROPERTY_PATHS = [
  "name",
  "runtime.connectionState",
  "runtime.powerState",
  "summary.hardware.cpuModel",
  "summary.hardware.cpuMhz",
  "summary.hardware.numCpuCores",
  "summary.hardware.memorySize",
  "summary.quickStats.overallCpuUsage",
  "summary.quickStats.overallMemoryUsage",
  "parent"
];

// src/mappers/vm-mapper.ts
function mapVmProperties(obj, propSet) {
  const props = propsToMap(propSet);
  return {
    moRef: obj,
    name: toString(props["name"]),
    powerState: mapPowerState(props["runtime.powerState"] ?? props["summary.runtime.powerState"]),
    guestId: toString(props["config.guestId"] || props["summary.config.guestId"]) || void 0,
    guestFullName: toString(props["config.guestFullName"] || props["summary.config.guestFullName"]) || void 0,
    numCpu: toNumber(props["config.hardware.numCPU"] || props["summary.config.numCpu"]),
    memoryMB: toNumber(props["config.hardware.memoryMB"] || props["summary.config.memorySizeMB"]),
    ipAddress: toString(props["guest.ipAddress"] || props["summary.guest.ipAddress"]) || void 0,
    hostRef: props["runtime.host"] ? toMoRef(props["runtime.host"]) : void 0,
    template: toBool(props["config.template"] || props["summary.config.template"]),
    uuid: toString(props["config.uuid"] || props["summary.config.uuid"]),
    overallCpuUsage: toNumber(props["summary.quickStats.overallCpuUsage"]),
    guestMemoryUsageMB: toNumber(props["summary.quickStats.guestMemoryUsage"]),
    storageCommitted: toNumber(props["summary.storage.committed"]),
    storageUncommitted: toNumber(props["summary.storage.uncommitted"]),
    hasSnapshot: props["snapshot"] != null,
    annotation: toString(props["config.annotation"]) || void 0,
    toolsStatus: toString(props["guest.toolsStatus"]) || void 0,
    toolsVersionStatus: toString(props["guest.toolsVersionStatus2"]) || void 0,
    hardwareVersion: toString(props["config.version"]) || void 0,
    uptimeSeconds: toNumber(props["summary.quickStats.uptimeSeconds"]),
    disks: parseDisks(props["config.hardware.device"], props["layoutEx"]),
    parentRef: props["parent"] ? toMoRef(props["parent"]) : void 0
  };
}
function parseDisks(deviceRaw, layoutExRaw) {
  if (!deviceRaw) return [];
  // SOAP wraps typed arrays — unwrap VirtualDevice wrapper
  const unwrapped = deviceRaw.VirtualDevice || deviceRaw;
  const devices = ensureArray(unwrapped);
  const fileSizeMap = new Map();
  const layoutDiskMap = new Map();
  if (layoutExRaw && typeof layoutExRaw === "object") {
    for (const f of ensureArray(layoutExRaw.file)) {
      fileSizeMap.set(toNumber(f.key), toNumber(f.size));
    }
    for (const d of ensureArray(layoutExRaw.disk)) {
      const dKey = toNumber(d.key);
      let used = 0;
      for (const chain of ensureArray(d.chain)) {
        for (const fk of ensureArray(chain.fileKey)) {
          used += fileSizeMap.get(toNumber(fk)) || 0;
        }
      }
      layoutDiskMap.set(dKey, used);
    }
  }
  const disks = [];
  for (const dev of devices) {
    if (!dev || typeof dev !== "object") continue;
    const cap = toNumber(dev.capacityInKB);
    if (!cap) continue;
    const key = toNumber(dev.key);
    const info = dev.deviceInfo;
    const label = info ? toString(info.label) : `Disk ${disks.length + 1}`;
    const backing = dev.backing;
    const fileName = backing ? toString(backing.fileName) : "";
    const thinProvisioned = backing ? toBool(backing.thinProvisioned) : false;
    disks.push({ label, capacityBytes: cap * 1024, usedBytes: layoutDiskMap.get(key) ?? 0, fileName, thinProvisioned });
  }
  return disks;
}
function mapPowerState(raw) {
  const s = toString(raw);
  if (s === "poweredOn") return "poweredOn";
  if (s === "poweredOff") return "poweredOff";
  if (s === "suspended") return "suspended";
  return "poweredOff";
}
var VM_PROPERTY_PATHS = [
  "name",
  "runtime.powerState",
  "runtime.host",
  "config.guestId",
  "config.guestFullName",
  "config.hardware.numCPU",
  "config.hardware.memoryMB",
  "config.hardware.device",
  "config.template",
  "config.uuid",
  "config.annotation",
  "config.version",
  "guest.ipAddress",
  "guest.toolsStatus",
  "guest.toolsVersionStatus2",
  "summary.quickStats.overallCpuUsage",
  "summary.quickStats.guestMemoryUsage",
  "summary.quickStats.uptimeSeconds",
  "summary.storage.committed",
  "summary.storage.uncommitted",
  "snapshot",
  "layoutEx",
  "parent"
];

// src/mappers/datastore-mapper.ts
function mapDatastoreProperties(obj, propSet) {
  const props = propsToMap(propSet);
  return {
    moRef: obj,
    name: toString(props["summary.name"] || props["name"]),
    type: toString(props["summary.type"]),
    capacityBytes: toNumber(props["summary.capacity"]),
    freeSpaceBytes: toNumber(props["summary.freeSpace"]),
    accessible: toBool(props["summary.accessible"], true)
  };
}
var DATASTORE_PROPERTY_PATHS = [
  "name",
  "summary.name",
  "summary.type",
  "summary.capacity",
  "summary.freeSpace",
  "summary.accessible"
];

// src/mappers/network-mapper.ts
function mapNetworkProperties(obj, propSet) {
  const props = propsToMap(propSet);
  return {
    moRef: obj,
    name: toString(props["name"]),
    accessible: toBool(props["summary.accessible"], true),
    ipPoolName: props["summary.ipPoolName"] ? toString(props["summary.ipPoolName"]) : void 0
  };
}
var NETWORK_PROPERTY_PATHS = [
  "name",
  "summary.accessible",
  "summary.ipPoolName"
];

// src/inventory/inventory-module.ts
var InventoryModule = class {
  constructor(pc, logger) {
    this.pc = pc;
    this.logger = logger;
  }
  /** Lists all datacenters in the inventory. */
  async listDatacenters() {
    this.logger.debug("Listing datacenters");
    const results = await this.pc.retrieveProperties("Datacenter", DATACENTER_PROPERTY_PATHS);
    return results.map((r) => mapDatacenterProperties(r.obj, r.propSet));
  }
  /**
   * Lists clusters, optionally filtered by datacenter.
   * @param datacenterId - Restrict to clusters in this datacenter.
   */
  async listClusters(datacenterId) {
    this.logger.debug("Listing clusters");
    const results = await this.pc.retrieveProperties(
      "ClusterComputeResource",
      CLUSTER_PROPERTY_PATHS,
      datacenterId
    );
    return results.map((r) => mapClusterProperties(r.obj, r.propSet));
  }
  /**
   * Lists ESXi hosts, optionally filtered by cluster.
   * @param clusterId - Restrict to hosts in this cluster.
   */
  async listHosts(clusterId) {
    this.logger.debug("Listing hosts");
    const results = await this.pc.retrieveProperties(
      "HostSystem",
      HOST_PROPERTY_PATHS,
      clusterId
    );
    return results.map((r) => mapHostProperties(r.obj, r.propSet));
  }
  /**
   * Lists virtual machines with optional filtering.
   * @param filter - Criteria to narrow results.
   */
  async listVMs(filter) {
    this.logger.debug("Listing VMs");
    const container = filter?.clusterId ?? filter?.hostId ?? filter?.folderId;
    const results = await this.pc.retrieveProperties(
      "VirtualMachine",
      VM_PROPERTY_PATHS,
      container
    );
    let vms = results.map((r) => mapVmProperties(r.obj, r.propSet));
    if (filter?.nameContains) {
      const search = filter.nameContains.toLowerCase();
      vms = vms.filter((vm) => vm.name.toLowerCase().includes(search));
    }
    return vms;
  }
  /**
   * Retrieves a single VM by its managed object reference. Throws {@link VsphereErrorCode.NOT_FOUND} if missing.
   * @param vmId - VM managed object reference.
   */
  async getVM(vmId) {
    this.logger.debug(`Getting VM ${vmId.value}`);
    const props = await this.pc.retrieveOne(vmId, VM_PROPERTY_PATHS);
    if (!props) {
      throw new VsphereError(`VM ${vmId.value} not found`, "NOT_FOUND" /* NOT_FOUND */, { moRef: vmId });
    }
    const propSet = Object.entries(props).map(([name, val]) => ({ name, val }));
    return mapVmProperties(vmId, propSet);
  }
  /**
   * Lists datastores, optionally filtered by datacenter.
   * @param datacenterId - Restrict to datastores in this datacenter.
   */
  async listDatastores(datacenterId) {
    this.logger.debug("Listing datastores");
    const results = await this.pc.retrieveProperties(
      "Datastore",
      DATASTORE_PROPERTY_PATHS,
      datacenterId
    );
    return results.map((r) => mapDatastoreProperties(r.obj, r.propSet));
  }
  /**
   * Lists networks, optionally filtered by datacenter.
   * @param datacenterId - Restrict to networks in this datacenter.
   */
  async listNetworks(datacenterId) {
    this.logger.debug("Listing networks");
    const results = await this.pc.retrieveProperties(
      "Network",
      NETWORK_PROPERTY_PATHS,
      datacenterId
    );
    return results.map((r) => mapNetworkProperties(r.obj, r.propSet));
  }
};

// src/vm/vm-module.ts
var VmModule = class {
  constructor(callFn, taskEngine, logger) {
    this.callFn = callFn;
    this.taskEngine = taskEngine;
    this.logger = logger;
  }
  /**
   * Powers on a virtual machine.
   * @param vmId - VM to power on.
   * @param hostId - Optional target host for the power-on.
   */
  async powerOn(vmId, hostId) {
    this.logger.info(`Powering on VM ${vmId.value}`);
    const args = { _this: vmId };
    if (hostId) args.host = hostId;
    const response = await this.callFn("PowerOnVM_Task", args);
    return this.taskEngine.handleTaskResponse(response);
  }
  /**
   * Powers off a virtual machine (hard stop).
   * @param vmId - VM to power off.
   */
  async powerOff(vmId) {
    this.logger.info(`Powering off VM ${vmId.value}`);
    const response = await this.callFn("PowerOffVM_Task", { _this: vmId });
    return this.taskEngine.handleTaskResponse(response);
  }
  /**
   * Hard-resets a virtual machine.
   * @param vmId - VM to reset.
   */
  async reset(vmId) {
    this.logger.info(`Resetting VM ${vmId.value}`);
    const response = await this.callFn("ResetVM_Task", { _this: vmId });
    return this.taskEngine.handleTaskResponse(response);
  }
  /**
   * Suspends a virtual machine.
   * @param vmId - VM to suspend.
   */
  async suspend(vmId) {
    this.logger.info(`Suspending VM ${vmId.value}`);
    const response = await this.callFn("SuspendVM_Task", { _this: vmId });
    return this.taskEngine.handleTaskResponse(response);
  }
  /**
   * Reconfigures a VM's CPU, memory, or annotations.
   * @param vmId - VM to reconfigure.
   * @param spec - Desired configuration changes.
   */
  async reconfigure(vmId, spec) {
    this.logger.info(`Reconfiguring VM ${vmId.value}`);
    const configSpec = {};
    if (spec.cpu !== void 0) configSpec.numCPUs = spec.cpu;
    if (spec.memoryMB !== void 0) configSpec.memoryMB = spec.memoryMB;
    if (spec.notes !== void 0) configSpec.annotation = spec.notes;
    const response = await this.callFn("ReconfigVM_Task", {
      _this: vmId,
      spec: configSpec
    });
    return this.taskEngine.handleTaskResponse(response);
  }
  /**
   * Clones a virtual machine.
   * @param vmId - Source VM to clone.
   * @param options - Clone destination and settings.
   */
  async clone(vmId, options) {
    this.logger.info(`Cloning VM ${vmId.value} as ${options.name}`);
    const location = {};
    if (options.datastore) location.datastore = options.datastore;
    if (options.resourcePool) location.pool = options.resourcePool;
    const response = await this.callFn("CloneVM_Task", {
      _this: vmId,
      folder: options.folder,
      name: options.name,
      spec: {
        location,
        powerOn: options.powerOn ?? false,
        template: options.asTemplate ?? false
      }
    });
    return this.taskEngine.handleTaskResponse(response);
  }
  /**
   * Destroys a virtual machine and its associated files.
   * @param vmId - VM to destroy.
   */
  async destroy(vmId) {
    this.logger.info(`Destroying VM ${vmId.value}`);
    const response = await this.callFn("Destroy_Task", { _this: vmId });
    return this.taskEngine.handleTaskResponse(response);
  }
  /**
   * Unregisters a VM from inventory without deleting its files.
   * @param vmId - VM to unregister.
   */
  async unregister(vmId) {
    this.logger.info(`Unregistering VM ${vmId.value}`);
    await this.callFn("UnregisterVM", { _this: vmId });
  }
};

// src/mappers/snapshot-mapper.ts
function mapSnapshotTree(raw) {
  if (!raw) return [];
  // SOAP returns { VirtualMachineSnapshotTree: [...] } wrapper
  if (raw && typeof raw === "object" && !Array.isArray(raw) && raw.VirtualMachineSnapshotTree) {
    return ensureArray(raw.VirtualMachineSnapshotTree).map(mapSnapshotNode);
  }
  const items = ensureArray(raw);
  return items.map(mapSnapshotNode);
}
function mapSnapshotNode(raw) {
  const obj = raw;
  return {
    moRef: toMoRef(obj.snapshot),
    name: toString(obj.name),
    description: toString(obj.description),
    createTime: toDate(obj.createTime) ?? /* @__PURE__ */ new Date(),
    state: mapPowerState2(obj.state),
    quiesced: toBool(obj.quiesced),
    children: mapSnapshotTree(obj.childSnapshotList)
  };
}
function mapPowerState2(raw) {
  const s = toString(raw);
  if (s === "poweredOn") return "poweredOn";
  if (s === "suspended") return "suspended";
  return "poweredOff";
}

// src/snapshots/snapshot-module.ts
var SnapshotModule = class {
  constructor(callFn, taskEngine, pc, logger) {
    this.callFn = callFn;
    this.taskEngine = taskEngine;
    this.pc = pc;
    this.logger = logger;
  }
  /**
   * Creates a new snapshot for a VM.
   * @param vmId - Target VM.
   * @param options - Snapshot name and settings.
   */
  async create(vmId, options) {
    this.logger.info(`Creating snapshot "${options.name}" for VM ${vmId.value}`);
    const response = await this.callFn("CreateSnapshot_Task", {
      _this: vmId,
      name: options.name,
      description: options.description ?? "",
      memory: options.memory ?? false,
      quiesce: options.quiesce ?? false
    });
    return this.taskEngine.handleTaskResponse(response);
  }
  /**
   * Lists the snapshot tree for a VM.
   * @param vmId - VM whose snapshots to list.
   */
  async list(vmId) {
    this.logger.debug(`Listing snapshots for VM ${vmId.value}`);
    const props = await this.pc.retrieveOne(vmId, ["snapshot.rootSnapshotList"]);
    if (!props) return [];
    const raw = props["snapshot.rootSnapshotList"] ?? props["snapshot"];
    return mapSnapshotTree(raw);
  }
  /**
   * Removes a single snapshot.
   * @param snapshotId - Snapshot to remove.
   * @param options - Set `removeChildren` to also remove child snapshots.
   */
  async remove(snapshotId, options) {
    this.logger.info(`Removing snapshot ${snapshotId.value}`);
    const response = await this.callFn("RemoveSnapshot_Task", {
      _this: snapshotId,
      removeChildren: options?.removeChildren ?? false,
      consolidate: true
    });
    return this.taskEngine.handleTaskResponse(response);
  }
  /**
   * Removes all snapshots from a VM.
   * @param vmId - VM whose snapshots to remove.
   */
  async removeAll(vmId) {
    this.logger.info(`Removing all snapshots from VM ${vmId.value}`);
    const response = await this.callFn("RemoveAllSnapshots_Task", {
      _this: vmId,
      consolidate: true
    });
    return this.taskEngine.handleTaskResponse(response);
  }
  /**
   * Reverts the VM to the specified snapshot.
   * @param snapshotId - Snapshot to revert to.
   */
  async revert(snapshotId) {
    this.logger.info(`Reverting to snapshot ${snapshotId.value}`);
    const response = await this.callFn("RevertToSnapshot_Task", {
      _this: snapshotId
    });
    return this.taskEngine.handleTaskResponse(response);
  }
  /**
   * Consolidates VM disks after snapshot operations.
   * @param vmId - VM whose disks to consolidate.
   */
  async consolidate(vmId) {
    this.logger.info(`Consolidating disks for VM ${vmId.value}`);
    const response = await this.callFn("ConsolidateVMDisks_Task", {
      _this: vmId
    });
    return this.taskEngine.handleTaskResponse(response);
  }
};

// src/mappers/event-mapper.ts
function mapEvents(raw) {
  if (!raw) return [];
  const items = ensureArray(raw);
  return items.map(mapEvent);
}
function mapEvent(raw) {
  const obj = raw;
  let entityRef;
  let entityName;
  if (obj.vm && typeof obj.vm === "object") {
    const vm = obj.vm;
    entityRef = vm.vm ? toMoRef(vm.vm) : void 0;
    entityName = toString(vm.name);
  } else if (obj.host && typeof obj.host === "object") {
    const host = obj.host;
    entityRef = host.host ? toMoRef(host.host) : void 0;
    entityName = toString(host.name);
  }
  let datacenterRef;
  if (obj.datacenter && typeof obj.datacenter === "object") {
    const dc = obj.datacenter;
    datacenterRef = dc.datacenter ? toMoRef(dc.datacenter) : void 0;
  }
  return {
    key: toNumber(obj.key),
    eventType: toString(obj.eventTypeId || obj.$type || obj.type || "Unknown"),
    createdTime: toDate(obj.createdTime) ?? /* @__PURE__ */ new Date(),
    message: toString(obj.fullFormattedMessage || obj.message),
    userName: toString(obj.userName) || void 0,
    entityRef,
    entityName,
    datacenterRef
  };
}

// src/events/events-module.ts
var EventsModule = class {
  constructor(callFn, eventManagerRef, logger) {
    this.callFn = callFn;
    this.eventManagerRef = eventManagerRef;
    this.logger = logger;
  }
  /**
   * Queries events from vCenter using an EventHistoryCollector.
   * @param filter - Optional criteria to narrow results.
   */
  async query(filter) {
    this.logger.debug("Querying events");
    const filterSpec = {};
    if (filter?.since) {
      filterSpec.time = {
        beginTime: filter.since.toISOString()
      };
    }
    if (filter?.entityId) {
      filterSpec.entity = {
        entity: filter.entityId,
        recursion: "all"
      };
    }
    if (filter?.types && filter.types.length > 0) {
      filterSpec.eventTypeId = filter.types;
    }
    const collectorResponse = await this.callFn(
      "CreateCollectorForEvents",
      {
        _this: this.eventManagerRef,
        filter: filterSpec
      }
    );
    const collectorRef = toMoRef(
      collectorResponse.returnval ?? collectorResponse
    );
    try {
      await this.callFn("ResetCollector", { _this: collectorRef });
      const maxCount = filter?.maxCount ?? 100;
      const readResponse = await this.callFn("ReadNextEvents", {
        _this: collectorRef,
        maxCount
      });
      const rawEvents = ensureArray(
        readResponse?.returnval ?? readResponse
      );
      return mapEvents(rawEvents);
    } finally {
      await this.callFn("DestroyCollector", { _this: collectorRef }).catch(() => {
      });
    }
  }
};

// src/mappers/alarm-mapper.ts
function mapAlarms(raw) {
  if (!raw) return [];
  const items = ensureArray(raw);
  return items.map(mapAlarm);
}
function mapAlarm(raw) {
  const obj = raw;
  return {
    moRef: toMoRef(obj.key ?? obj),
    alarmRef: toMoRef(obj.alarm),
    entityRef: toMoRef(obj.entity),
    entityName: toString(obj.entityName),
    alarmName: toString(obj.alarmName || obj.alarm),
    status: mapAlarmStatus(obj.overallStatus || obj.status),
    time: toDate(obj.time) ?? /* @__PURE__ */ new Date(),
    acknowledged: toBool(obj.acknowledged)
  };
}
function mapAlarmStatus(raw) {
  const s = toString(raw);
  if (s === "red") return "red";
  if (s === "yellow") return "yellow";
  if (s === "green") return "green";
  return "gray";
}

// src/alarms/alarms-module.ts
var AlarmsModule = class {
  constructor(callFn, alarmManagerRef, pc, rootFolderRef, logger) {
    this.callFn = callFn;
    this.alarmManagerRef = alarmManagerRef;
    this.pc = pc;
    this.rootFolderRef = rootFolderRef;
    this.logger = logger;
  }
  /**
   * Lists currently triggered alarms.
   * @param options - Optional filter to scope by entity.
   */
  async listActive(options) {
    this.logger.debug("Listing active alarms");
    const entityRef = options?.entityId ?? this.rootFolderRef;
    const props = await this.pc.retrieveOne(entityRef, ["triggeredAlarmState"]);
    if (!props || !props["triggeredAlarmState"]) return [];
    return mapAlarms(props["triggeredAlarmState"]);
  }
  /**
   * Acknowledges a triggered alarm on an entity.
   * @param alarmRef - The alarm to acknowledge.
   * @param entityRef - The entity the alarm is triggered on.
   */
  async acknowledge(alarmRef, entityRef) {
    this.logger.info(`Acknowledging alarm ${alarmRef.value} on ${entityRef.value}`);
    await this.callFn("AcknowledgeAlarm", {
      _this: this.alarmManagerRef,
      alarm: alarmRef,
      entity: entityRef
    });
  }
};

// src/health/health-module.ts
var HealthModule = class {
  constructor(callFn, eventsModule, logger) {
    this.callFn = callFn;
    this.eventsModule = eventsModule;
    this.logger = logger;
  }
  errorBuffer = [];
  maxErrors = 500;
  /**
   * Records a local error into the in-memory buffer.
   * @param code - Error classification code.
   * @param message - Human-readable error message.
   * @param options - Optional managed object reference and raw data.
   */
  recordError(code, message, options) {
    const error = {
      timestamp: /* @__PURE__ */ new Date(),
      severity: "error",
      sourceType: options?.moRef?.type ?? "unknown",
      sourceId: options?.moRef?.value ?? "unknown",
      message,
      raw: options?.raw
    };
    this.errorBuffer.push(error);
    if (this.errorBuffer.length > this.maxErrors) {
      this.errorBuffer = this.errorBuffer.slice(-this.maxErrors);
    }
  }
  /**
   * Returns recent errors from both vCenter events and the local buffer.
   * @param filter - Time-based filter.
   */
  async recentErrors(filter) {
    this.logger.debug("Fetching recent errors");
    const errorTypes = [
      "VmFailedToPowerOnEvent",
      "VmFailedToPowerOffEvent",
      "VmDisconnectedEvent",
      "HostConnectionLostEvent",
      "HostDisconnectedEvent",
      "TaskEvent",
      "EventEx",
      "AlarmStatusChangedEvent"
    ];
    const events = await this.eventsModule.query({
      since: filter.since,
      types: errorTypes,
      maxCount: 500
    });
    const normalized = events.map((event) => ({
      timestamp: event.createdTime,
      severity: inferSeverity(event.eventType),
      sourceType: event.entityRef?.type ?? "unknown",
      sourceId: event.entityRef?.value ?? event.entityName ?? "unknown",
      message: event.message,
      raw: event
    }));
    const localErrors = this.errorBuffer.filter(
      (e) => e.timestamp >= filter.since
    );
    return [...normalized, ...localErrors].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }
  /**
   * Returns locally recorded errors, optionally filtered to a recent time window.
   * @param sinceMs - Only return errors from the last N milliseconds.
   */
  getLocalErrors(sinceMs) {
    if (sinceMs === void 0) return [...this.errorBuffer];
    const since = Date.now() - sinceMs;
    return this.errorBuffer.filter((e) => e.timestamp.getTime() >= since);
  }
  /** Returns a count of buffered errors grouped by source type. */
  getErrorSummary() {
    const summary = {};
    for (const err of this.errorBuffer) {
      summary[err.sourceType] = (summary[err.sourceType] ?? 0) + 1;
    }
    return summary;
  }
  /** Clears all locally buffered errors. */
  clear() {
    this.errorBuffer = [];
  }
};
function inferSeverity(eventType) {
  if (eventType.includes("Failed") || eventType.includes("Lost") || eventType.includes("Disconnected")) {
    return "error";
  }
  if (eventType.includes("Alarm") || eventType.includes("Warning")) {
    return "warning";
  }
  return "info";
}

// src/client/vsphere-client.ts
var VsphereClient = class _VsphereClient {
  soap;
  session;
  logger;
  config;
  connected = false;
  connectingPromise = null;
  _taskEngine;
  _inventory;
  _vm;
  _snapshots;
  _events;
  _alarms;
  _health;
  constructor(config) {
    this.config = config;
    this.logger = config.logger ?? noopLogger;
    this.soap = new SoapClient(config);
    this.session = new SessionManager(this.soap, config, this.logger);
  }
  /**
   * Creates a new client and connects in one step.
   * @param config - Connection and authentication settings.
   */
  static async connect(config) {
    const client = new _VsphereClient(config);
    await client.connect();
    return client;
  }
  /** Establishes a SOAP session and authenticates with vCenter. Throws {@link VsphereErrorCode.CONNECTION_FAILED} if already connected. */
  async connect() {
    if (this.connected) {
      throw new VsphereError("Already connected", "CONNECTION_FAILED" /* CONNECTION_FAILED */);
    }
    if (this.connectingPromise) {
      return this.connectingPromise;
    }
    this.connectingPromise = this.doConnect();
    try {
      await this.connectingPromise;
    } finally {
      this.connectingPromise = null;
    }
  }
  async doConnect() {
    await this.soap.connect();
    try {
      const sc = await this.session.login();
      this.initModules(sc);
      this.session.startKeepAlive();
      this.connected = true;
      this.logger.info(
        `Connected to ${sc.aboutInfo.fullName} (API ${sc.aboutInfo.apiVersion})`
      );
    } catch (err) {
      await this.soap.destroy();
      throw err;
    }
  }
  /** Logs out of the vSphere session and closes the underlying connection. */
  async disconnect() {
    if (!this.connected) return;
    this.session.stopKeepAlive();
    await this.session.logout();
    await this.soap.destroy();
    this.connected = false;
    this.logger.info("Disconnected");
  }
  /** Inventory queries (VMs, hosts, clusters, datacenters, datastores). */
  get inventory() {
    this.ensureConnected();
    return this._inventory;
  }
  /** VM power operations and reconfiguration. */
  get vm() {
    this.ensureConnected();
    return this._vm;
  }
  /** Snapshot create, list, revert, and remove operations. */
  get snapshots() {
    this.ensureConnected();
    return this._snapshots;
  }
  /** Event history queries. */
  get events() {
    this.ensureConnected();
    return this._events;
  }
  /** Alarm listing and acknowledgement. */
  get alarms() {
    this.ensureConnected();
    return this._alarms;
  }
  /** Health monitoring and recent error aggregation. */
  get health() {
    this.ensureConnected();
    return this._health;
  }
  /** Raw vCenter ServiceContent returned at login. */
  get serviceContent() {
    this.ensureConnected();
    return this.session.serviceContent;
  }
  /**
   * Sends a raw SOAP method call to vCenter.
   * @internal
   * @param method - SOAP operation name.
   * @param args - Method arguments.
   */
  call(method, args) {
    this.ensureConnected();
    return this.soap.call(method, args);
  }
  initModules(sc) {
    const callFn = (method, args) => this.soap.call(method, args);
    this._taskEngine = new TaskEngine(callFn, this.logger);
    this._taskEngine.setPropertyCollector(sc.propertyCollector);
    const pc = new PropertyCollectorHelper(
      callFn,
      sc.propertyCollector,
      sc.rootFolder,
      this.logger
    );
    pc.setViewManager(sc.viewManager);
    this._inventory = new InventoryModule(pc, this.logger);
    this._vm = new VmModule(callFn, this._taskEngine, this.logger);
    this._snapshots = new SnapshotModule(callFn, this._taskEngine, pc, this.logger);
    this._events = new EventsModule(callFn, sc.eventManager, this.logger);
    this._alarms = new AlarmsModule(callFn, sc.alarmManager, pc, sc.rootFolder, this.logger);
    this._health = new HealthModule(callFn, this._events, this.logger);
  }
  ensureConnected() {
    if (!this.connected) {
      throw new VsphereError(
        "Client is not connected. Call connect() first.",
        "CONNECTION_FAILED" /* CONNECTION_FAILED */
      );
    }
  }
};

// src/utils/retry.ts
var DEFAULT_OPTIONS = {
  maxRetries: 3,
  baseDelayMs: 1e3,
  maxDelayMs: 3e4
};
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function withRetry(fn, opts = {}) {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  let lastError;
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === options.maxRetries) break;
      if (options.retryableCheck && !options.retryableCheck(err)) break;
      const delay = Math.min(
        options.maxDelayMs,
        options.baseDelayMs * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5)
      );
      await sleep(delay);
    }
  }
  throw lastError;
}
export {
  SERVICE_INSTANCE,
  TaskHandle,
  VsphereClient,
  VsphereError,
  VsphereErrorCode,
  moRef,
  noopLogger,
  withRetry
};
//# sourceMappingURL=index.js.map