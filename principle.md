# Nemetric 实现原理

## [Nemo Metric(check the sourceCode)](https://github.com/WarrenJones/nemetric)主要分为四个模块：
**performance: **主要是performance以及performanceObserver的一些调用的封装。
**detect-browser**:用于检测浏览器的**名字**，**版本**，以及**操作系统。**
**idle-queue: **实现将任务放入队列，在cpu空闲时候才执行，在这里就是检测到**指标数据**以后丢到这个队列里面让它来统一处理。
**Nemetric:** 供外部调用的类，接受指标参数，采样率，指标检测回调等参数然后调用**detect-browser,****idle-queue**以及**performance**实现对性能的采集。

## Performance (核心模块)：
利用[Performance](https://developer.mozilla.org/en-US/docs/Web/API/Performance) 的[Performance Timeline API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_Timeline), [Navigation Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_timing_API),  [User Timing API](https://developer.mozilla.org/en-US/docs/Web/API/User_Timing_API),[Resource Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Resource_Timing_API)获取Navigation指标，资源指标以及用户动作时间指标等，利用[PerformanceObserver](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/PerformanceObserver)监听firstPaint,firstContentfulPaint,firstInputDelay等。

首先是判断方法的支持性,不支持就没办法了。
```javascript
static supported(): boolean {
    return (
      window.performance &&
      !!performance.getEntriesByType &&
      !!performance.now &&
      !!performance.mark
    );
 }

static supportedPerformanceObserver(): boolean {
    return (window as any).chrome && 'PerformanceObserver' in window;
}

```

### 1. 获取Navigation Timing(指标可以继续增加)
直接 **performance.getEntriesByType('navigation')[0]** 获取到Navigation 这个Entry，然后再获得相应的指标即可。

![image.png](https://cdn.nlark.com/yuque/0/2019/png/198974/1572837571143-eaebca1e-0e75-401d-8610-7ca8e000cb3d.png#align=left&display=inline&height=431&name=image.png&originHeight=862&originWidth=2752&search=&size=198683&status=done&width=1376)

```javascript
export interface INemetricNavigationTiming {
  fetchTime?: number;
  workerTime?: number;
  totalTime?: number;
  downloadTime?: number;
  timeToFirstByte?: number;
  headerSize?: number;
  dnsLookupTime?: number;
}
/**
   * Navigation Timing API provides performance metrics for HTML documents.
   * w3c.github.io/navigation-timing/
   * developers.google.com/web/fundamentals/performance/navigation-and-resource-timing
   */
  get navigationTiming(): INemetricNavigationTiming {
    if (
      !Performance.supported() ||
      Object.keys(this.navigationTimingCached).length
    ) {
      return this.navigationTimingCached;
    }
    // There is an open issue to type correctly getEntriesByType
    // github.com/microsoft/TypeScript/issues/33866
    const navigation = performance.getEntriesByType('navigation')[0] as any;
    // In Safari version 11.2 Navigation Timing isn't supported yet
    if (!navigation) {
      return this.navigationTimingCached;
    }

    // We cache the navigation time for future times
    this.navigationTimingCached = {
      // fetchStart marks when the browser starts to fetch a resource
      // responseEnd is when the last byte of the response arrives
      fetchTime: parseFloat((navigation.responseEnd - navigation.fetchStart).toFixed(2)),
      // Service worker time plus response time
      workerTime: parseFloat(
        (navigation.workerStart > 0 ? navigation.responseEnd - navigation.workerStart : 0).toFixed(2),
      ),
      // Request plus response time (network only)
      totalTime: parseFloat((navigation.responseEnd - navigation.requestStart).toFixed(2)),
      // Response time only (download)
      downloadTime: parseFloat((navigation.responseEnd - navigation.responseStart).toFixed(2)),
      // Time to First Byte (TTFB)
      timeToFirstByte: parseFloat(
        (navigation.responseStart - navigation.requestStart).toFixed(2),
      ),
      // HTTP header size
      headerSize: parseFloat((navigation.transferSize - navigation.encodedBodySize).toFixed(2)),
      // Measuring DNS lookup time
      dnsLookupTime: parseFloat(
        (navigation.domainLookupEnd - navigation.domainLookupStart).toFixed(2),
      ),
    };
    return this.navigationTimingCached;
  }
```

### 2. 记录User Timing
主要是利用[Performance.mark以及Performance.measure](https://developer.mozilla.org/en-US/docs/Web/API/User_Timing_API)方法，核心就是对一个metric记录两遍，然后调用measure 获取得到duration。

```javascript
 mark(metricName: string, type: string): void {
    const mark = `mark_${metricName}_${type}`;
    (window.performance.mark as any)(mark);
  }

  measure(metricName: string, metric: IMetricEntry): number {
    const startMark = `mark_${metricName}_start`;
    const endMark = `mark_${metricName}_end`;
    (window.performance.measure as any)(metricName, startMark, endMark);
    return this.getDurationByMetric(metricName, metric);
  }
```


**Nemetric **对其进行封装对外暴露 start和 end 方法,而endPaint是一些UI渲染以及异步操作的记录。

```javascript
/**
   * Start performance measurement
   */
  start(metricName: string): void {
    if (!this.checkMetricName(metricName) || !Performance.supported()) {
      return;
    }
    if (this.metrics[metricName]) {
      this.logWarn('Recording already started.');
      return;
    }
    this.metrics[metricName] = {
      end: 0,
      start: this.perf.now(),
    };
    // Creates a timestamp in the browser's performance entry buffer
    this.perf.mark(metricName, 'start');
    // Reset hidden value
    this.isHidden = false;
  }

  /**
   * End performance measurement
   */
  end(metricName: string): void | number {
    if (!this.checkMetricName(metricName) || !Performance.supported()) {
      return;
    }
    const metric = this.metrics[metricName];
    if (!metric) {
      this.logWarn('Recording already stopped.');
      return;
    }
    // End Performance Mark
    metric.end = this.perf.now();
    this.perf.mark(metricName, 'end');
    // Get duration and change it to a two decimal value
    const duration = this.perf.measure(metricName, metric);
    const duration2Decimal = parseFloat(duration.toFixed(2));
    delete this.metrics[metricName];
    this.pushTask(() => {
      // Log to console, delete metric and send to analytics tracker
      this.log({ metricName, duration: duration2Decimal });
      this.sendTiming({ metricName, duration: duration2Decimal });
    });
    return duration2Decimal;
  }

  /**
   * End performance measurement after first paint from the beging of it
   */
  endPaint(metricName: string): Promise<void | number> {
    return new Promise(resolve => {
      setTimeout(() => {
        const duration = this.end(metricName);
        resolve(duration);
      });
    });
  }
```
### 3. 记录First Paint，First Contentful Paint，FirstInputDelay,DataConsumption.

**Performance **提供方法给**Nemetric **监听某个EventType.
```javascript
/**
   * PerformanceObserver subscribes to performance events as they happen
   * and respond to them asynchronously.
   */
  performanceObserver(
    eventType: IPerformanceObserverType,
    cb: (entries: any[]) => void,
  ): IPerformanceObserver {
    this.perfObserver = new PerformanceObserver(
      this.performanceObserverCb.bind(this, cb),
    );
    // Retrieve buffered events and subscribe to newer events for Paint Timing
    this.perfObserver.observe({ type: eventType, buffered: true });
    return this.perfObserver;
  }

  private performanceObserverCb(
    cb: (entries: PerformanceEntry[]) => void,
    entryList: IPerformanceObserverEntryList,
  ): void {
    const entries = entryList.getEntries();
    cb(entries);
  }
```

**Nemetric** 根据调用参数来初始化需要监听的指标,包括（firstPaint，firstContentfulPaint，firstInputDelay，dataConsumption）
```javascript
private initPerformanceObserver(): void {
    // Init observe FCP  and creates the Promise to observe metric
    if (this.config.firstPaint || this.config.firstContentfulPaint) {
      this.observeFirstPaint = new Promise(resolve => {
        this.logDebug('observeFirstPaint');
        this.observers['firstPaint'] = resolve;
      });
      this.observeFirstContentfulPaint = new Promise(resolve => {
        this.logDebug('observeFirstContentfulPaint');
        this.observers['firstContentfulPaint'] = resolve;
        this.initFirstPaint();
      });
    }

    // FID needs to be initialized as soon as Nemetric is available,
    // which returns a Promise that can be observed.
    // DataConsumption resolves after FID is triggered
    this.observeFirstInputDelay = new Promise(resolve => {
      this.observers['firstInputDelay'] = resolve;
      this.initFirstInputDelay();
    });

    // Collects KB information related to resources on the page
    if (this.config.dataConsumption) {
      this.observeDataConsumption = new Promise(resolve => {
        this.observers['dataConsumption'] = resolve;
        this.initDataConsumption();
      });
    }
  }

```

原理都是一样，初始化每个指标，对他们进行PerformanceObserver.observe就行监听，等到监听有结果就调用**digest**函数，**digest**统一调用**performanceObserverCb.而performanceObserverCb就是我们整个代码的核心！**
```javascript
 private performanceObserverResourceCb(options: {
    entries: IPerformanceEntry[];
  }): void {
    this.logDebug('performanceObserverResourceCb', options);
    options.entries.forEach((performanceEntry: IPerformanceEntry) => {
      if (performanceEntry.decodedBodySize) {
        const decodedBodySize = parseFloat(
          (performanceEntry.decodedBodySize / 1000).toFixed(2),
        );
        this.dataConsumption += decodedBodySize;
      }
    });
  }

  private digestFirstPaintEntries(entries: IPerformanceEntry[]): void {
    this.performanceObserverCb({
      entries,
      entryName: 'first-paint',
      metricLog: 'First Paint',
      metricName: 'firstPaint',
      valueLog: 'startTime',
    });
    this.performanceObserverCb({
      entries,
      entryName: 'first-contentful-paint',
      metricLog: 'First Contentful Paint',
      metricName: 'firstContentfulPaint',
      valueLog: 'startTime',
    });
  }

  /**
   * First Paint is essentially the paint after which
   * the biggest above-the-fold layout change has happened.
   */
  private initFirstPaint(): void {
    this.logDebug('initFirstPaint');
    try {
      this.perfObservers.firstContentfulPaint = this.perf.performanceObserver(
        'paint',
        this.digestFirstPaintEntries.bind(this),
      );
    } catch (e) {
      this.logWarn('initFirstPaint failed');
    }
  }

  private digestFirstInputDelayEntries(entries: IPerformanceEntry[]): void {
    this.performanceObserverCb({
      entries,
      metricLog: 'First Input Delay',
      metricName: 'firstInputDelay',
      valueLog: 'duration',
    });
    this.disconnectDataConsumption();
  }

  private initFirstInputDelay(): void {
    try {
      this.perfObservers.firstInputDelay = this.perf.performanceObserver(
        'first-input',
        this.digestFirstInputDelayEntries.bind(this),
      );
    } catch (e) {
      this.logWarn('initFirstInputDelay failed');
    }
  }

  private digestDataConsumptionEntries(entries: IPerformanceEntry[]): void {
    this.performanceObserverResourceCb({
      entries,
    });
  }

  private disconnectDataConsumption(): void {
    clearTimeout(this.dataConsumptionTimeout);
    if (!this.perfObservers.dataConsumption || !this.dataConsumption) {
      return;
    }
    this.logMetric(
      this.dataConsumption,
      'Data Consumption',
      'dataConsumption',
      'Kb',
    );
    this.perfObservers.dataConsumption.disconnect();
  }

  private initDataConsumption(): void {
    try {
      this.perfObservers.dataConsumption = this.perf.performanceObserver(
        'resource',
        this.digestDataConsumptionEntries.bind(this),
      );
    } catch (e) {
      this.logWarn('initDataConsumption failed');
    }
    this.dataConsumptionTimeout = setTimeout(() => {
      this.disconnectDataConsumption();
    }, 15000);
  }

```

**performanceObserverCb **接受一个指标的参数，然后找到对应的EntryName，调用**PushTask**将任务放到**Idle-queue**里面。而任务就是**logMetric**
```javascript
 private pushTask(cb: any): void {
    if (this.queue && this.queue.pushTask) {
      this.queue.pushTask(() => {
        cb();
      });
    } else {
      cb();
    }
  }

/**
   * Logging Performance Paint Timing
   */
  private performanceObserverCb(options: {
    entries: IPerformanceEntry[];
    entryName?: string;
    metricLog: string;
    metricName: INemetricMetrics;
    valueLog: 'duration' | 'startTime';
  }): void {
    this.logDebug('performanceObserverCb', options);
    options.entries.forEach((performanceEntry: IPerformanceEntry) => {
      this.pushTask(() => {
        if (
          this.config[options.metricName] &&
          (!options.entryName ||
            (options.entryName && performanceEntry.name === options.entryName))
        ) {
          this.logMetric(
            performanceEntry[options.valueLog],
            options.metricLog,
            options.metricName,
          );
        }
      });
      if (
        this.perfObservers.firstContentfulPaint &&
        performanceEntry.name === 'first-contentful-paint'
      ) {
        this.perfObservers.firstContentfulPaint.disconnect();
      }
    });
    if (
      this.perfObservers.firstInputDelay &&
      options.metricName === 'firstInputDelay'
    ) {
      this.perfObservers.firstInputDelay.disconnect();
    }
  }
```

**logMetric**很简单,就是调用输出log(此代码就不贴出来了)，以及sendtiming，sendtiming就是用户传参给**Nemetric **的analyticsTracker分析结果动作回调函数。
```javascript
/**
   * Dispatches the metric duration into internal logs
   * and the external time tracking service.
   */
  private logMetric(
    duration: number,
    logText: string,
    metricName: string,
    suffix: string = 'ms',
  ): void {
    const duration2Decimal = parseFloat(duration.toFixed(2));
    // Stop Analytics and Logging for false negative metrics
    if (
      metricName !== 'dataConsumption' &&
      duration2Decimal > this.config.maxMeasureTime
    ) {
      return;
    } else if (
      metricName === 'dataConsumption' &&
      duration2Decimal > this.config.maxDataConsumption
    ) {
      return;
    }

    // Save metrics in Duration property
    if (metricName === 'firstPaint') {
      this.firstPaintDuration = duration2Decimal;
    }
    if (metricName === 'firstContentfulPaint') {
      this.firstContentfulPaintDuration = duration2Decimal;
    }
    if (metricName === 'firstInputDelay') {
      this.firstInputDelayDuration = duration2Decimal;
    }
    this.observers[metricName](duration2Decimal);

    // Logs the metric in the internal console.log
    this.log({ metricName: logText, duration: duration2Decimal, suffix });

    // Sends the metric to an external tracking service
    this.sendTiming({ metricName, duration: duration2Decimal });
  }
  
  
   sendTiming(options: ISendTimingOptions): void {
    const { metricName, data, duration } = options;
    // Doesn't send timing when page is hidden
    if (this.isHidden) {
      return;
    }
    // Get Browser from userAgent
    const browser = this.browser;
    // Send metric to custom Analytics service,
    if (this.config.analyticsTracker) {
      //random track
      Math.random() < this.config.sampleRate && this.config.analyticsTracker({ data, metricName, duration, browser });
    }
  }

```

## Detect Browser(获取浏览器名，版本，系统)
**detect-browser** 其实很简单，就是根据userAgent，对**Nemetric**暴露detect方法，然后主要是**parseUserAgent，**枚举匹配对得上的userAgentRules.
```javascript
type Browser =
  | 'welike'
  | 'vidmate'
  | 'aol'
  | 'edge'
  | 'yandexbrowser'
  | 'vivaldi'
  | 'kakaotalk'
  | 'samsung'
  | 'chrome'
  | 'phantomjs'
  | 'crios'
  | 'firefox'
  | 'fxios'
  | 'opera'
  | 'ie'
  | 'bb10'
  | 'android'
  | 'ios'
  | 'safari'
  | 'facebook'
  | 'instagram'
  | 'ios-webview'　
  | 'searchbot';
type OperatingSystem =
  | 'iOS'
  | 'Android OS'
  | 'BlackBerry OS'
  | 'Windows Mobile'
  | 'Amazon OS'
  | 'Windows 3.11'
  | 'Windows 95'
  | 'Windows 98'
  | 'Windows 2000'
  | 'Windows XP'
  | 'Windows Server 2003'
  | 'Windows Vista'
  | 'Windows 7'
  | 'Windows 8'
  | 'Windows 8.1'
  | 'Windows 10'
  | 'Windows ME'
  | 'Open BSD'
  | 'Sun OS'
  | 'Linux'
  | 'Mac OS'
  | 'QNX'
  | 'BeOS'
  | 'OS/2'
  | 'Search Bot';
const userAgentRules: UserAgentRule[] = [
  ['aol', /AOLShield\/([0-9\._]+)/],
  ['edge', /Edge\/([0-9\._]+)/],
  ['yandexbrowser', /YaBrowser\/([0-9\._]+)/],
  ['vivaldi', /Vivaldi\/([0-9\.]+)/],
  ['kakaotalk', /KAKAOTALK\s([0-9\.]+)/],
  ['samsung', /SamsungBrowser\/([0-9\.]+)/],
  ['chrome', /(?!Chrom.*OPR)Chrom(?:e|ium)\/([0-9\.]+)(:?\s|$)/],
  ['phantomjs', /PhantomJS\/([0-9\.]+)(:?\s|$)/],
  ['crios', /CriOS\/([0-9\.]+)(:?\s|$)/],
  ['firefox', /Firefox\/([0-9\.]+)(?:\s|$)/],
  ['fxios', /FxiOS\/([0-9\.]+)/],
  ['opera', /Opera\/([0-9\.]+)(?:\s|$)/],
  ['opera', /OPR\/([0-9\.]+)(:?\s|$)$/],
  ['ie', /Trident\/7\.0.*rv\:([0-9\.]+).*\).*Gecko$/],
  ['ie', /MSIE\s([0-9\.]+);.*Trident\/[4-7].0/],
  ['ie', /MSIE\s(7\.0)/],
  ['bb10', /BB10;\sTouch.*Version\/([0-9\.]+)/],
  ['android', /Android\s([0-9\.]+)/],
  ['ios', /Version\/([0-9\._]+).*Mobile.*Safari.*/],
  ['safari', /Version\/([0-9\._]+).*Safari/],
  ['facebook', /FBAV\/([0-9\.]+)/],
  ['instagram', /Instagram\s([0-9\.]+)/],
  ['ios-webview', /AppleWebKit\/([0-9\.]+).*Mobile/],
  ['searchbot', SEARCHBOX_UA_REGEX],
];
type UserAgentRule = [Browser, RegExp];
type UserAgentMatch = [Browser, RegExpExecArray] | false;
type OperatingSystemRule = [OperatingSystem, RegExp];
export function detect(): BrowserInfo | BotInfo | NodeInfo | null {
  if (typeof navigator !== 'undefined') {
    return parseUserAgent(navigator.userAgent);
  }

  return getNodeVersion();
}

export function parseUserAgent(ua: string): BrowserInfo | BotInfo | null {
  // opted for using reduce here rather than Array#first with a regex.test call
  // this is primarily because using the reduce we only perform the regex
  // execution once rather than once for the test and for the exec again below
  // probably something that needs to be benchmarked though
  const matchedRule: UserAgentMatch =
    ua !== '' &&
    userAgentRules.reduce<UserAgentMatch>((matched: UserAgentMatch, [browser, regex]) => {
      if (matched) {
        return matched;
      }

      const uaMatch = regex.exec(ua);
      return !!uaMatch && [browser, uaMatch];
    }, false);

  if (!matchedRule) {
    return null;
  }

  const [name, match] = matchedRule;
  if (name === 'searchbot') {
    return new BotInfo();
  }

  let version = match[1] && match[1].split(/[._]/).slice(0, 3);
  if (version) {
    if (version.length < REQUIRED_VERSION_PARTS) {
      version = [
        ...version,
        ...new Array(REQUIRED_VERSION_PARTS - version.length).fill('0'),
      ];
    }
  } else {
    version = [];
  }

  return new BrowserInfo(name, version.join('.'), detectOS(ua));
}
```

## Idle Queue (低优先级任务队列)
这是谷歌大神Phlip Walton 给出的一个解决方案.Idle Queue维护一个任务队列，在前面的Performance会看到，pushTask就是将任务放到这里面，等到cpu空闲，任务才开始执行。


```javascript
 pushTask(cb: any) {
    this.addTask_(Array.prototype.push, cb);
  }

addTask_(
    arrayMethod: any,
    task: any,
    { minTaskTime = this.defaultMinTaskTime_ } = {},
  ) {
    const state = {
      time: now(),
      visibilityState: document.visibilityState,
    };

    arrayMethod.call(this.taskQueue_, { state, task, minTaskTime });

    this.scheduleTasksToRun_();
  }
```

核心就是 **scheduleTasksToRun_**，ensureTasksRun_是表示在页面不可见时候任务是否继续进行.
```javascript
scheduleTasksToRun_() {
    if (this.ensureTasksRun_ && document.visibilityState === 'hidden') {
      queueMicrotask(this.runTasks_);
    } else {
      if (!this.idleCallbackHandle_) {
        this.idleCallbackHandle_ = rIC(this.runTasks_);
      }
    }
  }

```

其中 queueMictotask就是一个创建一个微任务,可以看到，如果支持Promise就用promise，否则就用MutationObserver模拟一个微任务，如果MutationObserver都不支持的话，只能用同步代码处理了。

```javascript
/**
 * Queues a function to be run in the next microtask. If the browser supports
 * Promises, those are used. Otherwise it falls back to MutationObserver.
 * Note: since Promise polyfills are popular but not all support microtasks,
 * we check for native implementation rather than a polyfill.
 * @private
 * @param {!Function} microtask
 */
export const queueMicrotask = supportsPromisesNatively
  ? createQueueMicrotaskViaPromises()
  : supportsMutationObserver
    ? createQueueMicrotaskViaMutationObserver()
    : discardMicrotasks();

/**
 * @return {!Function}
 */
const createQueueMicrotaskViaPromises = () => {
  return (microtask: any) => {
    Promise.resolve().then(microtask);
  };
};

/**
 * @return {!Function}
 */
const createQueueMicrotaskViaMutationObserver = () => {
  let i = 0;
  let microtaskQueue: any = [];
  const observer = new MutationObserver(() => {
    microtaskQueue.forEach((microtask: any) => microtask());
    microtaskQueue = [];
  });
  const node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return (microtask: any) => {
    microtaskQueue.push(microtask);

    // Trigger a mutation observer callback, which is a microtask.
    // tslint:disable-next-line:no-increment-decrement
    node.data = String(++i % 2);
  };
};

const discardMicrotasks = () => {
  return (microtask: any) => {};
};
```

而rIC就是 requestIdleCallBack的简称了,cIC 就是 cancelIdleCallBack，如果浏览器不支持requestIdleCallBack 和cancelIdleCallBack，就用setTimeout来代替。

```javascript
export const rIC = supportsRequestIdleCallback_
  ? window.requestIdleCallback
  : requestIdleCallbackShim;

const requestIdleCallbackShim = (callback: any) => {
  const deadline = new IdleDealine(now());
  return setTimeout(() => callback(deadline), 0);
};
/**
 * The native `cancelIdleCallback()` function or `cancelIdleCallbackShim()`
 * if the browser doesn't support it.
 * @param {number} handle
 */
export const cIC = supportsRequestIdleCallback_
  ? window.cancelIdleCallback
  : cancelIdleCallbackShim;
/**
 * A minimal shim for the  cancelIdleCallback function. This accepts a
 * handle identifying the idle callback to cancel.
 * @private
 * @param {number|null} handle
 */
const cancelIdleCallbackShim = (handle: any) => {
  clearTimeout(handle);
};

/**
 * A minimal shim of the native IdleDeadline class.
 */
class IdleDealine {
  initTime_: any;
  /** @param {number} initTime */
  constructor(initTime: any) {
    this.initTime_ = initTime;
  }
  /** @return {boolean} */
  get didTimeout() {
    return false;
  }
  /** @return {number} */
  timeRemaining() {
    return Math.max(0, 50 - (now() - this.initTime_));
  }
}
```

最最核心的就是**runTasks_**了，就是在deadline前，不断的处理任务的队列，直到队列为空。
```javascript
/**
   * Runs as many tasks in the queue as it can before reaching the
   * deadline. If no deadline is passed, it will run all tasks.
   * If an `IdleDeadline` object is passed (as is with `requestIdleCallback`)
   * then the tasks are run until there's no time remaining, at which point
   * we yield to input or other script and wait until the next idle time.
   * @param {IdleDeadline=} deadline
   * @private
   */
  runTasks_(deadline?: any) {
    this.cancelScheduledRun_();

    if (!this.isProcessing_) {
      this.isProcessing_ = true;

      // Process tasks until there's no time left or we need to yield to input.
      while (
        this.hasPendingTasks() &&
        !shouldYield(deadline, (this.taskQueue_[0] as any).minTaskTime)
      ) {
        const { task, state } = (this.taskQueue_ as any).shift();

        this.state_ = state;
        task(state);
        this.state_ = null;
      }

      this.isProcessing_ = false;

      if (this.hasPendingTasks()) {
        // Schedule the rest of the tasks for the next idle time.
        this.scheduleTasksToRun_();
      }
    }
  }

  /**
 * Returns true if the IdleDealine object exists and the remaining time is
 * less or equal to than the minTaskTime. Otherwise returns false.
 * @param {IdleDeadline|undefined} deadline
 * @param {number} minTaskTime
 * @return {boolean}
 * @private
 */
const shouldYield = (deadline: any, minTaskTime: any) => {
  if (deadline && deadline.timeRemaining() <= minTaskTime) {
    return true;
  }
  return false;
};
  /**
   * @return {boolean}
   */
  hasPendingTasks() {
    return this.taskQueue_.length > 0;
  }
```

## Nemetric
非常简单了，对外暴露参数，然后根据参数调用相应模块就行。
```javascript
export interface INemetricOptions {
  // Metrics
  firstContentfulPaint?: boolean;
  firstInputDelay?: boolean;
  firstPaint?: boolean;
  dataConsumption?: boolean;
  navigationTiming?: boolean;
  // Analytics
  analyticsTracker?: (options: IAnalyticsTrackerOptions) => void;
  // Logging
  logPrefix?: string;
  logging?: boolean;
  maxMeasureTime?: number;
  maxDataConsumption?: number;
  warning?: boolean;
  // Debugging
  debugging?: boolean;
  //is for in-app
  inApp?: boolean;
  //0~1
  sampleRate?: number;
}

constructor(options: INemetricOptions = {}) {
    // Extend default config with external options
    this.config = Object.assign({}, this.config, options) as INemetricConfig;
    this.perf = new Performance();

    // Exit from Nemetric when basic Web Performance APIs aren't supported
    if (!Performance.supported()) {
      return;
    }

    this.browser = detect();

    // Checks if use Performance or the EmulatedPerformance instance
    if (Performance.supportedPerformanceObserver()) {
      this.initPerformanceObserver();
    }

    // Init visibilitychange listener
    this.onVisibilityChange();
    // 
    /**
     * if it's built for in-App
     * or it's safari
     * also need to listen for beforeunload
     */
    if (this.config.inApp || typeof window.safari === 'object' && window.safari.pushNotification) {
      this.onBeforeUnload();
    }
    // Ensures the queue is run immediately whenever the page
    // is in a state where it might soon be unloaded.
    // https://philipwalton.com/articles/idle-until-urgent/
    this.queue = new IdleQueue({ ensureTasksRun: true });
    // Log Navigation Timing
    if (this.config.navigationTiming) {
      this.logNavigationTiming();
    }
  }

```

## 总结
** **[Nemetric](https://github.com/WarrenJones/nemetric)** **主要是利用Performace以及Performace Observer来采集用户的数据。正如
[如何采集和分析网页用户的性能指标](https://unclewarren.cn/2019/08/19/%E5%A6%82%E4%BD%95%E9%87%87%E9%9B%86%E5%92%8C%E5%88%86%E6%9E%90%E7%BD%91%E9%A1%B5%E7%94%A8%E6%88%B7%E7%9A%84%E6%80%A7%E8%83%BD%E6%8C%87%E6%A0%87/) 所说，我们算用户指标的平均时长对我们来说用处不大。利用这些数据我们可以

1. 将性能指标结合地理位置录入数据库，形成统计图。
1. 大部分用户的指标的区间以及分布(哪些国家地区，浏览器版本比较慢等等)。
1. 做相关的A/B test 优化 对比 性能统计区间，提高我们h5的转化率。
